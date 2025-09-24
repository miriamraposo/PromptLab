import logging
import pandas as pd
from typing import List, Dict, Optional, Any
from utils.supabase_handler import supabase_handler

logger = logging.getLogger(__name__)

class HistoryService:
    """
    Servicio para gestionar el historial de pruebas de prompts en la base de datos.
    """
    def __init__(self):
        self.db_client = supabase_handler.get_db_client()
        self.table_name = 'historial_pruebas'

        

    def get_history_by_user(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not user_id:
            return {"success": False, "error": "User ID no proporcionado."}

        try:
            query = self.db_client.table(self.table_name).select("*", count="exact").eq("user_id", user_id)

            if filters:
                for column, value in filters.items():
                    if value is not None:
                        if column in ["fecha_inicio", "creado_en_gte"]:
                            query = query.gte("creado_en", value)
                        elif column in ["fecha_fin", "creado_en_lte"]:
                            query = query.lte("creado_en", value)
                        else:
                            query = query.eq(column, value)

            query = query.order("creado_en", desc=True)

            start_index = (page - 1) * limit
            end_index = start_index + limit - 1
            query = query.range(start_index, end_index)

            response = query.execute()

            return {
                "success": True,
                "data": response.data or [],
                "page": page,
                "limit": limit,
                "total": response.count
            }

        except Exception as e:
            logger.exception(f"Error en get_history_by_user para el usuario {user_id}")
            return {"success": False, "error": f"No se pudo recuperar el historial: {e}"}

    def add_entry(self, entry_data: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(entry_data, dict) or not entry_data:
            return {"success": False, "error": "Los datos proporcionados para la entrada son inválidos."}

        try:
            response = self.db_client.table(self.table_name).insert(entry_data).execute()
            if not response.data:
                error_msg = getattr(response, 'error', 'No se pudo insertar la entrada.')
                raise Exception(error_msg)

            logger.info(f"✅ Entrada de historial añadida con ID: {response.data[0]['id']}")
            return {"success": True, "data": response.data[0]}

        except Exception as e:
            logger.exception("Error en add_entry")
            return {"success": False, "error": f"No se pudo añadir la entrada al historial: {e}"}

    def rate_entry(self, entry_id: int, rating: str, user_id: str) -> Dict:
        valid_ratings = ["bueno", "malo", "regular"]
        if rating not in valid_ratings:
            return {"success": False, "error": "Calificación no válida."}
        if not entry_id or not user_id:
            return {"success": False, "error": "Faltan parámetros para calificar la entrada."}
        try:
            res = self.db_client.table(self.table_name) \
                .update({"calificacion": rating}) \
                .eq("id", entry_id) \
                .eq("user_id", user_id) \
                .execute()
            return {"success": True, "message": "Entrada calificada correctamente."}
        except Exception as e:
            logger.error(f"Error en rate_entry: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def analyze_performance(self, user_id: str) -> Dict:
        result = self.get_history_by_user(user_id)
        if not result["success"] or not result["data"]:
            return {"success": False, "error": "No hay historial para analizar."}

        df = pd.DataFrame(result["data"])

        try:
            resumen = {
                "total_pruebas": len(df),
                "duracion_promedio_seg": round(df["duracion_seg"].mean(), 2) if "duracion_seg" in df else None,
                "modelos_utilizados": df["nombre_del_modelo"].value_counts().to_dict() if "nombre_del_modelo" in df else {}
            }
            return {"success": True, "data": resumen}
        except Exception as e:
            logger.error(f"Error en analyze_performance: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def set_sharing_status(self, entry_id: int, share: bool, user_id: str) -> Dict:
        if not entry_id or not user_id:
            return {"success": False, "error": "Faltan parámetros."}
        try:
            response = self.db_client.table(self.table_name) \
                .update({'compartir_anonimo': share}) \
                .eq('id', entry_id) \
                .eq('user_id', user_id) \
                .execute()
            if response.data:
                return {"success": True, "message": "¡Gracias por contribuir!"}
            return {"success": False, "error": "No tienes permiso para modificar esta entrada."}
        except Exception as e:
            logger.error(f"Error en set_sharing_status: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    def delete_entry(self, entry_id: int, user_id: str) -> Dict:
        try:
            response = self.db_client.table(self.table_name) \
                .delete() \
                .eq('id', entry_id) \
                .eq('user_id', user_id) \
                .execute()

            if not response.data:
                return {"success": False, "error": "No se encontró la entrada o no tienes permiso para eliminarla."}

            return {"success": True, "message": "Entrada eliminada."}

        except Exception as e:
            logger.error(f"Error al eliminar entrada: {e}", exc_info=True)
            return {"success": False, "error": str(e)}


    def update_entry(self, entry_id: int, user_id: str, update_data: Dict[str, Any]) -> Dict:
        """Actualiza campos de una entrada de historial (ej: título personalizado)."""
        if not entry_id or not user_id or not update_data:
            return {"success": False, "error": "Faltan parámetros para la actualización."}
        
        try:
            response = self.db_client.table(self.table_name) \
                .update(update_data) \
                .eq("id", entry_id) \
                .eq("user_id", user_id) \
                .execute()

            if not response.data:
                return {"success": False, "error": "No se encontró la entrada o no tienes permiso."}

            return {"success": True, "data": response.data[0]}
        except Exception as e:
            logger.error(f"Error en update_entry: {e}", exc_info=True)
            return {"success": False, "error": "Error interno en la actualización."}


