# transformation_service.py

from TransformationService import TransformationService
import logging
import pandas as pd
from typing import Dict, Any, List
from utils.supabase_handler import supabase_handler  # Para cargar y guardar DataFrames


logger = logging.getLogger(__name__)


class TransformationService:
    def __init__(self):
        self.storage_handler = supabase_handler

    def apply_transformation(self, user_id: str, project_id: str, transformation_details: Dict[str, Any]) -> Dict:
        """
        Punto de entrada principal para aplicar cualquier transformación.
        Esta función actúa como un 'router' que llama a la función específica.
        """
        try:
            # 1. Cargar el DataFrame más reciente del proyecto
            # Por ahora, cargamos una versión 'cleaned'.
            df = self.storage_handler.load_dataframe(
                user_id, project_id, "cleaned_v1")
            if df is None:
                return {"success": False, "error": "No se pudo cargar el DataFrame del proyecto."}

            operation = transformation_details.get("operation")

            # 2. Enrutar a la función de transformación correcta
            if operation == "delete_columns":
                new_df = self._delete_columns(
                    df, transformation_details.get("columns", []))
            elif operation == "create_from_math":
                new_df = self._create_from_math(df, transformation_details)
            # ... elif para otras operaciones (rellenar nulos, etc.) ...
            else:
                return {"success": False, "error": f"Operación '{operation}' no reconocida."}

            # 3. Guardar el nuevo DataFrame transformado
            # Aquí podrías tener una lógica para versionado, ej: "cleaned_v2"
            path, msg = self.storage_handler.save_dataframe(
                new_df, user_id, project_id, "cleaned_v2")
            if not path:
                return {"success": False, "error": f"No se pudo guardar el DataFrame transformado: {msg}"}

            return {"success": True, "message": "Transformación aplicada con éxito.", "new_version_path": path}

        except Exception as e:
            logger.error(f"Error en apply_transformation: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

    # --- Métodos 'privados' para cada tipo de transformación ---

    def _delete_columns(self, df: pd.DataFrame, columns_to_delete: List[str]) -> pd.DataFrame:
        """Elimina las columnas especificadas."""
        if not columns_to_delete:
            raise ValueError("No se especificaron columnas para eliminar.")

        existing_columns = [
            col for col in columns_to_delete if col in df.columns]
        logger.info(f"Eliminando columnas: {existing_columns}")
        return df.drop(columns=existing_columns)

    def _create_from_math(self, df: pd.DataFrame, details: Dict[str, Any]) -> pd.DataFrame:
        """Crea una nueva columna a partir de una operación matemática."""
        col_a = details.get("column_a")
        col_b = details.get("column_b")  # O podría ser un valor fijo
        operator = details.get("operator")
        new_col_name = details.get("new_column_name")

        if not all([col_a, operator, new_col_name]):
            raise ValueError("Faltan parámetros para la operación matemática.")

        # Aquí iría la lógica para manejar diferentes operadores (+, -, *, /)
        # y si col_b es otra columna o un valor numérico.
        logger.info(
            f"Creando columna '{new_col_name}' con la operación: {col_a} {operator} {col_b}")
        if operator == '*':
            df[new_col_name] = df[col_a] * df[col_b]
        # ... más lógica de operadores ...

        return df

  