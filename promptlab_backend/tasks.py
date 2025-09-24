
# ... otras importaciones que necesites ...

import logging

from services.vision_backend import VisionPredictionService
# Configura un logger básico si el worker no lo tiene
logger = logging.getLogger(__name__)

def train_vision_model_task(image_records, model_arch, epochs):
    """
    Esta es la función que RQ ejecutará en segundo plano.
    Es el "trabajador pesado".
    """
    logger.info(f"[RQ-WORKER] Tarea recibida. Entrenando {model_arch} con {len(image_records)} imágenes.")
    
    try:
        # Creamos una instancia fresca del servicio dentro del worker
        vision_service = VisionPredictionService()
        
        # Llamamos al método que hace el trabajo computacional
        result = vision_service.train_model(
            image_records=image_records,
            model_arch=model_arch,
            epochs=epochs
        )
        
        logger.info("[RQ-WORKER] Tarea completada con éxito.")
        
        # El worker retorna el resultado completo, RQ lo guardará.
        return result

    except Exception as e:
        logger.error(f"[RQ-WORKER] La tarea ha fallado: {e}", exc_info=True)
        # Cuando una tarea lanza una excepción, RQ la marca como 'failed'.
        raise

