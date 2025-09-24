# services/project_service.py

from utils import supabase_handler  # Ajustar path según proyecto
from services import data_handler    # Ajustar path según proyecto
from typing import TypedDict, Literal, Any, Optional, Union, Dict
import pandas as pd
import json
import logging
import os

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

import os
import logging
import json
from typing import TypedDict, Literal, Any, Optional, Dict

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Configuración a través de variables de entorno
MAX_PREVIEW_ROWS = int(os.getenv("MAX_PREVIEW_ROWS", 500))
PROJECTS_TABLE = os.getenv("PROJECTS_TABLE", "projects")

class ServiceResponse(TypedDict, total=False):
    success: Literal[True, False]
    data: Any
    error: Optional[str]

def make_response(success: bool, data: Any = None, error: Optional[str] = None) -> ServiceResponse:
    """
    Formatea una respuesta estándar para la API.
    """
    return {"success": success, "data": data, "error": error}

class ProjectService:
    def __init__(self, db_client=None, storage_handler=None):
        # Se asume que supabase_handler es un módulo global importado que proporciona acceso a DB y storage
        self.db_client = db_client or supabase_handler.get_db_client()
        self.storage_handler = storage_handler or supabase_handler
        self.projects_table = PROJECTS_TABLE

    def _validate_project_name(self, name: str) -> None:
        if not name or not name.strip():
            raise ValueError("El nombre del proyecto no puede estar vacío.")
        if len(name) > 100:
            raise ValueError("El nombre del proyecto es demasiado largo.")

    def _verify_ownership(self, project_id: str, user_id: str) -> bool:
        """
        Verifica que el proyecto pertenece al usuario.
        """
        try:
            res = (
                self.db_client.table(self.projects_table)
                .select("project_id")
                .eq("project_id", project_id)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            return bool(res.data)
        except Exception as e:
            logger.error(f"Error en _verify_ownership: {e}", exc_info=True)
            return False

    def create_project(self, user_id: str, project_name: str, project_type: str) -> ServiceResponse:
        try:
            self._validate_project_name(project_name)
            project_entry = {
                "user_id": user_id,
                "project_name": project_name,
                "project_type": project_type,
                "status": "nuevo",
            }
            res = self.db_client.table(self.projects_table).insert(project_entry).execute()
            if not res.data:
                raise Exception("No se pudo crear el proyecto.")
            return make_response(True, res.data[0])
        except ValueError as ve:
            logger.warning(f"Validación fallida en create_project: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en create_project: {e}", exc_info=True)
            return make_response(False, error="Error interno al crear proyecto.")

    def get_projects_by_user(self, user_id: str) -> ServiceResponse:
        """
        Obtiene los proyectos de un usuario y los formatea para el frontend
        cumpliendo el contrato de datos (camelCase).
        """
        try:
            if not user_id:
                raise ValueError("user_id es obligatorio.")
            
            # 1. Pedimos TODOS los campos que necesita el frontend
            res = (
                self.db_client.table(self.projects_table)
                .select("*")  # Con '*' obtenemos todos los campos, incluyendo los paths de archivos
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )

            # 2. Transformamos la respuesta al formato camelCase que espera React
            projects_camel_case = [
                {
                    "id": p.get("project_id"),
                    "userId": p.get("user_id"),
                    "projectName": p.get("project_name"),
                    "projectType": p.get("project_type"),
                    "status": p.get("status"),
                    "createdAt": p.get("created_at"),
                    "originalFilePath": p.get("original_file_path"),
                    "cleanedFilePath": p.get("cleaned_file_path"),
                }
                for p in res.data
            ]
            
            # 3. Usamos tu función `make_response` con los datos ya transformados
            return make_response(True, projects_camel_case)

        except ValueError as ve:
            logger.warning(f"Validación fallida en get_projects_by_user: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en get_projects_by_user: {e}", exc_info=True)
            return make_response(False, error="Error interno al obtener proyectos.")

    def get_project_by_id(self, project_id: str, user_id: str) -> ServiceResponse:
        try:
            if not project_id or not user_id:
                raise ValueError("project_id y user_id son obligatorios.")
            res = (
                self.db_client.table(self.projects_table)
               .select("*")
               .eq("project_id", project_id)
               .eq("user_id", user_id)
               .single() # single() es perfecto aquí
               .execute()
            )
            if not res.data:
                return make_response(False, error="Proyecto no encontrado o no autorizado.")
            
            p = res.data  # p es ahora el diccionario del proyecto
            project_camel_case = {
              "id": p.get("project_id"),
              "userId": p.get("user_id"),
              "projectName": p.get("project_name"),
              "status": p.get("status"),
              "createdAt": p.get("created_at"),
              "originalFilePath": p.get("original_file_path"),
              "cleanedFilePath": p.get("cleaned_file_path"),
        }
            return make_response(True, project_camel_case)
            
        except ValueError as ve:
            logger.warning(f"Validación fallida en get_project_by_id: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en get_project_by_id: {e}", exc_info=True)
            return make_response(False, error="Error interno al obtener proyecto.")

    def rename_project(self, project_id: str, user_id: str, new_name: str) -> ServiceResponse:
        try:
            self._validate_project_name(new_name)

            if not self._verify_ownership(project_id, user_id):
                return make_response(False, error="No autorizado para renombrar este proyecto.")

            existing = (
                self.db_client.table(self.projects_table)
                .select("project_id")
                .eq("user_id", user_id)
                .eq("project_name", new_name)
                .execute()
            )
            if existing.data:
                return make_response(False, error="Ya existe un proyecto con ese nombre.")

            res = (
                self.db_client.table(self.projects_table)
                .update({"project_name": new_name})
                .eq("project_id", project_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not res.data:
                raise Exception("No se pudo actualizar el nombre del proyecto.")
            return make_response(True, res.data[0])
        except ValueError as ve:
            logger.warning(f"Validación fallida en rename_project: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en rename_project: {e}", exc_info=True)
            return make_response(False, error="Error interno al renombrar proyecto.")

    def delete_project(self, project_id: str, user_id: str, dataset_service=None) -> ServiceResponse:
        try:
            if not project_id or not user_id:
                raise ValueError("project_id y user_id son obligatorios.")

            if not self._verify_ownership(project_id, user_id):
                return make_response(False, error="No autorizado para eliminar este proyecto.")

            if dataset_service:
                datasets_res = dataset_service.list_datasets(project_id, user_id)
                if datasets_res.get("success"):
                    for ds in datasets_res["data"]:
                        ds_id = ds.get("dataset_id")
                        if ds_id:
                            ds_delete_res = dataset_service.delete_dataset(ds_id, user_id)
                            if not ds_delete_res.get("success"):
                                logger.warning(f"No se pudo eliminar dataset {ds_id}: {ds_delete_res.get('error')}")

            delete_res = (
                self.db_client.table(self.projects_table)
                .delete()
                .eq("project_id", project_id)
                .eq("user_id", user_id)
                .execute()
            )
            return make_response(True, delete_res.data)
        except ValueError as ve:
            logger.warning(f"Validación fallida en delete_project: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en delete_project: {e}", exc_info=True)
            return make_response(False, error="Error interno al eliminar proyecto.")

    def get_project_data_preview(
        self,
        project_id: str,
        user_id: str,
        version_name: str = "original",
        n_rows: int = 100,
    ) -> ServiceResponse:
        try:
            if not (isinstance(n_rows, int) and 1 <= n_rows <= MAX_PREVIEW_ROWS):
                raise ValueError(f"n_rows debe ser entero positivo y <= {MAX_PREVIEW_ROWS}")

            validation = self.get_project_by_id(project_id, user_id)
            if not validation["success"]:
                return make_response(False, error="Proyecto no encontrado o no autorizado.")

            df = self.storage_handler.load_dataframe(user_id, project_id, version_name)
            if df is None:
                return make_response(False, error=f"No se pudo cargar la versión '{version_name}'.")

            preview_data = df.head(n_rows).to_json(orient="records")
            metadata = {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "column_names": list(df.columns),
            }

            response_data = {"rows": json.loads(preview_data), "metadata": metadata}
            return make_response(True, response_data)
        except ValueError as ve:
            logger.warning(f"Validación fallida en get_project_data_preview: {ve}")
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en get_project_data_preview: {e}", exc_info=True)
            return make_response(False, error="Error interno al obtener preview.")

    def load_text(self, user_id: str, project_id: str, file_name: str) -> ServiceResponse:
        try:
            path = f"{user_id}/{project_id}/{file_name}"
            response = self.storage_handler.get_file(path)
            if response is None:
                return make_response(False, error="Archivo no encontrado")
            return make_response(True, response.decode("utf-8"))
        except Exception as e:
            logger.error(f"Error en load_text: {e}", exc_info=True)
            return make_response(False, error="Error al cargar el archivo de texto")
        
    def find_project_by_name_for_user(self, project_name: str, user_id: str) -> ServiceResponse:
        """
        Busca un proyecto por su nombre exacto para un usuario específico.
        """
        try:
            if not project_name or not user_id:
                raise ValueError("project_name y user_id son obligatorios.")

            res = (
                self.db_client.table(self.projects_table)
                .select("project_id, project_name")  # Pedimos solo lo que necesitamos
                .eq("project_name", project_name)
                .eq("user_id", user_id)
                .single()
                .execute()
            )
            
            if not res.data:
                return make_response(False, error="Proyecto no encontrado para este usuario.")

            return make_response(True, res.data)

        except ValueError as ve:
            return make_response(False, error=str(ve))
        except Exception as e:
            logger.error(f"Error en find_project_by_name_for_user: {e}", exc_info=True)
            return make_response(False, error="Error interno al buscar proyecto por nombre.")

