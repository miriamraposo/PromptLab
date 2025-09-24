# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


### **Parte 1: La Sección CRÍTICA (Lo que NO puede faltar)**

**Propósito:** Que otra persona (o un script) pueda ejecutar tu proyecto sin tener que preguntarte nada. Es el "Manual de Inicio Rápido".

Esta sección es **obligatoria** y debe ser la primera y más prominente. Incluye exactamente lo que ya hablamos:

*   **Nombre del Proyecto:** Un título claro.
*   **Requisitos Previos (Opcional pero útil):** Si necesitas una versión específica de Python o Node.js, aquí es donde lo mencionas (ej. "Este proyecto requiere Python 3.10+ y Node.js 18+").
*   **Instrucciones de Instalación:**
    *   Cómo clonar el repositorio.
    *   Pasos para configurar el backend (`venv`, `pip install`, `.env.example`).
    *   Pasos para configurar el frontend (`npm install`, `.env.example`).
*   **Instrucciones de Ejecución:**
    *   El comando para arrancar el servidor de backend (`flask run`).
    *   El comando para arrancar el servidor de frontend (`npm run dev`).

**Tu prioridad número uno es que esta parte sea perfecta.** Como bien dices, es para dar instrucciones de cómo arrancar el proyecto.

---

### **Parte 2: La Sección INFORMATIVA (Lo que es bueno tener)**

**Propósito:** Dar contexto a la persona que está viendo tu proyecto. ¿Qué es esto? ¿Para qué sirve? ¿Qué tecnologías usa?

Esta sección va **después** de las instrucciones de instalación. No es tan crítica para que el proyecto *funcione*, pero es muy importante para que el revisor *entienda* tu trabajo y vea el esfuerzo que has puesto.

Aquí es donde puedes añadir:

*   **Breve Descripción del Proyecto:** Uno o dos párrafos explicando el objetivo de PromptLab.
    > *"PromptLab es una plataforma integral de análisis de datos diseñada para acelerar proyectos de IA. Permite a los usuarios subir datasets, realizar análisis de calidad, aplicar limpiezas automáticas y visualizaciones interactivas. Además, integra un laboratorio de prompts para interactuar con modelos de lenguaje avanzados como Gemini, permitiendo..."*

*   **Stack Tecnológico:** Una lista de las tecnologías clave que usaste. Esto demuestra que sabes nombrar las herramientas con las que trabajas.
    *   **Backend:** Python, Flask, Supabase, Pandas, Scikit-learn, Google Gemini API.
    *   **Frontend:** React, Vite, Material-UI, Plotly.js.
    *   **Base de Datos:** PostgreSQL (a través de Supabase).