# PromptLab: Tu Laboratorio Integral de IA

PromptLab es una aplicación full-stack diseñada para ser un centro de mando para interactuar con modelos de IA. Permite a los usuarios gestionar datasets, analizar imágenes, entrenar modelos y experimentar con prompts de lenguaje a gran escala, todo desde una interfaz unificada.

## Características Principales

*   **Laboratorio de Prompts:** Un entorno avanzado para probar y guardar interacciones con LLMs (Modelos de Lenguaje Grandes) como Gemini Pro.
*   **Laboratorio de Visión:** Un conjunto de herramientas para el análisis profundo de imágenes, incluyendo clasificación, detección de objetos y OCR.
*   **Estudio Creativo:** Edición de imágenes impulsada por IA, incluyendo creación de memes y eliminación de fondos.
*   **Gestión de Datos:** Sube y gestiona tus datasets tabulares y de documentos.
*   **Galería de Imágenes:** Un lugar centralizado para todas las imágenes generadas y editadas.

## Requisitos Previos

Para ejecutar este proyecto, necesitarás tener instalado:

1.  [Docker](https://www.docker.com/products/docker-desktop/) y Docker Compose.
2.  [Git](https://git-scm.com/downloads).
3.  Un editor de código como [Visual Studio Code](https://code.visualstudio.com/).

## 🚀 Cómo Empezar (Método Recomendado con Docker)

La forma más sencilla y fiable de poner en marcha todo el proyecto (backend, frontend y base de datos) es usando Docker.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/promplab.git
    cd promplab
    ```

2.  **Configura las variables de entorno:**
    *   **Backend:** Navega a la carpeta `promptlab-backend/`. Renombra el archivo `.env.example` a `.env` y rellena tus claves secretas (Supabase, Google API Key, etc.).
    *   **Frontend:** Navega a `promptlab-frontend/`. Renombra `.env.example` a `.env` y rellena tus claves públicas de Supabase.

3.  **Construye y levanta los contenedores:**
    Desde la carpeta **raíz** del proyecto (`promplab`), ejecuta el siguiente comando. La primera vez puede tardar bastante mientras se descargan y construyen las imágenes.
    ```bash
    docker compose up --build
    ```
    *   `--build`: Fuerza la reconstrucción de las imágenes si has hecho cambios en el `Dockerfile` o el código.

4.  **¡Listo!**
    *   El **Frontend** estará disponible en `http://localhost:5173`.
    *   El **Backend** estará escuchando en `http://localhost:5001`.

Para detener la aplicación, ve a la terminal donde ejecutaste el `up` y presiona `Ctrl+C`.

---
## (Alternativo) Configuración para Desarrollo Local

Si prefieres no usar Docker, puedes ejecutar el backend y el frontend por separado.

### Backend (Python)
1.  Navega a `promptlab-backend/`.
2.  Crea un entorno virtual: `python -m venv env`
3.  Activa el entorno: `source env/bin/activate` (o `.\env\Scripts\activate` en Windows).
4.  Instala dependencias: `pip install -r requirements.txt`
5.  Crea y configura tu archivo `.env`.
6.  Descarga los modelos necesarios (ej. YOLO): `python descargar_yolo.py`.
7.  Ejecuta la aplicación: `flask run`

### Frontend (React + Vite)
1.  Navega a `promptlab-frontend/`.
2.  Instala dependencias: `npm install`
3.  Ejecuta la aplicación: `npm run dev`