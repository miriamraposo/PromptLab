
import spacy
import re
from typing import Dict, Any, List, Optional
from functools import lru_cache
import logging
from services.model_manager import ModelManager #

from collections import Counter
# --- Dependencias opcionales con chequeo de instalación ---
try:
    from spacytextblob.spacytextblob import SpacyTextBlob
    SPACYTEXTBLOB_INSTALLED = True
except ImportError:
    SPACYTEXTBLOB_INSTALLED = False

try:
    from sumy.parsers.plaintext import PlaintextParser
    from sumy.nlp.tokenizers import Tokenizer
    from sumy.summarizers.lsa import LsaSummarizer
    SUMY_INSTALLED = True
except ImportError:
    SUMY_INSTALLED = False

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation

# --- Configuración del Logging ---
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

llm_manager = ModelManager()
# ==============================================================================
# GESTOR DEL MODELO NLP (SINGLETON PATTERN)
# Esto asegura que el modelo pesado de Spacy se cargue UNA SOLA VEZ.
# ==============================================================================


class NLPModelManager:
    _instance = None
    _nlp_model = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(NLPModelManager, cls).__new__(cls)
        return cls._instance

    def load_model(self, language: str = 'es'):
        if self._nlp_model and getattr(self._nlp_model, 'lang', None) == language:
            return  # El modelo correcto ya está cargado

        model_name = 'es_core_news_md' if language == 'es' else 'en_core_web_md'
        logger.info(f"Cargando modelo de NLP '{model_name}'...")
        try:
            self._nlp_model = spacy.load(model_name)
            if SPACYTEXTBLOB_INSTALLED and 'spacytextblob' not in self._nlp_model.pipe_names:
                self._nlp_model.add_pipe('spacytextblob')
            logger.info(f"✅ Modelo de NLP '{model_name}' cargado y listo.")
        except OSError:
            logger.error(
                f"❌ Modelo spaCy '{model_name}' no encontrado. Ejecuta: python -m spacy download {model_name}")
            self._nlp_model = None

    def get_model(self):
        return self._nlp_model


# Inicializamos el gestor al importar el módulo
nlp_manager = NLPModelManager()
nlp_manager.load_model()  # Carga el modelo por defecto al iniciar la app


# ==============================================================================
# SERVICIO DE ANÁLISIS DE TEXTO (ARQUITECTURA SIMPLE)
# ==============================================================================

class TextAnalysisService:
    def __init__(self):
        """Inicializa el servicio de análisis de texto cargando las dependencias necesarias."""
        self.nlp = nlp_manager.get_model()
        self.spacytextblob_installed = SPACYTEXTBLOB_INSTALLED
        self.sumy_installed = SUMY_INSTALLED

    # =========================
    # MÉTODOS PÚBLICOS
    # =========================

    def do_legal_analysis(self, text: str) -> Dict[str, Any]:
        logger.info("Ejecutando perfil de análisis legal...")
        doc = self.nlp(text)
        return {
            "analysis_type": "legal_analysis",
            "clauses": self._extract_contract_clauses(text),
            "entities": self._extract_named_entities(doc),
            "summary": self._generate_summary(text),
        }

    def do_marketing_analysis(self, text: str) -> Dict[str, Any]:
        logger.info("Ejecutando perfil de análisis de marketing...")
        doc = self.nlp(text)
        return {
            "analysis_type": "marketing_analysis",
            "sentiment": self._analyze_sentiment(doc),
            "topics": self._model_topics(doc),
            "entities": self._extract_named_entities(doc),
        }

    def do_writing_style_analysis(self, text: str) -> Dict[str, Any]:
        logger.info("Ejecutando perfil de análisis de estilo...")
        doc = self.nlp(text)
        return {
            "analysis_type": "writing_style_analysis",
            "statistics": self._extract_statistics(doc),
            "summary": self._generate_summary(text),
        }



    def _analyze_sentiment(self, doc) -> Dict[str, Any]:
        """
        Analiza el sentimiento de un documento spaCy usando spaCyTextBlob.

        Args:
            doc (spacy.tokens.Doc): Documento spaCy procesado con extensión blob.

        Returns:
            Dict[str, Any]: Resultados del análisis de sentimiento.
        """
        if not doc or not hasattr(doc._, "blob"):
            logger.warning("El documento no tiene extensión 'blob' para análisis de sentimiento.")
            return {}

        try:
            polarity = round(doc._.blob.polarity, 3)
            subjectivity = round(doc._.blob.subjectivity, 3)
            interpretation = (
                "Positivo" if polarity > 0.1 else
                "Negativo" if polarity < -0.1 else
                "Neutral"
            )

            # Evaluaciones detalladas
            assessments = getattr(doc._.blob.sentiment_assessments, "assessments", [])

            positive_words = []
            negative_words = []

            for assessment in assessments:
                words = assessment[0]
                score = assessment[1]
                if score > 0:
                     positive_words.extend([(word, score) for word in words])
                elif score < 0:
                    negative_words.extend([(word, score) for word in words])

            top_positive = sorted(positive_words, key=lambda x: x[1], reverse=True)[:5]
            top_negative = sorted(negative_words, key=lambda x: x[1])[:5]

            return {
                "polarity": polarity,
                "subjectivity": subjectivity,
                "interpretation": interpretation,
                "positive_keywords": [word for word, _ in top_positive],
                "negative_keywords": [word for word, _ in top_negative]
            }

        except Exception as e:
            logger.exception(f"Error al analizar sentimiento: {e}")
            return {}


    def _extract_named_entities(self, doc) -> List[Dict[str, str]]:
        """
        Extrae entidades nombradas de un documento procesado por spaCy, aplicando
        filtros para omitir entidades poco relevantes.

        Args:
            doc (spacy.tokens.Doc): Documento ya analizado por spaCy.

        Returns:
            List[Dict[str, str]]: Lista de entidades útiles con su tipo etiquetado.
        """
        if not doc.ents:
            logger.info("No se encontraron entidades nombradas.")
            return []

        # Palabras comunes que generan ruido o falsos positivos
        words_to_ignore = {"Análisis", "Completar", "Acceder", "B", "C"}

        filtered_entities = []
        for ent in doc.ents:
            text = ent.text.strip()

            if ent.label_ == 'MISC':
                continue  # 'MISC' es muy genérico, usualmente poco útil
            if len(text) <= 2:
                continue  # Ignorar entidades demasiado cortas
            if text in words_to_ignore:
                continue  # Ignorar palabras irrelevantes

            filtered_entities.append({
                "text": text,
                "label": ent.label_
            })

        logger.info(f"Entidades detectadas: {len(doc.ents)}, después del filtrado: {len(filtered_entities)}")
        return filtered_entities
    

    def _generate_summary(self, text: str) -> str:
        """
        Genera un resumen robusto y adaptativo del texto dado usando LSA (Latent Semantic Analysis).
        Utiliza Sumy si está disponible, y adapta el número de frases según la longitud del texto.
        """
        if not SUMY_INSTALLED:
            raise ImportError("El módulo 'sumy' no está instalado. Instala 'sumy' para usar la función de resumen.")

        if not isinstance(text, str) or not text.strip():
            raise ValueError("El texto proporcionado para el resumen debe ser una cadena no vacía.")

        try:
            # Determinar idioma compatible
            lang_code = "spanish" if self.nlp.lang == "es" else "english"
            parser = PlaintextParser.from_string(text, Tokenizer(lang_code))
            original_sentences = parser.document.sentences

            potentially_filtered = [s for s in original_sentences if len(s.words) > 5]
            final_sentences_list = potentially_filtered if potentially_filtered else original_sentences
            
            final_text = " ".join(str(s) for s in final_sentences_list)
            final_parser = PlaintextParser.from_string(final_text, Tokenizer(lang_code))
        
        # 5. Ahora toda la lógica se basa en el parser limpio
            total_sentences = len(final_parser.document.sentences)
            if total_sentences == 0:
                raise ValueError("El texto no contiene oraciones detectables para resumir.")

            # Lógica adaptativa del número de frases
            if total_sentences <= 3:
                summary_sentence_count = min(1, total_sentences)
            elif total_sentences <= 10:
                summary_sentence_count = 2
            else:
                summary_sentence_count = max(3, min(7, int(total_sentences * 0.2)))

            logger.info(f"Resumiendo texto con {total_sentences} oraciones. Generando {summary_sentence_count} frases de resumen.")

            summarizer = LsaSummarizer()
            summary_sentences = summarizer(final_parser.document, summary_sentence_count)
            summary_text = " ".join(str(sentence) for sentence in summary_sentences).strip()

            if not summary_text:
                raise RuntimeError("El algoritmo de resumen no generó ninguna oración.")

            return summary_text

        except Exception as e:
            logger.error("Fallo en la generación de resumen", exc_info=True)
            raise RuntimeError(f"No se pudo generar el resumen del texto. Detalles: {str(e)}")


    def do_summary(self, text: str) -> dict:
        if not self.sumy_installed:
            raise NotImplementedError("La funcionalidad de resumen no está instalada.")
        
        summary_text = self._generate_summary(text)
        return {"summary": summary_text} # Devolvemos un dict para consistencia

    def do_sentiment(self, text: str) -> dict:

        """
         Realiza el análisis de sentimiento utilizando spaCyTextBlob.

        Args:
        text (str): Texto a analizar.

        Returns:
        dict: Resultado con polaridad y subjetividad.

        Raises:
        NotImplementedError: Si spaCyTextBlob no está instalado.
        ValueError: Si el texto es inválido.
        RuntimeError: Si el análisis no pudo realizarse.
        """
        if not self.spacytextblob_installed:
            raise NotImplementedError("La funcionalidad de sentimiento no está instalada.")
        doc = self.nlp(text)
        return self._analyze_sentiment(doc)

    def do_entities(self, text: str) -> list:
        doc = self.nlp(text)
        return self._extract_named_entities(doc)

    def do_statistics(self, text: str) -> dict:
        doc = self.nlp(text)
        return self._extract_statistics(doc)

    def do_topics(self, text: str) -> dict:
        doc = self.nlp(text)
        result = self._model_topics(doc)
        if 'error' in result or 'info' in result:
            raise ValueError(result.get('error') or result.get('info'))
        return result

    def do_clauses(self, text: str) -> dict:
        return self._extract_contract_clauses(text)


    # --- MÉTODOS PRIVADOS (EL CEREBRO) ---
    # Estos métodos contienen tu lógica de análisis y se mantienen igual.
    
    def _extract_statistics(self, doc) -> Dict[str, int]:
        return {"char_count": len(doc.text), "token_count": len([token for token in doc if not token.is_punct]), "sentence_count": len(list(doc.sents))}



    def _model_topics(self, doc, num_topics: int = 3, num_words: int = 5) -> Dict[str, Any]:
        try:
            valid_tokens = [t.lemma_.lower(
            ) for t in doc if t.is_alpha and not t.is_stop and not t.is_punct]
            if len(set(valid_tokens)) < 20:
                return {"info": "Texto demasiado corto o poco variado para un modelado de tópicos fiable."}

            vectorizer = CountVectorizer(
                max_df=0.9, min_df=2, ngram_range=(1, 2))
            tf = vectorizer.fit_transform([" ".join(valid_tokens)])

            # Si el vocabulario es muy pequeño, LDA puede fallar.
            if tf.shape[1] < num_topics:
                return {"info": "No hay suficiente vocabulario para extraer los tópicos solicitados."}

            lda = LatentDirichletAllocation(
                n_components=num_topics, random_state=42)
            lda.fit(tf)

            feature_names = vectorizer.get_feature_names_out()
            topics = {}
            for i, component in enumerate(lda.components_):
                top_words_idx = component.argsort()[:-num_words-1:-1]
                topics[f"Topic {i+1}"] = [feature_names[j]
                                          for j in top_words_idx]
            return topics
        except Exception as e:
            logger.error(f"Error en el modelado de tópicos: {e}")
            return {"error": "No se pudo realizar el modelado de tópicos."}


    def _extract_contract_clauses(self, texto: str) -> Dict[str, str]:
        """Busca cláusulas comunes en documentos legales."""
        patrones = {
            "objeto_contrato": r"(cláusula\s*\w*)?\s*objeto.*?(?=cláusula\s*\w+|$)",
            "confidencialidad": r"(cláusula\s*\w*)?\s*confidencialidad.*?(?=cláusula\s*\w+|$)",
            "duracion": r"(cláusula\s*\w*)?\s*duración.*?(?=cláusula\s*\w+|$)",
            "obligaciones": r"(cláusula\s*\w*)?\s*obligaciones.*?(?=cláusula\s*\w+|$)",
            "rescision_terminacion": r"(cláusula\s*\w*)?\s*(rescisi[oó]n|terminaci[oó]n).*?(?=cláusula\s*\w+|$)"
        }
        clausulas_encontradas = {}
        for nombre, patron in patrones.items():
            match = re.search(patron, texto, re.IGNORECASE | re.DOTALL)
            if match:
                clausulas_encontradas[nombre] = match.group(0).strip()
        return clausulas_encontradas

    def _split_by_sections(self, texto: str) -> List[str]:
        """Divide el texto en secciones basadas en la palabra 'cláusula'."""
        secciones = re.split(
            r'(cláusula\s+\w+[\.:\-]?)', texto, flags=re.IGNORECASE)
        if len(secciones) <= 1:
            return [texto.strip()] if texto.strip() else []

        chunks = []
        if secciones[0].strip():
            chunks.append(secciones[0].strip())

        for i in range(1, len(secciones), 2):
            chunks.append((secciones[i] + secciones[i+1]).strip())
        return chunks


    def _model_topics(self, doc, num_topics: int = 3, num_words: int = 5) -> Dict[str, Any]:
        """
        Realiza un modelado de tópicos simple usando LDA sobre los tokens del documento.
        
        Args:
            doc: Documento procesado por spaCy.
            num_topics (int): Número de tópicos a extraer.
            num_words (int): Número de palabras clave por tópico.

        Returns:
            Dict[str, Any]: Diccionario con los tópicos o mensajes de error/info.
        """
        try:
            # Preprocesamiento: quedarnos con lemas válidos
            valid_tokens = [
                t.lemma_.lower() 
                for t in doc 
                if t.is_alpha and not t.is_stop and not t.is_punct
            ]

            if len(set(valid_tokens)) < 20:
                return {"info": "Texto demasiado corto o poco variado para un modelado de tópicos fiable."}

            # --- CAMBIO CLAVE: min_df dinámico según longitud del texto ---
            min_df_value = 1 if len(valid_tokens) < 100 else 2

            vectorizer = CountVectorizer(
                max_df=0.9,
                min_df=min_df_value,
                ngram_range=(1, 2)
            )
            tf = vectorizer.fit_transform([" ".join(valid_tokens)])

            # Si el vocabulario es muy pequeño, LDA puede fallar
            if tf.shape[1] < num_topics:
                return {"info": "No hay suficiente vocabulario para extraer los tópicos solicitados."}

            lda = LatentDirichletAllocation(
                n_components=num_topics, 
                random_state=42
            )
            lda.fit(tf)

            feature_names = vectorizer.get_feature_names_out()
            topics = {}
            for i, component in enumerate(lda.components_):
                top_words_idx = component.argsort()[:-num_words-1:-1]
                topics[f"Tópico {i+1}"] = [feature_names[j] for j in top_words_idx]

            return topics

        except Exception as e:
            logger.error(f"Error en el modelado de tópicos: {e}", exc_info=True)
            return {"error": "No se pudo realizar el modelado de tópicos."}
