import logging
import os
import re
from typing import Union, Any, Dict, Optional
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage # Para que el type hint `file: FileStorage` 
import io
from io import BytesIO
import pandas as pd
import requests
import sqlalchemy

from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

import sqlparse
from sqlparse.sql import IdentifierList, Identifier
from sqlparse.tokens import Keyword, DML
from services import data_handler
from utils import supabase_handler  # Ajustar path según proyecto


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class DataService:
    def __init__(self, db_client=None, storage_handler=None):
        # Tu __init__ está perfecto. No necesita cambios.
        self.db_client = db_client  # or supabase_handler.get_db_client()
        self.storage_handler = storage_handler  # or supabase_handler
        # Es buena práctica definir los nombres de las tablas como atributos
        self.datasets_table = "datasets"

    def create_dataset_record(
        self,
        dataset_id: str,
        user_id: str,
        project_id: str,
        dataset_name: str,
        dataset_type: str,
        storage_path: str,
        file_size: int
    ) -> Dict[str, Any] | None:
        """
        Crea un registro para un nuevo dataset en la tabla 'datasets'.
        Se asume que el archivo ya fue guardado en Storage.
        
        Retorna:
            - El registro recién creado como dict si tiene éxito.
            - None si ocurre un error.
        """
        try:
            # --- 1. Validación de parámetros ---
            if not all([dataset_id, user_id, project_id, dataset_name, dataset_type, storage_path]):
                raise ValueError("Faltan parámetros obligatorios para crear el dataset.")

            if file_size < 0:
                raise ValueError("El tamaño del archivo no puede ser negativo.")

            # --- 2. Preparar el diccionario con los datos a insertar ---
            dataset_entry = {
                "dataset_id": dataset_id,
                "project_id": project_id,
                "user_id": user_id,
                "dataset_name": dataset_name,
                "dataset_type": dataset_type,
                "storage_path": storage_path,
                "metadata": {
                "sizeBytes": file_size,
                
                }
            }

            # --- 3. Ejecutar la inserción en la base de datos ---
            res = self.db_client.table(self.datasets_table).insert(dataset_entry).execute()

            # --- 4. Validar la respuesta ---
            if not res or not hasattr(res, "data") or not res.data:
                raise RuntimeError("No se pudo crear el registro del dataset en la base de datos.")

            # --- 5. Retornar el registro creado ---
            return res.data[0]

        except Exception as e:
            logger.error(
              f"[DataService.create_dataset_record] Error creando dataset "
              f"(dataset_id={dataset_id}, user_id={user_id}): {e}",
              exc_info=True
    )
            raise e



    # --- FUNCIÓN 2: GUARDAR CAMBIOS (La nueva función) ---
    def update_editable_content(self, document_id: str, user_id: str, new_text_content: str) -> None:
        """
        Actualiza el contenido del archivo de texto editable de un documento.
        """
        # 1. Obtener los metadatos y validar permisos (reutilizamos la lógica)
        # Esto es muy seguro: nos aseguramos de que el usuario sea el dueño ANTES de escribir.
        try:
            document_metadata = self.get_document_and_ensure_editable_version(document_id, user_id)
        except (ValueError, PermissionError) as e:
            # Si el documento no existe o no es del usuario, lanzamos el error hacia arriba.
            raise e

        # 2. Verificar que el documento es efectivamente editable
        editable_path = document_metadata.get('editable_text_path')
        if not editable_path:
            raise TypeError(f"El documento {document_id} no es editable o no se pudo convertir a texto.")
        
        # 3. Sobrescribir el archivo de texto en Storage
        # Delegamos la tarea al especialista en almacenamiento.
        try:
            self.storage_handler.save_text_content(new_text_content, editable_path)
            logger.info(f"Contenido del documento {document_id} actualizado correctamente en la ruta: {editable_path}")
        except Exception as e:
            logger.error(f"Error al guardar el nuevo contenido del documento {document_id} en Storage: {e}")
            # Lanzamos una excepción para que el endpoint sepa que algo falló.
            raise IOError("Fallo al escribir el archivo en el almacenamiento.") from e
        
        # Esta función no necesita devolver nada. Si no hay excepciones, todo fue un éxito.
        return

    def create_dataset_from_file(self, user_id: str, project_id: str, file: FileStorage) -> Dict[str, Any]:
        """
        Guarda un archivo subido en Storage y crea su registro en la base de datos.
        - Si es tabular, lo convierte a Parquet.
        - Si es de otro tipo (PDF, DOCX, TXT), guarda el archivo ORIGINAL.
        """
        try:
            original_filename = secure_filename(file.filename)
            dataset_type = data_handler.detect_file_type(original_filename)
            
            file.seek(0)
            file_bytes = file.read()
            file_size = len(file_bytes)
            
            path = None
            metadata = {}

            if dataset_type == 'tabular':
                ext = original_filename.rsplit('.', 1)[-1].lower()
                # Usamos la función de data_handler que sí existe para leer el archivo
                df, _ = data_handler._read_tabular(io.BytesIO(file_bytes), ext)
                
                if df is None:
                    raise ValueError("No se pudo leer el archivo tabular.")
                
                for col in df.select_dtypes(include=['object']).columns:
                    df[col] = df[col].astype(str)
                logger.info("Columnas de tipo 'object' convertidas a 'string' para asegurar la compatibilidad con Parquet.")

                    
                path, msg = self.storage_handler.save_dataframe(df, user_id, project_id, original_filename)
                if not path:
                    raise Exception(f"Error guardando Parquet: {msg}")

                metadata = {"rows": df.shape[0], "columns": df.shape[1], "sizeBytes": file_size}

            elif dataset_type in ['text', 'pdf', 'docx', 'json', 'md']:
                base_name, _ = os.path.splitext(original_filename)
                folder_name = base_name.strip().replace(" ", "_")

                # Guardamos el archivo original, sin procesar
                path, msg = self.storage_handler.save_file(
                    file_bytes=file_bytes,
                    user_id=user_id,
                    project_id=project_id,
                    folder=folder_name,
                    filename=original_filename
                )
                if not path:
                    raise Exception(f"Error guardando archivo: {msg}")
                
                metadata = {"sizeBytes": file_size}
            
            else:
                return {"success": False, "error": f"Tipo de archivo '{dataset_type}' no soportado."}
                
            dataset_entry = {
                "project_id": project_id,
                "user_id": user_id,
                "dataset_name": original_filename,
                "dataset_type": dataset_type,
                "storage_path": path,
                "metadata": metadata
            }
            
            res = self.db_client.table(self.datasets_table).insert(dataset_entry).execute()
            if not res.data:
                raise Exception("No se pudo crear el registro del dataset en la DB.")
                
            return {"success": True, "data": res.data[0]}

        except Exception as e:
            logger.error(f"Error en create_dataset_from_file: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def list_datasets(self, project_id: str, user_id: str) -> Dict[str, Any]:
        """
        Lista todos los datasets asociados a un proyecto.
        """
        try:
            res = (
                self.db_client.table(self.datasets_table)
                .select("*")
                .eq("project_id", project_id)
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return {"success": True, "data": res.data}
        except Exception as e:
            logger.error(f"Error en list_datasets: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
        

    def delete_dataset(self, dataset_id: str, user_id: str) -> Dict[str, Any]:
        """
        Elimina un dataset y su archivo asociado del storage.
        Es idempotente: si el dataset ya no existe, devuelve éxito.
        """
        try:
            if not all([dataset_id, user_id]):
                raise ValueError("dataset_id y user_id son obligatorios.")

            # 1. Obtener la información del dataset para validar propiedad y obtener la ruta del storage
            res = (
                self.db_client.table(self.datasets_table)
                .select("storage_path, user_id")
                .eq("dataset_id", dataset_id)
                .single()  # .single() lanzará un error si no encuentra la fila, que capturaremos abajo
                .execute()
            )
            
            dataset = res.data

            # Aunque .single() ya falla, esta es una doble comprobación de seguridad
            if dataset["user_id"] != user_id:
                raise PermissionError("El usuario no es propietario de este dataset.")

            # 2. Intentar eliminar el archivo del storage si existe una ruta
            storage_path = dataset.get("storage_path")
            if storage_path:
                # ¡AQUÍ USAMOS EL NUEVO MÉTODO CORRECTAMENTE!
                # Le pasamos el user_id para que el decorador @require_user_ownership funcione.
                success, message = self.storage_handler.delete_file(user_id=user_id, path=storage_path)
                if not success:
                    # Si falla la eliminación del storage, solo lo advertimos para no bloquear la operación
                    logger.warning(
                        f"No se pudo eliminar el archivo del storage '{storage_path}', "
                        f"pero se continuará con el borrado de la base de datos. Causa: {message}"
                    )

            # 3. Eliminar el registro de la base de datos
            self.db_client.table(self.datasets_table)\
                .delete()\
                .eq("dataset_id", dataset_id)\
                .execute()

            logger.info(f"Registro del dataset {dataset_id} eliminado de la base de datos.")
            return {"success": True, "message": "Dataset eliminado correctamente."}

        except Exception as e:
            # Aquí manejamos el error cuando .single() no encuentra nada
            if "JSON object requested, multiple (or no) rows returned" in str(e):
                logger.warning(f"Intento de eliminar un dataset que no existe (ID: {dataset_id}). Se considera un éxito.")
                return {"success": True, "message": "El dataset ya había sido eliminado."}

            logger.error(f"Error en delete_dataset: {e}", exc_info=True)
            return {"success": False, "error": "Ocurrió un error en el servidor."}
           
    def rename_dataset(self, dataset_id: str, user_id: str, new_name: str) -> Dict[str, Any]:
        """
        Cambia el nombre del dataset asegurando que no exista otro con ese nombre en el mismo proyecto.
        """
        try:
            if not all([dataset_id, user_id, new_name]):
                raise ValueError("dataset_id, user_id y new_name son obligatorios.")

            # Obtener proyecto asociado para validar duplicados
            res = (
                self.db_client.table(self.datasets_table)
                .select("project_id")
                .eq("dataset_id", dataset_id)
                .single()
                .execute()
            )
            if not res.data:
                raise Exception("Dataset no encontrado.")

            project_id = res.data["project_id"]

            # Verificar duplicados
            existing = (
                self.db_client.table(self.datasets_table)
                .select("dataset_id")
                .eq("project_id", project_id)
                .eq("user_id", user_id)
                .eq("dataset_name", new_name)
                .execute()
            )
            if existing.data:
                return {"success": False, "error": "Ya existe un dataset con ese nombre en este proyecto."}

            # Actualizar nombre
            update_res = (
                self.db_client.table(self.datasets_table)
                .update({"dataset_name": new_name})
                .eq("dataset_id", dataset_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not update_res.data:
                raise Exception("No se pudo renombrar el dataset o no tienes permisos.")

            return {"success": True, "data": update_res.data[0]}

        except Exception as e:
            logger.error(f"Error en rename_dataset: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def load_dataset_content(self, user_id: str, project_id: str, dataset_name: str, dataset_type: str) -> Union[pd.DataFrame, str, None]:
        """
        Carga el contenido de un dataset desde Storage según su tipo.
        """
        try:
            if dataset_type == "tabular":
                df = self.storage_handler.load_dataframe(user_id, project_id, dataset_name)
                return df
            elif dataset_type == "text":
                text = self.storage_handler.load_text(user_id, project_id, f"{dataset_name}.txt")
                return text
            else:
                logger.warning(f"Tipo de dataset no soportado: {dataset_type}")
                return None
        except Exception as e:
            logger.error(f"Error cargando contenido dataset {dataset_name}: {e}")
            return None
    

    def import_from_powerbi_file(
        self,
        user_id: str,
        project_id: str,
        dataset_name: str,
        powerbi_file_path: str,
    ) -> Dict[str, Any]:
        """
        Importa datos desde un archivo PowerBI exportado.
        Nota: Los archivos .pbix no pueden ser leídos directamente en Python,
        por lo que este método asume que el usuario exportó a CSV o Excel.
        """
        try:
            if not os.path.isfile(powerbi_file_path):
                raise FileNotFoundError("Archivo PowerBI no encontrado.")

            # Soportar CSV y Excel (XLSX)
            ext = os.path.splitext(powerbi_file_path)[1].lower()
            if ext == ".csv":
                df = pd.read_csv(powerbi_file_path)
            elif ext in [".xls", ".xlsx"]:
                df = pd.read_excel(powerbi_file_path)
            else:
                raise TypeError("Formato de archivo no soportado para importación PowerBI. Usa CSV o Excel.")

            if df.empty:
                raise ValueError("El archivo no contiene datos.")

            # Guardar dataset
            return self.create_dataset_from_content(
                user_id=user_id,
                project_id=project_id,
                dataset_name=dataset_name,
                dataset_type="tabular",
                content=df
            )
        except Exception as e:
            logger.error(f"Error en import_from_powerbi_file: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def import_from_api_json(
        self,
        user_id: str,
        project_id: str,
        dataset_name: str,
        api_url: str,
        params: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
        data_path: Optional[str] = None,
        max_records: Optional[int] = 10000
    ) -> Dict[str, Any]:
        """
        Importa datos tabulares desde una API que devuelve JSON.
        - data_path: ruta dentro del JSON para encontrar la lista de registros (por ej. "data.items")
        """
        try:
            if not all([user_id, project_id, dataset_name, api_url]):
                raise ValueError("Faltan datos obligatorios para importar desde API.")

            response = requests.get(api_url, params=params, headers=headers, timeout=10)
            response.raise_for_status()

            json_data = response.json()

            # Extraer lista de registros desde data_path si está definido
            records = json_data
            if data_path:
                for key in data_path.split("."):
                    records = records.get(key, {})                    
                if not isinstance(records, list):
                   raise ValueError(f"El path '{data_path}' no contiene una lista de registros.")

            df = pd.DataFrame(records)
            if df.empty:
                raise ValueError("La respuesta API no contiene datos o es vacía.")

            if max_records and len(df) > max_records:
                df = df.head(max_records)

            return self.create_dataset_from_content(
                user_id=user_id,
                project_id=project_id,
                dataset_name=dataset_name,
                dataset_type="tabular",
                content=df
            )
        except Exception as e:
            logger.error(f"Error en import_from_api_json: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
        
    
    MAX_FILE_SIZE_BYTES = 1_000_000  # 1 MB
    
    def update_content(self, dataset_id: str, user_id: str, new_content: str) -> Dict[str, Any]:
        """
        Actualiza el contenido de un archivo de texto en Storage y sus metadatos en la DB.
        """
        MAX_FILE_SIZE_BYTES = 1_000_000  # 1 MB (La puse aquí adentro para que sea autocontenida)

        try: # <--- CORRECCIÓN: Faltaban los dos puntos ':'
            # Validación básica de contenido
            if not isinstance(new_content, str) or not new_content.strip():
                return {"success": False, "error": "El contenido no puede estar vacío."}

            # Validación de tamaño
            content_size = len(new_content.encode("utf-8"))
            if content_size > MAX_FILE_SIZE_BYTES:
                return {"success": False, "error": f"El contenido supera el tamaño máximo permitido de {MAX_FILE_SIZE_BYTES // 1000} KB."}

            # 1. Obtener storage_path y validar propiedad
            res = (
                self.db_client.table(self.datasets_table)
                .select("storage_path, user_id, dataset_name") # Añadimos dataset_name para el re-guardado
                .eq("dataset_id", dataset_id)
                .single()
                .execute()
            )

            dataset = res.data
            if not dataset or dataset["user_id"] != user_id:
                return {"success": False, "error": "No se encontró el dataset o no tienes permisos."}

            storage_path = dataset.get("storage_path")
            if not storage_path:
                return {"success": False, "error": "No se encontró la ruta del archivo en storage."}

            # 2. Sobrescribir archivo en Supabase Storage
            # ¡OJO! Tu SupabaseHandler no tiene un método "overwrite_file".
            # Vamos a reutilizar "save_file" que ya tiene "upsert: true".
            file_bytes = new_content.encode("utf-8")
            
            # Necesitamos el project_id y el nombre del archivo original para reconstruir la ruta
            # storage_path suele ser 'user_id/project_id/folder/filename.txt'
            path_parts = storage_path.split('/')
            if len(path_parts) >= 4:
                # Reconstruimos los parámetros que necesita save_file
                p_id = path_parts[1]
                folder = path_parts[2]
                filename = path_parts[3]
                
                new_path, msg = self.storage_handler.save_file(
                    file_bytes=file_bytes,
                    user_id=user_id,
                    project_id=p_id,
                    folder=folder,
                    filename=filename
                )
                if not new_path:
                    return {"success": False, "error": f"Error al actualizar el archivo: {msg}"}
            else:
                return {"success": False, "error": "La ruta del archivo en storage es inválida."}
            
            # 3. (IMPORTANTE) Actualizar los metadatos en la base de datos
            new_metadata = {"length": len(new_content), "sizeBytes": content_size}
            
            self.db_client.table(self.datasets_table)\
                .update({"metadata": new_metadata})\
                .eq("dataset_id", dataset_id)\
                .execute()

            logger.info(f"Contenido y metadatos del archivo {storage_path} actualizados correctamente.")
            return {"success": True, "message": "Contenido actualizado con éxito."}

        except Exception as e: # <--- CORRECCIÓN: Faltaban los dos puntos ':'
            logger.error(f"Error en update_content: {e}", exc_info=True)
            return {"success": False, "error": "Error interno del servidor."}

    def get_dataset_info_by_id(self, dataset_id, user_id):
        """
        Obtiene la información básica de un dataset (nombre, ruta) de la base de datos,
        verificando que pertenece al usuario.
        """
        try:
            # Consulta a Supabase para obtener el dataset específico
            # Asegura que el dataset pertenezca al usuario que hace la petición
            query = self.db_client.table("datasets").select(
                "dataset_name, storage_path, dataset_type, project_id" # Seleccionamos los campos que necesitamos
            ).eq(
                "dataset_id", dataset_id
            ).eq(
                "user_id", user_id
            ).single() # Usamos single() porque esperamos un único resultado
            
            response = query.execute()

            # Verificamos si se encontró el dato
            if not response.data:
                return {"success": False, "error": "Dataset not found or access denied"}

            # Si se encontró, devolvemos el éxito y los datos
            return {"success": True, "data": response.data}

        except Exception as e:
            # Registramos el error en el servidor para depuración
            print(f"Error fetching dataset info from DB: {e}") # O usa tu logger
            return {"success": False, "error": "Failed to retrieve dataset information."}
           
         # Esta es TU función, con UNA SOLA LÍNEA AÑADIDA para la corrección.

               

def get_dataset_info_by_id_corrected(self, dataset_id, user_id):
    """
    Versión CORREGIDA que selecciona el project_id y usa el nombre
    correcto de la columna ID para evitar conflictos.
    """
    try:
        # Consulta a Supabase con las DOS correcciones
        query = self.db_client.table("datasets").select(
            # CORRECCIÓN 1: Aseguramos que se pida el project_id
            "dataset_name, storage_path, dataset_type, project_id"
        ).eq(
            # CORRECCIÓN 2: Usamos el nombre de la columna que aparece en tu screenshot
            "dataset_uuid", dataset_id
        ).eq(
            "user_id", user_id
        ).single()
        
        response = query.execute()

        if not response.data:
            return {"success": False, "error": "Dataset not found or access denied (Corrected Function)"}

        return {"success": True, "data": response.data}

    except Exception as e:
        print(f"Error in CORRECTED function: {e}")
        return {"success": False, "error": "Failed to retrieve dataset information (Corrected Function)."}
         

def rename_dataset(self, dataset_id: str, user_id: str, new_name: str) -> Dict[str, Any]:
    """
    Cambia el nombre del dataset asegurando que no exista otro con ese nombre en el mismo proyecto.
    """
    try:
        if not all([dataset_id, user_id, new_name]):
            raise ValueError("dataset_id, user_id y new_name son obligatorios.")

        # Obtener proyecto asociado para validar duplicados
        res = (
            self.db_client.table(self.datasets_table)
            .select("project_id")
            .eq("dataset_id", dataset_id)
            .single()
            .execute()
        )
        if not res.data:
            raise Exception("Dataset no encontrado.")

        project_id = res.data["project_id"]

        # --- CORRECCIÓN AQUÍ ---
        # Verificar duplicados, EXCLUYENDO el dataset actual
        existing = (
            self.db_client.table(self.datasets_table)
            .select("dataset_id")
            .eq("project_id", project_id)
            # .eq("user_id", user_id) # Esta línea es redundante si ya validamos por project_id
            .eq("dataset_name", new_name)
            .neq("dataset_id", dataset_id)  # <--- ¡¡ESTA ES LA LÍNEA CLAVE AÑADIDA!!
            .execute()
        )
        if existing.data:
            # Ahora este error solo se disparará si OTRO dataset tiene ese nombre.
            return {"success": False, "error": "Ya existe un dataset con ese nombre en este proyecto."}

        # Actualizar nombre
        update_res = (
            self.db_client.table(self.datasets_table)
            .update({"dataset_name": new_name})
            .eq("dataset_id", dataset_id)
            .eq("user_id", user_id) # Es bueno mantener la validación de usuario aquí por seguridad
            .execute()
        )
        if not update_res.data:
            raise Exception("No se pudo renombrar el dataset o no tienes permisos.")

        return {"success": True, "data": update_res.data[0]}

    except Exception as e:
        logger.error(f"Error en rename_dataset: {e}", exc_info=True)
        # Es mejor devolver un mensaje genérico al frontend por seguridad
        return {"success": False, "error": "Error interno al procesar la solicitud."}
    
    