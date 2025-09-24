
# NUEVO ARCHIVO: services/data_processing_service.py

import pandas as pd
import logging
from typing import Tuple, List, Dict, Any, Callable
import numpy as np
from typing import Dict, Any
import math

# En asistente_de_limpieza_orquestador.py

from . import load_data as ld
from . import clean_numericas as cn
from . import clean_text as ct

logger = logging.getLogger(__name__)

# ==============================================================================
# 1. FUNCIONES DE ANÁLISIS (READ-ONLY)
#    Estas funciones son llamadas por los endpoints que pueblan la UI
#    con información, gráficos y estadísticas. No modifican el DataFrame.
# ==============================================================================


def clean_nan_from_dict(data):
    """
    Reemplaza NaN/np.nan por None de forma recursiva en dicts, listas y tuplas.
    """
    if isinstance(data, dict):
        return {k: clean_nan_from_dict(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_nan_from_dict(v) for v in data]
    elif isinstance(data, tuple):
        return tuple(clean_nan_from_dict(v) for v in data)
    elif isinstance(data, float):
        return None if math.isnan(data) else data
    elif isinstance(data, np.generic) and np.isnan(data):
        return None
    else:
        return data


def get_preliminary_analysis(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Realiza un análisis inicial rápido del DataFrame.
    Llamado por el endpoint de carga de archivo.
    Reemplaza valores nulo-like antes del análisis.
    """
    try:
        null_like_values = ['nan', 'na', 'n/a', 'null', '', '--', 'undefined']
        null_regex = r'^\s*(' + '|'.join(null_like_values) + r')\s*$'

        df_procesado = df.copy()
        df_procesado.replace(to_replace=null_regex, value=np.nan, regex=True, inplace=True)

        _, n_duplicados, pct_duplicados = ld.detectar_duplicados(df_procesado)

        nan_summary = ld.nan_por_columna(df_procesado)
        total_nulos = int(nan_summary['cantidad_nan'].sum())
        total_elementos = df_procesado.size
        porcentaje_total_nulos = round((total_nulos / total_elementos) * 100 if total_elementos > 0 else 0, 2)

        by_column_list = nan_summary[nan_summary['cantidad_nan'] > 0].to_dict('records')
        cleaned_by_column_list = [clean_nan_from_dict(record) for record in by_column_list]

        analysis = {
            "project_summary": {
                "rows": df_procesado.shape[0],
                "columns": df_procesado.shape[1],
            },
            "duplicates_summary": {
                "count": n_duplicados,
                "percentage": round(pct_duplicados, 2)
            },
            "nulls_summary": {
                "total_count": total_nulos,
                "total_percentage": porcentaje_total_nulos,
                "by_column": cleaned_by_column_list
            },
            "columns_info": [
                {"name": col, "type": str(df_procesado[col].dtype)} for col in df_procesado.columns
            ]
        }

        # Limpiar NaNs en todo el análisis antes de devolver
        analysis = clean_nan_from_dict(analysis)

        logger.info("Análisis preliminar generado exitosamente.")
        return {"success": True, "data": analysis}

    except Exception as e:
        logger.error("Error crítico al generar análisis preliminar: %s", str(e))
        return {"success": False, "error": "Error al generar análisis preliminar."}
    
def get_column_details(df: pd.DataFrame, column_name: str) -> Dict[str, Any]:
    """
    Analiza una columna del DataFrame, detectando el tipo real (numérico o categórico)
    y devolviendo estadísticas relevantes, incluyendo outliers y problemas comunes de calidad.
    """
    if df.empty:
        return {"success": False, "error": "El DataFrame está vacío.", "error_code": "DATAFRAME_EMPTY"}

    if not isinstance(column_name, str):
        return {"success": False, "error": "El nombre de la columna debe ser una cadena de texto.", "error_code": "INVALID_COLUMN_NAME"}

    if column_name not in df.columns:
        return {"success": False, "error": f"La columna '{column_name}' no existe.", "error_code": "COLUMN_NOT_FOUND"}

    try:
        null_like_values = ['nan', 'na', 'n/a', 'null', '', '--', 'undefined']
        null_regex = r'^\s*(' + '|'.join(null_like_values) + r')\s*$'

        df_procesado = df.copy()
        df_procesado.replace(to_replace=null_regex, value=np.nan, regex=True, inplace=True)

        if df_procesado[column_name].isnull().all():
            return {
                "success": False,
                "error": f"La columna '{column_name}' contiene solo valores nulos.",
                "error_code": "COLUMN_EMPTY"
            }

        col_data = df_procesado[column_name]
        null_count = int(col_data.isnull().sum())
        logger.info(f"[DEBUG] Columna '{column_name}' tiene {null_count} valores nulos después de limpieza.")

        details = {
            "column_name": column_name,
            "original_type": str(df[column_name].dtype),
            "null_count": null_count
        }

        if pd.api.types.is_numeric_dtype(col_data):
            es_numerica = True
            details["detected_type"] = "numeric"
        else:
            es_numerica = False
            details["detected_type"] = "categorical"

        if es_numerica:
            try:
                stats_series, _ = cn.obtener_estadisticas_descriptivas(df_procesado, column_name)
                outliers_df, _, _, _ = cn.detectar_outliers_iqr(df_procesado, column_name)

                stats_dict = stats_series.round(2).to_dict() if stats_series is not None else {}
                clean_stats_dict = {k: None if pd.isna(v) else v for k, v in stats_dict.items()}

                details.update({
                    "analysis_type": "numeric",
                    "statistics": clean_stats_dict,
                    "outliers": {
                        "count": len(outliers_df),
                        "percentage": round((len(outliers_df) / len(df_procesado)) * 100, 2)
                        if len(df_procesado) > 0 else 0
                    }
                })

            except Exception as e:
                logger.warning(f"[{column_name}] Error en análisis numérico: {e}", exc_info=True)
                details.update({
                    "analysis_type": "numeric",
                    "statistics": {},
                    "outliers": {}
                })

        else:
            try:
                col_data = df_procesado[column_name]

                stats_df = pd.DataFrame([{
                    "count": int(col_data.count()),
                    "unique": int(col_data.nunique()),
                    "top": col_data.mode().iloc[0] if not col_data.mode().empty else None,
                    "freq": int(col_data.value_counts().iloc[0]) if not col_data.value_counts().empty else None
                }])

                stats_dict_cat = stats_df.iloc[0].to_dict()
                clean_stats_dict_cat = {k: None if pd.isna(v) else v for k, v in stats_dict_cat.items()}

                value_counts_df, _ = ld.valores_unicos_y_conteo(df_procesado, column_name)

                columna_limpia = df_procesado[column_name].apply(ct._limpiar_texto_individual)
                unicos_original = df_procesado[column_name].nunique()
                unicos_limpios = columna_limpia.nunique()
                problemas_formato = unicos_original > unicos_limpios

                df_valores_raros = ct.valores_poco_frecuentes(df_procesado, column_name, umbral=0.01)
                conteo_valores_raros = len(df_valores_raros)

                details.update({
                    "analysis_type": "categorical",
                    "statistics": clean_stats_dict_cat,
                    "unique_values": value_counts_df.to_dict("records") if value_counts_df is not None else [],
                    "total_unique_count": len(value_counts_df) if value_counts_df is not None else 0,
                    "advanced_analysis": {
                        "has_format_issues": problemas_formato,
                        "format_issues_details": (
                            f"Se reducirían de {unicos_original} a {unicos_limpios} valores únicos al limpiar formato."
                            if problemas_formato else "No se detectaron problemas obvios de formato."
                        ),
                        "rare_values_count": conteo_valores_raros,
                        "rare_values_percentage": round(
                            (conteo_valores_raros / len(value_counts_df)) * 100, 2
                        ) if len(value_counts_df) > 0 else 0
                    }
                })

            except Exception as e:
                logger.warning(f"[{column_name}] Error en análisis categórico: {e}", exc_info=True)
                details.update({
                    "analysis_type": "categorical",
                    "statistics": {},
                    "unique_values": [],
                    "total_unique_count": 0,
                    "advanced_analysis": {}
                })

        details_cleaned = clean_nan_from_dict(details)

        return {
            "success": True,
            "data": details_cleaned
        }

    except Exception as e:
        logger.error(f"Error crítico al analizar columna '{column_name}': {e}", exc_info=True)
        return {
            "success": False,
            "error": f"Error interno al analizar la columna '{column_name}'.",
            "error_code": "INTERNAL_ERROR"
        }



# --- Función para manejar outliers (reemplazar o eliminar) ---
def _handle_replace_outliers(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Manejador mejorado para tratar outliers.
    Siempre devuelve (DataFrame, mensaje).

    Métodos soportados:
    - 'capping': Reemplaza con los límites del IQR.
    - 'media', 'mediana', 'moda': Reemplaza outliers con ese estadístico.
    - 'manual': Reemplaza outliers con un valor específico.
    - 'eliminar': Elimina las filas que contienen outliers.
    """
    column_name = params.get("columna")
    method = params.get("metodo")

    # --- Validaciones iniciales ---
    if not column_name or not method:
        msg = "❌ Error: Faltan los parámetros 'columna' o 'metodo'."
        logger.error(msg)
        return df, msg

    if column_name not in df.columns:
        msg = f"❌ Error: La columna '{column_name}' no existe en el DataFrame."
        logger.error(msg)
        return df, msg

    if not pd.api.types.is_numeric_dtype(df[column_name]):
        msg = f"❌ Error: La columna '{column_name}' no es numérica."
        logger.error(msg)
        return df, msg

    # --- Detección de outliers ---
    df_outliers, _, lower_bound, upper_bound = cn.detectar_outliers_iqr(df, column_name)

    # --- Caso sin outliers ---
    if df_outliers.empty:
        msg = f"✅ No se detectaron outliers en '{column_name}'. No se realizó ninguna acción."
        logger.info(msg)
        return df, msg

    # --- Copia del DataFrame para modificar ---
    df_cleaned = df.copy()
    df_cleaned[column_name] = df_cleaned[column_name].astype(float)
    outlier_indices = df_outliers.index

    try:
        if method == 'capping':
            df_cleaned.loc[df_cleaned[column_name] < lower_bound, column_name] = lower_bound
            df_cleaned.loc[df_cleaned[column_name] > upper_bound, column_name] = upper_bound
            message = f"Se recortaron (capping) {len(outlier_indices)} outliers en '{column_name}'."

        elif method in ['media', 'mediana']:
            valor_imputacion = df.drop(outlier_indices)[column_name].agg(method)
            df_cleaned.loc[outlier_indices, column_name] = valor_imputacion
            message = f"Se reemplazaron {len(outlier_indices)} outliers con la {method} ({valor_imputacion:.2f})."

        elif method == 'moda':
            valor_imputacion = df.drop(outlier_indices)[column_name].mode().iloc[0]
            df_cleaned.loc[outlier_indices, column_name] = valor_imputacion
            message = f"Se reemplazaron {len(outlier_indices)} outliers con la moda ({valor_imputacion})."

        elif method == 'manual':
            valor_manual = params.get('valor')
            if valor_manual is None:
                msg = "❌ Error: El parámetro 'valor' es requerido para el método manual."
                logger.error(msg)
                return df, msg

            valor_manual_numerico = pd.to_numeric(valor_manual, errors='coerce')
            if pd.isna(valor_manual_numerico):
                msg = "❌ Error: El valor manual proporcionado no es un número válido."
                logger.error(msg)
                return df, msg

            df_cleaned.loc[outlier_indices, column_name] = valor_manual_numerico
            message = f"Se reemplazaron {len(outlier_indices)} outliers con el valor manual {valor_manual_numerico}."

        elif method == 'eliminar':
            df_cleaned = df_cleaned.drop(index=outlier_indices)
            message = f"Se eliminaron {len(outlier_indices)} filas con outliers en '{column_name}'."

        else:
            msg = f"❌ Error: Método '{method}' para tratar outliers no es válido."
            logger.error(msg)
            return df, msg

    except Exception as e:
        msg = f"❌ Error inesperado al tratar outliers: {str(e)}"
        logger.exception(msg)
        return df, msg

    logger.info(message)
    return df_cleaned, message




def get_analysis_for_visualization(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Genera un análisis optimizado para los componentes de visualización del frontend.
    Devuelve los detalles de las columnas como un diccionario por columna.
    """
    try:
        null_like_values = ['nan', 'na', 'n/a', 'null', '', '--', 'undefined']
        null_regex = r'^\s*(' + '|'.join(null_like_values) + r')\s*$'
        df_procesado = df.copy()

        for col in df_procesado.columns:
            if df_procesado[col].dtype == 'object':
                df_procesado[col] = df_procesado[col].astype(str).str.strip()

        df_procesado.replace(to_replace=null_regex, value=np.nan, regex=True, inplace=True)

        column_details_object = {}

        for col in df_procesado.columns:
            col_data = df_procesado[col].dropna()

            if pd.api.types.is_numeric_dtype(col_data):
                col_type = "numeric"
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                col_type = "datetime"
            elif pd.api.types.is_string_dtype(col_data) or pd.api.types.is_categorical_dtype(col_data):
                col_type = "categorical"
            else:
                col_type = "unknown"

            details_for_col = {
                "analysis_type": col_type,
                "null_count": int(df_procesado[col].isnull().sum()),
                "unique_count": int(col_data.nunique()) if col_type in ["categorical", "datetime"] else None
            }

            cleaned_details = clean_nan_from_dict(details_for_col)

            column_details_object[col] = cleaned_details

        return {
            "success": True,
            "data": {
                "columnDetails": column_details_object
            }
        }

    except Exception as e:
        logger.error("Error crítico al generar análisis para visualización: %s", str(e))
        return {"success": False, "error": "Error al generar análisis para visualización."}
    


def reemplazar_valor_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper que maneja la conversión de tipos antes de reemplazar un valor.
    """
    columna = params.get('columna')
    valor_a_reemplazar_str = params.get('valor_a_reemplazar')
    nuevo_valor_str = params.get('nuevo_valor')

    if not all([columna, valor_a_reemplazar_str is not None, nuevo_valor_str is not None]):
         return df, "❌ Error: Faltan parámetros para reemplazar."

    try:
        # --- INICIO DE LA LÓGICA DE CONVERSIÓN (copiada de la otra función) ---
        tipo_columna = df[columna].dtype
        
        # Convierte el valor a buscar
        valor_a_reemplazar = pd.Series([valor_a_reemplazar_str]).astype(tipo_columna).iloc[0]
        
        # Convierte el nuevo valor
        nuevo_valor = pd.Series([nuevo_valor_str]).astype(tipo_columna).iloc[0]
        
        logger.info(f"Reemplazo con tipos corregidos: buscando {type(valor_a_reemplazar)}, reemplazando con {type(nuevo_valor)}")
        # --- FIN DE LA LÓGICA DE CONVERSIÓN ---

    except (ValueError, TypeError):
        # Si la conversión falla, usa los valores originales como strings
        logger.warning("No se pudo convertir tipos, se usará reemplazo de string.")
        valor_a_reemplazar = valor_a_reemplazar_str
        nuevo_valor = nuevo_valor_str

    # Ahora llamas a la función de reemplazo con los tipos de datos correctos
    df_modificado = cn.reemplazar_valor(df, columna, valor_a_reemplazar, nuevo_valor)
    
    mensaje = f"✅ En la columna '{columna}', se reemplazó '{valor_a_reemplazar_str}' por '{nuevo_valor_str}'."
    return df_modificado, mensaje



def eliminar_filas_por_valor_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Elimina filas basándose en una lista de valores proporcionada por el usuario.
    Es "inteligente": si el usuario escribe 'N/A', 'null', etc., buscará valores nulos reales.
    """
    columna = params.get('columna')
    valores_str = params.get('valor') # Lo que el usuario escribe, ej: "USA, N/A, France"

    if not columna or not valores_str:
        return df, "❌ Error: Faltan parámetros."

    filas_antes = len(df)
    
    # 1. Separa los valores que el usuario introdujo en una lista de strings
    lista_valores_usuario = [v.strip() for v in valores_str.split(',')]

    # 2. Divide la lista en dos: los que son "palabras clave de nulos" y los que son valores reales
    nulos_keywords = ['na', 'n/a', 'nan', 'null', 'none', '']
    valores_nulos_solicitados = [v for v in lista_valores_usuario if v.lower() in nulos_keywords]
    valores_reales_solicitados = [v for v in lista_valores_usuario if v.lower() not in nulos_keywords]
    
    df_a_filtrar = df.copy()

    # 3. Si el usuario pidió eliminar filas con valores nulos...
    if valores_nulos_solicitados:
        # ...las eliminamos usando dropna()
        df_a_filtrar = df_a_filtrar.dropna(subset=[columna])
        
    # 4. Si el usuario pidió eliminar filas con valores reales...
    if valores_reales_solicitados:
        try:
            # Intentamos convertir los valores al tipo de la columna
            tipo_columna = df_a_filtrar[columna].dtype
            valores_reales_convertidos = pd.Series(valores_reales_solicitados).astype(tipo_columna).tolist()
        except (ValueError, TypeError):
            valores_reales_convertidos = valores_reales_solicitados
        
        # Eliminamos las filas que están en esa lista
        df_a_filtrar = df_a_filtrar[~df_a_filtrar[columna].isin(valores_reales_convertidos)]

    df_modificado = df_a_filtrar
    filas_despues = len(df_modificado)
    filas_eliminadas = filas_antes - filas_despues

    mensaje = f"✅ Se eliminaron {filas_eliminadas} filas."
    return df_modificado, mensaje

# Wrapper para REEMPLAZO MÚLTIPLE (inteligente con tipos)
def reemplazar_multiples_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    columna = params.get('columna')
    
    # El frontend nos enviará dos listas de strings
    valores_a_buscar_str = params.get('valores_originales', [])
    nuevos_valores_str = params.get('valores_nuevos', [])

    if not columna or not valores_a_buscar_str or not nuevos_valores_str or len(valores_a_buscar_str) != len(nuevos_valores_str):
        return df, "❌ Error: Las listas de valores originales y nuevos deben coincidir."

    try:
        # Intentamos convertir los valores al tipo de la columna
        tipo_columna = df[columna].dtype
        valores_a_buscar = pd.Series(valores_a_buscar_str).astype(tipo_columna).tolist()
        nuevos_valores = pd.Series(nuevos_valores_str).astype(tipo_columna).tolist()
    except (ValueError, TypeError):
        valores_a_buscar = valores_a_buscar_str
        nuevos_valores = nuevos_valores_str

    # Creamos el diccionario de mapeo para Pandas
    mapeo = dict(zip(valores_a_buscar, nuevos_valores))
    
    # Usamos .replace() con el diccionario
    df.replace({columna: mapeo}, inplace=True)
    
    mensaje = f"✅ Se realizaron {len(mapeo)} reemplazos en la columna '{columna}'."
    return df, mensaje


def agrupar_categorias_raras_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Agrupa las categorías que aparecen por debajo de un umbral en una nueva categoría 'Otros'.
    """
    columna = params.get('columna')
    # El umbral vendrá como un decimal desde el frontend (ej: 0.05 para 5%)
    umbral = params.get('umbral', 0.01) # Usamos 1% como valor por defecto seguro

    if not columna:
        return df, "❌ Error: Faltan parámetros (columna)."

    df_modificado = df.copy()
    
    # 1. Calcula la frecuencia de cada categoría como un porcentaje
    frecuencias = df_modificado[columna].value_counts(normalize=True)
    
    # 2. Identifica qué categorías están por debajo del umbral
    valores_a_agrupar = frecuencias[frecuencias < umbral].index.tolist()

    if not valores_a_agrupar:
        return df, f"✅ No se encontraron categorías con una frecuencia menor al {umbral:.0%}. No se realizó ningún cambio."

    # 3. Reemplaza todas esas categorías raras por la palabra 'Otros'
    df_modificado[columna] = df_modificado[columna].replace(valores_a_agrupar, 'Otros')
    
    mensaje = f"✅ Se agruparon {len(valores_a_agrupar)} categorías poco frecuentes en 'Otros'."
    return df_modificado, mensaje



def limpiar_por_patron_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Limpia una columna de texto aplicando un patrón de expresión regular predefinido.
    """
    columna = params.get('columna')
    # El frontend nos enviará el nombre del patrón, ej: 'extraer_numeros'
    patron_nombre = params.get('patron')

    if not columna or not patron_nombre:
        return df, "❌ Error: Faltan parámetros (columna, patron)."

    # --- Diccionario de "Hechizos" (Patrones Regex) ---
    PATRONES = {
        'extraer_numeros': {
            'regex': r'(\d+\.?\d*)', # Captura el primer número entero o decimal
            'mensaje': "Se extrajeron solo los valores numéricos."
        },
        'extraer_letras': {
            'regex': r'([a-zA-Z\s]+)', # Captura solo letras y espacios
            'mensaje': "Se extrajeron solo las letras y espacios."
        },
        'eliminar_puntuacion': {
            'regex': r'[^\w\s]', # Reemplaza todo lo que NO es un caracter de palabra o espacio
            'mensaje': "Se eliminaron los signos de puntuación."
        }
    }

    if patron_nombre not in PATRONES:
        return df, f"❌ Error: Patrón '{patron_nombre}' no reconocido."

    df_modificado = df.copy()
    config = PATRONES[patron_nombre]

    # Aseguramos que la columna sea de tipo string para usar .str
    columna_str = df_modificado[columna].astype(str)

    if 'extraer' in patron_nombre:
        # .extract() devuelve la primera coincidencia. Coalesce con la original si no hay match.
        df_modificado[columna] = columna_str.str.extract(config['regex'], expand=False).fillna(df_modificado[columna])
    elif 'eliminar' in patron_nombre:
        # .replace() con regex reemplaza las coincidencias con un string vacío
        df_modificado[columna] = columna_str.str.replace(config['regex'], '', regex=True)
    
    mensaje = f"✅ {config['mensaje']} en la columna '{columna}'."
    return df_modificado, mensaje




def validar_rango_numerico(df: pd.DataFrame, columna: str, min_val: float, max_val: float, mode: str = 'filter') -> pd.DataFrame:
    """
    Valida valores numéricos dentro de un rango [min_val, max_val].
    'filter' elimina filas fuera del rango.
    'replace' reemplaza valores fuera del rango con NaN.
    """
    if columna not in df.columns:
        raise ValueError(f"La columna '{columna}' no existe en el DataFrame")

    if mode not in ['filter', 'replace']:
        raise ValueError("El parámetro mode debe ser 'filter' o 'replace'")

    df_copy = df.copy()

    if mode == 'filter':
        return df_copy[(df_copy[columna] >= min_val) & (df_copy[columna] <= max_val)].reset_index(drop=True)
    else:  # mode == 'replace'
        mask_fuera_rango = (df_copy[columna] < min_val) | (df_copy[columna] > max_val)
        df_copy.loc[mask_fuera_rango, columna] = np.nan
        return df_copy



def validar_rango_numerico_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper para validar rango numérico con manejo de parámetros y mensaje.
    Devuelve (df_modificado, mensaje).
    """
    columna = params.get('columna')
    min_val = params.get('min_val')
    max_val = params.get('max_val')
    mode = params.get('mode', 'filter')  # 'filter' o 'replace'

    if columna is None or min_val is None or max_val is None:
        return df, "❌ Error: Se requieren los parámetros 'columna', 'min_val' y 'max_val'."

    try:
        min_val = float(min_val)
        max_val = float(max_val)
    except (ValueError, TypeError):
        return df, "❌ Error: 'min_val' y 'max_val' deben ser valores numéricos."

    try:
        df_modificado = validar_rango_numerico(df, columna, min_val, max_val, mode)
    except Exception as e:
        return df, f"❌ Error: {str(e)}"

    if mode == 'filter':
        filas_afectadas = len(df) - len(df_modificado)
        mensaje = f"✅ Se eliminaron {filas_afectadas} filas fuera del rango [{min_val} - {max_val}]."
    else:  # replace
        nans_antes = df[columna].isnull().sum()
        nans_despues = df_modificado[columna].isnull().sum()
        filas_afectadas = nans_despues - nans_antes
        mensaje = f"✅ Se reemplazaron {filas_afectadas} valores fuera del rango por nulos."

    return df_modificado, mensaje


def crear_columna_calculada_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper robusto para crear una columna calculada. Maneja validación,
    conversión de tipos y la operación matemática. Se integra con ACTION_MAP.
    """

    print("\n--- DEBUG: DENTRO DE crear_columna_calculada_wrapper ---")
    print(f"Parámetros recibidos: {params}")
    col_a_nombre = params.get('columna_a')
    col_b_nombre = params.get('columna_b')
    operacion = params.get('operacion')
    nuevo_nombre = params.get('nuevo_nombre')

    if not all([col_a_nombre, col_b_nombre, operacion, nuevo_nombre]):
        return df, "❌ Error: Faltan parámetros para crear la columna."

    df_copia = df.copy()

    # --- INICIO DE LA LÓGICA POTENTE ---
    # 1. Validación y conversión SEGURA de las columnas de entrada
    for col_nombre in [col_a_nombre, col_b_nombre]:
        if col_nombre not in df_copia.columns:
            return df, f"❌ Error: La columna de entrada '{col_nombre}' no existe."
        
        # Si la columna no es numérica, intenta convertirla.
        # errors='coerce' convierte los errores en NaN (nulo) en lugar de crashear.
        if not pd.api.types.is_numeric_dtype(df_copia[col_nombre]):
            columna_original = df_copia[col_nombre].copy()
            df_copia[col_nombre] = pd.to_numeric(columna_original, errors='coerce')
            
            nulos_generados = df_copia[col_nombre].isnull().sum() - columna_original.isnull().sum()
            if nulos_generados > 0:
                logger.info(f"Se forzó la conversión de '{col_nombre}' a numérico, generando {nulos_generados} nulos.")
    
    # 2. Realiza la operación
    operaciones = {
        'sumar': df_copia[col_a_nombre] + df_copia[col_b_nombre],
        'restar': df_copia[col_a_nombre] - df_copia[col_b_nombre],
        'multiplicar': df_copia[col_a_nombre] * df_copia[col_b_nombre],
        'dividir': df_copia[col_a_nombre] / df_copia[col_b_nombre].replace(0, np.nan)
    }

    if operacion not in operaciones:
        return df, f"❌ Error: Operación '{operacion}' no soportada."

    df_copia[nuevo_nombre] = operaciones[operacion]
    # --- FIN DE LA LÓGICA POTENTE ---

    simbolos = {'sumar': '+', 'restar': '-', 'multiplicar': '*', 'dividir': '/'}
    mensaje = f"✅ Se creó la nueva columna '{nuevo_nombre}' a partir de '{col_a_nombre} {simbolos.get(operacion)} {col_b_nombre}'."
    
    return df_copia, mensaje


def crear_columna_por_valor_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper para crear una nueva columna a partir de una columna base y un valor fijo.
    Incluye validaciones para producción (tipos, parámetros y división por cero).
    """
    col_base = params.get('columna_base')
    valor_str = params.get('valor')
    operacion = params.get('operacion')  # multiplicar, sumar, restar, dividir
    nuevo_nombre = params.get('nuevo_nombre')

    # 1. Validación de parámetros obligatorios
    if not all([col_base, valor_str is not None, operacion, nuevo_nombre]):
        return df, "❌ Error: Se requieren 'columna_base', 'valor', 'operacion' y 'nuevo_nombre'."

    # 2. Validar que la columna exista
    if col_base not in df.columns:
        return df, f"❌ Error: La columna '{col_base}' no existe en el DataFrame."

    # 3. Conversión de valor a float
    try:
        valor_float = float(valor_str)
    except (ValueError, TypeError):
        return df, "❌ Error: El valor proporcionado debe ser un número."

    # 4. Manejo de división por cero
    if operacion == 'dividir' and valor_float == 0:
        return df, "❌ Error: No se puede dividir por cero."

    # 5. Ejecutar la lógica pura
    try:
        df_modificado = cn.crear_columna_por_valor(df, col_base, valor_float, operacion, nuevo_nombre)

        # 6. Mensaje amigable para el usuario
        mensaje = f"✅ Columna '{nuevo_nombre}' creada correctamente aplicando '{operacion}' con {valor_float} sobre '{col_base}'."
        return df_modificado, mensaje

    except Exception as e:
        return df, f"❌ Error inesperado: {e}"




def duplicar_columna_pura(df: pd.DataFrame, col_original: str, nuevo_nombre: str) -> pd.DataFrame:
    """
    Duplica una columna existente en un DataFrame con un nuevo nombre.
    
    Args:
        df (pd.DataFrame): DataFrame original.
        columna_a_duplicar (str): Nombre de la columna a duplicar.
        nuevo_nombre (str): Nombre para la nueva columna duplicada.
        
    Returns:
        Tuple[pd.DataFrame, str]: DataFrame modificado y mensaje de resultado.
    """
    if col_original not in df.columns:
        raise ValueError(f"La columna '{col_original}' no existe.")
    if nuevo_nombre in df.columns:
        raise ValueError(f"El nombre '{nuevo_nombre}' ya existe.")
    
    df_copia = df.copy()
    df_copia[nuevo_nombre] = df_copia[col_original].copy()
    return df_copia


# --- Wrapper robusto para ACTION_MAP ---
def duplicar_columna_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper para duplicar una columna, con validaciones y manejo de errores.
    
    Args:
        df (pd.DataFrame): DataFrame original.
        params: Diccionario con 'columna_original' y 'nuevo_nombre_columna'.
        
    Returns:
        Tuple[pd.DataFrame, str]: DataFrame modificado y mensaje de resultado.
    """
    col_original = params.get('columna_original')
    nuevo_nombre = params.get('nuevo_nombre_columna')

    if not col_original or not nuevo_nombre:
        return df, "❌ Error: Se requieren los nombres de la columna original y la nueva."

    try:
        df_modificado = duplicar_columna_pura(df, col_original, nuevo_nombre)
        mensaje = f"✅ Columna '{col_original}' duplicada como '{nuevo_nombre}'."
        return df_modificado, mensaje
    except ValueError as e:
        return df, f"❌ Error: {e}"
    


def convertir_a_categorico_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Wrapper robusto para convertir columnas numéricas o seleccionadas a categóricas (texto).
    Soporta modo manual y automático.
    
    Parámetros (en params)
    ----------------------
    columnas : list[str], opcional
        Lista de columnas a convertir manualmente.
    auto : bool, por defecto False
        Si es True, detecta automáticamente columnas numéricas que parecen categóricas.
    umbral_unicos : int, por defecto 20
        Número máximo de valores únicos para considerar una columna numérica como categórica.
    """
    columnas = params.get("columnas")
    auto = bool(params.get("auto", False))
    umbral_unicos = int(params.get("umbral_unicos", 20))
    
    logger.info(f"🔍 Iniciando conversión a categórico. auto={auto}, columnas={columnas}, umbral={umbral_unicos}")

    df_copia = df.copy()
    columnas_convertidas = []

    try:
        if auto:
            for col in df_copia.select_dtypes(include=["number"]).columns:
                valores_unicos = df_copia[col].nunique(dropna=True)
                if valores_unicos <= umbral_unicos or col.lower() in ["año", "anio", "year", "codigo", "id"]:
                    df_copia[col] = df_copia[col].astype(str)
                    columnas_convertidas.append(col)
        else:
            if not columnas:
                return df, "⚠️ No se especificaron columnas para convertir."
            for col in columnas:
                if col in df_copia.columns:
                    df_copia[col] = df_copia[col].astype(str)
                    columnas_convertidas.append(col)
                else:
                    return df, f"❌ Error: La columna '{col}' no existe."
    except Exception as e:
        logger.error(f"❌ Error al convertir columnas a categórico: {e}", exc_info=True)
        return df, "❌ Error interno al convertir columnas."

    if not columnas_convertidas:
        return df_copia, "ℹ️ No se detectaron columnas para convertir."
    
    mensaje = f"✅ Columnas convertidas a texto: {', '.join(columnas_convertidas)}."
    logger.info(mensaje)
    return df_copia, mensaje


from typing import Tuple
import pandas as pd
import logging

logger = logging.getLogger(__name__)

def convertir_a_numerico_robusto_wrapper(df: pd.DataFrame, **params) -> Tuple[pd.DataFrame, str]:
    """
    Convierte una columna a tipo numérico de forma robusta:
      1. Reemplaza comas por puntos.
      2. Elimina espacios en blanco al inicio y al final.
      3. Intenta la conversión numérica, forzando NaN en caso de error.
    
    Retorna:
        (DataFrame modificado, mensaje de resultado)
    """
    columna = params.get('columna')

    # --- Validaciones iniciales ---
    if not columna:
        msg = "❌ Error: No se especificó la columna."
        logger.error(msg)
        return df, msg

    if columna not in df.columns:
        msg = f"❌ Error: La columna '{columna}' no existe en el DataFrame."
        logger.error(msg)
        return df, msg

    try:
        df_modificado = df.copy()

        # Guardar nulos originales para diagnóstico
        nulos_antes = df_modificado[columna].isnull().sum()

        # Forzar todo a string para manipulación segura
        col_str = df_modificado[columna].astype(str)

        # Paso 1: Reemplazar comas por puntos
        col_str = col_str.str.replace(',', '.', regex=False)

        # Paso 2: Eliminar espacios
        col_str = col_str.str.strip()

        # Paso 3: Convertir a numérico (coerce => errores se vuelven NaN)
        df_modificado[columna] = pd.to_numeric(col_str, errors='coerce')

        # Diagnóstico final
        nulos_despues = df_modificado[columna].isnull().sum()
        nulos_generados = nulos_despues - nulos_antes

        mensaje = (
            f"✅ Columna '{columna}' convertida a numérico. "
            f"Se generaron {nulos_generados} nuevos valores nulos por datos no convertibles."
        )
        logger.info(mensaje)
        return df_modificado, mensaje

    except Exception as e:
        msg = f"❌ Error inesperado al convertir a numérico: {str(e)}"
        logger.exception(msg)
        return df, msg


# 2. DISPATCHER DE ACCIONES DE TRANSFORMACIÓN (WRITE)
#    Este es el punto de entrada centralizado para MODIFICAR el DataFrame.
# ==============================================================================

# --- MAPA DE ACCIONES UNIFICADO Y FINAL ---
ACTION_MAP: Dict[str, Callable] = {
    # === ACCIONES GENERALES ===
    "general_drop_duplicates": ld.eliminar_duplicados,
    "general_drop_na_rows": ld.eliminar_nan_todo,
    "general_drop_columns": ld.eliminar_columnas,
    
    # ¡NUEVA ACCIÓN DE REEMPLAZO!
    "general_replace_value": reemplazar_valor_wrapper,
    "numeric_replace_outliers": _handle_replace_outliers,  #
    # === ACCIONES NUMÉRICAS ===
    "numeric_impute_by_method": cn.imputar_nulos_numericos,
    "numeric_impute_with_value": cn.imputar_valor_manual,
    "numeric_remap_values": reemplazar_multiples_wrapper,
    "type_convert_to_categorical": convertir_a_categorico_wrapper,
    # === ACCIONES CATEGÓRICAS ===
    "categorical_impute_with_constant": ct.imputar_constante,
    "categorical_remap_values": ct.reemplazar_valores_con_diccionario,
    "categorical_impute_with_mode": ct.imputar_moda,
    "categorical_standardize_format": lambda df, **params: ct.limpiar_columnas_categoricas(df, [params['columna']]),
    "categorical_group_rare": agrupar_categorias_raras_wrapper,
    "text_clean_by_pattern": limpiar_por_patron_wrapper,
    # === ACCIONES DE CONVERSIÓN DE TIPO ===
    # Ya tenías algunas, y podemos añadir más si es necesario.
    # Estas son las versiones que devuelven un DataFrame y un mensaje.
    "type_convert_to_integer": cn.convertir_a_entero,
    "type_convert_to_float": cn.convertir_a_flotante,
    "type_convert_to_numeric_smart": convertir_a_numerico_robusto_wrapper,
    "type_convert_to_date": ld.convertir_a_fecha, # Renombrada por consistencia
    "general_delete_rows_by_value": eliminar_filas_por_valor_wrapper,
    "numeric_validate_range": validar_rango_numerico_wrapper,
    "general_create_calculated_column": crear_columna_calculada_wrapper,
    "general_create_column_by_value": crear_columna_por_valor_wrapper,
    "general_duplicate_column": duplicar_columna_wrapper,

}


# --- Función orquestadora ---
def cleaning_action(df: pd.DataFrame, action: str, params: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(f"🧹 Iniciando acción de limpieza: '{action}' con params: {params}")
    print(f"\n--- !!! SE HA LLAMADO A cleaning_action CON LA ACCIÓN: {action} !!! ---\n")

    filas_antes = len(df)
    df_preparado = df.copy()

    # --- Paso 1: Reemplazar valores null-like ---
    null_like_values = ['nan', 'na', 'n/a', 'null', '', '--', 'undefined', 'N/A']
    null_regex = r'^\s*(' + '|'.join(null_like_values) + r')\s*$'
    df_preparado.replace(to_replace=null_regex, value=np.nan, regex=True, inplace=True)

    # --- Paso 2: Normalizar texto ---
    columnas_obj = df_preparado.select_dtypes(include='object').columns.tolist()
    for col in columnas_obj:
        df_preparado[col] = (
            df_preparado[col]
            .str.strip()
            .str.lower()
            .replace({'none': np.nan, '': np.nan})
        )

    # --- Paso 3: Ejecutar acción ---
    if action in ACTION_MAP:
        try:
            func_to_call = ACTION_MAP[action]
            df_cleaned, message = func_to_call(df_preparado, **params)

            # Diagnóstico post-limpieza
            new_analysis_result = get_preliminary_analysis(df_cleaned)
            if not new_analysis_result.get("success"):
                return {
                    "success": False,
                    "error": "La limpieza funcionó, pero el reanálisis falló."
                }

            return {
                "success": True,
                "message": message,
                "cleaned_dataframe": df_cleaned,
                "new_diagnostics": new_analysis_result["data"],
            }

        except TypeError:
            return {
                "success": False,
                "error": f"Parámetros incorrectos para la acción '{action}'."
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Error interno al ejecutar la acción '{action}': {str(e)}"
            }
    else:
        return {
            "success": False,
            "error": f"Acción de limpieza desconocida: '{action}'"
        }


    

def check_dataset_quality(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Realiza un diagnóstico de calidad completo pero eficiente.
    Optimizado para evitar iterar sobre columnas no numéricas al buscar outliers.
    """
    try:
        # --- 1. Preprocesamiento ---
        null_like_values = ['nan', 'na', 'n/a', 'null', '', '--', 'undefined']
        null_regex = r'^\s*(' + '|'.join(null_like_values) + r')\s*$'
        df_procesado = df.copy()
        df_procesado.replace(to_replace=null_regex, value=np.nan, regex=True, inplace=True)
        
        # --- 2. Chequeos Globales ---
        # Asumiendo que ld.detectar_duplicados devuelve (dataframe, conteo, indices)
        _, n_duplicados, _ = ld.detectar_duplicados(df_procesado)
        total_nulos = int(df_procesado.isnull().sum().sum())

        has_duplicates = n_duplicados > 0
        has_nulls = total_nulos > 0

        # --- 3. Chequeo de Outliers solo en columnas numéricas ---
        has_outliers = False
        outlier_columns = []

        numeric_cols = df_procesado.select_dtypes(include=[np.number]).columns

        for col_name in numeric_cols:
            # Asumiendo que cn.detectar_outliers_iqr devuelve (outliers_df, conteo, ...)
            outliers_df, _, _, _ = cn.detectar_outliers_iqr(df_procesado, col_name)
            if not outliers_df.empty:
                has_outliers = True
                outlier_columns.append(col_name)

        # --- 4. Veredicto Final ---
        is_clean = not (has_duplicates or has_nulls or has_outliers)

        # --- 5. Construcción de la Respuesta ---
        # Creamos un mensaje para el frontend
        message = "¡Excelente! El dataset cumple con los criterios básicos de calidad para continuar el analisis."
        if not is_clean:
            issues = []
            if has_duplicates: issues.append(f"{n_duplicados} duplicados")
            if has_nulls: issues.append(f"{total_nulos} valores nulos")
            if has_outliers: issues.append("outliers")
            message = f"El dataset contiene: {', '.join(issues)}. Se recomienda revisar y limpiar estos elementos antes de continuar."

        report = {
            "is_clean": is_clean, # Dejamos esto para info interna
            "issues": {
                "has_duplicates": has_duplicates,
                "duplicates_count": n_duplicados,
                "has_nulls": has_nulls,
                "nulls_count": total_nulos,
                "has_outliers": has_outliers,
                "outlier_columns": outlier_columns
            }
        }
        
        logger.info(f"Chequeo de calidad completado. Veredicto: {'Limpio' if is_clean else 'Con Problemas'}")
        
        # ======================= LA ÚNICA LÍNEA QUE CAMBIA =======================
        # En lugar de "success": True, usamos "success": is_clean
        # También pasamos el 'message' que acabamos de crear.
        return {"success": is_clean, "message": message, "data": report}
        # =========================================================================

    except Exception as e:
        logger.error("Error crítico durante el chequeo de calidad del dataset: %s", str(e))
        # También es buena idea pasar un mensaje en el error
        return {"success": False, "message": "Error interno al analizar el dataset.", "error": "Error al realizar el chequeo de calidad."}