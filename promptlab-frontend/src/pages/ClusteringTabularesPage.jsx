import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Alert, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import { TablePreview } from '../components/dashboard/DataPreviews'; 
import ClusteringControlPanel from '../components/dashboard/ClusteringControlPanel';
import ClusteringResultsModal from '../components/dashboard/ClusteringResultsModal'; // <<< 1. Importa el nuevo modal



export default function ClusteringTabularesPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    
      // --- ESTADOS (CORREGIDOS Y LIMPIOS) ---
    const [loadState, setLoadState] = useState({ loading: true, error: null, data: null });
    const [clusteringResult, setClusteringResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isResultsModalOpen, setResultsModalOpen] = useState(false);
    const [customClusterNames, setCustomClusterNames] = useState({});
    const [lastAnalysisConfig, setLastAnalysisConfig] = useState(null); // Correcto


    // --- EFECTO DE CARGA INICIAL DEL DATASET ---
    useEffect(() => {
        if (!datasetId) return;

        const fetchDatasetPreview = async () => {
            setLoadState({ loading: true, error: null, data: null });
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                
                // Usamos un endpoint que solo traiga la preview, si no existe, usamos el de diagnóstico
                const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/diagnose`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                
                if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                
                const result = await response.json();
                if (result.success && result.data) {
                    setLoadState({ loading: false, error: null, data: result.data });
                } else {
                    throw new Error(result.error || "La respuesta del backend no fue exitosa.");
                }
            } catch (err) {
                console.error("💥 ERROR durante la carga de datos:", err.message);
                setLoadState({ loading: false, error: err.message, data: null });
            }
        };

        fetchDatasetPreview();
    }, [datasetId]);

    const handleRetry = () => {
        setClusteringResult(null);
        setCustomClusterNames({}); // Limpiamos los nombres también
    };

    const handleUpdateClusterNames = (newNames) => {
        setCustomClusterNames(newNames);
    };

     

    const handleConfirmSaveModel = async (finalProjectName, finalModelDisplayName) => {
        if (!lastAnalysisConfig || !clusteringResult) {
            alert("Error: No hay un análisis para guardar.");
            return false;
        }
        if (!finalProjectName.trim() || !finalModelDisplayName.trim()) {
            alert("Por favor, asigna un nombre al proyecto y al modelo.");
            return false;
        }

        // Reutilizamos el loader general de la página
        setIsAnalyzing(true); 

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            
            // Construimos el payload final para el endpoint de guardado de modelo
            const finalPayload = {
                algorithm: lastAnalysisConfig.algorithm,
                parameters: lastAnalysisConfig.parameters,
                project_name: finalProjectName,
                model_display_name: finalModelDisplayName,
                // Le pasamos el projectId desde los params de la URL
                project_id: projectId 
            };
            
            

            // Llamamos al endpoint de guardado de modelo
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/train-clustering-model`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(finalPayload),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                if (response.status === 409) {
                    alert(`Error: ${result.error}`);
                } else {
                    throw new Error(result.error || 'Ocurrió un error al guardar el modelo.');
                }
                return false; // No cerramos el modal
            }
            
            alert(`¡Modelo "${finalModelDisplayName}" guardado con éxito!`);
            // Opcional: navegar a "Mis Modelos"
            // navigate('/models');
            return true; // Éxito, el modal se cerrará

        } catch (err) {
            alert(`Error al guardar: ${err.message}`);
            return false;
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveAsNewDataset = async () => {
        if (!clusteringResult || !loadState.data?.previewData) {
            showNotification("No hay resultados de clustering para guardar.", "error");
            return;
        }

        setIsAnalyzing(true); // Reutilizamos el loader general

        try {
            // 1. Mapea los IDs de clúster a los nombres personalizados
            const clusterLabelsWithNames = clusteringResult.cluster_labels.map(labelId => {
                const originalName = labelId === -1 ? "Ruido" : `Clúster ${labelId}`;
                return customClusterNames[originalName] || originalName; // Usa el nombre personalizado o el original
            });

            // 2. Prepara el payload para el backend
            const payload = {
                original_dataset_id: datasetId,
                new_column_name: "Segmento_Cluster", // Puedes hacer esto configurable si quieres
                labels: clusterLabelsWithNames,
                // Podríamos pedir un nombre para el nuevo dataset en un futuro
                new_dataset_name: `${loadState.data.datasetName} (Segmentado)` 
            };
            
            // 3. Llama a un NUEVO endpoint del backend
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            // NOTA: Este endpoint `/save-enriched-dataset` es nuevo, tenemos que crearlo en el backend
            const url = `${import.meta.env.VITE_API_URL}/api/datasets/save-enriched-dataset`; 
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "No se pudo guardar el dataset.");

            // 4. Éxito: notifica y redirige al usuario a la DataPrepPage del nuevo dataset
            showNotification("¡Nuevo dataset segmentado guardado con éxito!", "success");
            navigate(`/project/${projectId}/dataprep/${result.new_dataset_id}`);

        } catch (err) {
            showNotification(err.message, "error");
        } finally {
            setIsAnalyzing(false);
        }
    };



    const handleRunAnalysis = async ({ algorithm, parameters }) => {
    setIsAnalyzing(true);
    // IMPORTANTE: Limpia los resultados aquí para que la UI se actualice
    setClusteringResult(null); 
    setLastAnalysisConfig({ algorithm, parameters });
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/run-clustering-analysis`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ algorithm, parameters })
        });
        
        const result = await response.json();
        

        if (!result.success) {
            throw new Error(result.error || "El análisis falló.");
        }
        
        // <<< LA CORRECCIÓN CLAVE >>>
        // En lugar de llamar a los dos `set` por separado,
        // los agrupamos en uno solo si es posible, o nos aseguramos
        // de que el más importante se procese.

        // Primero, actualizamos el resultado.
        setClusteringResult(result);
        
        // Solo después de que el resultado está guardado, quitamos el loader.
        setIsAnalyzing(false); 
        
        showNotification("¡Análisis completado!", "success");

    } catch (err) {
        showNotification(err.message, "error");
        // En caso de error, también nos aseguramos de quitar el loader.
        setIsAnalyzing(false); 
        setClusteringResult(null);
    }
    // Ya no necesitamos el bloque `finally` porque manejamos `setIsAnalyzing(false)`
    // tanto en el `try` (éxito) como en el `catch` (error).
};

    // --- COMBINACIÓN DE DATOS PARA LA TABLA ---
    // Este `useMemo` es la clave del panel izquierdo. Combina los datos originales
    // con los resultados del clustering cuando estén disponibles.
    const tableDataWithClusters = React.useMemo(() => {
        const originalData = loadState.data?.previewData;

        // Si no hay datos originales o no hay resultados del clustering, devuelve los datos originales
        if (!originalData || !clusteringResult?.cluster_labels) {
            return originalData;
        }

        // Si hay resultados, añade la nueva columna "Cluster"
        return originalData.map((row, index) => ({
            Cluster: clusteringResult.cluster_labels[index],
            ...row,
        }));
    }, [loadState.data, clusteringResult]);


    // --- RENDERIZADO DEL PANEL IZQUIERDO ---
    const renderLeftPanel = () => {
        if (loadState.loading && !loadState.data) {
            return <CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />;
        }
        if (loadState.error) {
            return <Alert severity="error">{loadState.error}</Alert>;
        }
        if (!tableDataWithClusters) {
            return <Typography sx={{ p: 2 }}>No hay datos de vista previa disponibles.</Typography>;
        }

        return (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <TablePreview
                        // key para forzar el re-renderizado si fuera necesario
                        data={tableDataWithClusters}
                        // Quitamos la lógica de selección de columnas por ahora
                        // problematicColumns={{}}
                        // selectedColumn={null}
                        // onColumnSelect={() => {}}
                    />
                </Box>
            </Box>
        );
    };

    // --- RENDERIZADO DEL PANEL DERECHO (POR AHORA, UN MARCADOR) ---
    const renderRightPanel = () => {
        if (loadState.error) return null;
        if (loadState.loading) return <Paper sx={{ p: 2, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress /></Paper>;
        
        // <<< 4. Pasamos TODOS los nuevos props al panel de control
       return (
            <ClusteringControlPanel
                isAnalyzing={isAnalyzing}
                clusteringResults={clusteringResult}
                onRunAnalysis={handleRunAnalysis}
                onRetry={handleRetry}
                onOpenResultsModal={() => setResultsModalOpen(true)}
                onUpdateClusterNames={handleUpdateClusterNames}
                // Pasamos directamente la función de guardar dataset
                onSaveAsDataset={handleSaveAsNewDataset} 
            />
        );
    };


    // --- ESTRUCTURA PRINCIPAL DE LA PÁGINA ---
    return (
             <PaginaConAsistente nombreModulo="clustering">
            <Box sx={{
                height: '100vh',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                p: 2,
                pt: 'calc(72px + 1px)', // Ajuste para la barra de navegación superior
                background: "linear-gradient(135deg, #26717a, #44a1a0)",
            }}>
               <Paper
  elevation={0}
  sx={{
    p: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // separación entre título y botones
    background: '#005f73',
    border: '2px solid',
    borderColor: 'primary.main',
    borderRadius: 2,
    gap: 2,
  }}
>
  {/* Título a la izquierda */}
  <Typography variant="h6" sx={{ color: 'white' }}>
    Análisis de Clustering {loadState.data?.datasetName}
  </Typography>

  {/* Botones a la derecha */}
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Button
      variant="contained"
      size="small"
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate(`/project/${projectId}`)}
      color="secondary"
      sx={{ border: "2px solid #ffffff", color: "#ffffff" }}
    >
      Volver al Proyecto
    </Button>
  </Box>
</Paper>


                {/* Contenido Principal (Paneles) */}
                <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden' }}>
                    {/* Panel Izquierdo: Vista Previa */}
                    <Box sx={{ flex: '2 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Paper sx={{ flexGrow: 1, overflow: 'auto', position: 'relative' }}>
                            {(loadState.loading || isAnalyzing) && (
                                <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                                    <CircularProgress />
                                </Box>
                            )}
                            {renderLeftPanel()}
                        </Paper>
                    </Box>

                   {/* Panel Derecho */}
                    <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
                        {renderRightPanel()}
                    </Box>
                </Box>
                
                 {/* <<< 5. Añadimos el MODAL aquí, en la página principal */}
                {/* Solo se renderiza si tenemos resultados para mostrar */}
                {clusteringResult && (
                 <ClusteringResultsModal
                        open={isResultsModalOpen}
                        onClose={() => setResultsModalOpen(false)}
                        results={clusteringResult}
                        onSave={handleConfirmSaveModel}
                        initialModelName={`Análisis de ${clusteringResult?.n_clusters || 'N'} Segmentos`}
                        initialProjectName={loadState.data?.projectName || "Proyecto de Clustering"}
                    />
                )}

                
            </Box>
       </PaginaConAsistente>
    );
}
          