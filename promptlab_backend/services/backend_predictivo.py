# services/backend_predictivo.py
import logging
import numpy as np  
import pandas as pd 
from typing import List, Dict, Any, Union

from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.preprocessing import OneHotEncoder, OrdinalEncoder, LabelEncoder 
from sklearn.feature_selection import mutual_info_classif 
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold, KFold
from sklearn.metrics import classification_report, r2_score, mean_squared_error
from imblearn.over_sampling import SMOTE
from sklearn.compose import TransformedTargetRegressor
from imblearn.pipeline import Pipeline as ImbPipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, r2_score, mean_squared_error,mean_absolute_error 
from xgboost import XGBClassifier, XGBRegressor
from lightgbm import LGBMClassifier, LGBMRegressor
from sklearn import set_config 
import joblib
from io import BytesIO


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
set_config(transform_output="pandas")

# ===================================================================
# CLASE HELPER ROBUSTA (PRODUCCIÓN, "CLONE-SAFE")
# ===================================================================
class PredefinedOrdinalEncoder(BaseEstimator, TransformerMixin):
    """
    Codificador ordinal híbrido:
    - Usa mapas predefinidos para columnas conocidas (case-insensitive).
    - Usa OrdinalEncoder estándar para columnas desconocidas.
    - Compatible con clone() de scikit-learn (no guarda data en __init__).
    """

    def __init__(self, ordinal_maps: Dict[str, Dict[str, int]]):
        # No hacer transformaciones aquí → Clone-safe
        if not isinstance(ordinal_maps, dict):
            raise TypeError("ordinal_maps debe ser un diccionario {columna: {valor: entero}}.")
        self.ordinal_maps = ordinal_maps

    def fit(self, X: pd.DataFrame, y=None):
        if not isinstance(X, pd.DataFrame):
            raise TypeError("X debe ser un DataFrame de pandas.")

        # Normalizar claves de ordinal_maps a minúsculas
        self.lower_ordinal_maps_ = {k.lower(): v for k, v in self.ordinal_maps.items()}
        self.encoders_ = {}

        for col in X.columns:
            col_lower = col.lower()
            if col_lower in self.lower_ordinal_maps_:
                logger.debug(f"Columna '{col}' → usando mapa ordinal predefinido.")
                self.encoders_[col] = {'type': 'custom', 'map': self.lower_ordinal_maps_[col_lower]}
            else:
                logger.debug(f"Columna '{col}' → usando OrdinalEncoder estándar.")
                encoder = OrdinalEncoder(
                    handle_unknown='use_encoded_value',
                    unknown_value=-1,
                    dtype=int
                )
                encoder.fit(X[[col]].dropna())
                self.encoders_[col] = {'type': 'standard', 'encoder': encoder}

        return self

    def transform(self, X: pd.DataFrame) -> pd.DataFrame:
        if not hasattr(self, 'encoders_'):
            raise RuntimeError("El transformador no está entrenado. Llama a fit() primero.")

        if not isinstance(X, pd.DataFrame):
            raise TypeError("X debe ser un DataFrame de pandas.")

        X_transformed = X.copy()

        for col in X.columns:
            encoder_info = self.encoders_.get(col)
            if not encoder_info:
                logger.warning(f"La columna '{col}' no fue vista en fit(). Se rellena con -1.")
                X_transformed[col] = -1
                continue

            if encoder_info['type'] == 'custom':
                mapping = encoder_info['map']
                X_transformed[col] = (
                    X_transformed[col]
                    .astype(str)
                    .str.lower()
                    .map(mapping)
                    .fillna(-1)
                    .astype(int)
                )
            else:
                encoder = encoder_info['encoder']
                non_nulls = X_transformed[col].notna()
                if non_nulls.any():
                    transformed_values = encoder.transform(X.loc[non_nulls, [col]])
                    X_transformed.loc[non_nulls, col] = transformed_values.ravel() 
                                
                X_transformed[col] = X_transformed[col].fillna(-1).infer_objects(copy=False)

        return X_transformed

    def get_feature_names_out(self, input_features=None):
        """Devuelve los nombres de columnas procesadas."""
        return input_features if input_features is not None else list(self.encoders_.keys())


class SafeLabelEncoder(BaseEstimator, TransformerMixin):
    """
    LabelEncoder seguro para usar en pipelines y cross-validation.
    Convierte 'y' a números en fit() y de vuelta en inverse_transform().
    - Acepta Series, listas o arrays.
    - Tolera valores faltantes (opcionalmente los mapea a -1).
    - Compatible con scikit-learn pipelines.
    """

    def __init__(self, handle_unknown: str = "ignore", unknown_value: int = -1, logger=None):
        """
        Args:
            handle_unknown: {"ignore", "error"} -> comportamiento si se encuentran valores no vistos.
            unknown_value: valor numérico asignado a valores no vistos si handle_unknown="ignore".
            logger: instancia de logger opcional para debug.
        """
        self.handle_unknown = handle_unknown
        self.unknown_value = unknown_value
        self.logger = logger or logging.getLogger(__name__)

    def fit(self, y, X=None):
        y_array = np.ravel(np.array(y, dtype=object))  # Nos aseguramos de que sea 1D
        self.encoder_ = LabelEncoder()
        self.encoder_.fit(y_array[~pd.isnull(y_array)])  # Ignoramos NaN en el fit
        self.classes_ = np.array(self.encoder_.classes_, dtype=object)
        return self

    def transform(self, y, X=None):
        y_array = np.ravel(np.array(y, dtype=object))
        transformed = np.empty_like(y_array, dtype=float)

        for idx, val in enumerate(y_array):
            if pd.isnull(val):
                transformed[idx] = self.unknown_value
            else:
                try:
                    transformed[idx] = self.encoder_.transform([val])[0]
                except ValueError:
                    if self.handle_unknown == "ignore":
                        if self.logger:
                            self.logger.warning(f"Valor desconocido en 'y': {val} → {self.unknown_value}")
                        transformed[idx] = self.unknown_value
                    else:
                        raise
        return transformed.astype(int)

    def inverse_transform(self, y, X=None):
        y_array = np.ravel(np.array(y, dtype=object))
        inverted = np.empty_like(y_array, dtype=object)

        for idx, val in enumerate(y_array):
            if val == self.unknown_value:
                inverted[idx] = None
            else:
                try:
                    inverted[idx] = self.encoder_.inverse_transform([int(val)])[0]
                except ValueError:
                    if self.handle_unknown == "ignore":
                        inverted[idx] = None
                    else:
                        raise
        return inverted

# ===================================================================
# CLASE PRINCIPAL DEL SERVICIO
# ===================================================================


def mean_absolute_percentage_error(y_true, y_pred, zero_strategy="ignore"):
    """
    Calcula el Error Porcentual Absoluto Medio (MAPE).

    Parámetros
    ----------
    y_true : array-like (lista, np.array, pd.Series)
        Valores reales.
    y_pred : array-like (lista, np.array, pd.Series)
        Valores predichos.
    zero_strategy : str, opcional
        Cómo manejar valores reales iguales a cero:
        - "ignore" : Ignora estos elementos (default)
        - "zero"   : Trata el MAPE de estos elementos como cero
        - "nan"    : Devuelve np.nan si todos los valores son cero

    Retorna
    -------
    float
        MAPE en porcentaje (%).
    """
    # Convertir a np.array
    y_true = np.array(y_true, dtype=float)
    y_pred = np.array(y_pred, dtype=float)

    if y_true.shape != y_pred.shape:
        raise ValueError("y_true y y_pred deben tener la misma forma.")

    # Máscara para valores diferentes de cero
    non_zero_mask = y_true != 0

    if not np.any(non_zero_mask):
        if zero_strategy == "ignore":
            return 0.0
        elif zero_strategy == "nan":
            return np.nan
        elif zero_strategy == "zero":
            return 0.0
        else:
            raise ValueError(f"Estrategia desconocida: {zero_strategy}")

    # Cálculo del MAPE
    mape = np.mean(np.abs((y_true[non_zero_mask] - y_pred[non_zero_mask]) / y_true[non_zero_mask])) * 100
    return mape

class PredictionService:
    def __init__(self):
        # Modelos soportados
        self.models = {
            "clasificacion": {
                "Random Forest": RandomForestClassifier(random_state=42, n_jobs=-1),
                "XGBoost": XGBClassifier(random_state=42, use_label_encoder=False,
                                         eval_metric="mlogloss", n_jobs=-1),
                "LightGBM": LGBMClassifier(random_state=42, n_jobs=-1),
                "Gradient Boosting": GradientBoostingClassifier(random_state=42),
            },
            "regresion": {
                "Random Forest": RandomForestRegressor(random_state=42, n_jobs=-1),
                "XGBoost": XGBRegressor(random_state=42, n_jobs=-1),
                "LightGBM": LGBMRegressor(random_state=42, n_jobs=-1),
            },
        }

        # Diccionarios de ordinales (placeholder)
        self.ORDINAL_MAPS = {
               "educacion": {
               "ninguno": 0, "primario": 1, "secundario": 2, 
               "terciario": 3, "universitario": 4, "posgrado": 5
                 },
               "talla": {
                "xs": 0, "s": 1, "m": 2, "l": 3, "xl": 4, "xxl": 5
                },
                 "satisfaccion": {
                 "muy insatisfecho": 0, "insatisfecho": 1, "neutral": 2, 
                 "satisfecho": 3, "muy satisfecho": 4
                },
                 "frecuencia": {
                 "nunca": 0, "rara vez": 1, "a veces": 2, 
                "frecuentemente": 3, "siempre": 4
                 },
               "calidad_nivel": {
                 "muy mala": 0, "mala": 1, "regular": 2, "buena": 3, "excelente": 4
                },
               "ingreso": {
                 "bajo": 0, "medio": 1, "medio-alto": 2, "alto": 3
                 },
                 "experiencia": {
                 "junior": 0, "semi-senior": 1, "senior": 2, "experto": 3
                },
                 "rango_etario": {
                  "18-25": 0, "26-35": 1, "36-45": 2, "46-60": 3, "60+": 4
                },
               "dolor_gravedad": {
                 "leve": 0, "moderado": 1, "severo": 2, "critico": 3
                },
                "acuerdo": {
                "totalmente en desacuerdo": 0, "en desacuerdo": 1, "neutral": 2, 
                "de acuerdo": 3, "totalmente de acuerdo": 4
                    },
               "prioridad": {
                    "baja": 0, "media": 1, "alta": 2, "critica": 3
                },
               "probabilidad": {
                 "muy baja": 0, "baja": 1, "media": 2, "alta": 3, "muy alta": 4
                 }
                 }
        self.logger = logging.getLogger(__name__)

    def evaluate_model(
        self,
        serialized_model_bytes: bytes,
        df_to_evaluate: pd.DataFrame
    ) -> Dict[str, Any]:
        """
        Evalúa un modelo entrenado contra un nuevo dataset que contiene la columna objetivo.
        Devuelve métricas relevantes según el tipo de problema (clasificación o regresión).
        """
        try:
            self.logger.info("🔍 Iniciando evaluación de modelo...")

            # --- 1. Cargar artefactos ---
            try:
                buffer = BytesIO(serialized_model_bytes)
                artifacts = joblib.load(buffer)
            except Exception as load_err:
                self.logger.error(f"❌ Error cargando artefactos del modelo: {load_err}", exc_info=True)
                return {"success": False, "error": "El modelo no se pudo cargar correctamente."}

            pipeline = artifacts.get("pipeline")
            y_encoder = artifacts.get("y_encoder")
            training_features = artifacts.get("training_features")
            target_col = artifacts.get("target_col")
            problem_type = artifacts.get("problem_type")

            if not pipeline or not training_features or not target_col or not problem_type:
                error_msg = "Artefacto de modelo inválido. Faltan datos clave (pipeline, features, target o problem_type)."
                self.logger.error(error_msg)
                return {"success": False, "error": error_msg}

            # --- 2. Validación de esquema ---
            required_cols = set(training_features + [target_col])
            actual_cols = set(df_to_evaluate.columns)
            missing_cols = required_cols - actual_cols
            if missing_cols:
                error_msg = f"Dataset no compatible. Faltan columnas requeridas: {list(missing_cols)}"
                self.logger.error(error_msg)
                return {"success": False, "error": error_msg}

            if df_to_evaluate.empty:
                return {"success": False, "error": "El dataset de evaluación está vacío."}

            self.logger.info("✅ Validación de esquema exitosa.")

            # --- 3. Separar X e y ---
            X_eval = df_to_evaluate[training_features]
            y_eval_original = df_to_evaluate[target_col]

            # --- 4. Predicciones ---
            try:
                y_pred_eval = pipeline.predict(X_eval)
            except Exception as pred_err:
                self.logger.error(f"❌ Error durante la predicción: {pred_err}", exc_info=True)
                return {"success": False, "error": "No se pudieron generar predicciones con el dataset dado."}

            # --- 5. Métricas ---
            metrics = {}
            try:
                if problem_type == "clasificacion":
                    if y_encoder is None:
                        return {"success": False, "error": "El artefacto de clasificación no tiene 'y_encoder'."}

                    y_true_encoded = y_encoder.transform(y_eval_original)
                    cm = confusion_matrix(y_true_encoded, y_pred_eval)
                    metrics['confusion_matrix'] = cm.tolist()
                    metrics['accuracy'] = float(accuracy_score(y_true_encoded, y_pred_eval))
                    labels = y_encoder.classes_.tolist()
                    metrics['confusion_matrix_labels'] = labels
                    metrics['classification_report'] = classification_report(
                        y_true_encoded,
                        y_pred_eval,
                        target_names=labels,
                        output_dict=True
                    )

                elif problem_type == "regresion":
                    # --- BLOQUE ROBUSTO PARA REGRESIÓN ---
                    metrics['r2_score'] = float(r2_score(y_eval_original, y_pred_eval))
                    metrics['rmse'] = float(np.sqrt(mean_squared_error(y_eval_original, y_pred_eval)))
                    metrics['mae'] = float(mean_absolute_error(y_eval_original, y_pred_eval))

                    # MAPE seguro
                    mape_val = mean_absolute_percentage_error(y_eval_original, y_pred_eval)
                    metrics['mape'] = None if np.isnan(mape_val) or np.isinf(mape_val) else float(mape_val)

                    # Errores para histograma
                    prediction_errors = (y_eval_original - y_pred_eval).tolist()
                    metrics['error_histogram_data'] = prediction_errors

                    sample_size = min(len(y_eval_original), 200)
                    indices = np.random.choice(y_eval_original.index, sample_size, replace=False)
                    y_test_sample = y_eval_original.loc[indices]
                    y_pred_sample = pd.Series(y_pred_eval, index=y_eval_original.index).loc[indices]
                    metrics['scatter_plot_data'] = {
                    'actual': y_test_sample.tolist(),
                    'predicted': y_pred_sample.tolist()
                    }


                else:
                    return {"success": False, "error": f"Tipo de problema desconocido: {problem_type}"}

                self.logger.info("📊 Métricas calculadas con éxito.")

            except Exception as metric_err:
                self.logger.error(f"❌ Error calculando métricas: {metric_err}", exc_info=True)
                return {"success": False, "error": "Error al calcular métricas del modelo."}

            # --- 6. Respuesta final ---
            return {
                "success": True,
                "data": {
                    "problem_type": problem_type,
                    "metrics": metrics
                }
            }

        except Exception as e:
            self.logger.error(f"🔥 Error inesperado en evaluate_model: {e}", exc_info=True)
            return {"success": False, "error": "Error interno durante la evaluación."}



    def train_model(
        self,
        df: pd.DataFrame,
        target_col: str,
        model_name: str,
        encoding_strategies: Dict[str, str],
        problem_type: str = None,
        use_smote: bool = False,
        use_cv: bool = False,
        test_size: float = 0.25,
        random_state: int = 42,
    ) -> Dict[str, Any]:
        # 1. Validaciones iniciales
        if not isinstance(df, pd.DataFrame):
            return {"success": False, "error": "El parámetro 'df' debe ser un DataFrame."}
        if target_col not in df.columns:
            return {"success": False, "error": f"La columna objetivo '{target_col}' no está en el DataFrame."}
        if not (0 < test_size < 1):
            return {"success": False, "error": "'test_size' debe estar entre 0 y 1."}

        results = {"model_name": model_name, "problem_type": problem_type}

        try:
            logger.info("== INICIO train_model ==")

            # 2. Separar features y target
            feature_cols = [col for col in df.columns if col != target_col]
            X = df[feature_cols]
            y_original = df[target_col]

            # 3. Detectar tipo de problema
            if problem_type not in ['clasificacion', 'regresion']:
                logger.warning(
                    f"Tipo de problema '{problem_type}' no es válido o no fue provisto. Autodetectando..."
                )
                problem_type = self._detectar_tipo_problema(y_original)
            results["problem_type"] = problem_type

            # 4. Codificar target si es clasificación
            y_encoder = None
            if problem_type == 'clasificacion':
                y_encoder = SafeLabelEncoder()
                y = pd.Series(
                    y_encoder.fit_transform(y_original),
                    name=target_col,
                    index=y_original.index
                )
            else:
                y = y_original.copy()

            # 5. Preprocesador dinámico
            preprocessor = self._build_dynamic_preprocessor(X, encoding_strategies)

            # 6. Selección del modelo
            model = self.models.get(problem_type, {}).get(model_name)
            if model is None:
                return {
                    "success": False,
                    "error": f"Modelo '{model_name}' no disponible para {problem_type}."
                }

            pipeline_steps = [('preprocessor', preprocessor)]
            if use_smote and problem_type == 'clasificacion':
                pipeline_steps.append(('smote', SMOTE(random_state=random_state)))
            pipeline_steps.append(('model', model))
            pipeline = ImbPipeline(steps=pipeline_steps)

            # 7. División de datos
            stratify_param = (
                y
                if problem_type == 'clasificacion'
                and y.nunique() > 1
                and y.value_counts().min() >= 2
                else None
            )
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=random_state, stratify=stratify_param
            )

            # 8. Validación cruzada opcional
            if use_cv:
                scoring = 'accuracy' if problem_type == "clasificacion" else 'r2'
                cv_strategy = (
                    StratifiedKFold(5, shuffle=True, random_state=random_state)
                    if problem_type == "clasificacion" and stratify_param is not None
                    else KFold(5, shuffle=True, random_state=random_state)
                )
                try:
                    cv_scores = cross_val_score(pipeline, X, y, cv=cv_strategy, scoring=scoring)
                    results['cv_mean_score'] = float(np.mean(cv_scores))
                    results['cv_std_dev'] = float(np.std(cv_scores))
                except Exception as e:
                    logger.error(f"Error en validación cruzada: {e}", exc_info=True)
                    results['cv_error'] = str(e)

            # 9. Entrenamiento
            try:
                pipeline.fit(X_train, y_train)
            except Exception as e:
                return {"success": False, "error": f"Error en entrenamiento: {e}"}

            # 10. Predicción y métricas
            y_pred = pipeline.predict(X_test)
            if problem_type == "clasificacion":
                cm = confusion_matrix(y_test, y_pred)
                results['confusion_matrix'] = cm.tolist()
                results['accuracy'] = float(accuracy_score(y_test, y_pred))
                labels = y_encoder.classes_.tolist() if y_encoder else None
                if labels:
                    results['confusion_matrix_labels'] = labels
                    results['classification_report'] = classification_report(
                        y_test, y_pred, target_names=labels, output_dict=True
                    )
            else:  # regresión
                # Calcular métricas
                results['r2_score'] = float(r2_score(y_test, y_pred))
                results['rmse'] = float(np.sqrt(mean_squared_error(y_test, y_pred)))
                results['mae'] = float(mean_absolute_error(y_test, y_pred))

                # Calcular MAPE seguro
                mape_val = mean_absolute_percentage_error(y_test, y_pred)
                results['mape'] = None if np.isnan(mape_val) or np.isinf(mape_val) else float(mape_val)

                # Errores para histograma
                prediction_errors = (y_test - y_pred).tolist()
                results['error_histogram_data'] = prediction_errors

                # Submuestreo para scatter plot
                sample_size = min(len(y_test), 200)
                indices = np.random.choice(y_test.index, sample_size, replace=False)
                y_test_sample = y_test.loc[indices]
                y_pred_sample = pd.Series(y_pred, index=y_test.index).loc[indices]
                results['scatter_plot_data'] = {
                    'actual': y_test_sample.tolist(),
                    'predicted': y_pred_sample.tolist()
                }

            # 11. Importancia de características
            try:
                final_model = pipeline.named_steps['model']
                from sklearn.utils.validation import check_is_fitted
                check_is_fitted(final_model)

                if hasattr(final_model, 'feature_importances_'):
                    feature_names = pipeline.named_steps['preprocessor'].get_feature_names_out()
                    results['feature_importance_chart_data'] = {
                        name: float(imp)
                        for name, imp in zip(feature_names, final_model.feature_importances_)
                    }
                elif hasattr(final_model, 'coef_'):
                    feature_names = pipeline.named_steps['preprocessor'].get_feature_names_out()
                    coefs = np.abs(final_model.coef_).ravel()
                    results['feature_importance_chart_data'] = {
                        name: float(coef) for name, coef in zip(feature_names, coefs)
                    }
                else:
                    results['feature_importance_chart_data'] = {}
            except Exception as e:
                logger.error(f"No se pudo extraer importancia de características: {e}", exc_info=True)
                results['feature_importance_chart_data'] = {}

            # 12. Artefactos
            training_features = X.columns.tolist()
            results['artifacts'] = {
                'pipeline': pipeline,
                'y_encoder': y_encoder,
                'training_features': training_features,
                'target_col': target_col,
                'problem_type': problem_type
            }

            logger.info("== FIN train_model ==")
            return {"success": True, "data": results}

        except Exception as e:
            logger.error(f"Error general en train_model: {e}", exc_info=True)
            return {"success": False, "error": str(e)}


    def analyze_sensitivity(
        self,
        serialized_model_bytes: bytes,
        feature_to_vary: str,
        variation_range: dict,
        base_data_point: dict,
    ) -> dict:
        """
        Realiza un análisis de sensibilidad para un modelo y una característica.
        Respeta EXACTAMENTE los nombres de columnas tal como fueron entrenados en el pipeline.
        """
        try:
            # --- Validaciones ---
            if not serialized_model_bytes:
                raise ValueError("No se recibieron bytes del modelo serializado.")
            if feature_to_vary not in base_data_point:
                raise ValueError(f"La característica '{feature_to_vary}' no existe en base_data_point.")
            for key in ["start", "end"]:
                if key not in variation_range:
                    raise ValueError(f"Falta '{key}' en variation_range.")
            steps = int(variation_range.get("steps", 20))
            if steps <= 0:
                raise ValueError("'steps' debe ser mayor que 0.")

            # --- 1. Cargar artefactos ---
            buffer = BytesIO(serialized_model_bytes)
            artifacts = joblib.load(buffer)
            pipeline = artifacts.get("pipeline")
            y_encoder = artifacts.get("y_encoder")
            training_features = artifacts.get("training_features")
            problem_type = artifacts.get("problem_type")

            if not training_features:
                raise ValueError(
                    "El artefacto del modelo es antiguo y no contiene 'training_features'. "
                    "Por favor, vuelve a entrenar el modelo."
                )
            if pipeline is None:
                raise ValueError("No se encontró 'pipeline' en los artefactos.")
            if problem_type not in ["clasificacion", "regresion"]:
                raise ValueError("El artefacto no tiene un 'problem_type' válido.")

            # --- 2. Generar rango de simulación ---
            sim_values = np.linspace(variation_range["start"], variation_range["end"], steps)

            # --- 3. Construcción del DataFrame a prueba de errores ---
            # Creamos DataFrame vacío con columnas EXACTAS como en el entrenamiento
            sim_df = pd.DataFrame(columns=training_features)

            # Rellenamos con las filas variando la feature
            for val in sim_values:
                new_row_dict = base_data_point.copy()
                new_row_dict[feature_to_vary] = val
                new_row_df = pd.DataFrame([new_row_dict])
                sim_df = pd.concat([sim_df, new_row_df], ignore_index=True)

            # Forzar a que las columnas queden en el mismo orden
            sim_df = sim_df[training_features]

            # --- 4. Predicciones ---
            if problem_type == "clasificacion":
                if not hasattr(pipeline, "predict_proba"):
                    raise ValueError("El pipeline no soporta predict_proba para clasificación.")
                pred_array = pipeline.predict_proba(sim_df)
                predictions = pred_array[:, 1] if pred_array.shape[1] == 2 else pred_array
            else:  # regresion
                predictions = pipeline.predict(sim_df)
                

            # --- 5. Resultados ---
            results_data = [
                {"feature_value": float(val), "prediction": float(pred)}
                for val, pred in zip(sim_values, predictions)
            ]

            return {
                "success": True,
                "data": {
                    "feature_analyzed": feature_to_vary,
                    "problem_type": problem_type,
                    "sensitivity_results": results_data,
                },
            }

        except Exception as e:
            self.logger.error(f"Error en analyze_sensitivity: {e}", exc_info=True)
            return {"success": False, "error": str(e)}


    def make_batch_prediction(
        self,
        serialized_model_bytes: bytes,
        df_to_predict: pd.DataFrame,
    ) -> Dict[str, Union[bool, str, pd.DataFrame]]:
        """
        Aplica un pipeline previamente serializado para predicciones por lotes.
        """
        try:
            # --- Validaciones ---
            if not isinstance(serialized_model_bytes, (bytes, bytearray)):
                return {"success": False, "error": "El modelo debe ser un objeto bytes."}

            if not isinstance(df_to_predict, pd.DataFrame):
                return {"success": False, "error": "El dataset debe ser un DataFrame de pandas."}

            if df_to_predict.empty:
                return {"success": False, "error": "El DataFrame a predecir está vacío."}

            # --- 1. Cargar artefactos ---
            buffer = BytesIO(serialized_model_bytes)
            try:
                artifacts = joblib.load(buffer)
            except Exception as load_err:
                self.logger.error(f"Error al cargar el modelo serializado: {load_err}", exc_info=True)
                return {"success": False, "error": "Error al cargar el modelo serializado."}

            pipeline = artifacts.get("pipeline")
            y_encoder = artifacts.get("y_encoder")

            if pipeline is None:
                return {"success": False, "error": "El artefacto no contiene un 'pipeline' válido."}

            # --- 2. Realizar predicciones ---
            try:
                numeric_predictions = pipeline.predict(df_to_predict)
            except Exception as pred_err:
                self.logger.error(f"Error en la predicción: {pred_err}", exc_info=True)
                return {"success": False, "error": "Error durante la predicción."}

            # --- 3. Decodificar si es clasificación ---
            try:
                if y_encoder is not None:
                    final_predictions = y_encoder.inverse_transform(numeric_predictions)
                else:
                    if pd.api.types.is_numeric_dtype(numeric_predictions):
                        final_predictions = numeric_predictions.round(4)
                    else:
                        final_predictions = numeric_predictions
            except Exception as decode_err:
                self.logger.error(f"Error al decodificar predicciones: {decode_err}", exc_info=True)
                return {"success": False, "error": "Error al decodificar predicciones."}

            # --- 4. Generar DataFrame de salida ---
            df_with_predictions = df_to_predict.copy()
            df_with_predictions["prediction"] = final_predictions

            return {"success": True, "data": df_with_predictions}

        except Exception as e:
            self.logger.error(f"Error inesperado en make_batch_prediction: {e}", exc_info=True)
            return {"success": False, "error": "Error inesperado durante la predicción."}

    


    def _calculate_feature_importance(self, X: pd.DataFrame, y: pd.Series, problem_type: str) -> dict:
        """
        Calcula la importancia de cada feature de forma robusta para producción.
        - Preprocesa columnas categóricas y numéricas.
        - Usa correlación absoluta para regresión.
        - Usa Mutual Information para clasificación.
        """
        try:
            X_processed = X.copy()
            y_processed = y.copy()

            # --- Preprocesamiento de features categóricas ---
            categorical_cols_in_X = X_processed.select_dtypes(include=['object', 'category']).columns
            for col in categorical_cols_in_X:
                le = LabelEncoder()
                X_processed[col] = X_processed[col].astype(str).fillna('__MISSING__')
                X_processed[col] = le.fit_transform(X_processed[col])

            # --- Preprocesamiento de features numéricas ---
            numeric_cols_in_X = X_processed.select_dtypes(include=np.number).columns
            if not numeric_cols_in_X.empty:
                X_processed[numeric_cols_in_X] = X_processed[numeric_cols_in_X].fillna(
                    X_processed[numeric_cols_in_X].median()
                )

            # --- Cálculo de importancia según el tipo de problema ---
            if problem_type == 'regresion':
                y_processed = pd.to_numeric(y_processed, errors='coerce').fillna(y_processed.median())

                correlations = {}
                for col in X_processed.columns:
                    if pd.api.types.is_numeric_dtype(X_processed[col]):
                        corr_value = X_processed[col].corr(y_processed)
                        correlations[col] = corr_value if pd.notna(corr_value) else 0.0

                importance_scores = {k: round(abs(v), 4) for k, v in correlations.items()}

            else:  # Clasificación
                le_y = LabelEncoder()
                y_processed = y_processed.astype(str).fillna('__MISSING__')
                y_processed = pd.Series(le_y.fit_transform(y_processed), index=y.index, name=y.name)

                try:
                    mi_scores = mutual_info_classif(X_processed, y_processed, random_state=42)
                    importance_scores = pd.Series(mi_scores, index=X_processed.columns).round(4).to_dict()
                except Exception as e:
                    logger.error(f"Error calculando Mutual Information: {e}", exc_info=True)
                    importance_scores = {col: 0.0 for col in X_processed.columns}

            # --- Devolver en el mismo orden que X original ---
            final_scores = {col: importance_scores.get(col, 0.0) for col in X.columns}
            return final_scores

        except Exception as e:
            logger.error(f"Error en _calculate_feature_importance: {e}", exc_info=True)
            return {col: 0.0 for col in X.columns}


    def _detectar_tipo_problema(self, y: pd.Series) -> str:
        """
        Detecta si el problema es 'clasificacion' o 'regresion'
        basándose en el dtype del target y su cardinalidad.
        """
        if not isinstance(y, pd.Series):
            raise TypeError("El argumento 'y' debe ser un pd.Series.")

        y_clean = y.dropna()
        if y_clean.empty:
            raise ValueError("La serie objetivo está vacía o solo contiene valores nulos.")

        # Clasificación si es texto o categórico
        if pd.api.types.is_object_dtype(y.dtype) or pd.api.types.is_categorical_dtype(y.dtype):
            return "clasificacion"

        # Numérico: decidir por cardinalidad
        if pd.api.types.is_numeric_dtype(y.dtype):
            unique_values = y_clean.nunique()
            return "clasificacion" if unique_values < 50 else "regresion"

        # Otro tipo → asumir clasificación
        return "clasificacion"



    def _build_dynamic_preprocessor(
        self,
        X: pd.DataFrame,
        encoding_strategies: Dict[str, str]
    ) -> ColumnTransformer:
        """
        Construye un ColumnTransformer robusto basado en las estrategias
        especificadas por el usuario desde el frontend.
        - Valida columnas y estrategias antes de construir.
        - Maneja columnas inexistentes y estrategias no reconocidas.
        """
        if not isinstance(X, pd.DataFrame):
            raise TypeError("X debe ser un DataFrame de pandas.")

        if not isinstance(encoding_strategies, dict):
            raise TypeError("encoding_strategies debe ser un diccionario.")

        valid_strategies = {"one-hot", "ordinal", "descartar"}

        # Detectar columnas numéricas automáticamente
        numeric_features = X.select_dtypes(include=np.number).columns.tolist()
        ohe_features = []
        ordinal_features = []

        # Clasificar columnas según estrategia
        for col, strategy in encoding_strategies.items():
            if col not in X.columns:
                logger.warning(f"Columna '{col}' no encontrada en el dataset. Se ignora.")
                continue
            if strategy not in valid_strategies:
                logger.warning(f"Estrategia '{strategy}' no reconocida para columna '{col}'. Se ignora.")
                continue
            if strategy == "one-hot":
                ohe_features.append(col)
            elif strategy == "ordinal":
                ordinal_features.append(col)
            # 'descartar' se ignora en la asignación

        # Logging detallado
        logger.info("Estrategias Dinámicas Recibidas:")
        logger.info(f"Numéricas (automático): {numeric_features}")
        logger.info(f"One-Hot (usuario): {ohe_features}")
        logger.info(f"Ordinal (usuario): {ordinal_features}")
        logger.info(f"Descartadas (usuario): {[c for c, s in encoding_strategies.items() if s == 'descartar']}")

        # --- Pipelines por tipo (AQUÍ ESTÁ EL CAMBIO) ---
        numeric_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())  # <-- ¡EL INGREDIENTE SECRETO!
    ])

        onehot_transformer = Pipeline(steps=[
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ])
        ordinal_transformer = Pipeline(steps=[
       ('imputer', SimpleImputer(strategy='most_frequent')),
       ('ordinal', PredefinedOrdinalEncoder(ordinal_maps=self.ORDINAL_MAPS))
    ])

        # Construir ColumnTransformer final
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('ohe', onehot_transformer, ohe_features),
                ('ord', ordinal_transformer, ordinal_features)
            ],
            remainder='drop'
        )
        preprocessor.set_output(transform="pandas")
        return preprocessor


    

    def make_prediction(self, serialized_model_bytes: bytes, input_data: dict) -> dict:
        """
        Deserializa un pipeline de modelo y lo usa para predecir sobre nuevos datos.

        Args:
            serialized_model_bytes: El pipeline completo serializado con joblib.
            input_data: Un diccionario con los datos para una única predicción.
                        Ej: {"edad": 30, "pais": "argentina", "ingresos": 50000}

        Returns:
            Un diccionario con el resultado de la predicción o un error.
        """
        try:
            # 1. Deserializar el pipeline desde los bytes
            # Usamos BytesIO para tratar los bytes como un archivo, que es lo que joblib espera
            from io import BytesIO
            import joblib
            import pandas as pd
            import logging

            buffer = BytesIO(serialized_model_bytes)
            artifacts = joblib.load(buffer)
            pipeline = artifacts['pipeline']
            y_encoder = artifacts['y_encoder']
            input_df = pd.DataFrame(input_data, index=[0])

            numeric_prediction = pipeline.predict(input_df)

            if y_encoder:
            # inverse_transform espera un array, se lo pasamos
               final_prediction = y_encoder.inverse_transform(numeric_prediction)[0]
            else:
            # Si es regresión, el resultado ya es el final
                final_prediction = numeric_prediction[0].item()

            return {
                      "success": True,
                      "prediction_data": { "prediction": final_prediction }
               }

        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error durante la predicción en 'make_prediction': {e}", exc_info=True)
            return {"success": False, "error": f"Error interno al procesar la predicción: {e}"}
        


    