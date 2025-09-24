import React from 'react';
import Plot from 'react-plotly.js';

export default function FeatureImportanceChart({ data }) {
  // Verificación de seguridad por si no llegan datos
  if (!data || Object.keys(data).length === 0) {
    return <p>No se pudieron extraer los datos de importancia de características del modelo.</p>;
  }

  // 1. Convertir el objeto { nombre: puntaje } a un array de arrays [nombre, puntaje]
  const sortedData = Object.entries(data)
    // 2. Ordenar de menor a mayor (Plotly dibuja el primero de la lista en la parte de abajo)
    .sort(([, a], [, b]) => a - b)
    // 3. Quedarnos solo con las 15 características más importantes para no saturar el gráfico
    .slice(-15); 

  // 4. Separar los nombres y los puntajes en dos arrays distintos para Plotly
  const featureNames = sortedData.map(([name]) => name);
  const importanceScores = sortedData.map(([, score]) => score);

  return (
    <Plot
      data={[
        {
          type: 'bar',
          orientation: 'h', // ¡Barras horizontales!
          x: importanceScores,
          y: featureNames,
          marker: { color: 'rgba(33, 150, 243, 0.8)' }, // Un azul bonito
        },
      ]}
      layout={{
        title: 'Características Más Influyentes en la Predicción',
        autosize: true,
        margin: {
          l: 250, // Aumentamos el margen izquierdo para que quepan nombres de columnas largos
          r: 20,
          t: 50,
          b: 50,
        },
        xaxis: { 
          title: 'Importancia (calculada por el modelo)',
          automargin: true 
        },
        yaxis: { 
          tickfont: { size: 10 },
          automargin: true
        }
      }}
      // Desactivamos el menú de plotly para una apariencia más limpia
      config={{ responsive: true, displayModeBar: false }}
      // Aseguramos que el gráfico se adapte al contenedor
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  );
}