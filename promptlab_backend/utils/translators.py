# utils/translators.py

import logging
from deep_translator import GoogleTranslator

logger = logging.getLogger(__name__)


def translate_es_ing(texto_es: str) -> str:
    """Traduce texto de español a inglés usando GoogleTranslator."""
    if not texto_es:
        return ""
    try:
        return GoogleTranslator(source='es', target='en').translate(texto_es)
    except Exception as e:
        logger.error(f"Error de traducción: {e}")
        return texto_es



# Cache en memoria
_translation_cache = {}

def translate_es_en(texto_es: str) -> str:
    """Traduce texto de español a inglés usando GoogleTranslator con cache en memoria."""
    if not texto_es:
        return ""

    # Revisar cache primero
    if texto_es in _translation_cache:
        return _translation_cache[texto_es]

    try:
        traduccion = GoogleTranslator(source='es', target='en').translate(texto_es)
        _translation_cache[texto_es] = traduccion  # Guardar en cache
        return traduccion
    except Exception as e:
        logger.error(f"Error de traducción: {e}")
        return texto_es
