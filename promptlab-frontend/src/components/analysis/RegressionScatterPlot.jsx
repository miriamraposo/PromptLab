// RUTA: src/components/charts/RegressionScatterPlot.jsx

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from 'recharts';
import { Paper, Box, Typography, useTheme } from '@mui/material';

// --- COMPONENTE EXTRA: Tooltip Personalizado ---
// Esto formateará los números para que no tengan tantos decimales.
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <Paper elevation={3} sx={{ p: 1.5, background: 'rgba(255, 255, 255, 0.95)' }}>
                <Typography variant="body2">
                    {`Predicción: ${payload[0].payload.predicted.toFixed(2)}`}
                </Typography>
                <Typography variant="body2">
                    {`Valor Real: ${payload[0].payload.actual.toFixed(2)}`}
                </Typography>
            </Paper>
        );
    }
    return null;
};


export default function RegressionScatterPlot({ actual, predicted }) {
    const theme = useTheme();

    const chartData = actual.map((val, index) => ({
        actual: val,
        predicted: predicted[index],
    }));

   return (
        <Paper
            elevation={4}
            sx={{
                p: 3,
                borderRadius: 3,
                height: 450,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* El título ha sido cambiado de "Grafico Scattler" a un título más descriptivo */}
            <Typography variant="h6" align="center" gutterBottom>
               Grafico de Predicciones vs. Reales
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }} align="center">
                Idealmente los puntos deben formar una línea diagonal recta
            </Typography>
            
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {/* CAMBIO CLAVE: Aumentamos aún más el margen izquierdo */}
                    <ScatterChart margin={{ top: 10, right: 30, left: 30, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="actual" name="Valor Real">
                            <Label value="Valor Real" offset={-15} position="insideBottom" />
                        </XAxis>
                         <YAxis type="number" dataKey="predicted" name="Predicción">
  <Label
    value="Predicción"
    angle={-90}
    position="insideLeft"  // probá "outsideLeft" también
    offset={-20}            // ahora sí funciona
    style={{ textAnchor: "middle" }}
  />
</YAxis>
                        
                        {/* CAMBIO EXTRA: Usamos el Tooltip personalizado */}
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />

                        <Scatter data={chartData} fill={theme.palette.primary.main} />
                    </ScatterChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}