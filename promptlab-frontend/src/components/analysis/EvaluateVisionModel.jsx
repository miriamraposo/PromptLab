// RUTA: src/components/analysis/EvaluateVisionModel.jsx

import React, { useState, useEffect } from 'react'; // <-- Añade useEffect
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Tooltip, IconButton 
} from '@mui/material';
import DatasetSelectorModal from './DatasetSelectorModal';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

import ConfusionMatrix from './ConfusionMatrix';
import ClassificationReportChart from './ClassificationReportChart';
import ClassificationHelpPopover from './ClassificationHelpPopover'; 

export default function EvaluateVisionModel({ modelId, initialModelData }) {
     const [model, setModel] = useState(initialModelData || null);
    const [loadingModel, setLoadingModel] = useState(!initialModelData);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // (Opcional) Lógica para un popover de ayuda
    const [helpPopoverAnchor, setHelpPopoverAnchor] = useState(null);
    const handleOpenHelpPopover = (event) => setHelpPopoverAnchor(event.currentTarget);
    const handleCloseHelpPopover = () => setHelpPopoverAnchor(null);
    const isHelpPopoverOpen = Boolean(helpPopoverAnchor);

     useEffect(() => {
        // Si ya tenemos los datos (porque era un fantasma), no hacemos nada.
        if (initialModelData) return;
         const fetchModelDetails = async () => {
            // ... tu lógica para buscar un modelo REAL en la API ...
        };

        fetchModelDetails();
    }, [modelId, initialModelData]);


    const handleEvaluate = async () => {
        if (!selectedDataset) {
            setError("Por favor, selecciona un dataset etiquetado para la evaluación.");
            return;
        }
        setLoading(true);
        setError(null);
        setEvaluationResult(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const payload = { evaluation_dataset_id: selectedDataset.id };

            // ¡Llamamos al endpoint de EVALUATE!
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/vision/${modelId}/evaluate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Ocurrió un error durante la evaluación.');
            }
            
            setEvaluationResult(result.evaluation_results);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDatasetSelected = (dataset) => {
        const normalizedDataset = {
            ...dataset,
            name: dataset.file_name || dataset.datasetName,
            id: dataset.id || dataset.datasetId
        };
        setSelectedDataset(normalizedDataset);
        setEvaluationResult(null);
        setError(null);
    };

    return (
        <>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, border: '1px solid', borderColor: 'primary.main',  }}>
                <Typography variant="h6" fontWeight="bold">Evaluar Rendimiento del Modelo de Visión</Typography>
                
                <Paper variant="outlined" sx={{ p: 2, border: '1px solid', borderColor: 'primary.main', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography>
                        {selectedDataset ? `Dataset de evaluación: ${selectedDataset.name}` : 'Ningún dataset seleccionado.'}
                    </Typography>
                    <Button variant="contained" startIcon={<FindInPageIcon />} onClick={() => setModalOpen(true)}>
                        Seleccionar Dataset Etiquetado
                    </Button>
                </Paper>
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleEvaluate}
                        disabled={!selectedDataset || loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                    >
                        {loading ? "Calculando Métricas..." : "Evaluar Rendimiento"}
                    </Button>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                
                {evaluationResult && (
                    <Box sx={{ mt: 2 ,border: '1px solid',  p:5, gap:2, borderColor: 'primary.main', }}>
                       {/* --- BLOQUE CORREGIDO --- */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold">
                Dashboard de Rendimiento
            </Typography>
            
            {/* Este es el botón que abre el Popover */}
            <Tooltip title="¿Qué significan estas métricas?">
                <IconButton onClick={handleOpenHelpPopover} color="primary">
                    <HelpOutlineIcon />
                </IconButton>
            </Tooltip>
        </Box>
        {/* --- FIN DEL BLOQUE CORREGIDO --- */}
                        
                        <Paper elevation={3} sx={{ p: 3, mb: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">Precisión General (Accuracy)</Typography>
                            <Typography variant="h3" color="primary.main" fontWeight="bold">
                                {(evaluationResult.metrics.accuracy * 100).toFixed(2)}%
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Porcentaje de imágenes clasificadas correctamente en el dataset de prueba.
                            </Typography>
                        </Paper>

                        <Grid container spacing={4}>
                            <Grid size={{ xs: 12,  md: 4 }}>
                                <ConfusionMatrix 
                                    data={evaluationResult.confusion_matrix} 
                                    labels={evaluationResult.confusion_matrix_labels} 
                                />
                            </Grid>
                            <Grid size={{ xs: 12, md: 4 }}>
                                <ClassificationReportChart 
                                    report={evaluationResult.classification_report} 
                                    labels={evaluationResult.confusion_matrix_labels} 
                                />
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Paper>

            <DatasetSelectorModal
                open={isModalOpen}
                onClose={() => setModalOpen(false)}
                onDatasetSelect={handleDatasetSelected}
                // ¡La clave! Busca datasets de visión
                datasetCategory="vision"
            />
            
            {/* El popover se renderiza aquí */}
            <ClassificationHelpPopover
                open={isHelpPopoverOpen}
                anchorEl={helpPopoverAnchor}
                onClose={handleCloseHelpPopover}
            />
        </>
    );
}