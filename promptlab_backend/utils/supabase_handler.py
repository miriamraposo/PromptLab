# utils/supabase_handler.py
import uuid
import os
import io
import logging
import pandas as pd
from supabase import create_client, Client
from dotenv import load_dotenv
from typing import Optional, Tuple, List, Callable, Dict, Any
import time
from typing import NoReturn
import requests 
import mimetypes




load_dotenv()
logger = logging.getLogger(__name__)

def require_user_ownership(func):
    def wrapper(self, *args, **kwargs):
        user_id = kwargs.get("user_id")
        path = kwargs.get("path")
        if user_id and path and not path.startswith(f"{user_id}/"):
            logger.warning(f"⛔ Acceso denegado para {user_id} al archivo {path}")
            return None
        return func(self, *args, **kwargs)
    return wrapper



class SupabaseHandler:
    _instance = None
    _client: Client = None
    _bucket_name: str = "proyectos-usuarios"
    _visuals_bucket_name: str = "visuales" 
   

    def __new__(cls):
        if not cls._instance:
            cls._instance = super(SupabaseHandler, cls).__new__(cls)
        return cls._instance

    def _connect(self):
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_SERVICE_KEY")
            if not url or not key:
                raise ValueError("Configuración de Supabase incompleta.")
            self._client = create_client(url, key)

    def save_dataframe_to_storage(self, user_id: str, path: str, df: pd.DataFrame) -> NoReturn:
        """
        SOBRESCRIBE un DataFrame en una ruta existente en Supabase Storage.
        Detecta el formato del archivo por la extensión en la ruta.
        Lanza una excepción en caso de error.

        Args:
            user_id (str): ID del usuario solicitante.
            path (str): Ruta completa en el bucket (ej: "datasets/123/data.parquet").
            df (pd.DataFrame): DataFrame a guardar.

        Raises:
            PermissionError: Si el usuario no es propietario de la ruta.
            ValueError: Si la extensión no está soportada o si el DataFrame está vacío.
            Exception: Si ocurre un error en la conexión o subida.
        """
        self._connect()

        # 🔐 Control de permisos
        if not self.is_owner_of_path(user_id, path):
            logger.warning(f"[PERMISO DENEGADO] user_id={user_id} intentó escribir en {path}")
            raise PermissionError("El usuario no es propietario de esta ruta de archivo.")

        # 🚨 Validación de DataFrame
        if df is None or df.empty:
            logger.error(f"Intento de guardar DataFrame vacío en {path}")
            raise ValueError("El DataFrame está vacío. No se puede guardar.")

        try:
            # 📂 Detectar extensión
            file_ext = os.path.splitext(path)[-1].lower().strip('.')
            buffer_out = io.BytesIO()

            if file_ext == "parquet":
                df.to_parquet(buffer_out, index=False, engine="pyarrow", compression="snappy")
                content_type = "application/parquet"
            elif file_ext == "xlsx":
                df.to_excel(buffer_out, index=False, engine="openpyxl")
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            elif file_ext in ("csv", "txt"):
                df.to_csv(buffer_out, index=False, encoding="utf-8")
                content_type = "text/csv"
            else:
                logger.error(f"Extensión de archivo no soportada: {file_ext}")
                raise ValueError(f"Extensión no soportada: {file_ext}")

            buffer_out.seek(0)

            # 📤 Subida a Supabase Storage
            self._client.storage.from_(self._bucket_name).update(
                path=path,
                file=buffer_out.getvalue(),
                file_options={
                    "content-type": content_type,
                    "cache-control": "no-cache",
                },
            )

            logger.info(f"[OK] DataFrame guardado exitosamente en '{path}' (user_id={user_id})")

        except Exception as e:
            logger.exception(f"[ERROR] Falló la escritura de DataFrame en {path}: {e}")
            raise

    @require_user_ownership
    def load_file_as_dataframe(self, user_id: str, path: str, **kwargs) -> Optional[pd.DataFrame]:
        self._connect()
        logger.info(f"Cargando archivo '{path}' como DataFrame con URL firmada...")
        
        try:
            # PASO 1: Generar una URL firmada que es válida por un corto tiempo (ej. 60 segundos)
            # Esto es más seguro que usar URLs públicas.
            signed_url_response = self._client.storage.from_(self._bucket_name).create_signed_url(path, 60)
            base_url = signed_url_response['signedURL']

            # PASO 2: Añadir nuestro cache buster a la URL firmada.
            cache_buster = f"&t={int(time.time())}" # Usamos '&' porque las URLs firmadas ya tienen un '?'
            final_url = base_url + cache_buster

            # PASO 3: Descargar el contenido usando la URL única.
            response = requests.get(final_url)
            response.raise_for_status()  # Lanza un error si la descarga falla (ej. 404, 500)
            file_bytes = response.content

            # PASO 4: El resto de la lógica es la misma que ya tenías.
            ext = os.path.splitext(path)[-1].lower()

            if ext == ".csv":
                return pd.read_csv(io.BytesIO(file_bytes))
            elif ext in [".xlsx", ".xls"]:
                return pd.read_excel(io.BytesIO(file_bytes))
            elif ext == ".parquet":
                return pd.read_parquet(io.BytesIO(file_bytes))
            else:
                return None

        except Exception as e:
            logger.error(f"Error al cargar archivo '{path}' como DataFrame: {e}", exc_info=True)
            return None

    # --- Y APLICA LA MISMA LÓGICA A LAS OTRAS FUNCIONES DE LECTURA ---
    
    @require_user_ownership
    def load_file(self, user_id: str, path: str, **kwargs) -> Optional[bytes]:
        self._connect()
        try:
            signed_url_response = self._client.storage.from_(self._bucket_name).create_signed_url(path, 60)
            base_url = signed_url_response['signedURL']
            final_url = base_url + f"&t={int(time.time())}"

            response = requests.get(final_url)
            response.raise_for_status()
            return response.content
        except Exception as e:
            logger.error(f"❌ Error al cargar archivo desde {path}: {e}", exc_info=True)
            return None
            
    def load_file_as_csv(self, user_id: str, path: str) -> Optional[str]:
        # Esta función llama a load_file, que ya estará corregido si aplicas el cambio de arriba.
        # Pero para mayor claridad, podemos reescribirla también.
        self._connect()
        if not self.is_owner_of_path(user_id, path):
            return None
        try:
            file_bytes = self.load_file(user_id=user_id, path=path) # Llama a la versión segura
            if file_bytes is None:
                return None
            
            ext = os.path.splitext(path)[-1].lower()
            if ext == ".csv":
                return file_bytes.decode("utf-8")
            elif ext in [".xlsx", ".xls"]:
                df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl')
                return df.to_csv(index=False)
            elif ext == ".parquet":
                df = pd.read_parquet(io.BytesIO(file_bytes))
                return df.to_csv(index=False)
            else:
                return None
        except Exception as e:
            logger.error(f"❌ Error al cargar o convertir archivo desde {path}: {e}", exc_info=True)
            return None

   


    def get_db_client(self) -> Client:
        self._connect()
        return self._client

    # --- Seguridad adicional ---
    def is_owner_of_path(self, user_id: str, path: str) -> bool:
        """Verifica si el archivo pertenece al usuario."""
        return path.startswith(f"{user_id}/")

    # --- Transacción simulada ---
    def execute_transaction(self, operations: List[Callable[[], dict]]) -> dict:
        """
        Ejecuta múltiples operaciones. Si alguna falla, aborta todo.
        Ideal para operaciones en cadena sobre Supabase.
        """
        results = []
        for op in operations:
            try:
                result = op()
                if not result.get("success"):
                    logger.error(f"❌ Transacción abortada: {result}")
                    return {"success": False, "error": "Una operación falló", "details": result}
                results.append(result)
            except Exception as e:
                logger.error(f"❌ Error en transacción: {e}", exc_info=True)
                return {"success": False, "error": str(e)}
        return {"success": True, "results": results}
    
    def save_dataframe(self, df: pd.DataFrame, user_id: str, project_id: str, original_filename: str) -> Tuple[Optional[str], str]:
        """
        Guarda un DataFrame en formato .parquet en Supabase Storage, con una estructura de carpeta organizada por usuario y proyecto.

        Args:
            df (pd.DataFrame): DataFrame a guardar.
            user_id (str): ID del usuario propietario.
            project_id (str): ID del proyecto asociado.
            original_filename (str): Nombre original del archivo, usado para derivar el nombre final.

        Returns:
            Tuple[Optional[str], str]: Ruta del archivo guardado y mensaje de estado.
        """
        if df.empty:
            logger.warning("⚠️ DataFrame vacío, no se guardará.")
            return None, "El DataFrame está vacío."

        try:
            self._connect()

            # --- LÓGICA PARA LA RUTA DEL ARCHIVO ---
            base_name, _ = os.path.splitext(original_filename)
            base_name = base_name.strip().replace(" ", "_")  # limpiar nombre
            folder_name = base_name
            new_filename = f"{base_name}.parquet"
            path = f"{user_id}/{project_id}/{folder_name}/{new_filename}"

            # Convertir a parquet en memoria
            buffer = io.BytesIO()
            df.to_parquet(buffer, index=False)
            buffer.seek(0)  # Importante para asegurar el inicio del buffer

            # Subir archivo a Supabase Storage
            self._client.storage.from_(self._bucket_name).upload(
                path=path,
                file=buffer.read(),
                file_options={
                  "content-type": "application/octet-stream",
                  "cache-control": "0",  # <--- AÑADIDO
                  "upsert": "true"       # <--- AÑADIDO (muy recomendado)
            
                  }
                )

            logger.info(f"✅ DataFrame guardado exitosamente en: {path}")
            return path, "Guardado correctamente."

        except Exception as e:
            logger.exception(f"❌ Error al guardar DataFrame en {path}: {str(e)}")
            return None, f"Error al guardar el archivo: {str(e)}"


   
    # --- Storage: Archivo Genérico ---
    def save_file(self, file_bytes: bytes, user_id: str, project_id: str, folder: str, filename: str) -> Tuple[Optional[str], str]:
        self._connect()
        path = f"{user_id}/{project_id}/{folder}/{filename}"
        try:
            self._client.storage.from_(self._bucket_name).upload(
                path=path,
                file=file_bytes,
                file_options={
                  "content-type": "application/octet-stream",
                  "cache-control": "0",  # <--- AÑADIDO
                  "upsert": "true"       # <--- AÑADIDO (muy recomendado)
                   }
                )
            logger.info(f"✅ Archivo guardado en: {path}")
            return path, "Archivo guardado correctamente."
        except Exception as e:
            logger.error(
                f"❌ Error al guardar archivo en {path}: {e}", exc_info=True)
            return None, str(e)

   
        
    @staticmethod   
    def build_dataset_path(user_id: str, project_id: str, dataset_name: str) -> str:
        sanitized_name = dataset_name.replace(" ", "_").lower()
        return f"{user_id}/{project_id}/{sanitized_name}.parquet"
    
    @require_user_ownership
    def delete_file(self, user_id: str, path: str, **kwargs) -> Tuple[bool, str]:
        """
        Elimina un archivo del storage, validando que pertenezca al usuario.
        `path` debe ser la ruta completa del archivo en el bucket.
        """
        self._connect()
        logger.info(f"🗑️ Solicitud para eliminar archivo en: {path}")
        try:
            # La API de Supabase espera una lista de rutas
            response = self._client.storage.from_(self._bucket_name).remove([path])
            
            # La respuesta de remove es una lista de los archivos eliminados.
            # Si la lista no está vacía, la eliminación fue exitosa.
            if response:
                logger.info(f"✅ Archivo eliminado correctamente de Storage: {path}")
                return True, "Archivo de Storage eliminado."
            else:
                # Esto puede ocurrir si el archivo ya no existía, lo cual no es un error fatal.
                logger.warning(f"⚠️ El archivo no se encontró en Storage (posiblemente ya eliminado): {path}")
                return True, "El archivo no se encontró en Storage."

        except Exception as e:
            logger.error(
                f"❌ Error al eliminar archivo de Storage en {path}: {e}", exc_info=True)
            return False, str(e)

    # ----------------------------------------------------
    # MÉTODO: Guardar archivo visual en Storage
    # ----------------------------------------------------
    def save_visual_file(self, file_bytes: bytes, user_id: str, filename: str) -> Optional[Tuple[str, str]]:
        """
        Guarda un archivo de imagen en el bucket de 'visuals'.
        Organiza los archivos por carpetas de usuario.

        Args:
            file_bytes (bytes): Contenido del archivo.
            user_id (str): ID del usuario autenticado.
            filename (str): Nombre original del archivo.

        Returns:
            Optional[Tuple[str, str]]: (ruta en storage, URL pública).
        """
        self._connect()

        # 1. Validar nombre y extensión
        if not filename or "." not in filename:
            logger.warning(f"❌ Archivo sin extensión recibido: {filename}")
            return None, None

        ext = filename.rsplit(".", 1)[1].lower()
        if ext not in ("png", "jpg", "jpeg", "gif", "webp"):
            logger.warning(f"❌ Extensión no permitida: {ext}")
            return None, None

        # 2. Determinar content-type correcto
        content_type, _ = mimetypes.guess_type(filename)
        content_type = content_type or f"image/{'jpeg' if ext == 'jpg' else ext}"

        # 3. Generar nombre único y path
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        path = f"{user_id}/{unique_filename}"

        try:
            # 4. Subir archivo a Supabase Storage
            self._client.storage.from_(self._visuals_bucket_name).upload(
                path=path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )

            # 5. Obtener URL pública
            public_url = self._client.storage.from_(self._visuals_bucket_name).get_public_url(path)

            logger.info(f"✅ Archivo visual guardado en: {path}")
            return path, public_url

        except Exception as e:
            logger.error(f"❌ Error al guardar archivo visual en {path}: {e}", exc_info=True)
            return None, None

    # ---------------------------------------------------- 
    # MÉTODO: Insertar registro en tabla 'imagenes'
    # ----------------------------------------------------
    def insert_visual_record(self, record_data: dict) -> Optional[dict]:
        """
        Inserta un registro en la tabla 'imagenes'.

        Args:
            record_data (dict): Datos para la nueva fila.

        Returns:
            Optional[dict]: El registro recién creado.
        """
        self._connect()
        try:
            response = self.get_db_client().table("imagenes").insert(record_data).execute()
            
            # --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
            # Si la operación es exitosa, response.data contendrá una lista con el nuevo registro.
            # Si falla, la librería lanzará una excepción que será capturada por el 'except' block.
            if response.data:
                logger.info(f"✅ Registro visual insertado con ID: {response.data[0]['id']}")
                return response.data[0]  # Devolvemos el primer (y único) registro insertado
            else:
                # Esto es un caso raro, pero es bueno manejarlo.
                logger.error("❌ La inserción del registro visual no devolvió datos.")
                return None

        except Exception as e:
            # Cualquier error de la API (como un 400 Bad Request) será capturado aquí.
            logger.error(f"❌ Error al insertar registro visual: {e}", exc_info=True)
            return None


    def get_visuals_by_user(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 12,
        search_term: str | None = None,
        filter_type: str | None = None,
        color_filter: str | None = None,
    ) -> tuple[list[dict], int]:
        """
        Obtiene registros paginados de la tabla 'imagenes' para un usuario,
        con soporte de búsqueda por prompt, filtrado por tipo y por color dominante.

        Args:
            user_id (str): ID del usuario propietario de las imágenes.
            page (int): Número de página (mínimo 1).
            per_page (int): Cantidad de registros por página (mínimo 1).
            search_term (str | None): Texto a buscar en el campo 'prompt'.
            filter_type (str | None): Tipo de imagen a filtrar.
            color_filter (str | None): Color dominante a filtrar (búsqueda flexible).

        Returns:
            tuple[list[dict], int]: Lista de resultados y total de registros.
        """
        self._connect()

        # Validaciones de paginación
        if page < 1:
            logger.warning(f"⚠️ page={page} inválido, forzando a 1")
            page = 1
        if per_page < 1:
            logger.warning(f"⚠️ per_page={per_page} inválido, forzando a 12")
            per_page = 12

        start_index = (page - 1) * per_page
        end_index = start_index + per_page - 1

        try:
            query = (
                self.get_db_client()
                .table("imagenes")
                .select("*", count="exact")
                .eq("user_id", user_id)
            )

            # Búsqueda por prompt
            if search_term:
                query = query.ilike("prompt", f"%{search_term}%")

            # Filtro por tipo
            if filter_type:
                query = query.eq("type", filter_type)

            # Filtro por color dominante
            if color_filter:
                query = query.ilike("color_dominante", f"%{color_filter}%")

            # Ejecución con orden y paginación
            response = (
                query.order("created_at", desc=True)
                .range(start_index, end_index)
                .execute()
            )

            visuals = response.data or []
            total_count = response.count or 0

            return visuals, total_count

        except Exception as e:
            logger.error(
                f"❌ Error al obtener visuales para el usuario {user_id}: {e}",
                exc_info=True,
            )
            return [], 0




    # ----------------------------------------------------
    # MÉTODO: Eliminar archivo visual en Storage
    # ----------------------------------------------------
    def delete_visual_file(self, path: str) -> bool:
        """
        Elimina un archivo en el bucket 'visuales'.

        Args:
            path (str): Ruta del archivo dentro del bucket.

        Returns:
            bool: True si la operación fue exitosa, False en caso contrario.
        """
        self._connect()
        try:
            response = (
                self.get_db_client()
                .storage.from_(self._visuals_bucket_name)
                .remove([path])
            )
            if response and isinstance(response, dict) and response.get("error"):
                logger.error(f"❌ Error de Supabase al eliminar archivo {path}: {response['error']}")
                return False

            logger.info(f"🗑️ Archivo eliminado de Storage: {path}")
            return True

        except Exception as e:
            logger.error(f"❌ Error inesperado al eliminar archivo {path}: {e}", exc_info=True)
            return False




    def get_visuals_by_dataset(self, dataset_id: str, user_id: str) -> list[dict]:
        """
        Obtiene TODOS los registros de imágenes de un dataset, incluyendo sus etiquetas manuales
        si existen. Devuelve todas las imágenes, con o sin etiquetas.
        """
        self._connect()
        try:
            if not dataset_id or not user_id:
                logger.warning("⚠️ dataset_id o user_id no válidos en get_visuals_by_dataset.")
                return []

            # La consulta trae todas las imágenes e intenta unir las etiquetas
            response = (
                self._client.table("imagenes")
                .select("*, tags!image_tags(name)")
                .eq("user_id", user_id)
                .eq("dataset_id", dataset_id)
                .execute()
            )

            if not response.data:
                logger.warning(f"No se encontraron imágenes para el dataset {dataset_id}")
                return []

            # Lista final que contendrá TODOS los registros
            all_data = []
            for record in response.data:
                manual_tags_list = record.get("tags", [])

                # Formatea las etiquetas si existen
                if manual_tags_list and isinstance(manual_tags_list, list):
                    record["tags"] = [tag.get("name") for tag in manual_tags_list if tag.get("name")]
                else:
                    # Si no, asegura que el campo 'tags' sea una lista vacía
                    record["tags"] = []

                # Añade el registro a la lista final, sin importar si tenía etiquetas o no
                all_data.append(record)

            logger.info(
                f"Se encontraron {len(all_data)} imágenes en total para el dataset {dataset_id}"
            )
            return all_data

        except Exception as e:
            logger.error(
                f"❌ Error al obtener visuales y etiquetas para dataset_id={dataset_id}: {e}",
                exc_info=True,
            )
            return []




    def download_visual_file(self, path: str) -> Optional[bytes]:
        """
        Descarga los bytes de un archivo desde el bucket de 'visuales'.

        Args:
            path (str): Ruta relativa dentro del bucket 'visuales'.

        Returns:
            Optional[bytes]: El contenido del archivo en bytes, o None si falla.
        """
        # --- Validación inicial ---
        if not path or not isinstance(path, str):
            logger.warning("⚠️ Se intentó descargar un archivo visual con una ruta inválida o vacía.")
            return None

        self._connect()

        try:
            logger.debug(f"📥 Intentando descargar archivo visual desde: {path}")
            
            file_bytes = self._client.storage.from_(self._visuals_bucket_name).download(path)
            
            if not file_bytes:
                logger.warning(f"⚠️ El archivo en {path} no fue encontrado o está vacío en el bucket '{self._visuals_bucket_name}'.")
                return None

            logger.info(f"✅ Archivo descargado exitosamente desde {path} (bucket: {self._visuals_bucket_name})")
            return file_bytes

        except Exception as e:
            logger.error(
                f"❌ Error al descargar archivo visual desde {path}: {e}",
                exc_info=True
            )
            return None


    def get_tagged_images_for_project(self, user_id: str, project_id: str) -> List[Dict[str, Any]]:
        """
        Obtiene todas las imágenes de un proyecto con sus etiquetas.
        
        Args:
            user_id (str): ID del usuario dueño del proyecto
            project_id (str): ID del proyecto

        Returns:
            List[Dict[str, Any]]: Cada dict tiene 'id', 'storage_path' y 'tags' (lista de strings)
        """
        self._connect()
        try:
            # --- Consulta a Supabase con JOINs entre imagenes, image_tags y tags ---
            response = self._client.table("imagenes").select(
                "id, storage_path, tags!inner(name)"
            ).eq("user_id", user_id).eq("project_id", project_id).execute()

            if not response.data:
                logger.warning(f"No se encontraron imágenes etiquetadas para el proyecto {project_id}")
                return []

            # --- Formatear datos: aplanar etiquetas ---
            formatted_data = []
            for record in response.data:
                tags_list = record.get('tags', [])
                if tags_list:
                    record['tags'] = [tag['name'] for tag in tags_list]
                    formatted_data.append(record)
                else:
                    logger.info(f"Imagen {record['id']} omitida: no tiene etiquetas asignadas.")

            logger.info(f"{len(formatted_data)} imágenes con etiquetas obtenidas para el proyecto {project_id}")
            return formatted_data

        except Exception as e:
            logger.error(f"Error al obtener imágenes etiquetadas para el proyecto {project_id}: {e}", exc_info=True)
            return []


    def create_signed_urls_for_visuals(self, image_records: list, expiration_sec: int = 3600) -> list:
        """
        Función SEGURA y AISLADA.
        Recibe una lista de registros de imágenes y añade una clave 'signed_url' a cada uno.
        No modifica ninguna otra lógica existente.

        Args:
            image_records (list): Lista de diccionarios que representan registros de imágenes.
            expiration_sec (int): Tiempo en segundos para la validez del signed URL. Default 1 hora.

        Returns:
            list: Misma lista de registros, cada uno con clave 'signed_url' añadida.
        """
        if not image_records or not isinstance(image_records, list):
            return []

        client = self.get_db_client()
        if not client:
            logger.error("❌ Supabase client no inicializado. No se pueden generar signed URLs.")
            for record in image_records:
                record['signed_url'] = None
            return image_records

        for record in image_records:
            path = record.get("storage_path")
            if not path:
                record['signed_url'] = None
                continue

            try:
                signed_url_response = client.storage.from_(self._visuals_bucket_name).create_signed_url(path, expiration_sec)
                signed_url = signed_url_response.get("signedURL") or signed_url_response.get("signed_url")  # por compatibilidad
                record['signed_url'] = signed_url
            except Exception as e:
                logger.error(f"❌ Error generando signed URL para '{path}': {e}", exc_info=True)
                record['signed_url'] = None

        return image_records

    # ==========================================================
    # --- ¡AÑADE ESTE NUEVO MÉTODO A TU CLASE! ---
    # ==========================================================
    def add_tag_to_image(self, image_id: str, tag_name: str, user_id: str):
        """
        Añade una etiqueta a una imagen. Crea la etiqueta general si no existe para el usuario.
        Esta función encapsula la lógica para ser reutilizada por diferentes endpoints.

        Args:
            image_id (str): El ID de la imagen a etiquetar.
            tag_name (str): El nombre de la etiqueta a aplicar.
            user_id (str): El ID del usuario propietario.
        """
        self._connect()
        db = self.get_db_client()

        try:
            # 1. Buscar si la etiqueta YA EXISTE para este usuario para reutilizar su ID
            tag_resp = db.table("tags").select("id").eq("name", tag_name).eq("user_id", user_id).execute()

            tag_id = None
            if tag_resp.data:
                # Si la etiqueta ya existe, tomamos su ID
                tag_id = tag_resp.data[0]['id']
            else:
                # Si no existe, la creamos en la tabla 'tags'
                tag_id = str(uuid.uuid4())
                db.table("tags").insert({
                    "id": tag_id,
                    "name": tag_name,
                    "user_id": user_id
                }).execute()
                logger.info(f"Nueva etiqueta '{tag_name}' creada para el usuario {user_id}")

            # 2. Insertar la relación en la tabla de unión 'image_tags'
            #    Usamos upsert para evitar errores si la relación ya existe.
            db.table("image_tags").upsert({
                "image_id": image_id,
                "tag_id": tag_id
            }).execute()
            
            logger.info(f"Etiqueta '{tag_name}' (ID: {tag_id}) aplicada a la imagen {image_id}")
            return True

        except Exception as e:
            logger.error(f"Error en SupabaseHandler al añadir tag '{tag_name}' a imagen {image_id}: {e}", exc_info=True)


    def get_visuals_by_user_meme(
        self,
        user_id: str,
        page: int = 1,
        per_page: int = 12,
        search_term: str | None = None,
        filter_type: str | None = None,
        color_filter: str | None = None,
    ) -> tuple[list[dict], int]:
        """
        Obtiene registros paginados de la tabla 'imagenes' para un usuario,
        con soporte de búsqueda, filtros y generación de URLs firmadas seguras.

        Args:
            user_id (str): ID del usuario propietario de las imágenes.
            page (int): Número de página (mínimo 1).
            per_page (int): Cantidad de registros por página (mínimo 1).
            search_term (str | None): Texto a buscar en el campo 'prompt'.
            filter_type (str | None): Tipo de imagen a filtrar.
            color_filter (str | None): Color dominante a filtrar.

        Returns:
            tuple[list[dict], int]: Lista de resultados (con URLs firmadas como `public_url`) y total de registros.
        """
        self._connect()

        # --- Validaciones de paginación ---
        if page < 1:
            logger.warning(f"⚠️ page={page} inválido, forzando a 1")
            page = 1
        if per_page < 1:
            logger.warning(f"⚠️ per_page={per_page} inválido, forzando a 12")
            per_page = 12

        start_index = (page - 1) * per_page
        end_index = start_index + per_page - 1

        try:
            query = (
                self.get_db_client()
                .table("imagenes")
                .select("*", count="exact")
                .eq("user_id", user_id)
            )

            # --- Filtros opcionales ---
            if search_term:
                query = query.ilike("prompt", f"%{search_term}%")

            if filter_type:
                query = query.eq("type", filter_type)

            if color_filter:
                query = query.ilike("color_dominante", f"%{color_filter}%")

            # --- Ejecución con orden y paginación ---
            response = (
                query.order("created_at", desc=True)
                .range(start_index, end_index)
                .execute()
            )

            visuals = response.data or []
            total_count = response.count or 0

            # --- Agregar URLs firmadas ---
            if visuals:
                visuals = self.create_signed_urls_for_visuals(visuals)

                # Renombrar `signed_url` a `public_url` para compatibilidad con el frontend
                for visual in visuals:
                    visual["public_url"] = visual.get("signed_url")

            return visuals, total_count

        except Exception as e:
            logger.error(
                f"❌ Error al obtener visuales para el usuario {user_id}: {e}",
                exc_info=True,
            )
            return [], 0


# Instancia global única
supabase_handler = SupabaseHandler()
