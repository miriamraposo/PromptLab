// En src/components/dashboard/ConfusionMatrixChart.jsx

import React from 'react';
import Plot from 'react-plotly.js';

// --- FUNCIÓN DE AYUDA PARA EL COLOR DEL TEXTO ---
// Decide si el texto debe ser blanco o negro basado en el valor de la celda
const getTextColor = (value, maxValue) => {
  // Si el valor es más del 60% del máximo, la celda será oscura.
  // Usamos un umbral para cambiar el color del texto a blanco para mejor contraste.
  return value > maxValue * 0.6 ? 'white' : 'black';
};


export default function ConfusionMatrixChart({ data, labels }) {
  if (!data || !labels || data.length === 0 || labels.length === 0) {
    return <p>Datos de la matriz de confusión no disponibles.</p>;
  }

  const zData = [...data].reverse();
  const yLabels = [...labels].reverse();
  const maxValue = Math.max(...zData.flat());

  return (
    <Plot
      data={[
        {
          type: 'heatmap',
          z: zData,
          x: labels,
          y: yLabels,
          colorscale: 'Viridis',  // <-- SUGERENCIA: 'Blues' o 'Greens' suelen ser más limpios para esto
          reversescale: false,
          showscale: false,
          hoverinfo: 'none',
        },
      ]}
      layout={{
        title: 'Matriz de Aciertos y Errores',
        margin: { t: 50, b: 60, l: 80, r: 30 },
        
        // --- ANOTACIONES MEJORADAS ---
        annotations: zData.flatMap((row, i) =>
          row.map((value, j) => ({
            text: String(value),
            x: labels[j],
            y: yLabels[i],
            showarrow: false,
            font: {
              // <-- MEJORA: El color del texto ahora es dinámico
              color: getTextColor(value, maxValue),
              size: 18
            }
          }))
        ),
        
        xaxis: { 
            title: '<b>Predicción del Modelo</b>',
            tickangle: 0
        },
        yaxis: { 
            title: '<b>Valor Real</b>'
        },
        autosize: true,
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  );
}