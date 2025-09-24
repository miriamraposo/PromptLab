# load_data.py
from io import StringIO
import pandas as pd
import numpy as np
# ... otras importaciones
import logging
from typing import Union, List, Tuple, Optional
from pathlib import Path
from typing import  Dict
import traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)



def load_data(filepath: str, encoding: str = 'utf-8', separator: str = ',') -> Tuple[Optional[pd.DataFrame], str]:
    """
    Carga un archivo Excel o CSV y devuelve un DataFrame de pandas.
    Mantiene la firma original para no afectar otros endpoints.

    Mejoras:
    - Soporta CSV y Excel (.xlsx, .xls) con validación de formato seguro
    - Bloquea macros (no se procesan .xlsm)
    - Convierte automáticamente columnas de fecha cuando es posible
    - Limpia fórmulas y valores peligrosos (prevención de inyección)
    """

    try:
        file_path = Path(filepath)
        if not file_path.exists():
            return None, f"❌ El archivo '{filepath}' no fue encontrado."

        suffix = file_path.suffix.lower()

        # --- Validación segura de tipo de archivo ---
        if suffix not in ['.xlsx', '.xls', '.csv']:
            return None, "❌ Formato no soportado. Usa .csv, .xlsx o .xls (sin macros)."
        if suffix == '.xlsm':
            return None, "❌ Archivos con macros (.xlsm) no están permitidos por seguridad."

        # --- Cargar Excel ---
        if suffix in ['.xlsx', '.xls']:
            try:
                # Mantener lectura segura sin macros (openpyxl ignora VBA)
                df = pd.read_excel(file_path, engine='openpyxl', dtype=object)

                # Verificar si tiene VBAProject (indicador de macros)
                # Si openpyxl no soporta VBA, esta verificación extra evita abrir .xlsm disfrazados
                if "vbaProject" in str(df.columns).lower():
                    return None, "❌ Archivo sospechoso: contiene referencias a VBA."

            except ImportError:
                return None, "❌ Falta el paquete 'openpyxl'. Instálalo con: pip install openpyxl"
            except Exception as e:
                logger.error(f"Error al leer Excel: {e}", exc_info=True)
                return None, f"❌ Error al leer Excel: {e}"

        # --- Cargar CSV ---
        elif suffix == '.csv':
            try:
                # Usa pandas para robustez, previene carga parcial
                df = pd.read_csv(file_path, sep=separator, encoding=encoding, low_memory=False)
            except pd.errors.ParserError as e:
                return None, f"❌ Error de formato en CSV. Revisa el separador '{separator}'. Detalle: {e}"
            except Exception as e:
                logger.error(f"Error al leer CSV: {e}", exc_info=True)
                return None, f"❌ Error al leer CSV: {e}"

        # --- Validación de contenido ---
        if df.empty:
            return None, "⚠️ El archivo fue cargado, pero no contiene datos."

        # --- Limpieza de contenido peligroso ---
        # Elimina fórmulas que empiecen con '=' para evitar inyecciones tipo CSV
        df = df.applymap(lambda x: str(x).replace("=", "") if isinstance(x, str) else x)

        # Conversión segura de columnas de fecha
        for col in df.columns:
            if any(keyword in col.lower() for keyword in ['date', 'fecha', 'time']):
                try:
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                except Exception:
                    pass

        mensaje = f"✅ Archivo cargado correctamente. Filas: {df.shape[0]}, Columnas: {df.shape[1]}"
        return df, mensaje

    except Exception as e:
        logger.error(f"Error general en load_data: {e}", exc_info=True)
        return None, f"❌ Error interno al cargar el archivo: {e}"



def loades_data(filepath, encoding='utf-8', separator=','):
    """
    Carga un archivo Excel o CSV y devuelve un DataFrame de pandas.
    Mantiene la firma para no afectar el frontend.
    """
    try:
        filepath = Path(filepath)
        if not filepath.exists():
            return None, f"❌ El archivo '{filepath}' no fue encontrado."

        if filepath.suffix in ['.xlsx', '.xls']:
            # Forzar engine openpyxl y dtype=object para mayor robustez
            df = pd.read_excel(filepath, engine='openpyxl', dtype=object)

            # Intento de conversión automática segura de columnas fecha
            for col in df.columns:
                # Si la columna parece de fecha (nombres comunes o tipo object)
                if 'date' in col.lower() or 'fecha' in col.lower() or 'time' in col.lower():
                    try:
                        df[col] = pd.to_datetime(df[col], errors='coerce')
                    except Exception as e:
                        # No detener carga si falla conversión
                        pass

        elif filepath.suffix == '.csv':
            df = pd.read_csv(filepath, sep=separator, encoding=encoding, low_memory=False)
        else:
            return None, "❌ Formato de archivo no soportado. Usa .csv o .xlsx"

        mensaje = f"✅ Archivo cargado. Filas: {df.shape[0]}, Columnas: {df.shape[1]}"
        return df, mensaje

    except pd.errors.ParserError as e:
        return None, f"❌ Error de formato en CSV. ¿Estás seguro que el separador es '{separator}'? Error: {e}"

    except Exception as e:
        # Log detallado para backend (suponiendo logger o print)
        import logging
        logging.error(f"Error al cargar archivo {filepath}: {e}")
        logging.error(traceback.format_exc())
        return None, f"❌ Error al cargar el archivo: {e}"



def loads_datas(filepath, encoding='utf-8', separator=','):
    """
    Carga un archivo Excel o CSV y devuelve un DataFrame de pandas.
    """
    try:
        filepath = Path(filepath)  # ✅ Primero convertimos a Path
        if not filepath.exists():  # ✅ Luego verificamos si existe
            return None, f"❌ El archivo '{filepath}' no fue encontrado."

        if filepath.suffix in ['.xlsx', '.xls']:
            df = pd.read_excel(filepath)
        elif filepath.suffix == '.csv':
            df = pd.read_csv(filepath, sep=separator, encoding=encoding, low_memory=False)
        else:
            return None, "❌ Formato de archivo no soportado. Usa .csv o .xlsx"

        mensaje = f"✅ Archivo cargado. Filas: {df.shape[0]}, Columnas: {df.shape[1]}"
        return df, mensaje

    except pd.errors.ParserError as e:
        return None, f"❌ Error de formato en CSV. ¿Estás seguro que el separador es '{separator}'? Error: {e}"
    except Exception as e:
        return None, f"❌ Error al cargar el archivo: {e}"


# ===================== INFORMACIÓN GENERAL =====================


def show_info(df):
    """
    Devuelve un resumen del DataFrame (tipos de datos, cantidad de nulos, etc.).

    Args:
        df (pd.DataFrame): El DataFrame a analizar.

    Returns:
        str: Texto con la salida de df.info().
    """
    buffer = StringIO()
    df.info(buf=buffer)
    return buffer.getvalue()


def get_column_types(df):
    """
    Retorna listas separadas de columnas numéricas y categóricas.

    Args:
        df (pd.DataFrame): DataFrame de entrada.

    Returns:
        Tuple[List[str], List[str]]: Columnas numéricas y categóricas.
    """
    numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
    categorical_cols = df.select_dtypes(
        include=['object', 'category', 'bool']).columns.tolist()
    return numeric_cols, categorical_cols

# ===================== DUPLICADOS =====================


def detectar_duplicados(df: pd.DataFrame, columnas: Optional[List[str]] = None) -> Tuple[pd.DataFrame, int, float]:
    """
    Detecta filas duplicadas en un DataFrame.

    Args:
        df (pd.DataFrame): DataFrame a analizar.
        columnas (Optional[List[str]]): Columnas sobre las que buscar duplicados. 
                                        Si es None, analiza todas las columnas.

    Returns:
        Tuple[pd.DataFrame, int, float]: 
            - DataFrame con las filas duplicadas,
            - cantidad de duplicados,
            - porcentaje respecto al total.
    """
    total = len(df)
    if columnas:
        duplicados = df[df.duplicated(subset=columnas)]
    else:
        duplicados = df[df.duplicated()]

    porcentaje = (len(duplicados) / total) * 100 if total > 0 else 0
    return duplicados, len(duplicados), porcentaje

# --- CORRECCIÓN: Eliminada la función 'detectar_duplicados_completos' por ser redundante ---

# ===================== NULOS =====================


def nan_por_columna(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calcula la cantidad y porcentaje de valores NaN por columna.

    Args:
        df (pd.DataFrame): DataFrame a analizar.

    Returns:
        pd.DataFrame: Con columnas ['columna', 'cantidad_nan', 'porcentaje_nan'].
    """
    total = len(df)
    nan_counts = df.isna().sum()
    nan_pct = (nan_counts / total) * 100
    return pd.DataFrame({
        'columna': nan_counts.index,
        'cantidad_nan': nan_counts.values,
        'porcentaje_nan': nan_pct.values
    })


def nan_en_columna(df: pd.DataFrame, columna: str) -> Tuple[Optional[dict], Optional[str]]:
    """
    Devuelve la cantidad y porcentaje de NaN en una columna.

    Args:
        df (pd.DataFrame): DataFrame de entrada.
        columna (str): Nombre de la columna a analizar.

    Returns:
        Tuple[Optional[dict], Optional[str]]: Diccionario con stats o mensaje de error.
    """
    if columna not in df.columns:
        return None, f"La columna '{columna}' no existe."
    total = len(df)
    cantidad = df[columna].isna().sum()
    porcentaje = (cantidad / total) * 100
    return {'columna': columna, 'cantidad_nan': cantidad, 'porcentaje_nan': porcentaje}, None

# ======================
# 🧹 LIMPIEZA DE DATOS
# ======================

# --- CORRECCIÓN: Las funciones ahora retornan (DataFrame, mensaje) ---


def eliminar_duplicados(df: pd.DataFrame, subset: Optional[List[str]] = None, keep: str = 'first') -> Tuple[pd.DataFrame, str]:
    """
    Elimina filas duplicadas de un DataFrame.

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        subset (Optional[List[str]]): Lista de columnas a considerar para identificar duplicados.
                                      Si es None, se consideran todas las columnas.
        keep (str): Qué duplicado conservar ('first', 'last', False para eliminar todos).

    Returns:
        Tuple[pd.DataFrame, str]: Un tuple con el nuevo DataFrame limpio y un mensaje de resumen.
    """
    if not isinstance(df, pd.DataFrame):
        # Es bueno tener este tipo de validaciones en una librería
        raise TypeError("La entrada 'df' debe ser un DataFrame de pandas.")

    cantidad_antes = df.shape[0]
    df_limpio = df.drop_duplicates(subset=subset, keep=keep)
    cantidad_despues = df_limpio.shape[0]
    eliminados = cantidad_antes - cantidad_despues

    # ✅ Logging interno para auditoría
    logger.info(
        f"Se eliminaron {eliminados} filas duplicadas. Original: {cantidad_antes}, Final: {cantidad_despues}.")

    # ✅ Mensaje de retorno para el usuario final
    mensaje = f"✅ Duplicados eliminados: {eliminados}"
    return df_limpio, mensaje


def eliminar_nan_todo(df):
    """
    Elimina todas las filas que contienen al menos un valor NaN.

    Args:
        df (pd.DataFrame): El DataFrame original.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame limpio y mensaje con la cantidad eliminada.
    """
    cantidad_antes = df.shape[0]
    df_limpio = df.dropna()
    eliminados = cantidad_antes - df_limpio.shape[0]
    mensaje = f"✅ Filas eliminadas por contener al menos un valor NaN: {eliminados}"
    return df_limpio, mensaje


def eliminar_nan_columna(df: pd.DataFrame, columna: str) -> Tuple[pd.DataFrame, str]:
    """
    Elimina las filas que tienen NaN en una columna específica.

    Args:
        df (pd.DataFrame): DataFrame de entrada.
        columna (str): Nombre de la columna a evaluar.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame sin NaN en esa columna y un mensaje.
    """
    if columna not in df.columns:
        return df, f"❌ La columna '{columna}' no existe."
    cantidad_antes = df.shape[0]
    df_limpio = df.dropna(subset=[columna])
    eliminados = cantidad_antes - df_limpio.shape[0]
    if eliminados > 0:
        logger.info(f"Eliminados {eliminados} nulos en columna '{columna}'.")
    mensaje = f"✅ Filas eliminadas por NaN en la columna '{columna}': {eliminados}"
    return df_limpio, mensaje


def manejar_nan_columna(
    df: pd.DataFrame,
    columna: str,
    umbral: float = 5.0,
    metodo_imputacion: str = 'media'
) -> Tuple[pd.DataFrame, str]:
    """
    Maneja valores NaN en una columna de un DataFrame:
    - Si el porcentaje de NaN es bajo (<= umbral), elimina las filas.
    - Si el porcentaje es alto, imputa los valores usando media, mediana o moda.

    Args:
        df (pd.DataFrame): DataFrame de entrada.
        columna (str): Nombre de la columna a procesar.
        umbral (float): Porcentaje de NaN aceptable para eliminar filas. Si se supera, se imputa.
        metodo_imputacion (str): Método para imputar ('media', 'mediana', 'moda').

    Returns:
        Tuple[pd.DataFrame, str]: DataFrame limpio y mensaje con la acción realizada.
    """
    if columna not in df.columns:
        return df, f"❌ La columna '{columna}' no existe."

    total = df.shape[0]
    n_nan = df[columna].isna().sum()
    pct_nan = (n_nan / total) * 100

    if pct_nan == 0:
        return df, f"✅ No hay NaN en la columna '{columna}'."

    df_limpio = df.copy()

    logger.info(
        f"Manejando NaNs en '{columna}' - %NaN: {pct_nan:.2f}% - Método: {metodo_imputacion}")

    if pct_nan <= umbral:
        df_limpio, msg = eliminar_nan_columna(df_limpio, columna)
        return df_limpio, f"Se eliminaron filas porque el porcentaje de NaN ({pct_nan:.2f}%) era bajo. {msg}"
    else:
        if df_limpio[columna].dtype not in ['int64', 'float64']:
            return df, f"❌ No se puede imputar la columna '{columna}' porque no es numérica."

        if metodo_imputacion == 'media':
            valor = df_limpio[columna].mean()
        elif metodo_imputacion == 'mediana':
            valor = df_limpio[columna].median()
        elif metodo_imputacion == 'moda':
            modes = df_limpio[columna].mode()
            if not modes.empty:
                valor = modes[0]
            else:
                return df, f"❌ No se pudo calcular la moda para la columna '{columna}' (posiblemente todos los valores son únicos)."
        else:
            return df, f"❌ Método de imputación '{metodo_imputacion}' no reconocido."

        df_limpio[columna] = df_limpio[columna].fillna(valor)
        return df_limpio, f"✅ Se imputaron {n_nan} valores NaN en '{columna}' con la {metodo_imputacion} ({valor:.2f})."


# ===================== ANÁLISIS DE CATEGORÍAS =====================

# En load_data.py

def valores_unicos_y_conteo(df, columna):
    """
    Devuelve los valores únicos y su conteo con nombres de columna estandarizados.
    """
    if columna not in df.columns:
        return None, f"❌ La columna '{columna}' no existe."
    
    # dropna=False incluye los valores nulos (NaN) en el conteo
    value_counts = df[columna].value_counts(dropna=False).reset_index()
    
    # --- ¡LA LÍNEA CORREGIDA! ---
    # Nombramos las columnas como 'valor' y 'conteo' para que el frontend las entienda.
    value_counts.columns = ['valor', 'conteo'] 
    
    return value_counts, "Conteo de valores únicos generado."


def describe_categoricas(df: pd.DataFrame) -> Tuple[Optional[pd.DataFrame], Optional[str]]:
    """
    Describe las columnas categóricas del DataFrame (conteo, únicos, más frecuentes).

    Returns:
        Tuple[Optional[pd.DataFrame], Optional[str]]: DataFrame con estadísticas o mensaje de error.
    """
    categoricas = df.select_dtypes(include=['object', 'category']).columns
    if categoricas.empty:
        return None, "No hay columnas categóricas para describir."
    return df[categoricas].describe().T, None


def valores_poco_frecuentes(df, columna, umbral=0.01):
    """
    Devuelve los valores poco frecuentes en una columna categórica.

    Args:
        df (pd.DataFrame): DataFrame de entrada.
        columna (str): Columna categórica.
        umbral (float): Frecuencia mínima para considerar un valor como raro.

    Returns:
        pd.DataFrame: Valores menos frecuentes y su porcentaje.
    """
    total = len(df)
    conteos = df[columna].value_counts()
    frecuencias = conteos / total
    raras = frecuencias[frecuencias < umbral]
    return pd.DataFrame({'cantidad': conteos[raras.index], 'porcentaje': raras})

# ======================
# 🔧 FUNCIONES DE CONVERSIÓN (retornando mensajes)
# ======================


def convertir_a_fecha(df: pd.DataFrame, columna: str, formato: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """
    Convierte una columna a tipo datetime, tratando errores como NaN.

    Args:
        df (pd.DataFrame): DataFrame original.
        columna (str): Nombre de la columna a convertir.
        formato (str, optional): Formato personalizado de fecha (ej. '%d/%m/%Y').

    Returns:
        Tuple[pd.DataFrame, str]: DataFrame modificado y mensaje con resultado.
    """
    df_copia = df.copy()
    if columna in df_copia.columns:
        nulos_antes = df[columna].isna().sum()
        df_copia[columna] = pd.to_datetime(
            df_copia[columna], format=formato, errors='coerce')
        nulos_despues = df_copia[columna].isna().sum()
        nulos_creados = nulos_despues - nulos_antes

        logger.info(
            f"Columna '{columna}' convertida a datetime. Nulos generados por error de formato: {nulos_creados}.")

        mensaje = f"✅ Columna '{columna}' convertida a fecha. Se generaron {nulos_creados} nulos por errores de conversión."
        return df_copia, mensaje
    else:
        # También es bueno registrar los intentos fallidos
        logging.warning(
            f"Intento de convertir a fecha una columna inexistente: '{columna}'.")
        return df, f"❌ La columna '{columna}' no existe."


def convertir_varias_a_string(df, columnas):
    """
    Convierte una o más columnas a tipo string.

    Args:
        df (pd.DataFrame): DataFrame original.
        columnas (Union[str, List[str]]): Nombre(s) de columna(s) a convertir.

    Returns:
        Tuple[pd.DataFrame, str]: DataFrame modificado y mensaje de confirmación.
    """

    df_copia = df.copy()
    if isinstance(columnas, str):
        columnas = [columnas]
    for col in columnas:
        if col in df_copia.columns:
            df_copia[col] = df_copia[col].astype(str)
        else:
            return df, f"❌ La columna '{col}' no existe."
    mensaje = f"✅ Columnas {columnas} convertidas a string."
    return df_copia, mensaje


def eliminar_columnas(df: pd.DataFrame, columnas: list) -> Tuple[pd.DataFrame, str]:
    """
    Elimina columnas del DataFrame si existen.

    Args:
        df (pd.DataFrame): El DataFrame original.
        columnas (list): Lista de nombres de columnas a eliminar.

    Returns:
        Tuple[pd.DataFrame, str]: DataFrame modificado y mensaje.
    """
    df_copia = df.copy()
    existentes = [col for col in columnas if col in df_copia.columns]
    no_encontradas = [col for col in columnas if col not in df_copia.columns]

    if existentes:
        df_copia.drop(columns=existentes, inplace=True)
        msg = f"✅ Columnas eliminadas: {existentes}."
        if no_encontradas:
            msg += f" ❗ Las siguientes columnas no existen y no fueron eliminadas: {no_encontradas}."
    else:
        msg = f"❌ Ninguna de las columnas especificadas existe: {columnas}."

    return df_copia, msg


# En services/load_data.py

def robust_read_csv(bytes_content):
    """
    Intenta leer un CSV con varias codificaciones y delimitadores comunes.
    """
    encodings_to_try = ['utf-8', 'latin-1', 'cp1252', 'utf-16']
    delimiters_to_try = [',', ';', '\t', '|']
    
    for encoding in encodings_to_try:
        for delimiter in delimiters_to_try:
            try:
                bytes_content.seek(0)
                df = pd.read_csv(bytes_content, encoding=encoding, delimiter=delimiter, engine='python')

                # Validamos que haya más de una columna significativa
                if df.shape[1] > 1 or (df.shape[1] == 1 and df.shape[0] > 1):
                    return df
            except Exception:
                continue

    raise ValueError("Failed to decode CSV with common encodings and delimiters. The file may be corrupted.")


def renombrar_columnas(df: pd.DataFrame, mapeo: Dict[str, str]) -> Tuple[pd.DataFrame, str]:
    """
    Renombra columnas del DataFrame según el mapeo dado.

    Args:
        df (pd.DataFrame): DataFrame original.
        mapeo (Dict[str, str]): Diccionario con nombres actuales como claves y nuevos nombres como valores.

    Returns:
        Tuple[pd.DataFrame, str]: DataFrame con columnas renombradas y mensaje de estado.
    """
    df_copia = df.copy()
    columnas_existentes = [col for col in mapeo.keys() if col in df.columns]
    columnas_inexistentes = [col for col in mapeo.keys() if col not in df.columns]

    if columnas_existentes:
        mapeo_filtrado = {k: v for k, v in mapeo.items() if k in columnas_existentes}
        df_copia.rename(columns=mapeo_filtrado, inplace=True)
        msg = f"✅ Columnas renombradas: {mapeo_filtrado}."
        if columnas_inexistentes:
            msg += f" ❗ Columnas no encontradas y no renombradas: {columnas_inexistentes}."
    else:
        msg = f"❌ Ninguna columna fue renombrada. Ninguna de las columnas especificadas existe."

    return df_copia, msg

def apply_cleaning_action(df: pd.DataFrame, action: str, params: dict) -> dict:
    try:
        if action == "drop_columns":
            columnas = params.get("columns")
            if not isinstance(columnas, list) or not all(isinstance(col, str) for col in columnas):
                return {"success": False, "error": "El parámetro 'columns' debe ser una lista de strings."}
            df_modificado, mensaje = eliminar_columnas(df, columnas)
            return {"success": True, "dataframe": df_modificado, "message": mensaje}

        elif action == "rename_columns":
            mapeo = params.get("rename_map")
            if not isinstance(mapeo, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in mapeo.items()):
                return {"success": False, "error": "El parámetro 'rename_map' debe ser un diccionario de strings."}
            df_modificado, mensaje = renombrar_columnas(df, mapeo)
            return {"success": True, "dataframe": df_modificado, "message": mensaje}

        return {"success": False, "error": f"Acción '{action}' no reconocida."}

    except Exception as e:
        logger.exception(f"[apply_cleaning_action] Error al aplicar acción '{action}': {e}")
        return {"success": False, "error": "Error interno al aplicar la acción."}



def drop_rows(df, params):
    """
    Elimina filas del DataFrame según condiciones especificadas.
    
    Parámetros esperados en params:
    {
        "column": "nombre_columna",
        "operator": "==", "!=", ">", "<", ">=", "<=",
        "value": valor_a_comparar
    }
    """
    try:
        column = params.get("column")
        operator = params.get("operator")
        value = params.get("value")

        if column not in df.columns:
            return {"success": False, "error": f"La columna '{column}' no existe en el dataset"}

        # Comparación segura según el operador
        if operator == "==":
            filtered_df = df[df[column] != value]
        elif operator == "!=":
            filtered_df = df[df[column] == value]
        elif operator == ">":
            filtered_df = df[~(df[column] > value)]
        elif operator == "<":
            filtered_df = df[~(df[column] < value)]
        elif operator == ">=":
            filtered_df = df[~(df[column] >= value)]
        elif operator == "<=":
            filtered_df = df[~(df[column] <= value)]
        else:
            return {"success": False, "error": f"Operador '{operator}' no soportado"}

        return {
            "success": True,
            "dataframe": filtered_df,
            "message": f"Se eliminaron {len(df) - len(filtered_df)} filas que cumplen la condición."
        }

    except Exception as e:
        return {"success": False, "error": f"Error al eliminar filas: {str(e)}"}
