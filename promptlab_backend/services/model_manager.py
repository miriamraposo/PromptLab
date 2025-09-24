import os
import torch
import gc
import threading
import logging
from collections import OrderedDict
from llama_cpp import Llama 
from transformers import pipeline
from ultralytics import YOLO
from typing import Optional
from ultralytics import YOLO
from services.clustering_service import ClusteringService

try:
    import google.generativeai as genai
except ImportError:
    genai = None

logger = logging.getLogger(__name__)

# --- PASO 1: Comentamos los modelos que NO vamos a usar para ahorrar RAM ---
LOCAL_MODEL_PATHS = {
    #"TinyLlama/TinyLlama-1.1B-Chat-v1.0": "./models/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
    # "google/gemma-2b-it": "./models/gemma-2b-it.Q4_K_M.gguf",
    # "microsoft/phi-2": "./models/phi-2.Q4_K_M.gguf",
    # "tiiuae/falcon-rw-1b": "./models/falcon-rw-1b.Q4_K_M.gguf"    
    
}

class ModelManager:
    # ... (El __new__ y el _lock no cambian) ...
    def __init__(self):
        self._lock = threading.Lock()
        logger.info("Inicializando ModelManager de alto rendimiento...")
        self._local_models_cache = {}
        self._api_clients_cache = {}
        self._image_classifier = None
        self._object_detector = None
        self._clustering_service = None 
       
        # --- PASO 2: Comentamos los modelos en la lista de herramientas disponibles ---
        # Dejamos solo el que SÍ vamos a cargar.
        self.AVAILABLE_TOOLS = {
            #"Local: TinyLlama (1.1B)": "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
              "API: Google Gemini Pro": "gemini-1.5-flash-latest",
              "Local: Image Classifier (ViT)": "google/vit-base-patch16-224",
              "Local: Object Detector (YOLOv8n)": "yolov8n.pt",
              "Local: Image Clustering (K-Means)": "clustering_kmeans"
            # "Local: Gemma (2B)": "google/gemma-2b-it",
            # "Local: Microsoft Phi-2 (2.7B)": "microsoft/phi-2",
            # "Local: Falcon (1B)": "tiiuae/falcon-rw-1b",
        }
        
        self._preload_all_local_models()

    def setup_api_keys(self, google_api_key=None):
        """Configura y valida la clave API para el cliente de Google."""
        if google_api_key and genai:
            try:
                genai.configure(api_key=google_api_key)
                self._api_clients_cache['google'] = genai 
                logger.info("✅ Cliente Google Generative AI configurado exitosamente.")
            except Exception as e:
                logger.error(f"❌ Fallo al configurar la API de Google: {e}")
        elif not genai:
            logger.warning("Librería de Google (google.generativeai) no encontrada. Instálala con 'pip install google-generativeai'")
        else:
            logger.warning("Clave API de Google no proporcionada. El modelo Gemini no estará disponible.")


    def _preload_all_local_models(self):
        """
        Carga TODOS los modelos locales GGUF en la RAM al iniciar la aplicación.
        Esto elimina la espera de minutos en cada petición.
        """
        logger.info("==== INICIANDO PRECARGA DE MODELOS LOCALES ====")
        for display_name, model_id in self.AVAILABLE_TOOLS.items():
            if display_name.startswith("Local:"):
                model_path = LOCAL_MODEL_PATHS.get(model_id)
                if model_path and os.path.exists(model_path):
                    logger.info(f"Cargando '{display_name}' desde '{model_path}'...")
                    try:
                        # Usamos llama-cpp-python para cargar el modelo
                        self._local_models_cache[model_id] = Llama(
                            model_path=model_path,
                            n_ctx=2048,      # Tamaño del contexto, ajústalo si es necesario
                            n_gpu_layers=-1, # Intenta usar la GPU si está disponible
                            verbose=False    # Para mantener los logs limpios
                        )
                        logger.info(f"✅ Modelo '{display_name}' listo y en memoria.")
                    except Exception as e:
                        logger.error(f"❌ Fallo al cargar el modelo '{display_name}': {e}")
                elif model_path:
                     logger.warning(f"⚠️ Archivo no encontrado: '{model_path}' para el modelo '{display_name}'. Saltando.")

        logger.info("==== PRECARGA DE MODELOS LOCALES COMPLETADA ====")


    def _get_or_load_clustering_service(self) -> Optional[ClusteringService]:
        """
        Carga bajo demanda el servicio de clustering de imágenes.
        Devuelve una instancia de ClusteringService lista para usarse, o None si ocurre un error.
        """
        if self._clustering_service is None:
            with self._lock:
                # Doble chequeo para entornos multihilo
                if self._clustering_service is None:
                    try:
                        logger.info("🚀 Cargando ClusteringService...")
                        self._clustering_service = ClusteringService()
                        logger.info("✅ ClusteringService cargado y listo.")
                    except Exception as e:
                        logger.exception("❌ Error al cargar el ClusteringService.")
                        self._clustering_service = None
        return self._clustering_service


    def preload_vision_models(self):
        """
        Precarga explícitamente los modelos de visión más pesados
        para evitar la carga durante una petición HTTP.
        """
        logger.info("==== INICIANDO PRECARGA DE MODELOS DE VISIÓN ====")
        
        # Llama a la función que carga el clasificador.
        # La lógica interna de "lazy loading" se encargará de la carga real.
        if self._get_or_load_image_classifier() is not None:
            logger.info("✅ Modelo de Clasificación de Imágenes (ViT) precargado.")
        else:
            logger.error("❌ Falló la precarga del Clasificador de Imágenes.")

        # Opcional: Si quieres precargar YOLO también, descomenta la siguiente línea.
        # if self._get_or_load_object_detector() is not None:
        #     logger.info("✅ Modelo de Detección de Objetos (YOLO) precargado.")
        # else:
        #     logger.error("❌ Falló la precarga del Detector de Objetos.")
            
        logger.info("==== PRECARGA DE MODELOS DE VISIÓN COMPLETADA ====")


    def _get_or_load_image_classifier(self):
        """
        Lazy load del pipeline de clasificación de imágenes BEIT.
        """
        if self._image_classifier is None:
            with self._lock:
                if self._image_classifier is None:
                    try:
                        logger.info("🚀 Cargando modelo Google ViT para clasificación de imágenes...")
                        self._image_classifier = pipeline(
                            "image-classification",
                            model="google/vit-base-patch16-224"  
                        )
                        logger.info("✅ Modelo ViT  cargado correctamente y listo.")
                    except Exception as e:
                        logger.exception("❌ Error al cargar el modelo de clasificación de imágenes.")
                        self._image_classifier = None
        return self._image_classifier




    def _get_or_load_object_detector(self) -> Optional[YOLO]:
        """
        Carga bajo demanda el modelo YOLOv8n para detección de objetos.
        Devuelve una instancia de YOLO lista para usarse, o None si ocurre un error.
        """
        if self._object_detector is None:
            with self._lock:
                if self._object_detector is None:
                    model_path = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
                    try:
                        if not os.path.exists(model_path):
                            logger.error(f"❌ El archivo del modelo no existe en {model_path}")
                            return None

                        logger.info(f"🚀 Cargando modelo YOLOv8n desde {model_path}...")
                        self._object_detector = YOLO(model_path)
                        logger.info("✅ Modelo YOLOv8n cargado correctamente y listo.")

                    except Exception as e:
                        logger.exception(f"❌ Error al cargar el modelo YOLOv8n: {e}")
                        self._object_detector = None
        return self._object_detector 



    def get_tool(self, tool_display_name: str) -> dict:
        """
        Devuelve el objeto de la herramienta según su nombre de visualización.
        Retorna un diccionario con la estructura:
        {
            "success": bool,
            "tool_type": str,
            "tool_object": Any,
            "model_id": str,
            "provider": Optional[str],
            "error": Optional[str]
        }
        """
        tool_id = self.AVAILABLE_TOOLS.get(tool_display_name)
        if not tool_id:
            logger.error(f"❌ Herramienta no reconocida: {tool_display_name}")
            return {"success": False, "error": f"Herramienta no reconocida: {tool_display_name}"}

        # --- Determinar tipo de herramienta ---
        if tool_display_name.startswith("API:"):
            tool_type = "api"
        elif tool_display_name == "Local: Image Classifier (ViT)":
            tool_type = "local_vision_classification"
        elif tool_display_name == "Local: Object Detector (YOLOv8n)":
            tool_type = "local_vision_detection"
        elif tool_display_name == "Local: Image Clustering (K-Means)":  # ✅ NUEVO
            tool_type = "local_vision_clustering"
        elif tool_display_name.startswith("Local:"):
            tool_type = "local_llm"
        else:
            logger.error(f"❌ Tipo de herramienta desconocido para '{tool_display_name}'")
            return {"success": False, "error": f"Tipo de herramienta desconocido para '{tool_display_name}'."}

        # --- Manejo por tipo ---
        if tool_type == "api":
            provider = tool_display_name.split(":")[1].strip().split(" ")[0].lower()
            client = self._api_clients_cache.get(provider)
            if not client:
                logger.error(f"❌ Cliente API no configurado para '{provider}'")
                return {"success": False, "error": f"El cliente API para '{provider}' no está configurado."}
            return {
                "success": True,
                "tool_type": tool_type,
                "tool_object": client,
                "model_id": tool_id,
                "provider": provider,
            }

        elif tool_type == "local_vision_classification":
            model_obj = self._get_or_load_image_classifier()
            if not model_obj:
                logger.error(f"❌ Fallo al cargar modelo de clasificación de imágenes: {tool_display_name}")
                return {"success": False, "error": f"Modelo de imágenes '{tool_display_name}' no pudo ser cargado."}
            return {
                "success": True,
                "tool_type": tool_type,
                "tool_object": model_obj,
                "model_id": tool_id,
            }

        elif tool_type == "local_vision_detection":
            model_obj = self._get_or_load_object_detector()
            if not model_obj:
                logger.error(f"❌ Fallo al cargar modelo de detección de objetos: {tool_display_name}")
                return {"success": False, "error": f"Modelo de detección '{tool_display_name}' no pudo ser cargado."}
            return {
                "success": True,
                "tool_type": tool_type,
                "tool_object": model_obj,
                "model_id": tool_id,
            }

        elif tool_type == "local_vision_clustering":  # ✅ NUEVO
            service_obj = self._get_or_load_clustering_service()
            if not service_obj:
                logger.error(f"❌ Fallo al cargar el servicio de clustering: {tool_display_name}")
                return {"success": False, "error": f"Servicio de clustering '{tool_display_name}' no pudo ser cargado."}
            return {
                "success": True,
                "tool_type": tool_type,
                "tool_object": service_obj,
                "model_id": tool_id,
            }

        elif tool_type == "local_llm":
            model_obj = self._local_models_cache.get(tool_id)
            if not model_obj:
                logger.error(f"❌ Modelo local LLM no disponible: {tool_display_name}")
                return {"success": False, "error": f"Modelo local LLM '{tool_display_name}' no disponible."}
            return {
                "success": True,
                "tool_type": tool_type,
                "tool_object": model_obj,
                "model_id": tool_id,
            }

        # Fallback improbable
        logger.critical(f"⚠️ Lógica interna de get_tool falló para '{tool_display_name}'")
        return {"success": False, "error": "Lógica interna de get_tool falló."}

