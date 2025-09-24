# services/visualize.py

import plotly.express as px
import pandas as pd
from typing import Dict, Any
import logging

import plotly.graph_objects as go


logger = logging.getLogger(__name__)

# ==============================================================================
# LÓGICA DE GRÁFICOS (VERSIÓN CORREGIDA Y ESTANDARIZADA)
# ==============================================================================
DEFAULT_STYLE = {
    'width': 800,
    'height': 600,
    'bgcolor': 'white',
    'font_color': 'black',
    'font_size': 14
}

def _aplicar_estilo(fig, **kwargs):
    """Aplica un estilo consistente a las figuras de Plotly."""
    style_params = {
        'width': kwargs.get('width', DEFAULT_STYLE['width']),
        'height': kwargs.get('height', DEFAULT_STYLE['height']),
        'plot_bgcolor': kwargs.get('bgcolor', DEFAULT_STYLE['bgcolor']),
        'paper_bgcolor': kwargs.get('bgcolor', DEFAULT_STYLE['bgcolor']),
        'font': {
            'color': kwargs.get('font_color', DEFAULT_STYLE['font_color']),
            'size': kwargs.get('font_size', DEFAULT_STYLE['font_size'])
        }
    }
    fig.update_layout(**style_params)
    return fig


def grafico_barras(df: pd.DataFrame, **kwargs):
    x = kwargs.get('x')
    y = kwargs.get('y') # La y puede venir o no
    color = kwargs.get('color')
    title = kwargs.get('title', 'Gráfico de Barras')

    # --- ¡ESTA ES LA LÓGICA CLAVE QUE FALTABA! ---
    df_para_grafico = df
    y_para_grafico = y
    
    # Si NO nos dan una columna 'y', significa que tenemos que contar los valores de 'x'
    if y is None and x:
        # 1. Contamos los valores únicos de la columna 'x'
        df_contado = df[x].value_counts().reset_index()
        # 2. Renombramos las columnas para que sean predecibles ('valor' y 'conteo')
        df_contado.columns = [x, 'conteo'] 
        
        # 3. Actualizamos las variables que usará Plotly
        df_para_grafico = df_contado
        y_para_grafico = 'conteo' # Ahora la 'y' es nuestra columna de conteo
        
    # --- FIN DE LA LÓGICA CLAVE ---

    labels = kwargs.get('labels', {x: x, y_para_grafico: y_para_grafico})

    # Ahora, creamos la figura usando las variables correctas
    fig = px.bar(
        df_para_grafico,
        x=x,
        y=y_para_grafico, # Usamos la 'y' que puede ser la original o 'conteo'
        color=color,
        text=y_para_grafico, # Muestra los valores sobre las barras
        title=title,
        labels=labels,
        color_discrete_sequence=px.colors.qualitative.Set2
    )

    # El resto de tu código de estilo se queda exactamente igual
    fig.update_traces(
        textposition='outside',
        marker_line_color='black',
        marker_line_width=0.5,
        opacity=0.85
    )
    fig.update_layout(
        title_font_size=20,
        xaxis_title=kwargs.get('xaxis_title', x),
        yaxis_title=kwargs.get('yaxis_title', y_para_grafico),
        plot_bgcolor='white',
        paper_bgcolor='white',
        margin=dict(l=40, r=40, t=60, b=40),
        font=dict(size=14),
        bargap=0.2
    )
    fig.update_xaxes(showgrid=False, tickangle=kwargs.get('tickangle', -45))
    fig.update_yaxes(showgrid=True, gridcolor='lightgray', zeroline=True)

    return fig

def grafico_scatter(df: pd.DataFrame, **kwargs):
    fig = px.scatter(df, x=kwargs.get('x'), y=kwargs.get('y'), color=kwargs.get('color'), size=kwargs.get('size'), hover_name=kwargs.get('hover'), title=kwargs.get('title'))
    return _aplicar_estilo(fig, **kwargs)

def grafico_boxplot(df: pd.DataFrame, **kwargs):
    fig = px.box(df, y=kwargs.get('y'), x=kwargs.get('x'), color=kwargs.get('color'), title=kwargs.get('title'))
    return _aplicar_estilo(fig, **kwargs)


def grafico_histograma(df: pd.DataFrame, **kwargs):
    x_col = kwargs.get('x')
    
    nbins = kwargs.get('nbins')
    if nbins is None:
        unique_values = df[x_col].nunique()
        if unique_values < 30:
            nbins = unique_values
        else:
            nbins = 30

    fig = px.histogram(df, x=x_col, nbins=nbins, title=kwargs.get('title'))
    
    mean_val = df[x_col].mean()
    fig.add_vline(x=mean_val, line_dash="dash", line_color="red", annotation_text=f"Media: {mean_val:.2f}")

    # --- INICIO DE LAS MEJORAS VISUALES ---

    # 1. Dibuja un borde fino y oscuro alrededor de cada barra para separarlas visualmente.
    fig.update_traces(marker_line_width=1, marker_line_color='black')

    # 2. Añade un pequeño espacio (20%) entre las barras del histograma.
    fig.update_layout(bargap=0.2)

    # --- FIN DE LAS MEJORAS VISUALES ---

    return _aplicar_estilo(fig, **kwargs)

def grafico_pie(df: pd.DataFrame, **kwargs):
    """Genera un gráfico circular basado en el conteo de una columna."""
    columna_valores = kwargs.get('x') # La columna a contar
    
    # Plotly Express puede calcular los conteos directamente,
    # pero es más robusto si los calculamos nosotros para tener más control.
    df_contado = df[columna_valores].value_counts().reset_index()
    df_contado.columns = ['categoria', 'conteo']

    fig = px.pie(
        df_contado,
        names='categoria',
        values='conteo',
        title=kwargs.get('title', f'Distribución de {columna_valores}')
    )
    return _aplicar_estilo(fig, **kwargs)
    

def grafico_lineas(df: pd.DataFrame, **kwargs):
    fig = px.line(df, x=kwargs.get('x'), y=kwargs.get('y'), color=kwargs.get('color'), title=kwargs.get('title'))
    return _aplicar_estilo(fig, **kwargs)

def grafico_mapa(df: pd.DataFrame, **kwargs):
    if not {'lat', 'lon'}.issubset(df.columns):
        raise ValueError("El DataFrame debe tener columnas 'lat' y 'lon'.")

    zoom = kwargs.get('zoom', 3)  

    fig = px.scatter_mapbox(
        df, lat='lat', lon='lon', 
        color=kwargs.get('color'), 
        size=kwargs.get('size'), 
        hover_name=kwargs.get('hover'),
        title=kwargs.get('title', 'Mapa Interactivo'), 
        zoom=zoom
    )
    fig.update_layout(mapbox_style="open-street-map")
    return _aplicar_estilo(fig, **kwargs)


def grafico_mosaico(df: pd.DataFrame, **kwargs):
    x, y = kwargs.get('x'), kwargs.get('y')
    tabla = df.groupby([x, y]).size().reset_index(name='count')
    fig = px.bar(tabla, x=x, y='count', color=y, title=kwargs.get('title'), barmode='stack')
    return _aplicar_estilo(fig, **kwargs)

def grafico_matriz_correlacion(df: pd.DataFrame, **kwargs):
    columnas = kwargs.get('columnas')
    
    if columnas is None:
        df_numerico = df.select_dtypes(include='number')
        if df_numerico.shape[1] > 20:
            df_numerico = df_numerico.iloc[:, :20]
        df_corr = df_numerico.corr()
    else:
        df_corr = df[columnas].corr()
    
    fig = px.imshow(
        df_corr,
        text_auto=True,
        aspect="auto",
        color_continuous_scale='RdBu_r',
        title=kwargs.get('title')
    )
    return _aplicar_estilo(fig, **kwargs)


def grafico_matriz_scatter(df: pd.DataFrame, **kwargs):
    # Por defecto, usa todas las columnas numéricas.
    # Es bueno limitar el número para que no sea muy lento/grande.
    columnas_numericas = df.select_dtypes(include='number').columns.tolist()
    if len(columnas_numericas) > 7: # Un límite razonable
        columnas_numericas = columnas_numericas[:7]
        
    fig = px.scatter_matrix(
        df,
        dimensions=columnas_numericas,
        color=kwargs.get('color'), # Puedes colorear por una categoría
        title=kwargs.get('title', 'Matriz de Gráficos de Dispersión')
    )
    # Los pair plots pueden necesitar más espacio
    fig.update_layout(width=1000, height=1000)
    return _aplicar_estilo(fig, **kwargs)


def grafico_treemap_categorico(df: pd.DataFrame, **kwargs):
    # 1. Obtenemos las dos columnas categóricas
    path_col_1 = kwargs.get('x') # La primera categoría
    path_col_2 = kwargs.get('y') # La segunda categoría
    
    if not path_col_1 or not path_col_2:
        return {"success": False, "error": "Se requieren dos columnas categóricas."}

    # 2. Plotly Express hace todo el trabajo pesado.
    #    'path' define la jerarquía de los rectángulos.
    #    'values' podría ser una columna numérica para sumar, pero si no se especifica,
    #    Plotly contará las filas, que es lo que queremos.
    fig = px.treemap(
        df, 
        path=[px.Constant("Todas las categorías"), path_col_1, path_col_2],
        title=kwargs.get('title', f'Distribución de {path_col_1} por {path_col_2}')
    )
    
    fig.update_traces(root_color="lightgrey")
    fig.update_layout(margin = dict(t=50, l=25, r=25, b=25))
    return _aplicar_estilo(fig, **kwargs)

def grafico_violin(df: pd.DataFrame, **kwargs):
    """Genera un gráfico de violín para una columna numérica."""
    columna_y = kwargs.get('y') # La columna numérica a visualizar

    fig = px.violin(
        df,
        y=columna_y,
        box=True, # Muestra el box plot dentro del violín
        points="all", # Muestra todos los puntos de datos
        title=kwargs.get('title', f'Distribución de {columna_y}')
    )
    return _aplicar_estilo(fig, **kwargs)


# ==============================================================================
# FUNCIÓN DISPATCHER PRINCIPAL
# ==============================================================================

PLOT_GENERATORS = {
    "bar": grafico_barras,
    "scatter": grafico_scatter,
    "boxplot": grafico_boxplot,
    "histogram": grafico_histograma,
    "pie": grafico_pie,
    "line": grafico_lineas,
    "map": grafico_mapa,
    "mosaic": grafico_mosaico,
    "correlation_matrix": grafico_matriz_correlacion,
    "pair_plot": grafico_matriz_scatter,
    "treemap": grafico_treemap_categorico,
    "violin": grafico_violin,
   
    
}

def generate_plot(df: pd.DataFrame, plot_type: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Genera una especificación JSON de un gráfico Plotly.
    """
    if not isinstance(df, pd.DataFrame):
        return {"success": False, "error": "El objeto proporcionado no es un DataFrame válido."}

    if plot_type not in PLOT_GENERATORS:
        return {"success": False, "error": f"Tipo de gráfico '{plot_type}' no soportado."}

    # Validación de columnas movida aquí para mayor seguridad
    required_cols = [v for k, v in params.items() if k in ['x', 'y', 'color', 'size', 'hover'] and isinstance(v, str)]
    if 'columnas' in params and params['columnas'] is not None:
        required_cols.extend(params['columnas'])

    for col in required_cols:
        if col not in df.columns:
            return {"success": False, "error": f"La columna '{col}' no existe en los datos."}
    
    try:
        generator_func = PLOT_GENERATORS[plot_type]
        # Pasamos el diccionario completo de parámetros a la función generadora
        fig = generator_func(df, **params)
        
        fig_json = fig.to_json()
        
        return {"success": True, "plot_spec": fig_json}

    except Exception as e:
        logger.exception("Error al generar el gráfico")
        return {"success": False, "error": f"Error al generar el gráfico: {e}"}

