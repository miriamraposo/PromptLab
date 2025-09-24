
import json
import uuid
import warnings
from io import BytesIO
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import (
    silhouette_score, davies_bouldin_score, calinski_harabasz_score
)
from sklearn.neighbors import NearestNeighbors
import joblib

import logging
logger = logging.getLogger(__name__)




class TabularClusteringService:
    def __init__(self):
        # El init es simple y NO recibe argumentos.
        self.dataset_service = None
        self.supabase_handler = None
        logger.info("TabularClusteringService inicializado (sin dependencias).")

    # --- NUEVO MÉTODO DE CONFIGURACIÓN ---
    def configure(self, dataset_service, supabase_handler):
        """
        Configura las dependencias del servicio DESPUÉS de su creación.
        """
        self.dataset_service = dataset_service
        self.supabase_handler = supabase_handler
        logger.info("TabularClusteringService configurado con dependencias.")


    # ================================================================
    # MÉTODO 1: PREPROCESAMIENTO SIMPLE (PARA ANÁLISIS EXPLORATORIO)
    # ================================================================
    def _preprocess_for_analysis(self, tabular_data: List[Dict[str, Any]]) -> np.ndarray:
        if not tabular_data:
            raise ValueError("La lista de datos tabulares está vacía.")
        df = pd.DataFrame(tabular_data)
        if df.empty:
            raise ValueError("El DataFrame generado está vacío.")

        num_cols = df.select_dtypes(include=np.number).columns
        cat_cols = df.select_dtypes(exclude=np.number).columns

        for col in num_cols:
            df[col] = df[col].fillna(df[col].mean())
        for col in cat_cols:
            df[col] = df[col].fillna(df[col].mode()[0] if not df[col].mode().empty else "desconocido")

        df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
        features = StandardScaler().fit_transform(df.values)
        return features

    # ================================================================
    # MÉTODO 2: PIPELINE ROBUSTO (PARA ENTRENAMIENTO Y PREDICCIÓN)
    # ================================================================
    def _build_preprocessing_pipeline(self, df: pd.DataFrame) -> Pipeline:
        numeric_features = df.select_dtypes(include=np.number).columns.tolist()
        categorical_features = df.select_dtypes(include=['object', 'category']).columns.tolist()

        numeric_transformer = Pipeline([('imputer', SimpleImputer(strategy='median')), ('scaler', StandardScaler())])
        categorical_transformer = Pipeline([('imputer', SimpleImputer(strategy='most_frequent')), ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))])

        preprocessor = ColumnTransformer(
            transformers=[('num', numeric_transformer, numeric_features), ('cat', categorical_transformer, categorical_features)],
            remainder="drop"
        )
        return preprocessor

    # ================================================================
    # MÉTODO AUXILIAR: RESUMEN DE CLÚSTERES
    # ================================================================
    def _generate_cluster_summary(self, original_df: pd.DataFrame, cluster_labels: np.ndarray) -> Dict[str, Any]:
        summary = {}
        df_with_clusters = original_df.copy()
        df_with_clusters['cluster'] = cluster_labels
        numeric_cols = df_with_clusters.select_dtypes(include=np.number).columns.tolist()
        categorical_cols = df_with_clusters.select_dtypes(include=['object', 'category']).columns.tolist()

        for cluster_id in sorted(df_with_clusters['cluster'].unique()):
            cluster_df = df_with_clusters[df_with_clusters['cluster'] == cluster_id]
            cluster_name = "Ruido" if cluster_id == -1 else f"Clúster {cluster_id}"
            numeric_summary = cluster_df[numeric_cols].describe().to_dict() if numeric_cols else {}
            categorical_summary = {col: cluster_df[col].mode()[0] if not cluster_df[col].mode().empty else None for col in categorical_cols}
            summary[cluster_name] = {"n_samples": len(cluster_df), "numeric_summary": numeric_summary, "categorical_summary": categorical_summary}
        return summary

    # ================================================================
    # MÉTODOS DE ANÁLISIS EXPLORATORIO (USAN PREPROCESAMIENTO SIMPLE)
    # ================================================================
    def suggest_kmeans_k(self, tabular_data: List[Dict[str, Any]], max_k: int = 15) -> Dict[str, Any]:
        try:
            features = self._preprocess_for_analysis(tabular_data)
            k_values, inertia_scores = [], []
            warnings.filterwarnings("ignore", category=UserWarning, module="sklearn.cluster._kmeans")
            for k in range(2, max_k + 1):
                kmeans = KMeans(n_clusters=k, random_state=42, n_init=10).fit(features)
                k_values.append(k)
                inertia_scores.append(kmeans.inertia_)
            warnings.resetwarnings()
            return {"success": True, "data": {"k_values": k_values, "inertia_scores": inertia_scores}}
        except Exception as e:
            logger.exception("❌ Error en suggest_kmeans_k")
            return {"success": False, "error": str(e)}

    def suggest_dbscan_eps(self, tabular_data: List[Dict[str, Any]], min_samples: int) -> Dict[str, Any]:
        try:
            features = self._preprocess_for_analysis(tabular_data)
            neighbors = NearestNeighbors(n_neighbors=min_samples).fit(features)
            distances, _ = neighbors.kneighbors(features)
            k_distances = np.sort(distances[:, min_samples - 1])
            return {"success": True, "data": {"distances": k_distances.tolist(), "min_samples_used": min_samples}}
        except Exception as e:
            logger.exception("❌ Error en suggest_dbscan_eps")
            return {"success": False, "error": str(e)}

        # ================================================================
    # MÉTODO AUXILIAR: CÁLCULO ROBUSTO DE MÉTRICAS
    # ================================================================
    def _compute_clustering_metrics(self, features: np.ndarray, labels: np.ndarray) -> Dict[str, float]:
        """Calcula métricas de clustering de forma robusta.
        Retorna un diccionario con las métricas disponibles según el caso.
        """
        metrics = {}
        unique_labels = set(labels)

        # Necesitamos al menos 2 clusters distintos para calcular métricas
        if len(unique_labels) > 1:
            try:
                metrics["silhouette_score"] = float(silhouette_score(features, labels))
            except Exception:
                metrics["silhouette_score"] = None

            try:
                metrics["davies_bouldin_index"] = float(davies_bouldin_score(features, labels))
            except Exception:
                metrics["davies_bouldin_index"] = None

            try:
                metrics["calinski_harabasz_index"] = float(calinski_harabasz_score(features, labels))
            except Exception:
                metrics["calinski_harabasz_index"] = None
        else:
            metrics["silhouette_score"] = None
            metrics["davies_bouldin_index"] = None
            metrics["calinski_harabasz_index"] = None

        return metrics

    # ================================================================
    # MÉTODOS DE CLUSTERING
    # ================================================================
    def run_kmeans_clustering(self, tabular_data: List[Dict[str, Any]], n_clusters: int = 5) -> Dict[str, Any]:
        try:
            features = self._preprocess_for_analysis(tabular_data)
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10).fit(features)
            cluster_labels = kmeans.labels_

            # Reducir para visualización
            plot_coords_2d = PCA(n_components=2).fit_transform(features)

            # Calcular métricas robustas
            metrics = self._compute_clustering_metrics(features, cluster_labels)
            metrics["inertia_sse"] = float(kmeans.inertia_)

            summary = self._generate_cluster_summary(pd.DataFrame(tabular_data), cluster_labels)
            return {
                "success": True,
                "method": "kmeans",
                "cluster_labels": cluster_labels.tolist(),
                "n_clusters": len(set(cluster_labels)),
                "metrics": metrics,
                "plot_coords": plot_coords_2d.tolist(),
                "summary": summary,
            }
        except Exception as e:
            logger.exception("❌ Error en run_kmeans_clustering")
            return {"success": False, "error": str(e)}

    def run_dbscan_clustering(self, tabular_data: List[Dict[str, Any]], eps: float = 0.5, min_samples: int = 5) -> Dict[str, Any]:
        try:
            features = self._preprocess_for_analysis(tabular_data)
            dbscan = DBSCAN(eps=eps, min_samples=min_samples).fit(features)
            cluster_labels = dbscan.labels_

            n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)

            # Calcular métricas solo si hay clusters válidos
            mask = cluster_labels != -1
            metrics = {}
            if n_clusters > 1 and mask.sum() > 1:
                metrics = self._compute_clustering_metrics(features[mask], cluster_labels[mask])

            summary = self._generate_cluster_summary(pd.DataFrame(tabular_data), cluster_labels)
            return {
                "success": True,
                "method": "dbscan",
                "cluster_labels": cluster_labels.tolist(),
                "n_clusters": n_clusters,
                "metrics": metrics,
                "summary": summary,
            }
        except Exception as e:
            logger.exception("❌ Error en run_dbscan_clustering")
            return {"success": False, "error": str(e)}


    def run_clustering_analysis(self, tabular_data: List[Dict[str, Any]], algorithm: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        parameters = parameters or {}
        if algorithm == "kmeans":
            return self.run_kmeans_clustering(tabular_data, parameters.get("n_clusters", 5))
        elif algorithm == "dbscan":
            return self.run_dbscan_clustering(tabular_data, parameters.get("eps", 0.5), parameters.get("min_samples", 5))
        else:
            return {"success": False, "error": f"Algoritmo '{algorithm}' no soportado."}

    # ================================================================
    # MÉTODOS DE MODELO (USAN PIPELINE ROBUSTO)
    # ================================================================
    def train_and_serialize_clustering_model(self, tabular_data: List[Dict[str, Any]], algorithm: str, parameters: Dict[str, Any] = None) -> Dict[str, Any]:
        try:
            df = pd.DataFrame(tabular_data)
            parameters = parameters or {}
            preprocessor = self._build_preprocessing_pipeline(df)
            if algorithm == "kmeans": model = KMeans(n_clusters=parameters.get("n_clusters", 5), random_state=42, n_init=10)
            elif algorithm == "dbscan": model = DBSCAN(eps=parameters.get("eps", 0.5), min_samples=parameters.get("min_samples", 5))
            else: return {"success": False, "error": f"Algoritmo '{algorithm}' no soportado."}
            
            final_pipeline = Pipeline([('preprocessor', preprocessor), ('clusterer', model)]).fit(df)
            analysis_response = self.run_clustering_analysis(tabular_data, algorithm, parameters)
            if not analysis_response.get("success"): return analysis_response
            
            buffer = BytesIO()
            joblib.dump(final_pipeline, buffer)
            return {"success": True, "data": {"results": analysis_response, "artifacts": buffer.getvalue(), "n_samples": len(df)}}
        except Exception as e:
            logger.exception("❌ Error en train_and_serialize_clustering_model")
            return {"success": False, "error": str(e)}
        


    # ========================================================================
    # ENTRENAR Y GUARDAR MODELO DE CLUSTERING
    # ========================================================================
    def train_and_save_model(
        self,
        user_id: str,
        dataset_id: str,
        algorithm: str,
        parameters: Dict[str, Any],
        project_id: str,
        model_display_name: str,
        project_name: str
    ) -> Dict[str, Any]:
        """
        Entrena un modelo de clustering, lo serializa, lo guarda en Supabase
        y registra la metadata en la tabla `trained_models`.

        Args:
            user_id (str): ID del usuario dueño del proyecto.
            dataset_id (str): ID del dataset usado para entrenamiento.
            algorithm (str): Algoritmo de clustering (ej: 'kmeans', 'dbscan').
            parameters (Dict[str, Any]): Parámetros del algoritmo.
            project_id (str): ID del proyecto asociado.
            model_display_name (str): Nombre amigable del modelo.
            project_name (str): Nombre del proyecto.

        Returns:
            Dict[str, Any]: Diccionario con resultado de éxito o error.
        """
        try:
            # ----------------------------------------------------------------
            # 0. VALIDACIONES INICIALES
            # ----------------------------------------------------------------
            if not self.dataset_service or not self.supabase_handler:
                logger.error("Dependencias no inicializadas: dataset_service o supabase_handler.")
                return {"success": False, "error": "Servicio no inicializado correctamente."}

            if not user_id or not dataset_id or not project_id:
                logger.error("Faltan identificadores obligatorios.")
                return {"success": False, "error": "Faltan identificadores requeridos."}

            # ----------------------------------------------------------------
            # 1. CARGAR Y PREPARAR DATOS
            # ----------------------------------------------------------------
            logger.info(f"📂 Cargando dataset {dataset_id} para el usuario {user_id}...")
            dataset_info = self.dataset_service.get_dataset_info_by_id(dataset_id, user_id)
            storage_path = dataset_info["data"].get("storage_path")

            if not storage_path:
                logger.error("No se encontró el storage_path en el dataset.")
                return {"success": False, "error": "Dataset sin ruta de almacenamiento válida."}

            df = self.supabase_handler.load_file_as_dataframe(user_id=user_id, path=storage_path)

            if df is None or df.empty:
                logger.error("El dataframe cargado está vacío o es None.")
                return {"success": False, "error": "No se pudo cargar el dataset o está vacío."}

            logger.info(f"✅ Dataset cargado con {len(df)} filas y {len(df.columns)} columnas.")

            # ----------------------------------------------------------------
            # 2. ENTRENAR Y SERIALIZAR EL MODELO
            # ----------------------------------------------------------------
            logger.info(f"⚙️ Entrenando modelo de clustering '{algorithm}'...")
            train_result = self.train_and_serialize_clustering_model(
                df.to_dict(orient="records"), algorithm, parameters
            )

            if not train_result.get("success"):
                logger.error("Error al entrenar el modelo de clustering.")
                return train_result

            model_bytes = train_result["data"]["artifacts"]
            analysis_results = train_result["data"]["results"]

            # ----------------------------------------------------------------
            # 3. SUBIR EL MODELO AL STORAGE
            # ----------------------------------------------------------------
            model_id = str(uuid.uuid4())
            model_storage_path = f"{user_id}/{project_id}/models/{model_id}.joblib"

            logger.info(f"⬆️ Subiendo modelo a storage: {model_storage_path}")
            # Accedemos a través del atributo _client
            self.supabase_handler._client.storage.from_("proyectos-usuarios").upload(
            path=model_storage_path,
            file=model_bytes,
            file_options={"content-type": "application/octet-stream"}
            )
            # ----------------------------------------------------------------
            # 4. REGISTRAR EN BASE DE DATOS
            # ----------------------------------------------------------------
            new_model_record = {
                "id": model_id,
                "project_id": project_id,
                "user_id": user_id,
                "model_name": algorithm,
                "source_dataset_id": dataset_id,
                "target_col": None,
                "feature_cols": df.columns.tolist(),
                "model_storage_path": model_storage_path,
                "evaluation_results": analysis_results,
                "project_name": project_name,
                "model_display_name": model_display_name,
                "problem_type": "clustering_tabular",
            }

            logger.info("📝 Registrando modelo en tabla 'trained_models'...")
            self.supabase_handler._client.table("trained_models").insert(new_model_record).execute()

            # ----------------------------------------------------------------
            # 5. RESPUESTA DE ÉXITO
            # ----------------------------------------------------------------
            logger.info(f"🎉 Modelo {model_id} entrenado y guardado correctamente.")
            return {
                "success": True,
                "message": "Modelo de clustering guardado.",
                "model_id": model_id,
                "results": analysis_results,
            }

        except Exception as e:
            logger.exception("❌ Error en train_and_save_model")
            return {"success": False, "error": str(e)}



    # --- LA FUNCIÓN QUE FALTABA ---
    def predict_with_saved_model(self, model_bytes: bytes, new_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        try:
            model = joblib.load(BytesIO(model_bytes))
            df_new = pd.DataFrame(new_data)
            if df_new.empty: return {"success": False, "error": "El dataset nuevo está vacío."}
            
            labels = model.predict(df_new)
            return {"success": True, "data": {"n_samples": len(df_new), "labels": labels.tolist()}}
        except Exception as e:
            logger.exception("❌ Error en predict_with_saved_model")
            return {"success": False, "error": str(e)}