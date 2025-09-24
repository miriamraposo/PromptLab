import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Paper, Typography, Box } from '@mui/material';

const createHistogramData = (errors, numBins = 10) => {
    if (!errors || errors.length === 0) return [];
    const min = Math.min(...errors);
    const max = Math.max(...errors);
    const binSize = (max - min) / numBins;
    const bins = Array(numBins).fill(0).map((_, i) => ({
        range: `${(min + i * binSize).toFixed(2)} - ${(min + (i + 1) * binSize).toFixed(2)}`,
        count: 0,
    }));

    for (const error of errors) {
        let binIndex = Math.floor((error - min) / binSize);
        if (binIndex >= numBins) binIndex = numBins - 1;
        bins[binIndex].count++;
    }
    return bins;
};

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <Box sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                padding: 1.5,
                borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: 14
            }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Rango: {payload[0].payload.range}
                </Typography>
                <Typography variant="body2">Frecuencia: {payload[0].value}</Typography>
            </Box>
        );
    }
    return null;
};

 export default function ErrorHistogram({ errors }) {
    const data = createHistogramData(errors);

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
            <Typography variant="h6" align="center" gutterBottom>
                Grafico de Distribución de Errores
            </Typography>

            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {/* CAMBIO 1: Añadimos 'barGap' para controlar el espacio y hacer las barras más gruesas */}
                    <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barCategoryGap="20%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />

                        {/* CAMBIO 2: Ajustamos el 'XAxis' para que las etiquetas sean legibles */}
                        <XAxis
                            dataKey="range"
                            angle={-60} // Un ángulo más pronunciado para dar espacio
                            textAnchor="end" // Alinea el texto al final para que no se choque
                            height={90} // Más altura para que quepan las etiquetas rotadas
                            tick={{ fontSize: 10 }} // Fuente un poco más pequeña
                            interval={'preserveStartEnd'} // ¡LA MAGIA! Evita que las etiquetas se solapen
                        />

                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="count"
                            name="Frecuencia"
                            fill="url(#colorUv)"
                            radius={[5, 5, 0, 0]}
                        />
                        <defs>
                            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.9} />
                                <stop offset="100%" stopColor="#A5B4FC" stopOpacity={0.6} />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}