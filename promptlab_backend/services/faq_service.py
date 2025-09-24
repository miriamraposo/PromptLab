from sentence_transformers import SentenceTransformer, util
from typing import Dict, Any
from utils.faq_data_general import faqs
from services.prompt_lab_service import PromptLabService
import logging 


logger = logging.getLogger(__name__)

# --- Constante clave para la lógica híbrida ---
UMBRAL_SIMILITUD_IA = 0.70

class FAQService:
    # Ahora el type hint es específico: esperamos una instancia de PromptLabService
    def __init__(self, prompt_lab_service: PromptLabService):
        logger.info("Inicializando FAQService...")
        self.modelo_dudas = SentenceTransformer('all-MiniLM-L6-v2')
        self.faqs_data = faqs
        self.faq_embeddings = self.modelo_dudas.encode(
            [item['pregunta'] for item in self.faqs_data], 
            convert_to_tensor=True
        )
        # Cambiamos el nombre de la variable interna para que coincida. ¡Más claro!
        self.prompt_lab_service = prompt_lab_service
        logger.info("FAQService inicializado correctamente.")


    def _consultar_ia_generativa(self, pregunta_usuario: str, modulo: str, pregunta_cercana: str) -> Dict:
        """
        Llama al servicio de ejecución de prompts para obtener una respuesta de la IA.
        """
        logger.info(f"Similitud baja. Delegando a PromptExecutionService para la pregunta: '{pregunta_usuario}'")
        try:
            # 1. Preparamos el system_prompt como antes.
            system_prompt = f"""
            Eres un asistente experto en análisis de datos. Tu tarea es responder preguntas de los usuarios de forma clara y concisa.
            El usuario está trabajando en el módulo de '{modulo}'.
            La pregunta exacta del usuario es: "{pregunta_usuario}"
            
            Contexto adicional (una pregunta similar pero no correcta de nuestra base de datos): "{pregunta_cercana}"
            
            Por favor, responde directamente a la pregunta del usuario. Si no sabes la respuesta, es mejor decir que no la sabes a inventar información.
            """
            
            # 2. Llamamos al método `execute_prompt` del servicio que nos pasaron.
            #    Rellenamos los parámetros que necesita con valores lógicos para este contexto.
            resultado_ia = self.prompt_lab_service.execute_prompt(
                user_id="system-faq",
                tool_display_name=  "API: Google Gemini Pro",
                system_prompt=system_prompt,
                data_context=f"Contexto de FAQ: Módulo '{modulo}', pregunta cercana: '{pregunta_cercana}'",
                user_question=pregunta_usuario,
                dataset_id="N/A"
            )

            # 3. Procesamos la respuesta del servicio.
            if resultado_ia and resultado_ia.get("success"):
                return {
                    "pregunta_interpretada": pregunta_usuario,
                    "respuesta": resultado_ia["ai_response"],
                    "similitud": 0.0,
                    "fuente": "ia_generativa",
                    "meta": resultado_ia.get("meta") # Opcional: puedes pasar las métricas al frontend
                }
            else:
                # Si execute_prompt falló, propagamos el error.
                error_msg = resultado_ia.get("error", "Error desconocido en el servicio de IA.")
                logger.error(f"El servicio de ejecución de prompts falló: {error_msg}")
                return {"error": error_msg}

        except Exception as e:
            logger.error(f"Error inesperado al llamar a PromptExecutionService: {e}", exc_info=True)
            return {"error": f"Hubo un error interno al contactar a la IA: {str(e)}"}
    # 2. Solo hay UNA definición de `responder_duda`, la completa.


    def responder_duda(self, pregunta_usuario: str, modulo: str = None) -> Dict:
        """
        Encuentra la pregunta más similar o consulta a la IA si la similitud es baja.
        """
        # Filtrar FAQs por módulo si se proporciona
        indices_filtrados = list(range(len(self.faqs_data)))
        if modulo:
            indices_filtrados = [
                i for i, item in enumerate(self.faqs_data) 
                if item.get('modulo', 'general') == modulo
            ]

        # Si no hay FAQs para ese módulo, vamos directamente a la IA
        if not indices_filtrados:
            logger.warning(f"No se encontraron FAQs para el módulo '{modulo}'. Derivando a IA.")
            return self._consultar_ia_generativa(pregunta_usuario, modulo, "Ninguna")

        # Búsqueda de similitud
        embeddings_filtrados = self.faq_embeddings[indices_filtrados]
        embedding_usuario = self.modelo_dudas.encode(pregunta_usuario, convert_to_tensor=True)
        
        similitudes = util.cos_sim(embedding_usuario, embeddings_filtrados)[0]
        idx_local = int(similitudes.argmax())
        similitud_maxima = similitudes[idx_local].item()
        
        idx_global = indices_filtrados[idx_local]
        pregunta_encontrada = self.faqs_data[idx_global]

        # --- Lógica Híbrida ---
        if similitud_maxima >= UMBRAL_SIMILITUD_IA:
            # Similitud alta -> Devolvemos la respuesta de la FAQ
            logger.info(f"Encontrada FAQ con similitud alta ({similitud_maxima:.2f}).")
            return {
                "pregunta_interpretada": pregunta_encontrada['pregunta'],
                "respuesta": pregunta_encontrada['respuesta'],
                "similitud": round(similitud_maxima, 2),
                "fuente": "faq"
            }
        else:
            # Similitud baja -> Llamamos a la IA generativa
            return self._consultar_ia_generativa(
                pregunta_usuario, 
                modulo, 
                pregunta_encontrada['pregunta'] # Pasamos la pregunta cercana como contexto
            )


