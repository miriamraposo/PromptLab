# clean_text.py

import pandas as pd
import re
from unidecode import unidecode
from sklearn.preprocessing import LabelEncoder
import logging
from typing import Tuple # <-- Asegúrate de tener esta importación

# Configuración del log
logging.basicConfig(level=logging.INFO)
# logging.getLogger().setLevel(logging.DEBUG)

# ===================== 1. FUNCIONES DE ANÁLISIS =====================


def valores_unicos_y_conteo(df: pd.DataFrame, columna: str) -> tuple[pd.DataFrame, str]:
    """
    Calcula el conteo de valores únicos para una columna y devuelve un DataFrame
    con nombres de columna ESTANDARIZADOS ('valor', 'conteo').
    """
    if columna not in df.columns:
        # En lugar de raise, devolvemos None y un mensaje de error para manejo en el endpoint
        return None, f"La columna '{columna}' no existe."
    
    # 1. Hacemos el conteo y convertimos a DataFrame
    value_counts_df = df[columna].value_counts(dropna=False).reset_index()
    
    # 2. Asignamos nombres de columna fijos y predecibles
    #    value_counts_df.columns[0] siempre será la columna de valores (antes 'index')
    #    value_counts_df.columns[1] siempre será la columna de conteos
    value_counts_df.columns = ['valor', 'conteo']

def detectar_tipos_columnas(df: pd.DataFrame) -> tuple[list, list]:
    """Devuelve listas de columnas categóricas y numéricas."""
    categoricas = df.select_dtypes(
        include=['object', 'category']).columns.tolist()
    numericas = df.select_dtypes(include=['int64', 'float64']).columns.tolist()
    return categoricas, numericas
    
    
    return value_counts_df, "Conteo de valores únicos calculado exitosamente."

def describe_categoricas(df: pd.DataFrame) -> pd.DataFrame:
    """Genera estadísticas descriptivas para todas las columnas categóricas."""
    categoricas = df.select_dtypes(include=['object', 'category']).columns
    if categoricas.empty:
        return pd.DataFrame(columns=['count', 'unique', 'top', 'freq'])
    return df[categoricas].describe().T


def valores_poco_frecuentes(df: pd.DataFrame, columna: str, umbral: float = 0.01) -> pd.DataFrame:
    """Encuentra valores con una frecuencia menor al umbral en una columna."""
    if columna not in df.columns:
        raise ValueError(f"La columna '{columna}' no existe.")
    total = len(df)
    conteos = df[columna].value_counts()
    frecuencias = conteos / total
    raras = frecuencias[frecuencias < umbral]
    return pd.DataFrame({
        'cantidad': conteos[raras.index],
        'porcentaje': raras
    })

# ===================== 2. LIMPIEZA Y TRANSFORMACIÓN =====================


def _limpiar_texto_individual(texto: str) -> str:
    """Limpia un valor de texto individual: minúsculas, sin acentos ni símbolos raros."""
    if not isinstance(texto, str):
        return texto
    original = texto
    texto = texto.strip().lower()
    texto = unidecode(texto)
    texto = re.sub(r"[^a-z0-9\s-]", "", texto)
    texto = re.sub(r"\s+", " ", texto).strip()
    
    if logging.getLogger().level == logging.DEBUG:
        logging.debug(f"Limpieza aplicada: '{original}' → '{texto}'")
    
    return texto


def limpiar_columnas_categoricas(df: pd.DataFrame, columnas: list) -> Tuple[pd.DataFrame, str]: # <-- CAMBIO 1
    """Limpia múltiples columnas categóricas del DataFrame."""
    df_copia = df.copy()
    for col in columnas:
        if col in df_copia.columns and df_copia[col].dtype == 'object':
            logging.info(f"Limpieza iniciada en columna: {col}")
            df_copia[col] = df_copia[col].apply(_limpiar_texto_individual)
    
    # <-- CAMBIO 2
    message = f"✅ Formato estandarizado para las columnas: {', '.join(columnas)}."
    return df_copia, message



def reemplazar_valores_con_diccionario(df: pd.DataFrame, columna: str, mapeo: dict) -> Tuple[pd.DataFrame, str]: # <-- CAMBIO 1
    """Reemplaza valores de una columna con un diccionario."""
    df_copia = df.copy()
    if columna in df_copia.columns:
        df_copia[columna] = df_copia[columna].replace(mapeo)
    
    # <-- CAMBIO 2
    message = f"✅ Valores reemplazados en la columna '{columna}'."
    return df_copia, message

# ===================== 3. IMPUTACIÓN =====================


def imputar_moda(df: pd.DataFrame, columna: str) -> Tuple[pd.DataFrame, str]:
    """
    Imputa valores nulos en una columna categórica usando la moda (el valor más frecuente).
    """
    if columna not in df.columns:
        return df, f"❌ Error: La columna '{columna}' no existe."

    df_copia = df.copy()
    
    # Comprobación de seguridad por si la columna está completamente vacía
    if df_copia[columna].mode().empty:
        message = f"⚠️ No se pudo calcular la moda para '{columna}' (posiblemente vacía). No se imputó nada."
        return df_copia, message
        
    moda = df_copia[columna].mode()[0]
    
    nulos_antes = df_copia[columna].isnull().sum()
    if nulos_antes == 0:
        message = f"✅ La columna '{columna}' no tenía nulos."
        return df_copia, message

    df_copia[columna] = df_copia[columna].fillna(moda)
    
    message = f"✅ Se imputaron {nulos_antes} nulos en '{columna}' con la moda ('{moda}')."
    
    # --- LA LÍNEA MÁS IMPORTANTE ---
    # Ahora devuelves DOS cosas: el DataFrame modificado y un mensaje.
    return df_copia, message

# ===================== 4. ENCODING =====================


def aplicar_codificacion(df: pd.DataFrame, columna: str, metodo: str = 'label', target_col: str = None) -> pd.DataFrame:
    """Aplica codificación a una columna categórica."""
    df_copia = df.copy()
    if columna not in df_copia.columns:
        raise ValueError(f"La columna '{columna}' no existe.")
    if metodo == 'label':
        df_copia[columna] = _codificar_label(df_copia[columna])
    elif metodo == 'one_hot':
        dummies = pd.get_dummies(
            df_copia[columna], prefix=columna, drop_first=True)
        df_copia = pd.concat(
            [df_copia.drop(columns=[columna]), dummies], axis=1)
    elif metodo == 'frecuencia':
        df_copia[columna] = _codificar_frecuencia(df_copia[columna])
    elif metodo == 'target_mean':
        if target_col is None or target_col not in df_copia.columns:
            raise ValueError(
                "Para 'target_mean' se requiere una columna 'target_col' válida.")
        df_copia[columna] = _codificar_target_mean(
            df_copia[columna], df_copia[target_col])
    else:
        raise ValueError(f"Método '{metodo}' no soportado.")
    return df_copia

# --- Helpers ---


def _codificar_label(serie: pd.Series) -> pd.Series:
    le = LabelEncoder()
    if serie.dropna().empty:
        return serie
    codificada = pd.Series(le.fit_transform(
        serie.dropna()), index=serie.dropna().index)
    return codificada.reindex(serie.index)


def _codificar_frecuencia(serie: pd.Series) -> pd.Series:
    frecs = serie.value_counts(normalize=True)
    return serie.map(frecs)


def _codificar_target_mean(col_categorica: pd.Series, col_target: pd.Series) -> pd.Series:
    medias = col_target.groupby(col_categorica).mean()
    return col_categorica.map(medias)

# ===================== 5. UTILIDAD =====================




# --- FUNCIÓN CORREGIDA ---
def imputar_constante(df: pd.DataFrame, columna: str, valor: str) -> Tuple[pd.DataFrame, str]: # <-- CAMBIO 1
    """Imputa valores nulos en una columna con una constante proporcionada."""
    df_copia = df.copy() # <-- CAMBIO 3: Trabajar sobre una copia por seguridad
    
    if columna not in df_copia.columns: # <-- CAMBIO 4: Añadir validación
        return df, f"❌ Error: La columna '{columna}' no existe."

    null_count = df_copia[columna].isnull().sum()
    if null_count == 0:
        return df_copia, f"✅ No hay valores nulos que imputar en la columna '{columna}'."
    
    df_copia[columna] = df_copia[columna].fillna(valor)
    mensaje = f"✅ Se imputaron {null_count} valores nulos en '{columna}' con el valor '{valor}'."
    return df_copia, mensaje