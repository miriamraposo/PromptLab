import logging
import os
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any, List
from io import BytesIO

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, models
from torch.utils.data import DataLoader, random_split
from torchvision.datasets import ImageFolder
from PIL import Image
import joblib
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
import copy
from utils.supabase_handler import supabase_handler  

# --- Logging robusto ---
logger = logging.getLogger("VisionPredictionService")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


class VisionPredictionService:
    """
    Servicio especializado para entrenar, evaluar y usar modelos
    de clasificación de imágenes usando PyTorch.
    """

    def __init__(self):
        self.architectures = {
            "resnet34": models.resnet34,
            "mobilenet_v2": models.mobilenet_v2,
            "efficientnet_b0": models.efficientnet_b0
        }
        self.logger = logger

    # --- Preparación del dataset desde DB ---
    def _prepare_dataset_from_db(self, image_records: List[Dict[str, Any]]) -> Path:
        temp_dir = Path(tempfile.mkdtemp(prefix="vision_dataset_"))
        self.logger.info(f"📁 Creando dataset temporal en: {temp_dir}")

        for record in image_records:
            tags = record.get("tags")
            storage_path = record.get("storage_path")

            if not tags or not storage_path:
                self.logger.warning(f"Registro omitido: {record.get('id')}")
                continue

            label = tags[0]
            label_dir = temp_dir / label
            label_dir.mkdir(exist_ok=True)

            image_bytes = supabase_handler.download_visual_file(storage_path)
            if image_bytes:
                try:
                    img = Image.open(BytesIO(image_bytes)).convert("RGB")
                    file_name = Path(storage_path).stem
                    img.save(label_dir / f"{file_name}.png", "PNG")
                except Exception as e:
                    self.logger.error(f"❌ No se pudo procesar {storage_path}: {e}")
            else:
                self.logger.error(f"❌ No se pudo descargar {storage_path}")

        return temp_dir

    # --- Entrenamiento principal ---   

    # --- Bucle de entrenamiento ---
    def _run_training_loop(self, model, train_loader, val_loader, criterion, optimizer, epochs, device):
        for epoch in range(epochs):
            self.logger.info(f"--- Época {epoch+1}/{epochs} ---")
            model.train()
            running_loss = 0.0
            for inputs, labels in train_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                running_loss += loss.item() * inputs.size(0)
            epoch_loss = running_loss / len(train_loader.dataset)
            self.logger.info(f"Pérdida (Train): {epoch_loss:.4f}")
        return model

    # --- Evaluación ---
    def _evaluate_on_validation_set(self, model, val_loader, device):
        model.eval()
        y_true, y_pred = [], []
        corrects, total = 0, 0
        with torch.no_grad():
            for inputs, labels in val_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)
                y_true.extend(labels.cpu().numpy())
                y_pred.extend(preds.cpu().numpy())
                corrects += torch.sum(preds == labels.data)
                total += labels.size(0)
        accuracy = corrects.double() / total
        self.logger.info(f"Precisión (Validación): {accuracy:.4f}")
        metrics = {"accuracy": float(accuracy)}
        return metrics, y_true, y_pred



    def train_model(  
        self,
        image_records: List[Dict[str, Any]],
        model_arch: str = "resnet34",
        epochs: int = 5,
        learning_rate: float = 0.001,
        test_size: float = 0.2
    ) -> Dict[str, Any]:
        self.logger.info("<<<<< EJECUTANDO VERSIÓN NUEVA DEL SERVICIO (SOLO STATE_DICT) >>>>>")
        if not image_records:
            return {"success": False, "error": "No se proporcionaron datos de imágenes."}

        dataset_path = None
        try:
            # --- Preparar dataset temporal ---
            dataset_path = self._prepare_dataset_from_db(image_records)
            if not any(dataset_path.iterdir()):
                return {"success": False, "error": "Dataset temporal vacío."}

            # --- Transformaciones ---
            data_transforms = {
                "train": transforms.Compose([
                    transforms.RandomResizedCrop(224),
                    transforms.RandomHorizontalFlip(),
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406],
                                         [0.229, 0.224, 0.225])
                ]),
                "val": transforms.Compose([
                    transforms.Resize(256),
                    transforms.CenterCrop(224),
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406],
                                         [0.229, 0.224, 0.225])
                ]),
            }

            full_dataset = ImageFolder(dataset_path, transform=data_transforms["train"])
            class_names = full_dataset.classes
            num_classes = len(class_names)

            if num_classes < 2:
                return {"success": False, "error": f"Se necesitan al menos 2 clases, encontradas: {num_classes}"}

            # --- División estratificada ---
            indices = list(range(len(full_dataset)))
            labels = [s[1] for s in full_dataset.samples]

            train_indices, val_indices = train_test_split(
                indices, test_size=test_size, stratify=labels, random_state=42
            )

            train_dataset = torch.utils.data.Subset(full_dataset, train_indices)

            # Copiamos dataset de validación y cambiamos la transformación
            val_dataset = copy.deepcopy(torch.utils.data.Subset(full_dataset, val_indices))
            val_dataset.dataset.transform = data_transforms["val"]

            train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
            val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)

            # --- Dispositivo ---
            device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
            self.logger.info(f"Dispositivo de entrenamiento: {device}")

            # --- Cargar modelo ---
            model_constructor = self.architectures.get(model_arch)
            if not model_constructor:
                return {"success": False, "error": f"Arquitectura '{model_arch}' no soportada."}

            model = model_constructor(weights="IMAGENET1K_V1")

            # Congelar capas convolucionales
            for param in model.parameters():
                param.requires_grad = False

            # Reemplazar la última capa según el modelo
            if hasattr(model, "fc"):  # resnet
                num_ftrs = model.fc.in_features
                model.fc = nn.Linear(num_ftrs, num_classes)
            elif hasattr(model, "classifier"):  # mobilenet/efficientnet
                if isinstance(model.classifier, nn.Sequential):
                    in_features = model.classifier[-1].in_features
                    model.classifier[-1] = nn.Linear(in_features, num_classes)
                else:
                    in_features = model.classifier.in_features
                    model.classifier = nn.Linear(in_features, num_classes)
            else:
                raise ValueError("Modelo no soporta modificación de clasificador final.")
            
            model = model.to(device)

            # --- Pérdida y optimizador ---
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=learning_rate)

            # --- Entrenamiento ---
            self.logger.info(f"🚀 Iniciando entrenamiento de {model_arch} por {epochs} épocas...")
            model = self._run_training_loop(model, train_loader, val_loader, criterion, optimizer, epochs, device)
            self.logger.info("✅ Entrenamiento completado.")

            # --- Evaluación ---
            metrics, y_true, y_pred = self._evaluate_on_validation_set(model, val_loader, device)
            report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
            cm = confusion_matrix(y_true, y_pred)

            final_results = {
                "model_name": model_arch,
                "problem_type": "vision_classification",
                "metrics": metrics,
                "classification_report": report,
                "confusion_matrix": cm.tolist(),
                "confusion_matrix_labels": class_names,
            }

            # --- Guardar artefactos (solo lo esencial) ---
            artifacts = {
                "model_state_dict": model.state_dict(),
                "class_names": class_names,
                "model_arch": model_arch,
            }

            buffer = BytesIO()
            torch.save(artifacts, buffer)
            final_results["artifacts_bytes"] = buffer.getvalue()

            return {"success": True, "data": final_results}

        except Exception as e:
            self.logger.error(f"🔥 Error en train_model: {e}", exc_info=True)
            return {"success": False, "error": str(e)}

        finally:
            if dataset_path and os.path.exists(dataset_path):
                self.logger.info(f"🧹 Limpiando directorio temporal: {dataset_path}")
                shutil.rmtree(dataset_path)


    def load_model_from_artifacts(self, artifacts_bytes: bytes, device: str = None):
        """
        Restaura un modelo entrenado a partir de artefactos guardados.
        """
        buffer = BytesIO(artifacts_bytes)
        artifacts = torch.load(buffer, map_location="cpu")

        model_arch = artifacts["model_arch"]
        class_names = artifacts["class_names"]

        # Reconstruir transformaciones para predicción/validación
        data_transforms = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ])

        # Reconstruir modelo
        model_constructor = self.architectures.get(model_arch)
        if not model_constructor:
            raise ValueError(f"Arquitectura '{model_arch}' no soportada.")

        model = model_constructor(weights=None)
        if hasattr(model, "fc"):
            num_ftrs = model.fc.in_features
            model.fc = nn.Linear(num_ftrs, len(class_names))
        elif hasattr(model, "classifier"):
            if isinstance(model.classifier, nn.Sequential):
                in_features = model.classifier[-1].in_features
                model.classifier[-1] = nn.Linear(in_features, len(class_names))
            else:
                in_features = model.classifier.in_features
                model.classifier = nn.Linear(in_features, len(class_names))

        device = device or ("cuda:0" if torch.cuda.is_available() else "cpu")
        model.load_state_dict(artifacts["model_state_dict"])
        model = model.to(device)
        model.eval()

        return model, class_names, data_transforms


    def evaluate_model(
        self,
        model,
        dataset_path: Path,
        transforms,
        class_names: List[str],
        batch_size: int = 32
    ) -> Dict[str, Any]:
        """
        Evalúa un modelo cargado sobre un dataset etiquetado.
        """
        val_dataset = ImageFolder(dataset_path, transform=transforms)
        val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False)

        metrics, y_true, y_pred = self._evaluate_on_validation_set(model, val_loader, next(model.parameters()).device)
        report = classification_report(y_true, y_pred, target_names=class_names, output_dict=True)
        cm = confusion_matrix(y_true, y_pred)

        return {
            "metrics": metrics,
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "confusion_matrix_labels": class_names,
        }

    def predict_images(
        self,
        model,
        image_paths: List[Path],
        transforms,
        class_names: List[str],
        device: str = None
    ) -> List[Dict[str, Any]]:
        """
        Predice etiquetas para una lista de imágenes.
        """
        device = device or ("cuda:0" if torch.cuda.is_available() else "cpu")
        results = []

        for path in image_paths:
            try:
                img = Image.open(path).convert("RGB")
                input_tensor = transforms(img).unsqueeze(0).to(device)

                with torch.no_grad():
                    outputs = model(input_tensor)
                    probs = torch.softmax(outputs, dim=1)
                    conf, pred_idx = torch.max(probs, 1)
                    pred_class = class_names[pred_idx.item()]

                results.append({
                    "image": str(path),
                    "predicted_class": pred_class,
                    "confidence": float(conf.item())
                })
            except Exception as e:
                self.logger.error(f"❌ Error procesando {path}: {e}")
                results.append({
                    "image": str(path),
                    "error": str(e)
                })

        return results
