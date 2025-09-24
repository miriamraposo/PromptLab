# =========================================================
# Archivo: promptlab_backend/vision_processor.py
# Microservicio Flask para análisis de imágenes con OpenCV + HuggingFace
# =========================================================

import cv2
import numpy as np
from sklearn.cluster import KMeans
import os
import logging
import requests
import google.generativeai as genai
from PIL import Image ,ImageFont, ImageDraw
import io
import base64
import textwrap
from requests.adapters import HTTPAdapter, Retry
import requests
from rembg import remove
import gc # Necesitarás importar el garbage collector
import cv2
import pytesseract
from PIL import Image
import io
import gc
import io
import json



MAX_IMAGE_SIZE = 1024 # Reducción máxima de resolución (px)

# -----------------------
# Configuración general
# -----------------------
MODEL_API_URL = "https://api-inference.huggingface.co/models/<TU_MODELO>"
MAX_PROMPT_LENGTH = 500  # Limite de caracteres del prompt
REQUEST_TIMEOUT = 120    # Timeout en segundos


# Configuración de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger(__name__)


# =========================================================
# Funciones auxiliares
# =========================================================
def analizar_calidad_blur(imagen):
    """Calcula un score de calidad basado en el nivel de desenfoque."""
    try:
        gray = cv2.cvtColor(imagen, cv2.COLOR_BGR2GRAY)
        score = cv2.Laplacian(gray, cv2.CV_64F).var()
        return round(float(score), 2)
    except Exception as e:
        logger.error(f"Error analizando blur: {e}")
        return None


def extraer_color_dominante(imagen, k=3):
    """Extrae el color dominante usando KMeans y lo devuelve en HEX."""
    try:
        imagen_reducida = cv2.resize(imagen, (150, 150), interpolation=cv2.INTER_AREA)
        data = imagen_reducida.reshape((-1, 3))

        kmeans = KMeans(n_clusters=k, n_init="auto", random_state=42)
        kmeans.fit(data)
        colors = kmeans.cluster_centers_
        counts = np.bincount(kmeans.labels_)

        dominant = colors[np.argmax(counts)]
        r, g, b = [int(c) for c in dominant]

        return f"#{r:02x}{g:02x}{b:02x}"
    except Exception as e:
        logger.error(f"Error extrayendo color dominante: {e}")
        return None


def analizar_imagen_con_gemini(imagen_bytes):
    """
    Analiza una imagen usando la API de Gemini Pro Vision y devuelve una descripción.
    """
    try:
        # 1. Configurar el cliente usando la API Key que ya tienes en .env
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {"error": "No se encontró la GOOGLE_API_KEY."}
        
        genai.configure(api_key=api_key)
        
        # 2. Cargar la imagen en un formato que Gemini entienda
        img = Image.open(io.BytesIO(imagen_bytes))
        
        # 3. Crear el modelo y hacer la petición
        # Le pasamos la imagen y un prompt de texto pidiéndole que la describa
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        prompt = "Describe los objetos, el escenario y las características principales de esta imagen en una frase concisa."
        
        response = model.generate_content([prompt, img])
        
        # 4. Procesar la respuesta y devolverla en nuestro formato
        # En lugar de contar objetos, guardamos la descripción generada por IA
        description = response.text.strip()
        
        return {"gemini_description": description}

    except Exception as e:
        logger.error(f"Error llamando a la API de Gemini Vision: {e}")
        return {"error": str(e)}
        
def procesar_imagen_completa(imagen_bytes, nombre_archivo, model_manager_instance, image_id=None):
    """
    Orquesta el análisis completo de una imagen.
    VERSIÓN CORREGIDA Y FINAL.
    Usa OpenCV + funciones locales + un modelo de Hugging Face vía ModelManager.
    """
    try:
        # --- PASO 1: DECODIFICAR IMAGEN ---
        nparr = np.frombuffer(imagen_bytes, np.uint8)
        imagen_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if imagen_cv is None:
            return {"nombre_archivo": nombre_archivo, "error": "No se pudo leer la imagen."}

        # --- PASO 2: ANÁLISIS LOCAL (calidad y color) ---
        calidad = analizar_calidad_blur(imagen_cv)
        color_dominante = extraer_color_dominante(imagen_cv)

        # Creamos el diccionario base
        resultado_final = {
            "nombre_archivo": nombre_archivo,
            "calidad_blur": calidad,
            "color_dominante_hex": color_dominante
        }

        # Si se pasa un ID de imagen, lo agregamos al resultado
        if image_id:
            resultado_final['image_id'] = image_id

        # --- PASO 3: ANÁLISIS DE CONTENIDO CON IA LOCAL ---
        analysis_result_local, error_local = analizar_contenido_imagen_localmente(
            imagen_bytes,
            model_manager_instance=model_manager_instance
        )

        # --- PASO 4: INTEGRACIÓN DE RESULTADOS ---
        if error_local:
            resultado_final["detection_error"] = error_local

        if analysis_result_local and "etiquetas" in analysis_result_local:
            # Tomamos las 3 etiquetas principales para descripción
            top_labels = [label['descripcion'] for label in analysis_result_local['etiquetas'][:3]]
            resultado_final['descripcion_ia'] = ", ".join(top_labels)

            # Guardamos todas las etiquetas para más detalle
            resultado_final['tags_ia'] = analysis_result_local['etiquetas']

        return resultado_final

    except Exception as e:
        logger.error(f"Error procesando imagen {nombre_archivo}: {e}", exc_info=True)
        return {"nombre_archivo": nombre_archivo, "error": str(e)}


def procesaremos_imagen_completa(imagen_bytes, nombre_archivo, model_manager_instance, image_id=None):
    """
    Orquesta el análisis de una imagen.
    VERSIÓN SIMPLIFICADA: No utiliza el modelo pesado de clasificación de imágenes.
    Solo realiza análisis locales con OpenCV.
    """
    try:
        # --- PASO 1: DECODIFICAR IMAGEN ---
        nparr = np.frombuffer(imagen_bytes, np.uint8)
        imagen_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if imagen_cv is None:
            return {"nombre_archivo": nombre_archivo, "error": "No se pudo leer la imagen."}

        # --- PASO 2: ANÁLISIS LOCAL (calidad y color) ---
        calidad = analizar_calidad_blur(imagen_cv)
        color_dominante = extraer_color_dominante(imagen_cv)

        # Creamos el diccionario base
        resultado_final = {
            "nombre_archivo": nombre_archivo,
            "calidad_blur": calidad,
            "color_dominante_hex": color_dominante
        }

        # Si se pasa un ID de imagen, lo agregamos al resultado
        if image_id:
            resultado_final['image_id'] = image_id

        # ===================================================================
        # --- PASO 3: DESCONECTAMOS EL ANÁLISIS CON IA PESADO ---
        #
        # La siguiente línea es la que causaba la carga del modelo BEIT.
        # La comentamos para evitarlo.
        #
        # analysis_result_local, error_local = analizar_contenido_imagen_localmente(
        #     imagen_bytes,
        #     model_manager_instance=model_manager_instance
        # )
        # ===================================================================

        # --- PASO 4: VALORES POR DEFECTO PARA EL CSV ---
        # Como ya no tenemos el análisis de IA, debemos proporcionar valores
        # por defecto para que la estructura del CSV no se rompa.
        resultado_final['descripcion_ia'] = f"Imagen: {nombre_archivo}"
        resultado_final['tags_ia'] = [] # Una lista vacía

        return resultado_final

    except Exception as e:
        logger.error(f"Error procesando imagen {nombre_archivo}: {e}", exc_info=True)
        return {"nombre_archivo": nombre_archivo, "error": str(e)}
# =========================================================
# NUEVA SECCIÓN: GENERACIÓN DE IMÁGENES
# =========================================================

# Elige un modelo de la biblioteca de Hugging Face. Stable Diffusion XL es una gran opción.
MODEL_API_URL = "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0"



# --- Cache de fuente global ---
_FONT_CACHE = {}

def cargar_fuente(font_size: int, font_name: str = "impact"):
    """Carga una fuente específica con fallback y cache."""
    global _FONT_CACHE
    cache_key = f"{font_name}-{font_size}"
    if cache_key in _FONT_CACHE:
        return _FONT_CACHE[cache_key]

    FUENTES_DISPONIBLES = {
        "impact": "assets/impact.ttf",
        "arial": "assets/arial.ttf",
        "comic_sans": "assets/comic.ttf"
    }

    ruta_seleccionada = FUENTES_DISPONIBLES.get(
        font_name.lower(), FUENTES_DISPONIBLES["impact"]
    )

    rutas_fuentes = [
        ruta_seleccionada,
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]

    for ruta in rutas_fuentes:
        try:
            font = ImageFont.truetype(ruta, size=font_size)
            _FONT_CACHE[cache_key] = font
            return font
        except IOError:
            continue

    logger.warning(f"⚠️ No se encontró la fuente '{font_name}'. Usando default.")
    font = ImageFont.load_default()
    _FONT_CACHE[cache_key] = font
    return font


def dibujar_texto_con_borde(draw, posicion, texto, font, fill, stroke_fill, stroke_width=3):
    """Dibuja texto con borde para estilo meme."""
    draw.text(
        posicion,
        texto,
        font=font,
        fill=fill,
        stroke_fill=stroke_fill,
        stroke_width=stroke_width,
        align="center"
    )

def crear_meme(
    imagen_bytes: bytes,
    texto_arriba: str,
    texto_abajo: str,
    color_relleno: str = "white",
    color_borde: str = "black",
    nombre_fuente: str = "impact",
    font_size_override: int = None,
):
    """
    Genera un meme con texto arriba y abajo.
    Permite personalizar colores, fuente y tamaño.
    Devuelve: {"imagen": bytes}, None en éxito | None, str(error) en fallo.
    """
    try:
        # Validación mínima
        if not imagen_bytes:
            return None, "No se recibió imagen."

        # Abrimos imagen y normalizamos a RGBA
        img = Image.open(io.BytesIO(imagen_bytes)).convert("RGBA")
        width, height = img.size
        draw = ImageDraw.Draw(img)

        # --- Lógica de tamaño de fuente ---
        if font_size_override and isinstance(font_size_override, int) and font_size_override > 0:
            font_size = font_size_override
        else:
            # Escalamos según ancho de la imagen (~1/10 típico en memes)
            font_size = max(20, int(width / 10))

        font = cargar_fuente(font_size, nombre_fuente)

        # --- Render de texto superior ---
        if texto_arriba:
            wrapped = textwrap.wrap(texto_arriba, width=20)
            y = 10
            for linea in wrapped:
                bbox = draw.textbbox((0, 0), linea, font=font)
                x = (width - (bbox[2] - bbox[0])) / 2
                dibujar_texto_con_borde(draw, (x, y), linea, font, color_relleno, color_borde)
                y += (bbox[3] - bbox[1]) + 5

        # --- Render de texto inferior (mejorado con altura real) ---
        if texto_abajo:
            wrapped = textwrap.wrap(texto_abajo, width=20)

            # Medimos el bloque completo
            bloque_de_texto = "\n".join(wrapped)
            bbox_bloque = draw.textbbox((0, 0), bloque_de_texto, font=font)
            altura_total_real = bbox_bloque[3] - bbox_bloque[1]

            # Posición inicial basada en altura real
            y = max(10, height - altura_total_real - 10)

            for linea in wrapped:
                bbox_linea = draw.textbbox((0, 0), linea, font=font)
                x = (width - (bbox_linea[2] - bbox_linea[0])) / 2
                dibujar_texto_con_borde(draw, (x, y), linea, font, color_relleno, color_borde)
                y += (bbox_linea[3] - bbox_linea[1]) + 5

        # Export a PNG en memoria
        output = io.BytesIO()
        img.save(output, format="PNG", optimize=True)
        return {"imagen": output.getvalue()}, None

    except Exception as e:
        logger.exception(f"❌ Error en crear_meme: {e}")
        return None, f"Error en crear_meme: {str(e)}"


# =========================================================
# NUEVA SECCIÓN: ANÁLISIS DE IMÁGENES PARA PREDICCIONES
# =========================================================



def analizar_contenido_imagen_google(imagen_bytes: bytes):
    """
    Usa Google Cloud Vision API para extraer etiquetas, objetos y texto de una imagen.
    Esta función es la base para el módulo de predicciones.
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return None, "No se encontró la GOOGLE_API_KEY."
        
        # Google Vision API requiere la imagen en formato base64
        imagen_b64 = base64.b64encode(imagen_bytes).decode('utf-8')
        
        url = f"https://vision.googleapis.com/v1/images:annotate?key={api_key}"
        
        # Construimos la petición solicitando las características que nos interesan
        request_body = {
            "requests": [
                {
                    "image": {
                        "content": imagen_b64
                    },
                    "features": [
                        { "type": "LABEL_DETECTION", "maxResults": 10 },      # Etiquetas generales
                        { "type": "OBJECT_LOCALIZATION", "maxResults": 5 },   # Objetos específicos
                        { "type": "TEXT_DETECTION" }                          # OCR
                    ]
                }
            ]
        }
        
        logger.info("Enviando imagen a Google Cloud Vision API para análisis de contenido...")
        response = requests.post(url, json=request_body, timeout=30)
        
        if response.status_code != 200:
            error_msg = f"Error en API de Google Vision: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return None, error_msg

        data = response.json()
        
        # Procesamos la respuesta para devolver un diccionario limpio
        resultado = {}
        annotations = data['responses'][0]
        
        if 'labelAnnotations' in annotations:
            resultado['etiquetas'] = [
                {"descripcion": label['description'], "score": round(label['score'], 2)} 
                for label in annotations['labelAnnotations']
            ]
            
        if 'localizedObjectAnnotations' in annotations:
            resultado['objetos'] = [
                {"nombre": obj['name'], "score": round(obj['score'], 2)} 
                for obj in annotations['localizedObjectAnnotations']
            ]

        if 'textAnnotations' in annotations:
            # El primer resultado es el texto completo
            resultado['texto_detectado'] = annotations['textAnnotations'][0]['description'].replace('\n', ' ')
        
        logger.info("Análisis de contenido completado exitosamente.")
        return resultado, None

    except Exception as e:
        logger.error(f"Error inesperado en analizar_contenido_imagen_google: {e}")
        return None, str(e)
    

def download_image_from_url(url):
    """Descarga una imagen desde una URL y devuelve los bytes. Devuelve None si falla."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, timeout=10, headers=headers, stream=True)
        response.raise_for_status()
        return response.content
    except requests.exceptions.RequestException as e:
        logger.warning(f"No se pudo descargar la imagen desde {url}: {e}")
        return None



def combinar_imagenes(bytes_primer_plano: bytes, bytes_fondo: bytes) -> tuple[bytes | None, str | None]:
    """
    Combina una imagen de primer plano (con transparencia) sobre una de fondo.
    Retorna (bytes PNG, None) en éxito | (None, error) en fallo.
    """
    try:
        fg = Image.open(io.BytesIO(bytes_primer_plano)).convert("RGBA")
        bg = Image.open(io.BytesIO(bytes_fondo)).convert("RGBA")

        # Escalamos fondo al tamaño del primer plano
        bg = bg.resize(fg.size)

        # Combinamos usando el canal alpha
        bg.paste(fg, (0, 0), fg)

        output = io.BytesIO()
        bg.save(output, format="PNG", optimize=True)
        return output.getvalue(), None

    except Exception as e:
        logger.error(f"❌ Error al combinar imágenes: {e}", exc_info=True)
        return None, f"Error al combinar imágenes: {str(e)}"

def generar_imagen_desde_texto(prompt_texto: str):
    """
    Llama a la Inference API de Hugging Face para generar una imagen a partir de un texto.
    Devuelve: (bytes_imagen, None) en éxito | (None, mensaje_error) en fallo.
    """

    try:
        # --- Validaciones iniciales ---
        api_token = os.getenv("HF_TOKEN")
        if not api_token:
            logger.error("No se encontró la HF_TOKEN en el entorno.")
            return None, "Token de Hugging Face no configurado."

        if not prompt_texto or not prompt_texto.strip():
            return None, "El prompt no puede estar vacío."

        prompt_texto = prompt_texto.strip()
        if len(prompt_texto) > MAX_PROMPT_LENGTH:
            logger.warning("Prompt demasiado largo, truncando a 500 caracteres.")
            prompt_texto = prompt_texto[:MAX_PROMPT_LENGTH]

        headers = {"Authorization": f"Bearer {api_token}"}
        payload = {"inputs": prompt_texto}

        # --- Configurar reintentos ---
        session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        session.mount("https://", HTTPAdapter(max_retries=retries))

        logger.info(f"Enviando prompt a Hugging Face: '{prompt_texto}'")
        response = session.post(MODEL_API_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)

        # --- Validar respuesta ---
        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if content_type.startswith("image/"):
                logger.info("Imagen generada exitosamente desde Hugging Face.")
                return response.content, None
            else:
                error_msg = f"Respuesta inesperada de la API: {response.text}"
                logger.error(error_msg)
                return None, error_msg

        elif response.status_code == 503:
            logger.warning("Modelo de IA está cargando, intentar de nuevo más tarde.")
            return None, "El modelo de IA está cargando, por favor intenta nuevamente en unos momentos."

        else:
            error_msg = f"Error en API de Hugging Face: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return None, error_msg

    except requests.exceptions.Timeout:
        logger.error("Timeout: la solicitud a Hugging Face tardó demasiado.")
        return None, "La solicitud tardó demasiado, intenta nuevamente."

    except requests.exceptions.ConnectionError:
        logger.error("Error de conexión con Hugging Face.")
        return None, "No se pudo conectar a Hugging Face, verifica tu red."

    except Exception as e:
        logger.exception(f"Error inesperado en generar_imagen_desde_texto: {e}")
        return None, f"Error inesperado: {e}"




def generar_imagen_desde_texto(prompt_texto: str):
    """
    Llama a la Inference API de Hugging Face para generar una imagen a partir de un texto.
    Devuelve: (bytes_imagen, None) en éxito | (None, mensaje_error) en fallo.
    """
    try:
        # Validaciones iniciales
        api_token = os.getenv("HF_TOKEN")
        if not api_token:
            logger.error("No se encontró la HF_TOKEN en el entorno.")
            return None, "Token de Hugging Face no configurado."

        if not prompt_texto or not prompt_texto.strip():
            return None, "El prompt no puede estar vacío."

        prompt_texto = prompt_texto.strip()
        if len(prompt_texto) > MAX_PROMPT_LENGTH:
            logger.warning(f"Prompt demasiado largo, truncando a {MAX_PROMPT_LENGTH} caracteres.")
            prompt_texto = prompt_texto[:MAX_PROMPT_LENGTH]

        headers = {"Authorization": f"Bearer {api_token}"}
        payload = {"inputs": prompt_texto}

        # Configurar reintentos
        session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=2,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        session.mount("https://", HTTPAdapter(max_retries=retries))

        logger.info(f"Enviando prompt a Hugging Face: '{prompt_texto}'")
        response = session.post(MODEL_API_URL, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)

        # Validar respuesta
        if response.status_code == 200:
            content_type = response.headers.get("content-type", "")
            if content_type.startswith("image/"):
                logger.info("Imagen generada exitosamente desde Hugging Face.")
                return response.content, None
            else:
                error_msg = f"Respuesta inesperada de la API: {response.text}"
                logger.error(error_msg)
                return None, error_msg

        elif response.status_code == 503:
            logger.warning("Modelo de IA está cargando, intenta de nuevo más tarde.")
            return None, "El modelo de IA está cargando, intenta nuevamente en unos momentos."

        else:
            error_msg = f"Error en API de Hugging Face: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return None, error_msg

    except requests.exceptions.Timeout:
        logger.error("Timeout: la solicitud a Hugging Face tardó demasiado.")
        return None, "La solicitud tardó demasiado, intenta nuevamente."

    except requests.exceptions.ConnectionError:
        logger.error("Error de conexión con Hugging Face.")
        return None, "No se pudo conectar a Hugging Face, verifica tu red."

    except Exception as e:
        logger.exception(f"Error inesperado en generar_imagen_desde_texto: {e}")
        return None, f"Error inesperado: {e}"
    

def reducir_imagen(imagen: Image.Image) -> Image.Image:
    """Reduce la resolución de la imagen manteniendo proporciones."""
    imagen.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE))
    return imagen

# --- ESTA ES LA ÚNICA FUNCIÓN QUE REEMPLAZAMOS ---
def eliminar_fondo_imagen(imagen_bytes: bytes):
    """
    Remueve el fondo de una imagen usando la librería local `rembg`.
    Devuelve: (bytes_imagen, None) en éxito | (None, mensaje_error) en fallo.
    """
    try:
        logger.info("Procesando remoción de fondo localmente con rembg...")
        
        # 1. Abrir y reducir la imagen para optimizar
        input_image = Image.open(io.BytesIO(imagen_bytes)).convert("RGBA")
        input_image = reducir_imagen(input_image)

        # 2. Aplicar el modelo de remoción
        output_image = remove(input_image)

        # 3. Guardar el resultado en memoria
        output_buffer = io.BytesIO()
        output_image.save(output_buffer, format="PNG")
        
        result_bytes = output_buffer.getvalue()

        # 4. Liberar memoria explícitamente (buena práctica)
        del input_image, output_image, output_buffer
        gc.collect()

        logger.info("Fondo removido localmente con éxito.")
        return result_bytes, None

    except Exception as e:
        logger.exception(f"Error inesperado durante la remoción de fondo local: {e}")
        return None, f"Error inesperado al procesar la imagen localmente: {str(e)}"



def analizar_contenido_imagen_localmente(imagen_bytes: bytes, model_manager_instance):
    """
    Analiza una imagen usando una instancia del ModelManager que se pasa como parámetro.

    Args:
        imagen_bytes (bytes): Bytes de la imagen a analizar.
        model_manager_instance (ModelManager): Instancia del ModelManager.

    Returns:
        resultado (dict) : Diccionario con etiquetas y scores.
        error (str)      : Mensaje de error en caso de fallo, None si fue exitoso.
    """
    try:
        # --- PASO 1: Obtener la herramienta local de visión ---
        tool_response = model_manager_instance.get_tool("Local: Image Classifier (ViT)")

        if not tool_response.get("success"):
            error_msg = tool_response.get("error", "El modelo de imágenes no está disponible.")
            logger.warning(f"⚠️ Herramienta de visión no disponible: {error_msg}")
            return None, error_msg

        image_classifier_pipeline = tool_response.get("tool_object")

        # --- PASO 2: Abrir la imagen de manera segura ---
        try:
            img = Image.open(io.BytesIO(imagen_bytes))
            img = img.convert("RGB")  # Asegurar formato compatible con el pipeline
        except Exception as e_img:
            logger.error(f"Error al abrir o convertir la imagen: {e_img}", exc_info=True)
            return None, "La imagen no pudo ser procesada (formato inválido o corrupta)."

        # --- PASO 3: Clasificación ---
        # --- CAMBIO: Se anida un try-except específico para el KeyError ---
        try:
            labels = image_classifier_pipeline(img)
        except KeyError as e_key:
            # Este es el error específico que vimos en los logs.
            # Lo registramos como una advertencia pero no detenemos todo.
            logger.warning(f"Se encontró una etiqueta desconocida (KeyError: {e_key}) al procesar una imagen. Se ignorará la predicción.")
            # Devolvemos una lista vacía para que el proceso pueda continuar.
            labels = []
        except Exception as e_pipeline:
            # Mantenemos la captura para cualquier otro error del pipeline.
            logger.exception(f"Error ejecutando el pipeline de clasificación: {e_pipeline}")
            return None, f"Error ejecutando el modelo de clasificación: {str(e_pipeline)}"
        # --- FIN DEL CAMBIO ---

        # --- PASO 4: Formatear resultado ---
        # No se necesita cambiar nada aquí. Si 'labels' está vacía,
        # la lista por comprensión simplemente generará una lista vacía.
        resultado = {
            "etiquetas": [
                {"descripcion": label['label'].split(', ')[0], "score": round(label['score'], 2)}
                for label in labels
            ]
        }

        # --- PASO 5: Limpieza de memoria ---
        del img
        gc.collect()

        return resultado, None

    except Exception as e:
        logger.exception(f"Error inesperado en análisis de imagen local: {e}")
        return None, f"Error inesperado en análisis local: {str(e)}"


# --- ESPECIALISTA 1: DETECCIÓN DE OBJETOS CON YOLO ---
def detectar_objetos_con_yolo(imagen_bytes: bytes, model_manager_instance):
    try:
        tool_response = model_manager_instance.get_tool("Local: Object Detector (YOLOv8n)")
        if not tool_response.get("success"):
            return None, tool_response.get("error")

        yolo_model = tool_response.get("tool_object")
        img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")

        results = yolo_model.predict(img, conf=0.4)

        objetos = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = [int(coord) for coord in box.xyxy[0]]
                objetos.append({
                    "nombre": result.names[int(box.cls)],
                    "score": round(float(box.conf), 2),
                    "caja": [x1, y1, x2, y2]
                })
        return objetos, None

    except Exception as e:
        logger.exception("❌ Error en detección de objetos con YOLO")
        return None, str(e)


# --- ESPECIALISTA 2: ETIQUETADO CON BEIT ---
def etiquetar_imagen_con_beit(imagen_bytes: bytes, model_manager_instance):
    try:
        tool_response =  model_manager_instance.get_tool("Local: Image Classifier (ViT)")
        if not tool_response.get("success"):
            return None, tool_response.get("error")

        pipeline = tool_response.get("tool_object")
        img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
        labels = pipeline(img)

        resultado = [
            {"descripcion": l['label'].split(', ')[0], "score": round(l['score'], 2)}
            for l in labels
        ]
        return resultado, None

    except Exception as e:
        logger.exception("❌ Error en etiquetado con BEIT")
        return None, str(e)


# --- ESPECIALISTA 3: OCR CON TESSERACT ---
def extraer_texto_con_tesseract(imagen_bytes: bytes):
    try:
        img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
        texto = pytesseract.image_to_string(img, lang='spa+eng')
        texto_limpio = texto.replace('\n', ' ').strip()
        return texto_limpio, None

    except Exception as e:
        logger.exception("❌ Error en OCR con Tesseract")
        return None, str(e)


# --- DIRECTOR DE ORQUESTA ---
def analisis_completo_de_imagen(imagen_bytes: bytes, filename: str, model_manager_instance):
    """
    Función principal que orquesta el análisis completo de una imagen:
    1. Extrae metadatos
    2. Etiquetado general (BEIT)
    3. Detección de objetos (YOLO)
    4. OCR (Tesseract)
    """
    logger.info(f"🔬 Iniciando análisis completo para '{filename}'...")

    final_result = {
        "metadata": {},
        "tags_ia": [],
        "objetos_detectados": [],
        "texto_extraido": None,
        "errores": []
    }

    # 1. Metadatos básicos
    try:
        img = Image.open(io.BytesIO(imagen_bytes))
        final_result["metadata"] = {
            "dimensions": f"{img.width}x{img.height}",
            "size_kb": round(len(imagen_bytes) / 1024, 2),
            "filename": filename
        }
    except Exception as e:
        logger.exception("❌ Error extrayendo metadatos")
        final_result["errores"].append(f"Metadata: {str(e)}")

    # 2. Etiquetado (BEIT)
    etiquetas, err_etiquetas = etiquetar_imagen_con_beit(imagen_bytes, model_manager_instance)
    if err_etiquetas:
        final_result["errores"].append(f"Etiquetado: {err_etiquetas}")
    if etiquetas:
        final_result["tags_ia"] = etiquetas

    # 3. Detección de Objetos (YOLO)
    objetos, err_objetos = detectar_objetos_con_yolo(imagen_bytes, model_manager_instance)
    if err_objetos:
        final_result["errores"].append(f"Detección de Objetos: {err_objetos}")
    if objetos:
        final_result["objetos_detectados"] = objetos

    # 4. Extracción de Texto (Tesseract)
    texto, err_texto = extraer_texto_con_tesseract(imagen_bytes)
    if err_texto:
        final_result["errores"].append(f"OCR: {err_texto}")
    if texto:
        final_result["texto_extraido"] = texto

    logger.info(f"✅ Análisis completo para '{filename}' finalizado.")
    return final_result



def orquestar_edicion_avanzada(
    imagen_original_bytes: bytes,
    prompt_fondo_ia: str | None = None,
    fondo_personalizado_bytes: bytes | None = None,
) -> tuple[bytes | None, str | None]:
    """
    Orquesta el flujo completo de edición de imágenes:
    1. Elimina el fondo de la imagen original.
    2. Si se provee un fondo (personalizado o de IA), lo combina.
    3. Devuelve la imagen final.
    """

    if not imagen_original_bytes:
        return None, "No se recibió la imagen original."

    # --- Paso 1: eliminar fondo ---
    try:
        logger.info("🪄 Iniciando eliminación de fondo...")
        img_sin_fondo_bytes, err = eliminar_fondo_imagen(imagen_original_bytes)
        if err or not img_sin_fondo_bytes:
            logger.error(f"❌ Fallo en la eliminación de fondo: {err}")
            return None, f"Error al eliminar el fondo: {err}"
    except Exception as e:
        logger.error(f"❌ Excepción inesperada en eliminación de fondo: {e}", exc_info=True)
        return None, f"Error inesperado en eliminación de fondo: {str(e)}"

    # --- Paso 2: decidir fondo ---
    try:
        # Caso A: Fondo generado con IA
        if prompt_fondo_ia:
            logger.info(f"🤖 Generando fondo con IA (prompt='{prompt_fondo_ia}')...")
            fondo_bytes, err = generar_imagen_desde_texto(prompt_fondo_ia)
            if err or not fondo_bytes:
                logger.error(f"❌ Fallo al generar fondo con IA: {err}")
                return None, f"Error al generar el fondo con IA: {err}"

            logger.info("✨ Combinando con fondo generado por IA...")
            return combinar_imagenes(img_sin_fondo_bytes, fondo_bytes)

        # Caso B: Fondo personalizado subido
        if fondo_personalizado_bytes:
            logger.info("📂 Usando fondo personalizado proporcionado por el usuario...")
            return combinar_imagenes(img_sin_fondo_bytes, fondo_personalizado_bytes)

        # Caso C: No se especificó fondo
        logger.info("➡️ No se especificó fondo, devolviendo imagen sin fondo.")
        return img_sin_fondo_bytes, None

    except Exception as e:
        logger.error(f"❌ Error en orquestar_edicion_avanzada: {e}", exc_info=True)
        return None, f"Error en orquestar_edicion_avanzada: {str(e)}"


def extraer_datos_estructurados_con_gemini(imagen_bytes: bytes) -> dict:
    """
    Usa Gemini para analizar una imagen de un documento (factura, catálogo) y
    extraer datos estructurados en formato JSON.
    """
    try:
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            return {"error": "No se encontró la GOOGLE_API_KEY."}
        
        genai.configure(api_key=api_key)
        
        img = Image.open(io.BytesIO(imagen_bytes))
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        
        # --- ¡EL CAMBIO CLAVE ESTÁ AQUÍ, EN EL PROMPT! ---
        prompt = """
        Analiza la siguiente imagen de una página de un documento. 
        Identifica todos los items o entradas distintas (como productos en un catálogo o líneas en una factura). 
        Para cada item, extrae su descripción, SKU y precio si están disponibles.
        Devuelve el resultado SOLAMENTE como un array de objetos JSON dentro de un objeto JSON principal 
        con la clave "extracted_items". Si no encuentras items, devuelve un array vacío.
        Ejemplo de formato de salida: {"extracted_items": [{"descripcion": "...", "sku": "...", "precio": "..."}, ...]}
        """
        
        response = model.generate_content([prompt, img])
        
        # --- Procesamos la respuesta para obtener el JSON ---
        try:
            cleaned_response = response.text.strip().replace('```json', '').replace('```', '').strip()
            ia_result = json.loads(cleaned_response)
            return ia_result # Devolvemos el objeto JSON completo
        except (json.JSONDecodeError, AttributeError):
            logger.warning(f"Gemini no devolvió un JSON válido. Respuesta: {response.text}")
            return {"extracted_items": []} # Devolvemos una estructura vacía en caso de error

    except Exception as e:
        logger.error(f"Error llamando a la API de Gemini: {e}")
        return {"error": str(e)}