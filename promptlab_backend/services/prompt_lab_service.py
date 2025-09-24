# services/prompt_lab_service.py
import logging
import time
from typing import List, Dict, Any, Tuple, Optional
import uuid

# Corregimos los imports para que coincidan con la estructura de carpetas
from services.model_manager import ModelManager
from utils.translators import translate_es_en
from services.history_service import HistoryService

logger = logging.getLogger(__name__)

# --- CONSTANTES ---
# Centralizamos la configuración para que sea fácil de modificar.
API_TIMEOUT_SECONDS = 30.0

PROMPT_TEMPLATES = {
    "default_contextual": (
        "System: {system_prompt}\n\n"
        "--- Data Context ---\n{data_context}\n--- End Context ---\n\n"
        "User Question: {user_question}"
    ),
    "gemma": (
        "<start_of_turn>user\n"
        "**System Instruction:**\n{system_prompt}\n\n"
        "**Data Context:**\n{data_context}\n\n"
        "**User Question:**\n{user_question}<end_of_turn>\n<start_of_turn>model\n"
    ),
    "tinyllama": (
        "<|system|>\n{system_prompt}</s>\n"
        "<|user|>\n**Context:**\n{data_context}\n\n**Question:**\n{user_question}</s>\n"
        "<|assistant|>\n"
    ),
    "sql_generation": (
        "### Task\n"
        "Generate a **PostgreSQL** query that answers the user question based on the provided table schema. "
        "The query should be compatible with PostgreSQL 15.\n"
        "Schema:\n```sql\n{data_context}\n```\n"
        "User Question: {user_question}\n"
        "### SQL Query\n"
    )
}

MODEL_PRICING_PER_1K_TOKENS = {
    "gpt-4o": {"input": 0.005, "output": 0.015},
    "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
    "claude-3-sonnet-20240229": {"input": 0.003, "output": 0.015},
    "gemini-1.5-flash-latest": {"input": 0.00035, "output": 0.00053}
}


class PromptLabService:
    def __init__(self, model_manager: ModelManager, history_service: HistoryService):
        self.model_manager = model_manager
        self.history_service = history_service
        self.translate_es_en = translate_es_en

    def _handle_api_call(
        self,
        tool_display_name: str,
        tool_object: Any,
        model_id: str,
        system_prompt: str,
        data_context: str,
        user_question: str
    ) -> Tuple[str, str, Optional[int], Optional[int]]:
        """Maneja la lógica para todos los clientes API, incluyendo timeouts y uso de tokens."""
        ai_response, prompt_tokens, completion_tokens = "", None, None
        user_content = f"Data Context:\n{data_context}\n\nUser Question: {user_question}"
        final_prompt_for_debug = self._build_prompt(
            "default_contextual",
            system_prompt=system_prompt,
            data_context=data_context,
            user_question=user_question
        )

        try:
            if "Gemini" in tool_display_name:
                # --- SECCIÓN CORREGIDA ---
                gemini_client = tool_object
                model_instance = gemini_client.GenerativeModel(model_id)  # Creamos el modelo específico aquí

                response = model_instance.generate_content(  # Lo usamos aquí
                    final_prompt_for_debug,
                    request_options={'timeout': API_TIMEOUT_SECONDS}
                )
                ai_response = response.text
                # No podemos obtener el conteo de tokens fácilmente con la v1 de la API de Gemini,
                # lo dejamos como None por ahora.
                prompt_tokens, completion_tokens = None, None

            elif "Anthropic" in tool_display_name:
                response = tool_object.messages.create(
                    model=model_id,
                    max_tokens=2048,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_content}],
                    timeout=API_TIMEOUT_SECONDS
                )
                ai_response = response.content[0].text
                prompt_tokens, completion_tokens = response.usage.input_tokens, response.usage.output_tokens

            elif "OpenAI" in tool_display_name:
                response = tool_object.chat.completions.create(
                    model=model_id,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    timeout=API_TIMEOUT_SECONDS
                )
                ai_response = response.choices[0].message.content
                prompt_tokens, completion_tokens = response.usage.prompt_tokens, response.usage.completion_tokens

            else:
                raise NotImplementedError(
                    f"El manejo de la API para '{tool_display_name}' no está implementado."
                )

        except Exception as e:
            if "timed out" in str(e).lower():
                logger.warning(
                    f"La llamada a la API para '{tool_display_name}' excedió el timeout de {API_TIMEOUT_SECONDS}s."
                )
                raise TimeoutError(
                    f"La llamada a la API '{tool_display_name}' tardó demasiado en responder."
                ) from e
            raise e

        return ai_response, final_prompt_for_debug, prompt_tokens, completion_tokens


    # --- MÉTODOS PRIVADOS ---
    def _validate_inputs(self, **kwargs) -> Tuple[bool, str]:
        for key, value in kwargs.items():
            if not isinstance(value, str) or not value.strip():
                return False, f"El parámetro '{key}' no puede estar vacío."
        return True, ""

    def _build_prompt(self, template_name: str, **kwargs) -> str:
        template = PROMPT_TEMPLATES.get(template_name, PROMPT_TEMPLATES["default_contextual"])
        return template.format(**kwargs)

    def _generate_local_response(self, tool_object: Dict, final_prompt: str, generation_params: Dict) -> str:
        model, tokenizer, device = tool_object['model'], tool_object['tokenizer'], tool_object['device']
        inputs = tokenizer(final_prompt, return_tensors="pt").to(device)
        outputs = model.generate(**inputs, **generation_params)
        return tokenizer.decode(outputs[0, inputs.input_ids.shape[1]:], skip_special_tokens=True)

    def _calculate_cost(self, model_id: str, prompt_tokens: int, completion_tokens: int) -> Optional[float]:
        pricing = MODEL_PRICING_PER_1K_TOKENS.get(model_id)
        if not pricing:
            return None
        cost = ((prompt_tokens / 1000) * pricing["input"]) + ((completion_tokens / 1000) * pricing["output"])
        return round(cost, 6)

    
    def _handle_local_model(self, tool_display_name: str, tool_object: Dict, system_prompt: str, data_context: str, user_question: str) -> Tuple[str, str]:
        tool_name_lower = tool_display_name.lower()
        generation_params = {"max_new_tokens": 512}
        
        if "sql" in tool_name_lower:
            translated_question = self.translate_es_en(user_question)
            final_prompt = self._build_prompt("sql_generation", data_context=data_context, user_question=translated_question)
            generation_params = {"max_new_tokens": 256, "num_beams": 5}
        elif "gemma" in tool_name_lower:
            final_prompt = self._build_prompt("gemma", system_prompt=system_prompt, data_context=data_context, user_question=user_question)
        elif "tinyllama" in tool_name_lower:
            final_prompt = self._build_prompt("tinyllama", system_prompt=system_prompt, data_context=data_context, user_question=user_question)
        else:
            final_prompt = self._build_prompt("default_contextual", system_prompt=system_prompt, data_context=data_context, user_question=user_question)

        ai_response = self._generate_local_response(tool_object, final_prompt, generation_params)
        return ai_response, final_prompt
        
    def _log_history(self, **kwargs) -> None:
        try:
            self.history_service.add_entry(kwargs)
        except Exception as e:
            logger.error(f"No se pudo guardar la entrada en el historial: {e}")

 

    def execute_prompts(
        self,
        user_id: str,
        tool_display_name: str,
        system_prompt: str,
        data_context: str,
        preguntas: List[str],
        dataset_id: str,
    ) -> Dict[str, Any]:
        """Ejecuta múltiples prompts y devuelve la lista de resultados con métricas agregadas."""

        # --- 1. Inicializamos variables para agregar métricas ---
        resultados = []
        latencia_total_ms = 0
        costo_total_usd = 0.0
        tokens_prompt_total = 0
        tokens_completion_total = 0

        for idx, pregunta in enumerate(preguntas):
            try:
                logger.info(f"[PromptLabService] [{idx+1}/{len(preguntas)}] Ejecutando prompt: {pregunta[:60]}...")

                # --- 2. Llamamos a la función singular ---
                resultado = self.execute_prompt(
                    user_id=user_id,
                    tool_display_name=tool_display_name,
                    system_prompt=system_prompt,
                    data_context=data_context,
                    user_question=pregunta,
                    dataset_id=dataset_id  # <-- bug corregido
                )

                # --- 3. Si la ejecución fue exitosa, sumamos las métricas explícitamente ---
                if resultado.get("success"):
                    meta = resultado.get("meta", {})

                    # Manejar latencia (siempre debería estar, pero lo protegemos)
                    latencia_total_ms += meta.get("latency_ms", 0)

                    # Manejar costo (solo si no es None)
                    costo_actual = meta.get("estimated_cost_usd")
                    if costo_actual is not None:
                        costo_total_usd += costo_actual

                    # Manejar tokens (solo si no son None)
                    tokens_prompt_actuales = meta.get("prompt_tokens")
                    if tokens_prompt_actuales is not None:
                        tokens_prompt_total += tokens_prompt_actuales

                    tokens_completion_actuales = meta.get("completion_tokens")
                    if tokens_completion_actuales is not None:
                        tokens_completion_total += tokens_completion_actuales

                # Anexamos info extra siempre
                resultado["user_question"] = pregunta
                resultado["index"] = idx
                resultados.append(resultado)

            except Exception as e:
                logger.exception(f"[PromptLabService] Error en el prompt {idx+1}: {e}")
                resultados.append({
                    "success": False,
                    "error": str(e),
                    "user_question": pregunta,
                    "index": idx
                })

        # --- 4. Construimos el resumen final con métricas agregadas ---
        num_exitosos = sum(1 for r in resultados if r.get("success"))

        return {
            "resultados": resultados,
            "resumen": {
                "total_prompts": len(preguntas),
                "exitosos": num_exitosos,
                "fallidos": len(preguntas) - num_exitosos,
                "costo_total_estimado_usd": round(costo_total_usd, 6),
                "latencia_promedio_ms": int(latencia_total_ms / num_exitosos) if num_exitosos > 0 else 0,
                "tokens_prompt_total": tokens_prompt_total,
                "tokens_completion_total": tokens_completion_total,
                "tokens_totales": tokens_prompt_total + tokens_completion_total,
            }
        }


    def execute_prompt(
        self,
        user_id: str,
        tool_display_name: str,
        system_prompt: str,
        data_context: str,
        user_question: str,
        dataset_id: str,
    ) -> Dict[str, Any]:
        """Ejecuta un único prompt y devuelve un solo resultado, con validaciones, logs y métricas."""

        request_id = str(uuid.uuid4())
        started = time.time()
        logger.info(f"[{request_id}] Iniciando ejecución del prompt con herramienta '{tool_display_name}'")

        # --- Inicializamos métricas comunes para evitar errores en frontend ---
        prompt_tokens = None
        completion_tokens = None
        costo_estimado = None

        try:
            # --- 1. Validación de parámetros ---
            if not user_id or not isinstance(user_id, str):
                return {"success": False, "error": "user_id inválido."}
            if not tool_display_name or not isinstance(tool_display_name, str):
                return {"success": False, "error": "tool_display_name inválido."}
            if not system_prompt or not isinstance(system_prompt, str):
                return {"success": False, "error": "system_prompt inválido."}
            if not user_question or not isinstance(user_question, str):
                return {"success": False, "error": "user_question inválido."}
            if not data_context or not isinstance(data_context, str):
                return {"success": False, "error": "data_context inválido."}
            if not dataset_id:
                return {"success": False, "error": "dataset_id inválido."}

            # --- 2. Obtener herramienta/modelo ---
            tool_response = self.model_manager.get_tool(tool_display_name)
            if not tool_response.get("success"):
                return {"success": False, "error": tool_response.get("error", "Error al obtener herramienta.")}

            tool_type = tool_response.get("tool_type")
            tool_object = tool_response.get("tool_object")
            model_id = tool_response.get("model_id")

            if not tool_type or not tool_object:
                return {"success": False, "error": "Datos de la herramienta incompletos."}

            # --- 3. Ejecutar prompt ---
            try:
                if tool_type == "api":
                    ai_response, final_prompt, prompt_tokens, completion_tokens = self._handle_api_call(
                        tool_display_name, tool_object, model_id, system_prompt, data_context, user_question
                    )
                else:  # Local
                    ai_response, final_prompt = self._handle_local_model(
                        tool_display_name, tool_object, system_prompt, data_context, user_question
                    )
                    # Locales no devuelven tokens
                    prompt_tokens, completion_tokens = None, None
            except TimeoutError:
                logger.error(f"[{request_id}] Timeout al generar respuesta", exc_info=True)
                return {"success": False, "error": "El modelo tardó demasiado en responder."}
            except Exception as e:
                logger.error(f"[{request_id}] Error ejecutando el modelo: {e}", exc_info=True)
                return {"success": False, "error": f"Error interno del modelo: {str(e)}"}

            if not ai_response or not isinstance(ai_response, str):
                return {"success": False, "error": "Respuesta vacía o inválida del modelo."}

            # --- 4. Calcular costo y reunir métricas ---
            if tool_type == "api" and prompt_tokens is not None and completion_tokens is not None:
                costo_estimado = self._calculate_cost(model_id, prompt_tokens, completion_tokens)

            # --- 5. Métricas y log final ---
            latency_ms = int((time.time() - started) * 1000)
            logger.info(f"[{request_id}] Prompt ejecutado con éxito en {latency_ms}ms")

            return {
                "success": True,
                "ai_response": ai_response.strip(),
                "meta": {
                    "request_id": request_id,
                    "latency_ms": latency_ms,
                    "model_id": model_id,
                    "tool_type": tool_type,
                    "prompt_tokens": prompt_tokens,           # Puede ser None
                    "completion_tokens": completion_tokens,   # Puede ser None
                    "estimated_cost_usd": costo_estimado      # Puede ser None
                }
            }

        except Exception as e:
            logger.error(f"[{request_id}] Error crítico en execute_prompt: {e}", exc_info=True)
            return {"success": False, "error": "Error interno del servidor."}

