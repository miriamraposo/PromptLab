# clean_numericas.py

# ===================== IMPORTS =====================
import logging
from typing import Tuple, List, Optional, Any, Literal
import re
import numpy as np
import pandas as pd

# ===================== CONFIGURACIÓN DE LOGGING =====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
# logger.setLevel(logging.DEBUG)

# ===================== CONSTANTES =====================
MetodoReemplazoOutlier = Literal['limite', 'media', 'mediana']
MetodoImputacionNumerica = Literal['media', 'mediana', 'moda', 'cero']

# ===================== 1. FUNCIONES DE ANÁLISIS =====================


def detectar_columnas_posiblemente_numericas(df: pd.DataFrame, umbral_conversion: float = 0.8) -> List[str]:
    """
    Identifica columnas 'object' que probablemente contengan datos numéricos.

    Una columna se considera "posiblemente numérica" si más de un `umbral_conversion`
    de sus valores no nulos pueden ser convertidos a número.

    Args:
        df (pd.DataFrame): El DataFrame a analizar.
        umbral_conversion (float): El porcentaje mínimo de valores convertibles (0.0 a 1.0).

    Returns:
        List[str]: Una lista con los nombres de las columnas sospechosas.
    """
    sospechosas = []
    logger.info("Iniciando detección de columnas posiblemente numéricas...")
    columnas_objeto = df.select_dtypes(include=['object']).columns
    
    if not any(columnas_objeto):
        logger.info("No se encontraron columnas de tipo 'object' para analizar.")
        return []

    for col in columnas_objeto:
        muestra_limpia = df[col].dropna()
        if muestra_limpia.empty:
            continue

        convertidos = pd.to_numeric(muestra_limpia, errors='coerce')
        tasa_exito = 1 - (convertidos.isna().sum() / len(muestra_limpia))

        if tasa_exito >= umbral_conversion:
            logger.info(f"Columna '{col}' es posiblemente numérica (tasa de conversión: {tasa_exito:.2%})")
            sospechosas.append(col)
            
    return sospechosas

def obtener_estadisticas_descriptivas(df: pd.DataFrame, columna: str) -> Tuple[Optional[pd.Series], str]:
    """
    Obtiene estadísticas descriptivas para una columna numérica.

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): La columna a describir.

    Returns:
        Tuple[Optional[pd.Series], str]: Una tupla con la serie de descripción y un mensaje.
    """
    if columna not in df.columns:
        msg = f"La columna '{columna}' no existe."
        logger.error(msg)
        return None, f"❌ {msg}"

    if pd.api.types.is_numeric_dtype(df[columna]):
        descripcion = df[columna].describe()
        logger.info(f"Se generaron estadísticas descriptivas para la columna '{columna}'.")
        return descripcion, descripcion.to_string()
    else:
        msg = f"La función de estadísticas solo aplica a columnas numéricas. '{columna}' no lo es."
        logger.warning(msg)
        return None, f"⚠️ {msg}"

def detectar_outliers_iqr(df: pd.DataFrame, columna: str, factor: float = 1.5) -> Tuple[Optional[pd.DataFrame], str, Optional[float], Optional[float]]:
    """
    Detecta outliers en una columna numérica usando el método del Rango Intercuartílico (IQR).

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): La columna numérica a analizar.
        factor (float): El factor para multiplicar el IQR. Comúnmente 1.5.

    Returns:
        Tuple[Optional[pd.DataFrame], str, Optional[float], Optional[float]]:
        - Un DataFrame con las filas que son outliers.
        - Un mensaje descriptivo del resultado.
        - El límite inferior calculado.
        - El límite superior calculado.
    """
    if columna not in df.select_dtypes(include=np.number).columns:
        msg = f"Detección de outliers solo aplica a columnas numéricas. '{columna}' no lo es."
        logger.warning(msg)
        return None, f"⚠️ {msg}", None, None

    Q1 = df[columna].quantile(0.25)
    Q3 = df[columna].quantile(0.75)
    IQR = Q3 - Q1

    if IQR == 0:
        msg = f"No se detectaron outliers en '{columna}' (IQR es 0)."
        logger.info(msg)
        return pd.DataFrame(), f"✅ {msg}", None, None

    limite_inferior = Q1 - factor * IQR
    limite_superior = Q3 + factor * IQR

    outliers_df = df[(df[columna] < limite_inferior) | (df[columna] > limite_superior)]
    
    msg = (
        f"Se encontraron {len(outliers_df)} outliers en '{columna}'. "
        f"Límites: [{limite_inferior:.2f}, {limite_superior:.2f}]"
    )
    logger.info(msg)
    return outliers_df, msg, limite_inferior, limite_superior

# ===================== 2. TRANSFORMACIONES =====================

def convertir_a_numerico(df: pd.DataFrame, columna: str) -> Tuple[pd.DataFrame, str]:
    """
    Convierte una columna de un DataFrame a tipo numérico, manejando errores.

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): El nombre de la columna a convertir.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame modificado y un mensaje de estado.
    """
    df_copia = df.copy()
    if columna not in df_copia.columns:
        msg = f"La columna '{columna}' no existe."
        logger.error(msg)
        return df, f"❌ {msg}"

    if pd.api.types.is_numeric_dtype(df_copia[columna]):
        msg = f"La columna '{columna}' ya era de tipo numérico."
        logger.info(msg)
        return df_copia, f"✅ {msg}"

    original_nans = df_copia[columna].isna().sum()
    df_copia[columna] = pd.to_numeric(df_copia[columna], errors='coerce')
    nuevos_nans = df_copia[columna].isna().sum() - original_nans
    
    msg = f"Columna '{columna}' convertida a numérico. Se generaron {nuevos_nans} valores nulos."
    logger.info(msg)
    return df_copia, f"✅ {msg}"

def reemplazar_outliers(df: pd.DataFrame, columna: str, limite_inferior: float, limite_superior: float, metodo: MetodoReemplazoOutlier = 'limite') -> Tuple[pd.DataFrame, str]:
    """
    Reemplaza outliers de una columna por un valor calculado (capping o imputación).

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): La columna a tratar.
        limite_inferior (float): Límite inferior para considerar un valor como outlier.
        limite_superior (float): Límite superior para considerar un valor como outlier.
        metodo (MetodoReemplazoOutlier): Método a usar: 'limite', 'media', o 'mediana'.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame modificado y un mensaje de estado.
    """
    df_copia = df.copy()
    
    if metodo == 'limite':
        df_copia[columna] = df_copia[columna].clip(lower=limite_inferior, upper=limite_superior)
        mensaje = f"Outliers en '{columna}' reemplazados por los límites (capping)."
    elif metodo in ['media', 'mediana']:
        valores_validos = df_copia.loc[(df_copia[columna] >= limite_inferior) & (df_copia[columna] <= limite_superior), columna]
        valor = valores_validos.mean() if metodo == 'media' else valores_validos.median()
        df_copia[columna] = np.where(
            (df_copia[columna] < limite_inferior) | (df_copia[columna] > limite_superior),
            valor,
            df_copia[columna]
        )
        mensaje = f"Outliers en '{columna}' reemplazados con la {metodo} ({valor:.2f}) de los valores no atípicos."
    else:
        # Salvaguarda, aunque Literal previene esto
        msg = f"Método no válido '{metodo}'. Usa 'limite', 'media' o 'mediana'."
        logger.error(msg)
        return df, f"❌ {msg}"

    logger.info(mensaje)
    return df_copia, f"✅ {mensaje}"

# ===================== 3. IMPUTACIÓN =====================

def imputar_nulos_numericos(df: pd.DataFrame, columna: str, metodo: MetodoImputacionNumerica) -> Tuple[pd.DataFrame, str]:
    """
    Imputa valores nulos en una columna numérica usando un método estadístico.

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): La columna a imputar.
        metodo (MetodoImputacionNumerica): Método a usar: 'media', 'mediana', 'moda', o 'cero'.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame modificado y un mensaje de estado.
    """
    df_copia = df.copy()
    if columna not in df_copia.columns or not pd.api.types.is_numeric_dtype(df_copia[columna]):
        msg = f"La columna '{columna}' no es numérica o no existe."
        logger.warning(msg)
        return df, f"⚠️ {msg}"

    if metodo == 'media': valor = df_copia[columna].mean()
    elif metodo == 'mediana': valor = df_copia[columna].median()
    elif metodo == 'moda': valor = df_copia[columna].mode()[0] if not df_copia[columna].mode().empty else np.nan
    elif metodo == 'cero': valor = 0
    else:
        msg = f"Método '{metodo}' no reconocido."
        logger.error(msg)
        return df, f"❌ {msg}"

    if pd.isna(valor):
        msg = f"No se pudo calcular '{metodo}' para '{columna}'. No se imputó."
        logger.warning(msg)
        return df, f"⚠️ {msg}"

    df_copia[columna] = df_copia[columna].fillna(valor)
    msg = f"Nulos en '{columna}' imputados con {metodo} ({valor:.2f})."
    logger.info(msg)
    return df_copia, f"✅ {msg}"

def imputar_valor_manual(df: pd.DataFrame, columna: str, valor: Any) -> Tuple[pd.DataFrame, str]:
    """
    Imputa un valor específico en los nulos de una columna.

    Args:
        df (pd.DataFrame): El DataFrame de entrada.
        columna (str): La columna a imputar.
        valor (Any): El valor a usar para rellenar los nulos.

    Returns:
        Tuple[pd.DataFrame, str]: El DataFrame modificado y un mensaje de estado.
    """
    df_copia = df.copy()
    if columna not in df_copia.columns:
        msg = f"La columna '{columna}' no existe."
        logger.error(msg)
        return df, f"❌ {msg}"

    n_nulos = df_copia[columna].isna().sum()
    if n_nulos == 0:
        msg = f"La columna '{columna}' no contiene nulos. No se imputó nada."
        logger.info(msg)
        return df_copia, f"✅ {msg}"

    df_copia[columna] = df_copia[columna].fillna(valor)
    msg = f"Se imputaron {n_nulos} nulos en '{columna}' con el valor '{valor}'."
    logger.info(msg)
    return df_copia, f"✅ {msg}"






def convertir_a_entero(df: pd.DataFrame, columna: str) -> Tuple[pd.DataFrame, str]:
    """
    Intenta convertir una columna a tipo entero con soporte para nulos (Int64).
    """
    if columna not in df.columns:
        return df, f"❌ Error: La columna '{columna}' no existe."
    
    df_copia = df.copy()
    col_original = df_copia[columna].copy()
    
    # errors='coerce' convierte errores en NaN
    col_convertida = pd.to_numeric(col_original, errors='coerce')
    
    # Contamos la pérdida de datos
    nulos_antes = col_original.isnull().sum()
    nulos_despues = col_convertida.isnull().sum()
    nuevos_nulos = nulos_despues - nulos_antes
    
    # Convertimos a Int64 para permitir nulos. Los decimales se truncarán.
    df_copia[columna] = col_convertida.astype('Int64')
    
    message = f"✅ Se convirtió '{columna}' a entero. {nuevos_nulos} valores no válidos se transformaron en nulos."
    return df_copia, message

def convertir_a_flotante(df: pd.DataFrame, columna: str) -> Tuple[pd.DataFrame, str]:
    """
    Intenta convertir una columna a tipo flotante (con decimales).
    """
    if columna not in df.columns:
        return df, f"❌ Error: La columna '{columna}' no existe."
        
    df_copia = df.copy()
    col_original = df_copia[columna].copy()
    
    col_convertida = pd.to_numeric(col_original, errors='coerce')
    
    nulos_antes = col_original.isnull().sum()
    nulos_despues = col_convertida.isnull().sum()
    nuevos_nulos = nulos_despues - nulos_antes
    
    df_copia[columna] = col_convertida
    
    message = f"✅ Se convirtió '{columna}' a decimal. {nuevos_nulos} valores no válidos se transformaron en nulos."
    return df_copia, message


def convertir_a_float_robusto(col):
    def parsear(valor):
        if pd.isna(valor):
            return np.nan
        try:
            return float(valor)
        except:
            pass

        if isinstance(valor, str):
            # Extraer el primer número válido del string
            match = re.search(r"[-+]?\d*\.\d+|\d+", valor)
            if match:
                try:
                    return float(match.group())
                except:
                    return np.nan
        return np.nan

    return col.apply(parsear)

def convertir_columna_numerica(df, columna, tipo='float'):
    if tipo == 'float':
        return df[columna].astype(float)
    elif tipo == 'int':
        # Para int conviene primero limpiar NaNs y luego convertir:
        return df[columna].fillna(0).astype(int)
    else:
        raise ValueError("Tipo debe ser 'float' o 'int'")



def reemplazar_valor(df, columna, valor_a_reemplazar, nuevo_valor):
    df[columna] = df[columna].replace(valor_a_reemplazar, nuevo_valor)
    return df


def crear_columna_por_valor(
    df: pd.DataFrame, 
    columna_base: str, 
    valor: float, 
    operacion: str, 
    nueva_columna_nombre: str
) -> pd.DataFrame:
    """
    Crea una nueva columna como resultado de una operación
    entre una columna existente y un valor constante.
    """
    df_copia = df.copy()

    # Validación y conversión segura de la columna de entrada
    if columna_base not in df_copia.columns:
        raise ValueError(f"La columna '{columna_base}' no existe.")
    if not pd.api.types.is_numeric_dtype(df_copia[columna_base]):
        df_copia[columna_base] = pd.to_numeric(df_copia[columna_base], errors='coerce')

    # Diccionario de operaciones
    operaciones = {
        'sumar': df_copia[columna_base] + valor,
        'restar': df_copia[columna_base] - valor,
        'multiplicar': df_copia[columna_base] * valor,
        'dividir': df_copia[columna_base] / valor if valor != 0 else np.nan
    }
    
    if operacion not in operaciones:
        raise ValueError(f"Operación '{operacion}' no soportada.")

    df_copia[nueva_columna_nombre] = operaciones[operacion]
    return df_copia



def convertir_a_categorico(df: pd.DataFrame, columnas: Optional[List[str]] = None, 
                            auto: bool = False, umbral_unicos: int = 20) -> Tuple[pd.DataFrame, str]:
    """
    Convierte columnas a tipo categórico (texto), ya sea de forma manual o automática.
    
    Parámetros
    ----------
    df : pd.DataFrame
        DataFrame de entrada.
    columnas : list[str], opcional
        Lista de columnas a convertir manualmente. Ignorado si auto=True.
    auto : bool, por defecto False
        Si es True, detecta automáticamente columnas numéricas que parecen categóricas.
    umbral_unicos : int, por defecto 20
        Número máximo de valores únicos para considerar una columna numérica como categórica.
    
    Retorna
    -------
    Tuple[pd.DataFrame, str]
        - DataFrame con las columnas convertidas.
        - Mensaje descriptivo de las acciones realizadas.
    """
    
    df_copia = df.copy()
    columnas_convertidas = []

    if auto:
        # Detectar columnas numéricas con pocos valores únicos
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

    if not columnas_convertidas:
        return df_copia, "ℹ️ No se detectaron columnas para convertir."
    
    mensaje = f"✅ Columnas convertidas a texto: {', '.join(columnas_convertidas)}."
    return df_copia, mensaje

