from transformers import AutoTokenizer, AutoModelForCausalLM
import logging

# Configura un logger simple para ver el progreso
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')

# --- LISTA DE MODELOS QUE QUIERES DESCARGAR ---
MODELS_TO_DOWNLOAD = [
    
    "google/gemma-2b-it",
    "microsoft/phi-2"
    # Añade aquí cualquier otro modelo de Hugging Face que quieras tener listo
]

def pre_cache_model(model_id):
    """
    Descarga un modelo y su tokenizador a la caché local de Hugging Face.
    """
    try:
        logging.info(f"--- Iniciando descarga para: {model_id} ---")
        
        # Descargar el tokenizador (suele ser rápido)
        AutoTokenizer.from_pretrained(model_id)
        logging.info(f"✅ Tokenizador para {model_id} descargado.")
        
        # Descargar el modelo completo (esta es la parte lenta)
        AutoModelForCausalLM.from_pretrained(model_id, low_cpu_mem_usage=True)
        logging.info(f"✅ Modelo {model_id} descargado y cacheado exitosamente.")
        
    except Exception as e:
        logging.error(f"❌ Falló la descarga para {model_id}: {e}")

if __name__ == "__main__":
    logging.info("--- INICIANDO PROCESO DE PRE-CACHEADO DE MODELOS ---")
    for model in MODELS_TO_DOWNLOAD:
        pre_cache_model(model)
    logging.info("--- PROCESO DE PRE-CACHEADO FINALIZADO ---")