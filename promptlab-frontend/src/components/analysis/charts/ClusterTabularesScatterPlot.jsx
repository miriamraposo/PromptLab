// src/components/analysis/charts/ClusterTabularesScatterPlot.jsx (VERSIÓN CORREGIDA Y MEJORADA)

import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Box, Typography } from '@mui/material';

// Paleta de colores más amplia y visualmente distinguible
const COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        // El nombre del grupo viene del `name` del componente <Scatter>
        const groupName = payload[0].name; 
        return (
            <Paper elevation={3} sx={{ p: 1, background: 'rgba(255, 255, 255, 0.95)' }}>
                <Typography variant="body2" fontWeight="bold">
                    {groupName}
                </Typography>
            </Paper>
        );
    }
    return null;
};

export default function ClusterScatterPlot({ labels, coords }) {
    
    // --- LÓGICA DE UNIÓN DE DATOS (LA PARTE CORREGIDA) ---
    const chartData = useMemo(() => {
        if (!labels || !coords || labels.length !== coords.length) {
            return []; // Devuelve un array vacío si los datos no son válidos
        }
        
        // Unimos los dos arrays en el formato que recharts necesita: [{ x: coord[0], y: coord[1], cluster: label }]
        const combined = labels.map((label, index) => ({
            x: coords[index][0],
            y: coords[index][1],
            cluster: label
        }));

        // Agrupamos los datos por clúster para que recharts pueda pintarlos
        return combined.reduce((acc, point) => {
            const clusterId = point.cluster;
            if (!acc[clusterId]) {
                acc[clusterId] = [];
            }
            acc[clusterId].push(point);
            return acc;
        }, {});

    }, [labels, coords]);

    // Ordenamos los IDs de clúster para que la leyenda aparezca en orden (ej: Grupo 0, Grupo 1...)
    const sortedClusterIds = Object.keys(chartData).sort((a, b) => parseInt(a) - parseInt(b));

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" align="center" gutterBottom fontWeight="bold">
                Visualización de Grupos (Reducción con PCA)
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" dataKey="x" name="Componente Principal 1" tick={false}>
                             <label value="Componente Principal 1" offset={-10} position="insideBottom" />
                        </XAxis>
                        <YAxis type="number" dataKey="y" name="Componente Principal 2" tick={false}>
                            <label value="Componente Principal 2" angle={-90} position="insideLeft" />
                        </YAxis>
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />}/>
                        <Legend />
                        
                        {/* Mapeamos sobre los datos agrupados para crear un <Scatter> por cada clúster */}
                        {sortedClusterIds.map(clusterId => (
                            <Scatter
                                key={clusterId}
                                name={clusterId === '-1' ? 'Ruido' : `Grupo ${clusterId}`}
                                data={chartData[clusterId]}
                                fill={clusterId === '-1' ? '#888888' : COLORS[parseInt(clusterId) % COLORS.length]}
                            />
                        ))}
                    </ScatterChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}