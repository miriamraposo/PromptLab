# utils/prompt_crafters.py
from typing import List, Dict
import logging


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


def generate_prompt_for_clause(clause: str, analysis_type: str) -> str:
    """
    Genera un prompt específico para analizar una cláusula contractual.
    analysis_type puede ser: 'resumen', 'riesgos', 'simplificacion'.
    """
    if not isinstance(clause, str) or not clause.strip():
        return "Error: La cláusula proporcionada está vacía."

    prompts = {
        "resumen": f"Resume en dos o tres puntos clave la siguiente cláusula legal, explicando sus implicaciones principales:\n\n---\n{clause}\n---",
        "riesgos": f"Analiza la siguiente cláusula e identifica posibles riesgos, ambigüedades o puntos desfavorables para una de las partes. Sé específico y justifica tu análisis:\n\n---\n{clause}\n---",
        "simplificacion": f"Reescribe la siguiente cláusula legal en un lenguaje claro, simple y accesible para alguien que no es abogado, sin perder el significado esencial:\n\n---\n{clause}\n---"
    }

    return prompts.get(analysis_type, f"[⚠️ Tipo de análisis desconocido: '{analysis_type}'] {clause}")


def generate_comparison_prompt(clause_a: str, clause_b: str) -> str:
    """
    Genera un prompt para comparar dos cláusulas y destacar sus diferencias clave.
    """
    return (
        f"Compara las siguientes dos cláusulas legales y explica sus diferencias principales, "
        f"implicancias legales y posibles ventajas o desventajas para cada parte:\n\n"
        f"---\nCláusula A:\n{clause_a}\n---\n\n---\nCláusula B:\n{clause_b}\n---"
    )


def generate_missing_elements_prompt(document: str, contract_type: str) -> str:
    """
    Sugiere qué elementos faltan en un documento contractual, según el tipo de contrato.
    """
    return (
        f"Analiza el siguiente documento legal y sugiere qué cláusulas o elementos esenciales podrían estar faltando "
        f"para un contrato del tipo '{contract_type}'. Justifica tu respuesta:\n\n---\n{document}\n---"
    )


def generate_compliance_check_prompt(document: str, regulation: str) -> str:
    """
    Verifica si un documento cumple con una normativa específica (ej: GDPR, Ley de Contratos del Estado).
    """
    return (
        f"Revisa el siguiente documento legal y analiza si cumple con los requisitos de la regulación '{regulation}'. "
        f"Indica qué aspectos cumplen y cuáles no:\n\n---\n{document}\n---"
    )


def generate_translation_prompt(text: str, target_language: str = "en") -> str:
    """
    Genera un prompt para traducir un texto legal a otro idioma.
    """
    return (
        f"Traduce el siguiente texto legal al idioma '{target_language}' de forma precisa, "
        f"manteniendo su significado legal:\n\n---\n{text}\n---"
    )


def generate_tone_adjustment_prompt(text: str, tone: str = "neutral") -> str:
    """
    Reformula un texto legal con un tono distinto ('formal', 'amigable', 'persuasivo', etc.).
    """
    return (
        f"Reescribe el siguiente texto legal con un tono '{tone}' manteniendo su significado y precisión:\n\n---\n{text}\n---"
    )


def list_available_prompt_types() -> List[str]:
    """
    Lista los tipos de análisis disponibles para generación de prompts.
    """
    return [
        "resumen",
        "riesgos",
        "simplificacion",
        "comparacion",
        "faltantes",
        "compliance",
        "traduccion",
        "tono"
    ]

def get_system_prompt_for_simplification():
    return "Eres un comunicador experto. Reescribe el siguiente texto en un lenguaje claro y simple, accesible para un público general, sin perder el significado esencial. Devuelve únicamente el texto simplificado."

def get_system_prompt_for_grammar_check():
    return "Eres un asistente de escritura experto. Corrige cualquier error de gramática, ortografía o puntuación en el siguiente texto. Devuelve únicamente el texto corregido."

def get_system_prompt_for_keyword_extraction():
    return "Analiza el siguiente texto y extrae las 5 a 10 palabras o frases clave más importantes. Devuelve solo una lista de las palabras clave, separadas por comas."


def get_system_prompt_for_tone_change(tone: str) -> str:
    """
    Devuelve el prompt del sistema para cambiar el tono del texto.
    """
    tone_instructions = {
        "formal": "Reescribe el texto con un tono formal, utilizando un lenguaje profesional y respetuoso.",
        "informal": "Reescribe el texto con un tono informal, utilizando expresiones cotidianas y un lenguaje cercano.",
        "persuasivo": "Reescribe el texto con un tono persuasivo, orientado a convencer al lector.",
        "emocional": "Reescribe el texto con un tono emocional, apelando a los sentimientos del lector.",
        "neutral": "Reescribe el texto con un tono neutral, evitando opiniones y emociones."
    }

    prompt = tone_instructions.get(tone)
    if not prompt:
        logger.warning(f"Intento de usar un tono no soportado: '{tone}'")
        raise ValueError(
            f"Tono '{tone}' no es válido. Tonos soportados: {', '.join(tone_instructions.keys())}."
        )

    logger.info(f"Prompt generado exitosamente para el tono: '{tone}'")
    return prompt

def get_system_prompt_for_title_generation():
    """
    Retorna el prompt del sistema para la generación de títulos claros y atractivos.
    """
    return (
        "Eres un experto en redacción creativa. Genera un título breve, claro y atractivo "
        "para el siguiente texto, asegurando que resuma su esencia y sea llamativo. "
        "Devuelve únicamente el título."
    )




