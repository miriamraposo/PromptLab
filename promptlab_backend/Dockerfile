FROM python:3.10-slim

# Establece el directorio de trabajo
WORKDIR /app

# Instala las herramientas de sistema
# (Esta parte estaba perfecta)
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libgl1 \ 
    tesseract-ocr \   
    tesseract-ocr-spa \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Copia el archivo de requerimientos primero
COPY requirements.txt .

# Actualiza pip e instala los requerimientos
# (Esta parte estaba perfecta)
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# --- ¡LA LÓGICA DE YOLO EN EL ORDEN CORRECTO! ---

# 1. Copiamos solo el script de descarga
COPY descargar_yolo.py .

# 2. Ejecutamos el script para descargar el modelo
RUN python descargar_yolo.py

# --- FIN DE LA SECCIÓN DE YOLO ---


# 3. AHORA, copiamos el resto del código de la aplicación.
#    Como 'yolov8n.pt' está en .dockerignore, no se copiará desde tu PC.
#    La imagen ya tendrá la versión descargada por el script.
COPY . .

# Expone el puerto
EXPOSE 5001

# Comando por defecto
CMD ["flask", "run", "--host=0.0.0.0", "--port=5001"]