// src/components/DatasetVisualizer.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import Plot from 'react-plotly.js';
import {
    Box, CircularProgress, Alert, Button, Dialog, DialogTitle,
    DialogContent, DialogActions, Typography, Paper, FormControl,
    InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';
import { supabase } from '../supabaseClient';
import { useParams } from 'react-router-dom';



// El mismo componente interno de antes para mostrar el gráfico
const PlotlyChart = ({ plotSpec }) => {
    if (!plotSpec || !plotSpec.data || !plotSpec.layout) {
        return <Alert severity="warning">La especificación del gráfico es incompleta.</Alert>;
    }
    return (
        <Plot
            data={plotSpec.data}
            layout={{ ...plotSpec.layout, autosize: true }}
            style={{ width: '100%', height: '100%' }}
            useResizeHandler={true}
            config={{ responsive: true }}
        />
    );
};


const PLOT_DEFINITIONS = {
    correlation_matrix: {
        label: 'Matriz de Correlación',
        info: 'Muestra la correlación lineal entre todas las columnas numéricas.',
        params: [] 
    },
    scatter: {
        label: 'Gráfico de Dispersión',
        info: 'Compara dos variables numéricas para identificar patrones.',
        params: [
            { id: 'x', label: 'Eje X', type: 'numeric' },
            { id: 'y', label: 'Eje Y', type: 'numeric' },
            { id: 'color', label: 'Agrupar por Color (Opcional)', type: 'categorical' },
        ]
    },
    boxplot: {
        label: 'Diagrama de Cajas (Box Plot)',
        info: 'Compara la distribución de una variable numérica a través de diferentes categorías.',
        params: [
            { id: 'x', label: 'Categoría (Eje X)', type: 'categorical' },
            { id: 'y', label: 'Variable Numérica (Eje Y)', type: 'numeric' },
            { id: 'color', label: 'Segmentar por Color (Opcional)', type: 'categorical' },
        ]
    },
    // --- CORRECCIÓN 1: AÑADIDA LA COMA ---
    pair_plot: {
        label: 'Gráfico de Pares (Pair Plot)',
        info: 'Muestra la relación entre todas las variables numéricas a la vez.',
        params: [
            { id: 'color', label: 'Agrupar por Color (Opcional)', type: 'categorical' },
        ]
    }, 
    
    mosaic: { // Clave 'mosaic' para que coincida con el backend
        label: 'Gráfico de Mosaico (Barras Apiladas)',
        info: 'Compara la distribución de dos variables categóricas.',
        params: [
            
            { id: 'x', label: 'Categoría Principal (Eje X)', type: 'categorical' },
            { id: 'y', label: 'Segunda Categoría (Apilar por)', type: 'categorical' },
        ]
    },

    treemap: { // Usamos la clave 'treemap' que coincide con el backend
        label: 'Diagrama de Árbol (Treemap)',
        info: 'Muestra la proporción de dos variables categóricas como rectángulos anidados.',
        params: [
            { id: 'x', label: 'Categoría Principal', type: 'categorical' },
            { id: 'y', label: 'Sub-categoría', type: 'categorical' },
        ]
    } 
};


export default function DatasetVisualizer({ columns }) {

    const { datasetId } = useParams();
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [plotSpec, setPlotSpec] = useState(null);
    
    const [selectedPlotType, setSelectedPlotType] = useState('');
    const [plotParams, setPlotParams] = useState({});
    const generateChartButtonRef = useRef(null);

   
    // Filtramos las columnas por tipo para los selectores.
    // useMemo evita que se recalcule en cada render.
    const numericColumns = useMemo(() => 
    columns.filter(c => 
        // Si el tipo existe y (incluye 'int' O incluye 'float'), es numérico.
        // .toLowerCase() lo hace compatible con 'Int64', 'float64', etc.
        c.type && (c.type.toLowerCase().includes('int') || c.type.toLowerCase().includes('float'))
    ), [columns]);

    const categoricalColumns = useMemo(() => 
    columns.filter(c => 
        // Si el tipo existe y (incluye 'string' O incluye 'object'), es categórico.
        c.type && (c.type.toLowerCase().includes('string') || c.type.toLowerCase().includes('object'))
    ), [columns]);

  

     useEffect(() => {
        // Si el modal se acaba de CERRAR...
        if (modalOpen === false) {
            // ...y la "memoria" del botón no está vacía...
            if (generateChartButtonRef.current) {
                // ...devuelve el foco a ese botón.
                generateChartButtonRef.current.focus();
            }
        }
    }, [modalOpen]); 

    // --- FIN DEPURACIÓN ---
    const handleParamChange = (paramId, value) => {
        setPlotParams(prev => ({ ...prev, [paramId]: value }));
    };

    const handlePlotTypeChange = (e) => {
        setSelectedPlotType(e.target.value);
        setPlotParams({}); // Reseteamos los parámetros al cambiar de gráfico
    };

    const isConfigurationValid = () => {
        if (!selectedPlotType) return false;
        const requiredParams = PLOT_DEFINITIONS[selectedPlotType].params.filter(p => !p.label.includes('Opcional'));
        return requiredParams.every(p => plotParams[p.id]);
    };

    const handleGenerateChart = async () => {
        setModalOpen(true);
        setLoading(true);
        setError(null);
        setPlotSpec(null);
        
        const config = {
            plot_type: selectedPlotType,
            params: {
                ...plotParams,
                title: PLOT_DEFINITIONS[selectedPlotType].label
            }
        };

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/visualize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify(config)
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Error del servidor');
            
            setPlotSpec(JSON.parse(result.plot_spec));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

  

    return (
        <Paper variant="outlined" sx={{ p: 1, mt: 0 }}>
             {/* --- INICIO DE LA MODIFICACIÓN --- */}
        <Box sx={{ mb: 2 }}>
        {/* Fila con título y botón */}
           <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                 Análisis Exploratorio Global
             </Typography>

             <Button
                  ref={generateChartButtonRef}
                  variant="contained"
                  onClick={handleGenerateChart}
                  disabled={!isConfigurationValid()}
                  sx={{ flexShrink: 0, ml: 2 }}
                >
                    Generar Gráfico
             </Button>
           </Box>
             <Box sx={{ mb: 2 }}>
             {/* Descripción debajo */}
             <Typography variant="body1" color="text.secondary">
                 Para salir del visualizador, selecciona el botón "Volver a Diagnóstico" en la barra superior del encabezado.
             </Typography>
             </Box>
            </Box>

        {/* --- FIN DE LA MODIFICACIÓN --- */}

             <Alert   severity="warning" sx={{ mb: 2 }}>
             Antes de continuar, se recomienda que el archivo esté procesado y no contenga duplicados, datos faltantes ni valores atípicos o inconsistentes.<br />
           </Alert>


            {/* Selector de tipo de gráfico */}
            <FormControl fullWidth sx={{ mb: 4 }}>
                <InputLabel id="plot-type-label">Selecciona un tipo de gráfico</InputLabel>
                <Select
                    labelId="plot-type-label"
                    value={selectedPlotType}
                    label="Selecciona un tipo de gráfico"
                    onChange={handlePlotTypeChange}
                >
                    {Object.entries(PLOT_DEFINITIONS).map(([key, { label }]) => (
                        <MenuItem key={key} value={key}>{label}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Selectores de parámetros dinámicos */}
            {selectedPlotType && (
                <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
                    <Typography variant="body1" color="black" sx={{mb: 2}}>
                        {PLOT_DEFINITIONS[selectedPlotType].info}
                    </Typography>
                    {PLOT_DEFINITIONS[selectedPlotType].params.map(param => (
                        <FormControl key={param.id} fullWidth sx={{ mb: 2 }}>
                            <InputLabel id={`${param.id}-label`}>{param.label}</InputLabel>
                            <Select
                                labelId={`${param.id}-label`}
                                value={plotParams[param.id] || ''}
                                label={param.label}
                                onChange={(e) => handleParamChange(param.id, e.target.value)}
                            >
                                {(param.type === 'numeric' ? numericColumns : categoricalColumns).map(col => (
                                    <MenuItem key={col.name} value={col.name}>{col.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ))}
                </Paper>
            )}

           
            
            {/* Modal para mostrar el gráfico */}
            <Dialog open={modalOpen} onClose={handleCloseModal} fullWidth maxWidth="lg">
                <DialogTitle>
                    {selectedPlotType && PLOT_DEFINITIONS[selectedPlotType].label}
                </DialogTitle>
                <DialogContent sx={{ height: '70vh' }}>
                    {loading && <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>}
                    {error && <Alert severity="error">Error: {error}</Alert>}
                    {plotSpec && <PlotlyChart plotSpec={plotSpec} />}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cerrar</Button>
                </DialogActions>

        
            </Dialog>
        </Paper>
    );
}


