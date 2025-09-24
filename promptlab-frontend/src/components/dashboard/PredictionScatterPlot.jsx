// En src/components/dashboard/PredictionScatterPlot.jsx

import React from 'react';
import Plot from 'react-plotly.js';

export default function PredictionScatterPlot({ data }) {
  // Verificación de seguridad por si no llegan los datos
  if (!data || !data.actual || !data.predicted) {
    return <p>Datos para el gráfico de dispersión no disponibles.</p>;
  }

  const { actual, predicted } = data;

  // Trace para los puntos de datos (azul)
  const scatterTrace = {
    x: actual,
    y: predicted,
    mode: 'markers',
    type: 'scatter',
    name: 'Predicciones',
    marker: { color: 'rgba(33, 150, 243, 0.7)', size: 8 },
  };

  // Trace para la línea ideal de 45 grados (naranja, punteada)
  const lineTrace = {
    x: [Math.min(...actual), Math.max(...actual)],
    y: [Math.min(...actual), Math.max(...actual)],
    mode: 'lines',
    type: 'scatter',
    name: 'Predicción Perfecta',
    line: { color: 'rgba(255, 87, 34, 0.8)', width: 2, dash: 'dash' },
  };

  return (
    <Plot
      data={[scatterTrace, lineTrace]}
      layout={{
        title: 'Predicciones del Modelo vs. Valores Reales',
        margin: { t: 50, b: 60, l: 80, r: 30 },
        xaxis: { title: '<b>Valor Real</b>' },
        yaxis: { title: '<b>Predicción del Modelo</b>' },
        autosize: true,
        showlegend: true,
        legend: { x: 0.05, y: 0.95 }, // Posiciona la leyenda arriba a la izquierda
      }}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: '100%', height: '100%' }}
      useResizeHandler={true}
    />
  );
}