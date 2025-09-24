// src/pages/PredictClusterPage.jsx (Esqueleto Final)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Stack, Divider } from '@mui/material';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';

// --- NUESTROS COMPONENTES ---
import FileUploaderClustering from '../components/FileUploaderClustering';
import DatasetSelectorModal from '../components/analysis/DatasetSelectorModal'; // <<< 1. IMPORTAMOS EL MODAL
import { TablePreview } from '../components/dashboard/DataPreviews';
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DownloadIcon from '@mui/icons-material/Download';


export default function PredictClusterPage() {
    const { modelId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    const [modelInfo, setModelInfo] = useState(null);
    const [fileToPredict, setFileToPredict] = useState(null);
    const [selectedDataset, setSelectedDataset] = useState(null); // <<< 2. NUEVO ESTADO para el dataset guardado
    const [isModalOpen, setIsModalOpen] = useState(false); // <<< 3. NUEVO ESTADO para controlar el modal
    const [predictionResult, setPredictionResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isPredicting, setIsPredicting] = useState(false);
    const [error, setError] = useState(null);


   useEffect(() => {
  const fetchModelInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trained_models")       // 👈 tu tabla de modelos
        .select("id, model_name") // 👈 columna con el nombre del modelo
        .eq("id", modelId)
        .single();

      if (error) throw error;
      setModelInfo(data);
    } catch (err) {
      console.error("Error cargando info del modelo:", err);
      setModelInfo(null);
    } finally {
      setLoading(false);
    }
  };

  fetchModelInfo();
}, [modelId]);

   const handleFileSelect = (file) => {
        setFileToPredict(file);
        setSelectedDataset(null); // <<< Importante: si sube archivo, anulamos la selección del modal
        setPredictionResult(null);
        setError(null);
    };

    // <<< 4. NUEVA FUNCIÓN para cuando se selecciona un dataset del modal
    const handleDatasetSelectFromModal = (dataset) => {
        setSelectedDataset(dataset);
        setFileToPredict(null); // <<< Importante: si selecciona dataset, anulamos el archivo subido
        setPredictionResult(null);
        setError(null);
        setIsModalOpen(false); // Cierra el modal
        showNotification(`Dataset "${dataset.name}" seleccionado.`, "info");
    };


    const handleRunSegmentation = async () => {
        // Decide qué función de predicción llamar
        if (fileToPredict) {
            await runPredictionWithFile();
        } else if (selectedDataset) {
            await runPredictionWithSavedDataset();
        } else {
            showNotification("Por favor, sube un archivo o selecciona un dataset existente.", "warning");
        }
    };


   const handleDownload = () => {
        if (!predictionResult || predictionResult.length === 0) {
            showNotification("No hay datos de resultado para descargar.", "warning");
            return;
        }

        try {
            // 1. Obtener los encabezados (nombres de las columnas)
            const headers = Object.keys(predictionResult[0]);
            
            // 2. Crear la primera línea del CSV con los encabezados
            let csvContent = headers.join(',') + '\n';

            // 3. Añadir cada fila de datos al string del CSV
            predictionResult.forEach(row => {
                const values = headers.map(header => {
                    let cellValue = row[header];
                    // Para asegurar que el CSV sea válido, escapamos las comillas y envolvemos en comillas si hay comas
                    if (typeof cellValue === 'string') {
                        cellValue = cellValue.replace(/"/g, '""'); // Escapa comillas dobles
                        if (cellValue.includes(',')) {
                            return `"${cellValue}"`;
                        }
                    }
                    return cellValue;
                });
                csvContent += values.join(',') + '\n';
            });

            // 4. Crear un "Blob" (un archivo en la memoria del navegador)
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

            // 5. Crear un link temporal para iniciar la descarga
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            const modelName = modelInfo?.modelName?.replace(/\s+/g, '_') || modelId;
            
            link.setAttribute("href", url);
            link.setAttribute("download", `segmentacion_${modelName}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            
            link.click(); // Simular un clic
            
            document.body.removeChild(link); // Limpiar el link
            URL.revokeObjectURL(url); // Liberar memoria

        } catch (err) {
            console.error("Error al generar el CSV para descarga:", err);
            showNotification("Ocurrió un error al intentar descargar los resultados.", "error");
        }
    };

    const runPredictionWithFile = async () => {
        setIsPredicting(true);
        setError(null);
        setPredictionResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");
            const formData = new FormData();
            formData.append('file', fileToPredict);
            const url = `${import.meta.env.VITE_API_URL}/api/models/${modelId}/predict-cluster`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Error en la predicción.");
            setPredictionResult(result.data);
            showNotification("¡Segmentación completada!", "success");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPredicting(false);
        }
    };

    // <<< 6. NUEVA FUNCIÓN para predecir con dataset guardado
    const runPredictionWithSavedDataset = async () => {
        setIsPredicting(true);
        setError(null);
        setPredictionResult(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            // Usamos el nuevo endpoint y enviamos un JSON
            const url = `${import.meta.env.VITE_API_URL}/api/models/${modelId}/predict-with-saved-dataset`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json' // <<< Importante: indicamos que enviamos JSON
                },
                body: JSON.stringify({ dataset_id: selectedDataset.datasetId }), // <<< Enviamos el ID
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || "Error en la predicción.");
            setPredictionResult(result.data);
            showNotification("¡Segmentación completada!", "success");
        } catch (err) {
            setError(err.message);
        } finally {
            setIsPredicting(false);
        }
    };

   if (loading) return <CircularProgress />;
    // Modificamos el error para que sea más genérico
    if (!modelInfo && !loading) return <Alert severity="error">No se pudo cargar la información del modelo.</Alert>;


 return (
  <Box
    sx={{
      p: 3,
      pt: 'calc(72px + 2px)',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f7fa, #e3f2fd)',
    }}
  >

      <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between', // opcional: si querés que se separen
        mb: 3,
      }}
    >
     

      <Typography variant="h5" fontWeight="bold">
        Segmentar Nuevos Datos
      </Typography>
    

    <Typography color="text.secondary" sx={{ mb: 4 }}>
      Usando el modelo: <strong>{modelInfo?.model_name || modelId}</strong>
    </Typography>

     <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/models')}
        variant="contained"
      >
        Volver a Mis Modelos
      </Button>

  </Box>

    {/* Contenedor principal */}
    <Fade in timeout={700}>
      <Paper
        elevation={4}
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          borderRadius: 4,
        }}
      >
       {/* Paso 1 */}
<Box sx={{ mb: 4 }}>
  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
    Paso 1: Sube el archivo con los datos a segmentar
  </Typography>

  {/* Opción A */}
  <Paper
    elevation={2}
    sx={{
      p: 3,
      mb: 3,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      background: 'linear-gradient(135deg, #f1f8e9, #f9fbe7)',
    }}
  >
    <Typography variant="subtitle1" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <UploadFileIcon color="success" />
      Opción A: Subir archivo nuevo
    </Typography>
    <Typography sx={{ color: 'text.secondary' }}>
      Sube un archivo desde tu equipo para segmentarlo directamente.
    </Typography>
    <FileUploaderClustering onFileSelect={handleFileSelect} />
    {fileToPredict && (
      <Alert severity="info" sx={{ mt: 1 }}>
        Archivo seleccionado: {fileToPredict.name}
      </Alert>
    )}
  </Paper>

  {/* Separador */}
  <Divider sx={{ my: 2 }}>
    <Typography variant="overline" sx={{ px: 2 }}>
      O
    </Typography>
  </Divider>

  {/* Opción B */}
  <Paper
    elevation={2}
    sx={{
      p: 3,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      background: 'linear-gradient(135deg, #e3f2fd, #e8eaf6)',
    }}
  >
    <Typography variant="subtitle1" fontWeight="600" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <FolderOpenIcon color="primary" />
      Opción B: Seleccionar dataset existente
    </Typography>
    <Typography sx={{ color: 'text.secondary' }}>
      Usa un dataset que ya hayas guardado previamente en la plataforma.
    </Typography>
    <Button
      variant="contained"
      startIcon={<FolderOpenIcon />}
      onClick={() => setIsModalOpen(true)}
    >
      Seleccionar Dataset Existente
    </Button>
    {selectedDataset && (
      <Alert severity="info" sx={{ mt: 1 }}>
        Dataset seleccionado: {selectedDataset.name}
      </Alert>
    )}
  </Paper>
</Box>

        

        {/* Botón ejecutar */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleRunSegmentation}
             disabled={(!fileToPredict && !selectedDataset) || isPredicting}
            startIcon={
              isPredicting ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <AnalyticsIcon />
              )
            }
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 3,
              fontWeight: 'bold',
              textTransform: 'none',
              fontSize: '1rem',
            }}
          >
            {isPredicting ? 'Procesando...' : 'Ejecutar Segmentación'}
          </Button>
        </Box>

        {/* Error */}
        {error && <Alert severity="error">{error}</Alert>}

        {/* Resultados */}
        {predictionResult && (
          <Grow in timeout={700}>
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: 3,
                backgroundColor: '#ebf1f8ff',
                boxShadow: 2,
              }}
            >
              <Divider sx={{ mb: 3 }} />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 ,mt:2 }}
              >
                <Typography variant="h6" fontWeight="600">
                  Resultados de la Segmentación
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleDownload}
                >
                  Descargar Resultados
                </Button>
              </Stack>
              <Box sx={{ height: 500, width: '100%' }}>
                <TablePreview data={predictionResult} />
              </Box>
            </Box>
          </Grow>
        )}
      </Paper>
    </Fade>
     {/* <<< 7. RENDERIZAMOS EL MODAL */}
            <DatasetSelectorModal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onDatasetSelect={handleDatasetSelectFromModal}
                datasetCategory="tabular" // Le decimos al modal que solo muestre datasets tabulares
            />
  </Box>
);
}