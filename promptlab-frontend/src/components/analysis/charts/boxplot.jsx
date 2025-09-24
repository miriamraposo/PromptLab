// RUTA: src/components/charts/ErrorBoxPlot.jsx

import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Paper, Typography, Box, useTheme } from '@mui/material';

// Función de lógica para calcular los datos del boxplot. Es correcta.
const createBoxPlotData = (errors) => {
    if (!errors || errors.length === 0) return [];
    
    const sorted = [...errors].sort((a, b) => a - b);
    const min = sorted[0];
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const median = sorted[Math.floor(sorted.length * 0.5)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const max = sorted[sorted.length - 1];

    // Recharts necesita que la "base" y la "altura" de la barra sean un rango.
    // La base será q1, y la altura será la diferencia (q3 - q1).
    return [{ 
        name: 'Errores', 
        box: [q1, q3], // [inicio_barra, fin_barra]
        whiskers: [min, max], // [inicio_bigote, fin_bigote]
        median: median
    }];
};

// Componente para el Tooltip personalizado
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <Paper elevation={3} sx={{ p: 2, background: 'rgba(255, 255, 255, 0.95)' }}>
                <Typography variant="subtitle2">Rango Intercuartílico (IQR)</Typography>
                <Typography variant="body2">Q1: {data.box[0].toFixed(2)}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Mediana: {data.median.toFixed(2)}</Typography>
                <Typography variant="body2">Q3: {data.box[1].toFixed(2)}</Typography>
                <Typography variant="subtitle2" sx={{ mt: 1 }}>Rango Total</Typography>
                <Typography variant="body2">Mínimo: {data.whiskers[0].toFixed(2)}</Typography>
                <Typography variant="body2">Máximo: {data.whiskers[1].toFixed(2)}</Typography>
            </Paper>
        );
    }
    return null;
};

export default function ErrorBoxPlot({ errors }) {
    const theme = useTheme();
    const data = createBoxPlotData(errors);

       return (
        <Paper
            elevation={4}
            sx={{
                p: 3, // CAMBIO: Padding consistente con los otros gráficos
                borderRadius: 3,
                height: 450, // CAMBIO: Altura fija y consistente
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            <Typography variant="h6" align="center" gutterBottom>
              Grafico de Box Plot de Errores
            </Typography>
            
            {/* CAMBIO CLAVE: Corregido el width a 100% */}
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        {/* Añadimos un ancho fijo al YAxis para alinear mejor el gráfico */}
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(200,200,200,0.1)'}}/>
                        <Legend />
                        
                        <Bar dataKey="box" name="Rango Intercuartílico" fill={theme.palette.primary.main} barSize={50} />
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}
