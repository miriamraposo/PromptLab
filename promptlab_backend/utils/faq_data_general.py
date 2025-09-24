

faqs = [
    # ================================================================
    # --- GENERAL / EXPLORACIÓN ---
    # ================================================================
    {
        "pregunta": "¿Cuándo se recomienda eliminar duplicados?",
        "respuesta": "Cuando las filas duplicadas no aportan nueva información y podrían distorsionar el análisis.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Qué son los NaN?",
        "respuesta": "Son valores faltantes o nulos que representan datos ausentes.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Cuándo eliminar NaN?",
        "respuesta": "Se pueden eliminar si afectan a pocas filas o si no son relevantes.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Cuándo imputar NaN?",
        "respuesta": "Si eliminar los valores causaría pérdida significativa de información, es mejor imputarlos.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Cómo imputar NaN en columnas categóricas?",
        "respuesta": "Usualmente con la moda (valor más frecuente).",
        "modulo": "general"
    },
    {
        "pregunta": "¿Por qué hay que transformar las fechas?",
        "respuesta": "Porque muchos modelos no entienden bien las fechas si no se convierten a componentes útiles como año, mes, día, etc.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Qué es un outlier?",
        "respuesta": "Es un valor que se aleja mucho del resto de los datos y puede influir negativamente en los modelos.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Qué tipos de datos existen en pandas?",
        "respuesta": "Hay numéricos (`int`, `float`), categóricos (`object`, `category`) y fechas (`datetime`).",
        "modulo": "general"
    },
    {
        "pregunta": "¿Qué es value_counts()?",
        "respuesta": "`value_counts()` se usa para ver cuántas veces aparece cada valor único en una columna.",
        "modulo": "general"
    },
    {
        "pregunta": "¿Por qué revisar la correlación?",
        "respuesta": "Porque muestra cómo se relacionan dos variables numéricas y ayuda a entender patrones.",
        "modulo": "general"
    },


    # ================================================================
    # --- PREDICCIONES Y REGRESIÓN ---
    # ================================================================
    {
        "pregunta": "¿Qué es la regresión lineal?",
        "respuesta": "Es un modelo que busca la relación lineal entre una variable dependiente y una o más independientes.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es la regresión logística?",
        "respuesta": "Es un modelo usado para problemas de clasificación, que estima la probabilidad de que una observación pertenezca a una clase.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué diferencia hay entre regresión lineal y logística?",
        "respuesta": "La lineal predice valores continuos, mientras que la logística predice probabilidades para clasificación.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es el overfitting?",
        "respuesta": "Es cuando un modelo se ajusta demasiado a los datos de entrenamiento y pierde capacidad de generalización.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es el underfitting?",
        "respuesta": "Es cuando un modelo no aprende lo suficiente y no captura la relación entre las variables.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Por qué dividir en entrenamiento y test?",
        "respuesta": "Para evaluar la capacidad del modelo de generalizar a datos no vistos.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es la validación cruzada?",
        "respuesta": "Es una técnica que divide los datos en varios subconjuntos para entrenar y validar el modelo en diferentes combinaciones.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es R² en regresión?",
        "respuesta": "Es una métrica que indica qué tan bien el modelo explica la variabilidad de la variable dependiente.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es el error cuadrático medio (MSE)?",
        "respuesta": "Es la media de los errores al cuadrado entre valores reales y predichos, usado para medir la precisión del modelo.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es el MAE?",
        "respuesta": "Es el Error Absoluto Medio, que indica la magnitud promedio del error sin considerar la dirección.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Por qué normalizar variables en regresión?",
        "respuesta": "Para evitar que las variables con rangos más grandes dominen el modelo y mejorar la convergencia del algoritmo.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué es el multicolinealidad?",
        "respuesta": "Es cuando dos o más variables independientes están fuertemente correlacionadas, lo que puede afectar el modelo.",
        "modulo": "predicciones"
    },   

    {
    "pregunta": "¿Qué es Label Encoding?",
    "respuesta": "Es una técnica que convierte categorías en números enteros, asignando un valor único a cada categoría sin mantener un orden específico.",
    "modulo": "predicciones"
},
{
    "pregunta": "¿Qué es Ordinal Encoding?",
    "respuesta": "Es una técnica que asigna números enteros a las categorías respetando un orden jerárquico definido previamente.",
    "modulo": "predicciones"
},


         {
        "pregunta": "¿Qué es one-hot encoding?",
        "respuesta": "Es un método que crea columnas binarias para cada categoría de la variable, indicando su presencia o ausencia.",
        "modulo": "predicciones"
    },

    {
        "pregunta": "¿Qué es un prompt?",
        "respuesta": "Un prompt es la instrucción o mensaje que le das al modelo para obtener una respuesta.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo escribir un buen prompt?",
        "respuesta": "Un buen prompt debe ser claro, específico y contener el contexto necesario para que el modelo entienda lo que querés.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es el contexto en un prompt?",
        "respuesta": "El contexto son los detalles o información adicional que ayudan al modelo a responder con precisión.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué significa ser específico en un prompt?",
        "respuesta": "Significa indicar exactamente lo que querés, evitando ambigüedades.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué pasa si mi prompt es muy corto?",
        "respuesta": "Si es muy corto, el modelo puede dar respuestas genéricas o equivocadas por falta de información.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué pasa si mi prompt es muy largo?",
        "respuesta": "Si es demasiado largo o confuso, el modelo puede interpretar mal lo que buscás.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es el few-shot prompting?",
        "respuesta": "Es una técnica donde das ejemplos en el prompt para guiar la respuesta del modelo.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es el zero-shot prompting?",
        "respuesta": "Es cuando pedís algo al modelo sin darle ejemplos, solo la instrucción directa.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es el chain-of-thought?",
        "respuesta": "Es una técnica donde pedís al modelo que explique su razonamiento paso a paso antes de dar la respuesta final.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Por qué agregar formato en un prompt?",
        "respuesta": "Porque mejora la claridad; podés usar listas, títulos o estructuras para que la respuesta salga más organizada.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo le pido al modelo que use un tono específico?",
        "respuesta": "Indicá el tono en el prompt, por ejemplo: 'Explicalo de forma simple y profesional'.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo pedirle al modelo que hable en cierto idioma?",
        "respuesta": "Incluí la instrucción, por ejemplo: 'Respondé en español con ejemplos claros'.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo mejorar un prompt que no funciona bien?",
        "respuesta": "Agregá contexto, sé más claro y probá dividir la instrucción en pasos simples.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es la temperatura en generación de texto?",
        "respuesta": "Es un parámetro que controla la creatividad: valores bajos (0.2) dan respuestas más precisas y altos (0.8) más creativas.",
        "modulo": "promptlab"
    },
    
        {
        "pregunta": "¿Por qué el modelo a veces inventa cosas?",
        "respuesta": "Porque completa el texto de la forma más probable, incluso si no tiene información exacta. Podés pedirle 'No inventes datos'.",
        "modulo": "promptlab"
    },


    # ================================================================
    # --- NUMÉRICAS ---
    # ================================================================
    {
        "pregunta": "¿Qué es la media?",
        "respuesta": "La media es el promedio: se suman todos los valores y se divide por la cantidad total.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es la mediana?",
        "respuesta": "La mediana es el valor central cuando ordenás todos los datos.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es el mínimo?",
        "respuesta": "Es el valor más bajo de una columna numérica.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es el máximo?",
        "respuesta": "Es el valor más alto de una columna.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es el IQR?",
        "respuesta": "El IQR (rango intercuartílico) es la diferencia entre el tercer cuartil y el primer cuartil, útil para detectar outliers.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Cómo se imputan valores NaN?",
        "respuesta": "Se pueden imputar usando estadísticos como media, mediana o un valor constante.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Cómo se reemplazan valores extremos?",
        "respuesta": "Los valores extremos pueden reemplazarse por los límites del IQR o valores máximos/minimos aceptables.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué significa imputar un dato?",
        "respuesta": "Imputar significa reemplazar un valor faltante por un valor estimado.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué método me recomendás para imputar?",
        "respuesta": "Si tenés muchos outliers, la mediana o el IQR son opciones más robustas que la media.",
        "modulo": "categoricas_numericas"
    },

    # ================================================================
    # --- CATEGÓRICAS ---
    # ================================================================
    {
        "pregunta": "¿Por qué es importante detectar valores únicos en columnas categóricas?",
        "respuesta": "Detectar valores únicos ayuda a encontrar errores, como categorías mal escritas.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es un diccionario para reemplazar valores?",
        "respuesta": "Es una herramienta para unificar categorías que representan lo mismo pero están escritas distinto.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué son variables categóricas?",
        "respuesta": "Las variables categóricas representan grupos o categorías (por ejemplo, color, género, ciudad).",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es one-hot encoding?",
        "respuesta": "Es un método que crea columnas binarias para cada categoría de la variable, indicando su presencia o ausencia.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es label encoding?",
        "respuesta": "Es un método que asigna un número entero a cada categoría de la variable.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué diferencias hay entre one-hot y label encoding?",
        "respuesta": "Label encoding mantiene un orden numérico que puede inducir errores en algunos modelos; one-hot crea columnas independientes y evita problemas de orden.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué hacer con categorías raras o poco frecuentes?",
        "respuesta": "Se pueden agrupar en una categoría 'Otros' para evitar que el modelo aprenda patrones poco representativos.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Por qué limpiar valores nulos en categóricas?",
        "respuesta": "Los valores nulos pueden impedir que el modelo entienda correctamente la variable, así que se imputan o se crean categorías especiales.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es la cardinalidad de una variable categórica?",
        "respuesta": "Es la cantidad de categorías únicas que tiene la variable. Alta cardinalidad puede complicar el modelado.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué problemas trae la alta cardinalidad?",
        "respuesta": "Genera muchas columnas con one-hot encoding y puede causar sobreajuste o mayor consumo de memoria.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Qué es imputar variables categóricas?",
        "respuesta": "Reemplazar los valores faltantes por la categoría más frecuente o por una categoría especial como 'Desconocido'.",
        "modulo": "categoricas_numericas"
    },
    {
        "pregunta": "¿Por qué revisar inconsistencias de texto en categóricas?",
        "respuesta": "Errores de escritura, mayúsculas y espacios pueden crear categorías duplicadas y afectar la calidad del modelo.",
        "modulo": "categoricas_numericas"
    },

    
    # ================================================================
    # --- PROMPT ENGINEERING (promptlab) ---
    # ================================================================
    {
        "pregunta": "¿Qué es el 'few-shot learning'?",
        "respuesta": "Es una técnica donde se muestran al modelo algunos ejemplos en el prompt para guiarlo a generar respuestas similares.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo le pido a la IA que sea más creativa?",
        "respuesta": "Puedes usar instrucciones abiertas, pedir múltiples alternativas y ajustar parámetros como 'temperature' si están disponibles.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Por qué mi prompt a veces da respuestas diferentes?",
        "respuesta": "Porque los modelos de IA son probabilísticos y pueden variar en cada ejecución, especialmente si la configuración favorece la creatividad.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Qué es un buen 'system prompt'?",
        "respuesta": "Es una instrucción inicial que define el rol, tono y estilo de la IA, orientando todas las respuestas posteriores.",
        "modulo": "promptlab"
    },
    {
        "pregunta": "¿Cómo puedo mejorar la claridad de mis prompts?",
        "respuesta": "Siendo específico, usando ejemplos, evitando ambigüedades y dividiendo instrucciones complejas en pasos más simples.",
        "modulo": "promptlab"
    },

    # ================================================================
    # --- PREDICCIONES Y REGRESIÓN ---
    # ================================================================
    {
        "pregunta": "¿Qué significa el error R²?",
        "respuesta": "Es el coeficiente de determinación que indica qué tan bien las variables independientes explican la variable dependiente.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Es mejor un MAE bajo o alto?",
        "respuesta": "Siempre es mejor un MAE (Error Absoluto Medio) bajo, ya que significa que las predicciones están más cerca de los valores reales.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué variables son las más importantes en mi predicción?",
        "respuesta": "Depende del modelo: en regresión lineal puedes mirar los coeficientes, y en modelos más complejos se usan métricas de importancia de variables.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Por qué mi modelo predice valores negativos si no debería?",
        "respuesta": "Porque no tiene restricciones internas. Para evitarlo, puedes aplicar transformaciones, usar modelos adecuados o postprocesar las salidas.",
        "modulo": "predicciones"
    },
    {
        "pregunta": "¿Qué diferencia hay entre MAE, RMSE y MAPE?",
        "respuesta": "El MAE mide el error promedio, el RMSE penaliza más los errores grandes y el MAPE muestra el error en porcentaje respecto al valor real.",
        "modulo": "predicciones"
    },

    # ================================================================
    # --- CLUSTERING ---
    # ================================================================
    {
        "pregunta": "¿Cómo sé cuántos clusters elegir?",
        "respuesta": "Puedes usar métodos como el 'Elbow Method' o la puntuación de silueta para decidir el número óptimo de clusters.",
        "modulo": "clustering"
    },
    {
        "pregunta": "¿Qué significa que un punto tenga una puntuación de silueta negativa?",
        "respuesta": "Que probablemente está mal asignado a un cluster y encajaría mejor en otro.",
        "modulo": "clustering"
    },
    {
        "pregunta": "Mis clusters se ven muy mezclados, ¿qué puedo hacer?",
        "respuesta": "Prueba normalizar los datos, usar un algoritmo diferente (K-means, DBSCAN, HDBSCAN) o reducir la dimensionalidad con PCA o t-SNE.",
        "modulo": "clustering"
    },
    {
        "pregunta": "¿Qué diferencia hay entre K-means y DBSCAN?",
        "respuesta": "K-means necesita que definas el número de clusters y asume formas esféricas, mientras que DBSCAN encuentra clusters de forma arbitraria y detecta ruido.",
        "modulo": "clustering"
    },
    {
        "pregunta": "¿Cómo interpreto los centroides de un cluster?",
        "respuesta": "Son el valor promedio de todas las variables para los puntos asignados a ese cluster, lo que da una idea del 'perfil' típico de ese grupo.",
        "modulo": "clustering"
    },

    # ================================================================
# --- CLUSTERING (IMÁGENES Y TABULARES) ---
# ================================================================
    {
    "pregunta": "¿Cómo sé cuántos clusters elegir?",
    "respuesta": "Puedes usar el método del codo (Elbow Method), el coeficiente de Silhouette o criterios de validación interna para decidir el número óptimo de clusters.",
    "modulo": "clustering"
    },
    {
    "pregunta": "¿Qué significa que un punto tenga una puntuación de silueta negativa?",
    "respuesta": "Significa que ese punto podría estar mal asignado a un cluster; quizás pertenece más a otro cluster cercano.",
    "modulo": "clustering"
    },
    {
    "pregunta": "Mis clusters se ven muy mezclados, ¿qué puedo hacer?",
    "respuesta": "Considera normalizar o escalar los datos, usar técnicas de reducción de dimensionalidad o revisar las features utilizadas.",
    "modulo": "clustering"
     },

# --- NUEVAS PREGUNTAS PARA CLUSTERING DE IMÁGENES ---
     {
    "pregunta": "¿Cómo agrupo imágenes que son visualmente similares?",
    "respuesta": "Primero convierte las imágenes en vectores de características usando embeddings de un modelo de visión y luego aplica clustering sobre esos vectores.",
    "modulo": "clustering"
     },
     {
    "pregunta": "¿Qué hacer si algunas imágenes terminan en clusters inesperados?",
    "respuesta": "Revisa la calidad de los embeddings, la normalización de los vectores y considera eliminar ruido o imágenes muy diferentes del resto.",
    "modulo": "clustering"
    },
    {
    "pregunta": "¿Puedo usar el mismo número de clusters para todos los datasets de imágenes?",
    "respuesta": "No necesariamente. Cada dataset puede tener diferente diversidad visual; ajusta el número de clusters según métricas como Silhouette Score o el método del codo.",
    "modulo": "clustering"
    },
    {
    "pregunta": "¿Cómo interpreto un cluster de imágenes?",
    "respuesta": "Revisa las imágenes agrupadas juntas; suelen compartir características visuales similares que el modelo detectó como relevantes.",
    "modulo": "clustering"
    },

    # ================================================================
# --- CLUSTERING (DATOS TABULARES) ---
# ================================================================
{
    "pregunta": "¿Cómo manejo variables con escalas muy distintas?",
    "respuesta": "Es recomendable normalizar o estandarizar las variables antes de aplicar clustering, para que ninguna domine la distancia.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Qué hago con valores faltantes antes de clusterizar?",
    "respuesta": "Dependiendo del método, puedes imputar los valores faltantes, eliminarlos o usar algoritmos que soporten NaNs.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Cómo elegir entre K-means, DBSCAN o jerárquico?",
    "respuesta": "Depende de la forma de tus datos: K-means funciona bien para clusters esféricos, DBSCAN detecta clusters de densidad y el jerárquico es útil para explorar la estructura de los datos.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Qué hacer si hay outliers que afectan los clusters?",
    "respuesta": "Considera detectar y remover outliers antes de clusterizar, o usar algoritmos robustos como DBSCAN que los tratan como ruido.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Cómo interpreto los clusters obtenidos?",
    "respuesta": "Analiza las características promedio o distribuciones de cada cluster para entender qué los distingue y darles sentido en tu negocio o análisis.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Puedo usar clustering en variables categóricas?",
    "respuesta": "Sí, pero debes usar distancias apropiadas (como Gower) o transformar las variables en numéricas con one-hot encoding antes de aplicar clustering.",
    "modulo": "clustering"
},
{
    "pregunta": "¿Cómo evalúo si los clusters son buenos?",
    "respuesta": "Usa métricas como Silhouette Score, Davies-Bouldin Index o valida con conocimiento experto para ver si los clusters tienen sentido.",
    "modulo": "clustering"
},



    # ================================================================
    # --- ANÁLISIS DE SENSIBILIDAD ---
    # ================================================================
    {
        "pregunta": "¿Qué es un análisis de sensibilidad?",
        "respuesta": "Es una técnica que permite evaluar cómo cambian los resultados de un modelo al variar sus parámetros de entrada.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Por qué es importante el análisis de sensibilidad?",
        "respuesta": "Porque ayuda a identificar qué variables tienen mayor impacto en los resultados y cuáles pueden ser ignoradas o requieren control más preciso.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Cómo se interpreta un alto índice de sensibilidad?",
        "respuesta": "Significa que pequeñas variaciones en esa variable provocan cambios significativos en la salida del modelo, indicando que es crítica para la predicción.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Qué diferencias hay entre análisis local y global?",
        "respuesta": "El local evalúa la sensibilidad alrededor de un punto específico de las variables, mientras que el global analiza todo el rango posible de variación.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Puedo usar análisis de sensibilidad con modelos de IA?",
        "respuesta": "Sí, es útil para entender la influencia de cada característica en las predicciones y para detectar comportamientos inesperados del modelo.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Qué hago si varias variables tienen alta sensibilidad?",
        "respuesta": "Debes priorizar su control o medición precisa, o incluso considerar simplificar el modelo para reducir dependencia de variables críticas.",
        "modulo": "sensibilidad"
    },
    {
        "pregunta": "¿Puede el análisis de sensibilidad ayudar a mejorar mi modelo?",
        "respuesta": "Sí, permite identificar variables importantes, reducir la complejidad y enfocarse en las características que realmente impactan el resultado.",
        "modulo": "sensibilidad"
    },
]



