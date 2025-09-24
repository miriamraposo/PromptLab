// src/components/CorrelationMatrix.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
import Plot from 'react-plotly.js'; // Importamos Plotly
import { supabase } from '../../supabaseClient';

const CorrelationMatrix = () => {
    const { datasetId } = useParams();
    const [chartData, setChartData] = useState({ loading: true, error: null, data: null });

    useEffect(() => {
        const fetchCorrelationData = async () => {
            setChartData({ loading: true, error: null, data: null });
            try {
                // 1. Obtener sesión de Supabase
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");

                // 2. Llamar a tu nuevo endpoint de correlación
                const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/correlation-matrix`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.error || `Error del servidor (${response.status})`);
                }
                
                // Suponemos que tu API devuelve algo así:
                // {
                //   "success": true,
                //   "data": {
                //     "columns": ["edad", "salario", "antiguedad"],
                //     "matrix": [
                //       [1.0, 0.85, 0.42],
                //       [0.85, 1.0, 0.67],
                //       [0.42, 0.67, 1.0]
                //     ]
                //   }
                // }
                setChartData({ loading: false, error: null, data: result.data });

            } catch (err) {
                setChartData({ loading: false, error: err.message, data: null });
            }
        };

        fetchCorrelationData();
    }, [datasetId]);

    if (chartData.loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    }
    if (chartData.error) {
        return <Alert severity="error">{chartData.error}</Alert>;
    }
    if (!chartData.data || !chartData.data.matrix || chartData.data.matrix.length === 0) {
        return <Alert severity="info">No hay suficientes columnas numéricas para calcular una matriz de correlación.</Alert>;
    }

    const { columns, matrix } = chartData.data;

    return (
        <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Matriz de Correlación de Columnas Numéricas
            </Typography>
            <Plot
                data={[
                    {
                        z: matrix,          // Los valores de la matriz
                        x: columns,         // Etiquetas en el eje X
                        y: columns,         // Etiquetas en el eje Y
                        type: 'heatmap',    // Tipo de gráfico
                        colorscale: 'Viridis', // Paleta de colores (otras: 'Blues', 'Reds', etc.)
                        reversescale: true,
                        showscale: true,    // Muestra la barra de leyenda de color
                        text: matrix.map(row => row.map(val => val.toFixed(2))), // Mostrar valor en cada celda
                        texttemplate: "%{text}",
                        hoverongaps: false
                    }
                ]}
                layout={{
                    // title: 'Matriz de Correlación',
                    xaxis: { autorange: 'reversed' }, // A veces es necesario para el orden correcto
                    autosize: true
                }}
                style={{ width: '100%', minHeight: '450px' }}
                useResizeHandler={true} // Hace el gráfico responsive
            />
        </Paper>
    );
};

export default CorrelationMatrix;