import React, { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Paper, Box, Typography } from '@mui/material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1919', '#19B2FF'];

export default function ClusterScatterPlot({ data }) {
    // Agrupamos los puntos por su ID de clúster
    const groupedData = useMemo(() => {
        return data.reduce((acc, point) => {
            const clusterId = point.cluster_id;
            if (!acc[clusterId]) {
                acc[clusterId] = [];
            }
            acc[clusterId].push(point.plot_coords);
            return acc;
        }, {});
    }, [data]);

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 2, height: 400, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="subtitle1" align="center" gutterBottom fontWeight="bold">
                Visualización de Grupos (PCA)
            </Typography>
            <Box sx={{ flexGrow: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid />
                       <XAxis
  type="number"
  dataKey="x"
  name="Componente 1"
  tick={{ fill: '#555', fontSize: 12, angle: -45, textAnchor: 'end' }}
  label={{ value: 'Componente Principal 1', position: 'insideBottom', offset: -5 }}
  domain={['dataMin - 1', 'dataMax + 1']}
/>

<YAxis
  type="number"
  dataKey="y"
  name="Componente 2"
  tick={{ fill: '#555', fontSize: 12, angle: 0 }} // cambiar a 0 o 45 según necesidad
  label={{ value: 'Componente Principal 2', angle: -90, position: 'left', offset: 10 }}
  domain={['dataMin - 0.5', 'dataMax + 0.5']}
/>

{Object.entries(groupedData).map(([clusterId, points]) => (
  <Scatter
    key={clusterId}
    name={`Grupo ${parseInt(clusterId) + 1}`}
    data={points}
    fill={COLORS[parseInt(clusterId) % COLORS.length]}
  >
    {/* Opcional: etiquetas de puntos */}
    {/* <LabelList dataKey="x" position="top" fontSize={10} /> */}
  </Scatter>
))}
                    </ScatterChart>
                </ResponsiveContainer>
            </Box>
        </Paper>
    );
}