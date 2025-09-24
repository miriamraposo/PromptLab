// RUTA: src/components/analysis/RegressionReportChart.jsx

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Paper, Box, Typography, useTheme } from '@mui/material';

export default function ClassificationReportChart({ report, labels }) {
    const theme = useTheme();

    // Transformamos los datos del reporte al formato que Recharts necesita
    const chartData = labels.map(label => ({
        name: label,
        // Traducimos las métricas a español para el gráfico
        Precisión: report[label]?.precision || 0,
        Sensibilidad: report[label]?.recall || 0,
    }));

return (
  <Paper
    elevation={4} // sombra más marcada
    sx={{
      height: '100%',
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 3, // bordes redondeados
      boxShadow: 3,
      transition: '0.3s',
      '&:hover': {
        boxShadow: 6, // sombra más intensa al pasar el mouse
        transform: 'translateY(-2px)', // pequeño levantamiento
      },
    }}
  >
    <Typography variant="h6" gutterBottom>
      Rendimiento por Clase
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
      Este gráfico muestra qué tan bien predice el modelo para cada resultado posible.
    </Typography>
    <Box sx={{ flexGrow: 1 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => `${(value * 100).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="Precisión" fill={theme.palette.primary.main} />
          <Bar dataKey="Sensibilidad" fill={theme.palette.secondary.main} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  </Paper>
);
}