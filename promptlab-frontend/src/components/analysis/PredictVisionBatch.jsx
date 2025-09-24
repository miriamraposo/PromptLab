// RUTA NUEVA: src/components/analysis/PredictVisionBatch.jsx

import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Chip,Tooltip, IconButton } from '@mui/material';
import DatasetSelectorModal from './DatasetSelectorModal';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; 
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FindInPageIcon from '@mui/icons-material/FindInPage';
import InsightsIcon from '@mui/icons-material/Insights';
import ConfidenceHelpPopover from './ConfidenceHelpPopover'; 

export default function PredictVisionBatch({ modelId }) {
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [helpAnchorEl, setHelpAnchorEl] = useState(null);

    const handleHelpClick = (event) => setHelpAnchorEl(event.currentTarget);
    const handleHelpClose = () => setHelpAnchorEl(null);
    const isHelpOpen = Boolean(helpAnchorEl);

    const handlePredict = async () => {
        if (!selectedDataset) { /* ... */ return; }
        setLoading(true);
        setError(null);
        setPredictions(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const payload = { dataset_id: selectedDataset.id };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/vision/${modelId}/batch-predict`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Ocurrió un error al procesar el lote.');
            }
            
            setPredictions(result.data);

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
        setPredictions(null);
        setError(null);
    };

    return (
    <>
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 ,border: 1,        
    borderColor: 'primary.main', 
    borderRadius: 2,}}>
            <Typography variant="h6" fontWeight="bold">Aplicar Modelo a un Nuevo Dataset de Imágenes</Typography>
            
            <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center'  ,border: 1,          
    borderColor: 'primary.main', 
    borderRadius: 2,}}>
                <Typography>
                    {selectedDataset ? `Dataset seleccionado: ${selectedDataset.name}` : 'Ningún dataset seleccionado.'}
                </Typography>
                <Button variant="contained" startIcon={<FindInPageIcon />} onClick={() => setModalOpen(true)}>
                    Seleccionar Dataset
                </Button>
            </Paper>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    size="large"
                    onClick={handlePredict}
                    disabled={!selectedDataset || loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                >
                    {loading ? "Generando Predicciones..." : "Generar Predicciones"}
                </Button>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}
            
            {predictions && (
                <Box sx={{ mt: 2 }}>
                    {/* --- VERSIÓN CORREGIDA: Título + Icono de Ayuda --- */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h5">Resultados de la Predicción</Typography>
                        <Tooltip title="Entender los resultados">
                            <IconButton onClick={handleHelpClick} size="small" sx={{ ml: 1 }}>
                                <HelpOutlineIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    
                    {/* La línea duplicada ha sido eliminada */}

                    <Grid container spacing={2}>
                        {predictions.map((pred, index) => (
                           <Grid key={index} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                                <Paper variant="outlined">
                                    {pred.image_url ? (
                                        <img src={pred.image_url} alt={`Predicción ${index}`} style={{ width: '100%', height: 200, objectFit: 'cover', borderTopLeftRadius: '4px', borderTopRightRadius: '4px' }} />
                                    ) : (
                                        <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.200' }}>
                                            <Typography color="text.secondary">Imagen no disponible</Typography>
                                        </Box>
                                    )}
                                    <Box p={1} textAlign="center">
                                        {pred.error ? (
                                            <Chip label={pred.error} color="error" size="small" />
                                        ) : (
                                            <>
                                                <Typography variant="subtitle1" fontWeight="bold">{pred.predicted_class}</Typography>
                                                <Chip 
                                                    icon={<InsightsIcon />} 
                                                    label={`Confianza: ${(pred.confidence * 100).toFixed(1)}%`} 
                                                    color="primary" 
                                                    variant="outlined" 
                                                    size="small" 
                                                />
                                            </>
                                        )}
                                    </Box>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Paper>

        <DatasetSelectorModal
            open={isModalOpen}
            onClose={() => setModalOpen(false)}
            onDatasetSelect={handleDatasetSelected}
            datasetCategory="vision"
        />

        {/* --- No te olvides de renderizar el Popover --- */}
        <ConfidenceHelpPopover
            open={isHelpOpen}
            anchorEl={helpAnchorEl}
            onClose={handleHelpClose}
        />
    </>
);
}