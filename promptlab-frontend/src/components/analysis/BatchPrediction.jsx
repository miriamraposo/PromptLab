// RUTA: src/components/analysis/BatchPrediction.jsx (VERSIÓN FINAL)

import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, Button, CircularProgress, Alert, Paper, Stack, 
    Divider, Chip
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

// Importamos el nuevo modal
import DatasetSelectorModal from './DatasetSelectorModal';

import DownloadIcon from '@mui/icons-material/Download';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import FindInPageIcon from '@mui/icons-material/FindInPage'; // Icono para el botón de seleccionar

import { IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HelpPopover from './HelpPopover'; // Importamos nuestro nuevo componente



export default function BatchPrediction({ model, projectId }) {
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [isModalOpen, setModalOpen] = useState(false);
    const [predictions, setPredictions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [helpAnchorEl, setHelpAnchorEl] = useState(null);

    // 3. Añade estas dos funciones para abrir y cerrar el Popover
    const handleHelpClick = (event) => {
        setHelpAnchorEl(event.currentTarget);
    };

    const handleHelpClose = () => {
        setHelpAnchorEl(null);
    };

    const isHelpOpen = Boolean(helpAnchorEl);

    // --- Lógica para la llamada a la API (AHORA SIMPLIFICADA) ---
    const handlePredict = async () => {
        if (!selectedDataset) {
            setError("Por favor, selecciona un dataset primero.");
            return;
        }
        setLoading(true);
        setError(null);
        setPredictions(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            // El payload ahora es un JSON con el ID del dataset
            const payload = {
                dataset_id: selectedDataset.datasetId
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/batch-predict`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json' // ¡MUY IMPORTANTE!
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Ocurrió un error al procesar el archivo.');
            }
            
            const predictionsWithId = result.data.map((row, index) => ({ id: index, ...row }));
            setPredictions(predictionsWithId);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    
    // El callback que se pasa al modal
    const handleDatasetSelected = (dataset) => {
        setSelectedDataset(dataset);
        setPredictions(null); // Limpiamos predicciones anteriores
        setError(null);
    };

    // El resto del componente (tabla, descarga) se mantiene casi igual
    const columns = predictions ? Object.keys(predictions[0]).filter(k => k !== 'id').map(key => ({
        field: key,
        headerName: key.toUpperCase().replace(/_/g, ' '),
        width: key.toLowerCase() === 'prediction' ? 180 : 150,
        ...(key.toLowerCase() === 'prediction' && {
            renderCell: (params) => (
                <Chip icon={<AnalyticsIcon />} label={typeof params.value === 'number' ? params.value.toFixed(4) : params.value} color="primary" variant="outlined" size="small" />
            )
        })
    })) : [];

     const handleDownload = () => {
        if (!predictions || predictions.length === 0) {
            console.error("No hay datos de predicción para descargar.");
            return;
        }

        // 1. Obtener los encabezados (nombres de las columnas)
        //    Filtramos la columna 'id' que solo usa la tabla para renderizar.
        const headers = Object.keys(predictions[0]).filter(key => key !== 'id');
        
        // 2. Crear la primera línea del CSV con los encabezados
        let csvContent = headers.join(',') + '\n';

        // 3. Añadir cada fila de datos al string del CSV
        predictions.forEach(row => {
            const values = headers.map(header => {
                let cellValue = row[header];
                // Si el valor contiene una coma, lo envolvemos en comillas dobles
                // para que no se rompa el formato CSV.
                if (typeof cellValue === 'string' && cellValue.includes(',')) {
                    return `"${cellValue}"`;
                }
                return cellValue;
            });
            csvContent += values.join(',') + '\n';
        });

        // 4. Crear un "Blob", que es como un archivo en la memoria del navegador
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // 5. Crear un link temporal para iniciar la descarga
        const link = document.createElement("a");
        if (link.download !== undefined) { // Chequeo de compatibilidad del navegador
            const url = URL.createObjectURL(blob);
            const modelName = model.modelName.replace(/\s+/g, '_'); // Reemplaza espacios por guiones bajos
            
            link.setAttribute("href", url);
            link.setAttribute("download", `predicciones_${modelName}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            
            link.click(); // Simular un clic en el link
            
            document.body.removeChild(link); // Limpiar el link temporal
        }
    };

    return (
        <>
            <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* --- SECCIÓN DE SELECCIÓN DE DATASET (NUEVA INTERFAZ) --- */}
                     <Box>
                    {/* 4. Coloca el ícono de ayuda junto al título */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                            Paso 1: Seleccionar el Archivo 
                        </Typography>
                        <IconButton onClick={handleHelpClick} size="small" sx={{ ml: 1 }}>
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Box>
                    <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2}}>
                        <Typography sx={{ color: selectedDataset ? 'text.primary' : 'text.secondary' }}>
                            {selectedDataset ? `Dataset seleccionado: ${selectedDataset.name}` : 'Ningún dataset seleccionado.'}
                        </Typography>
                         <Button
  variant="outlined"  // corregido
  startIcon={<FindInPageIcon />}
  onClick={() => setModalOpen(true)}
  sx={{
    color: '#0288d1',           // texto e icono celeste intenso
    borderColor: '#0288d1',     // borde celeste
    '&:hover': {
      backgroundColor: 'rgba(2, 136, 209, 0.08)', // fondo sutil al pasar el mouse
      borderColor: '#0288d1',
    },
  }}
>
  Seleccionar Dataset
</Button>
                    </Paper>
                </Box>

                {/* --- SECCIÓN DE EJECUCIÓN --- */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handlePredict}
                        disabled={!selectedDataset || loading}
                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                    >
                        {loading ? "Procesando Lote..." : "Generar Predicciones"}
                    </Button>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
                
                {/* --- SECCIÓN DE RESULTADOS --- */}
                {predictions && (
                    <Box>
                        <Divider sx={{ my: 2 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
                                Resultados de la Predicción
                            </Typography>
                             <Button
  variant="outlined"
  startIcon={<DownloadIcon />}
  onClick={handleDownload}
  sx={{
    color: '#0288d1',           // color del texto e icono
    borderColor: '#0288d1',     // color del borde
    '&:hover': {
      backgroundColor: 'rgba(2, 136, 209, 0.08)', // fondo ligero al hover
      borderColor: '#0288d1',
    },
  }}
>
  Descargar Resultados
</Button>
                        </Stack>
                        <Box sx={{ height: 500, width: '100%' }}>
                            <DataGrid rows={predictions} columns={columns} density="compact" />
                        </Box>
                    </Box>
                )}
            </Paper>

            {/* El Modal que se renderiza pero está oculto hasta que se abre */}
            <DatasetSelectorModal
                open={isModalOpen}
                onClose={() => setModalOpen(false)}
                onDatasetSelect={handleDatasetSelected}
            />
             <HelpPopover
                open={isHelpOpen}
                anchorEl={helpAnchorEl}
                onClose={handleHelpClose}
            />
        </>
        
    );
}

