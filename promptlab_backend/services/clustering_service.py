# services/clustering_service.py

import logging
import json
from io import BytesIO
from pathlib import Path
from typing import List, Dict, Any, Optional
from sklearn.decomposition import PCA
from PIL import Image
import torch
import torch.nn as nn
from torchvision import models, transforms
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler
import numpy as np

from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score

logger = logging.getLogger(__name__)



# ---------------- CONFIGURACIÓN DE LOGS ----------------
logger = logging.getLogger("ClusteringService")
logger.setLevel(logging.INFO)

# En producción puedes configurar un handler a archivo
if not logger.handlers:
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    ch.setFormatter(formatter)
    logger.addHandler(ch)


class ClusteringService:
    """
    Servicio de clustering de imágenes basado en extracción de características con ResNet34.
    Soporta métodos de clustering K-Means y DBSCAN.
    """

    def __init__(self):
        self.device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
        self.feature_extractor = self._load_feature_extractor()
        self.transform = self._get_transforms()
        logger.info(f"ClusteringService inicializado en dispositivo: {self.device}")

    # ---------------- CARGA DE MODELO ----------------
    def _load_feature_extractor(self) -> nn.Module:
        """Carga un modelo ResNet34 preentrenado en ImageNet sin la capa de clasificación final."""
        try:
            model = models.resnet34(weights="IMAGENET1K_V1")
            model.fc = nn.Identity()  # Quitamos la capa final
            model.to(self.device)
            model.eval()
            logger.info("✅ Extractor de características (ResNet34) cargado.")
            return model
        except Exception as e:
            logger.error(f"Error al cargar el modelo: {e}")
            raise

    def _get_transforms(self) -> transforms.Compose:
        """Transformaciones estándar de preprocesamiento para modelos de ImageNet."""
        return transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    # ---------------- FEATURE EXTRACTION ----------------
    def _extract_features(self, image_bytes_list: List[bytes]) -> np.ndarray:
        """
        Convierte una lista de imágenes en bytes a un array de vectores de características.
        """
        features_list = []
        with torch.no_grad():
            for idx, image_bytes in enumerate(image_bytes_list):
                try:
                    img = Image.open(BytesIO(image_bytes)).convert("RGB")
                    img_t = self.transform(img)
                    batch_t = torch.unsqueeze(img_t, 0).to(self.device)

                    features = self.feature_extractor(batch_t)
                    features_list.append(features.cpu().numpy().flatten())
                except Exception as e:
                    logger.error(f"❌ Error procesando imagen {idx}: {e}")
                    continue

        return np.array(features_list)


    def run_kmeans_clustering(
        self, image_bytes_list: List[bytes], n_clusters: int = 5
    ) -> Dict[str, Any]:
        """
        Ejecuta clustering K-Means sobre una lista de imágenes,
        calcula métricas de calidad y genera coordenadas PCA para visualización.
        """
        try:
            if not image_bytes_list:
                return {"success": False, "error": "La lista de imágenes está vacía."}

            if len(image_bytes_list) < n_clusters:
                return {"success": False, "error": "Se necesitan más imágenes que clústeres."}

            logger.info(f"🚀 Extrayendo características de {len(image_bytes_list)} imágenes...")
            features = self._extract_features(image_bytes_list)

            if features.shape[0] == 0:
                return {"success": False, "error": "No se pudieron extraer características de ninguna imagen."}

            # --- 1. Escalado de características ---
            scaler = StandardScaler()
            scaled_features = scaler.fit_transform(features)

            # --- 2. Aplicar K-Means ---
            logger.info(f"🤖 Aplicando K-Means con k={n_clusters}...")
            kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
            cluster_labels = kmeans.fit_predict(scaled_features)

            # --- 3. Reducir dimensionalidad con PCA para visualización ---
            logger.info("📉 Reduciendo dimensionalidad con PCA para el gráfico...")
            pca = PCA(n_components=2)
            plot_coords_2d = pca.fit_transform(scaled_features)

            # --- 4. Calcular métricas de clustering ---
            metrics = {"inertia_sse": float(kmeans.inertia_)}
            if n_clusters > 1:
                metrics["silhouette_score"] = float(silhouette_score(scaled_features, cluster_labels))
                metrics["davies_bouldin_index"] = float(davies_bouldin_score(scaled_features, cluster_labels))
                metrics["calinski_harabasz_index"] = float(calinski_harabasz_score(scaled_features, cluster_labels))

            # --- 5. Respuesta ---
            return {
                "success": True,
                "method": "kmeans",
                "cluster_labels": cluster_labels.tolist(),
                "n_clusters": len(set(cluster_labels)),
                "metrics": metrics,
                "plot_coords": plot_coords_2d.tolist(),  # coordenadas para graficar en el frontend
            }

        except Exception as e:
            logger.exception("❌ Error en run_kmeans_clustering")
            return {"success": False, "error": str(e)}



    def run_dbscan_clustering(
        self, image_bytes_list: List[bytes], eps: float = 0.5, min_samples: int = 5
    ) -> Dict[str, Any]:
        """
        Ejecuta clustering DBSCAN sobre una lista de imágenes y calcula métricas de calidad.
        """
        try:
            if not image_bytes_list:
                return {"success": False, "error": "La lista de imágenes está vacía."}

            logger.info(f"🚀 Extrayendo características de {len(image_bytes_list)} imágenes...")
            features = self._extract_features(image_bytes_list)

            if features.shape[0] == 0:
                return {"success": False, "error": "No se pudieron extraer características de ninguna imagen."}

            scaler = StandardScaler()
            scaled_features = scaler.fit_transform(features)

            logger.info(f"🤖 Aplicando DBSCAN (eps={eps}, min_samples={min_samples})...")
            dbscan = DBSCAN(eps=eps, min_samples=min_samples)
            cluster_labels = dbscan.fit_predict(scaled_features)

            n_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)

            # --- Cálculo de métricas ---
            metrics = {}
            mask = cluster_labels != -1  # Filtrar ruido
            if n_clusters > 1 and mask.sum() > 1:
                metrics["silhouette_score"] = float(silhouette_score(scaled_features[mask], cluster_labels[mask]))
                metrics["davies_bouldin_index"] = float(davies_bouldin_score(scaled_features[mask], cluster_labels[mask]))
                metrics["calinski_harabasz_index"] = float(calinski_harabasz_score(scaled_features[mask], cluster_labels[mask]))

            return {
                "success": True,
                "method": "dbscan",
                "cluster_labels": cluster_labels.tolist(),
                "n_clusters": n_clusters,
                "metrics": metrics,
            }

        except Exception as e:
            logger.exception("❌ Error en run_dbscan_clustering")
            return {"success": False, "error": str(e)}

    # ---------------- GUARDADO Y RESPUESTAS ----------------
    def save_results(
        self, results: Dict[str, Any], output_path: str = "clustering_results.json"
    ) -> bool:
        """
        Guarda los resultados en un archivo JSON para ser consumido por frontend u otros servicios.
        """
        try:
            path = Path(output_path)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=4, ensure_ascii=False)
            logger.info(f"📂 Resultados guardados en {path.absolute()}")
            return True
        except Exception as e:
            logger.error(f"❌ Error al guardar resultados: {e}")
            return False

    def format_for_frontend(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """
        Da formato limpio a los resultados para ser enviados al frontend.
        """
        if not results.get("success"):
            return {"success": False, "error": results.get("error", "Error desconocido.")}

        return {
            "success": True,
            "method": results.get("method"),
            "clusters": [
                {"image_index": idx, "cluster": cluster}
                for idx, cluster in enumerate(results.get("cluster_labels", []))
            ],
            "n_clusters": results.get("n_clusters"),
        }
