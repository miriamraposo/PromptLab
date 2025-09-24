// En src/pages/ClusteringPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, CircularProgress, Alert, Button, Grid, TextField,
    List, ListItemButton, ListItemText, Select, MenuItem, FormControl, InputLabel,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    ListItemAvatar, Avatar, Accordion, AccordionSummary, AccordionDetails, IconButton
} from '@mui/material';
import { FixedSizeGrid as GridVirt } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // <-- Ícono para el acordeón
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // <-- Ícono para la ayuda
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import ClusteringHelpPopover from '../components/analysis/ClusteringHelpPopover'; // 
import ClusterScatterPlot from '../components/analysis/charts/ClusterScatterPlot';
// ====================================================================
// --- COMPONENTES DE LA GALERÍA ---
// ====================================================================

const CELL_IMAGE_HEIGHT = 150;
const CELL_PADDING = 8;
const CELL_ROW_HEIGHT = CELL_IMAGE_HEIGHT + (CELL_PADDING * 2);

// --- Celda para la vista de CONFIGURACIÓN (virtualizada) ---
const ConfigGridCell = ({ columnIndex, rowIndex, style, data }) => {
    // ... (Este componente está perfecto, no necesita cambios)
    const { items, selectedIds, toggleSelection, columnCount } = data;
    const index = rowIndex * columnCount + columnIndex;
    const img = items[index];
    if (!img) return null;
    const cellStyle = { ...style, padding: `${CELL_PADDING}px` };
    const isSelected = selectedIds.has(img.id);
    return (
        <div style={cellStyle}>
            <Paper
                variant="outlined"
                sx={{
                    height: '100%',
                    border: isSelected ? '2px solid' : '1px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative'
                }}
                onClick={() => toggleSelection(img.id)}
            >
                <Box component="img" src={img.signed_url} alt={img.nombre_archivo} sx={{ width: '100%', height: CELL_IMAGE_HEIGHT, objectFit: 'contain', backgroundColor: '#f5f5f5' }} />
            </Paper>
        </div>
    );
};

// --- Galería para la vista de CONFIGURACIÓN (virtualizada) ---
function ConfigImageGallery({ images, selectedIds, toggleSelection }) {
    // ... (Este componente está perfecto, no necesita cambios)
    return (
        <Box sx={{ flexGrow: 1, width: '100%', height: '100%' }}>
            <AutoSizer>
                {({ height, width }) => {
                    if (height === 0 || width === 0) return null;
                    const columnCount = Math.max(1, Math.floor(width / (CELL_IMAGE_HEIGHT + 2 * CELL_PADDING)));
                    const rowCount = Math.ceil(images.length / columnCount);
                    return (
                        <GridVirt
                            columnCount={columnCount}
                            columnWidth={width / columnCount}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={CELL_ROW_HEIGHT}
                            width={width}
                            itemData={{ items: images, selectedIds, toggleSelection, columnCount }}
                        >
                            {ConfigGridCell}
                        </GridVirt>
                    );
                }}
            </AutoSizer>
        </Box>
    );
}

// --- Galería para la vista de RESULTADOS (NO virtualizada) ---
const GroupedGallery = ({ groupedImages, correctionSelection, toggleCorrectionSelection }) => {
    // ... (Este componente está perfecto, no necesita cambios)
    return (
        <Box sx={{ p: 1, overflowY: 'auto', height: '100%' }}>
           {Object.entries(groupedImages).map(([clusterId, images]) => (
    <Box
        key={clusterId}
        id={`cluster-${clusterId}`}
        sx={{
            mb: 4,
            transition: "background-color 0.6s ease",
            "&.highlighted": { backgroundColor: "rgba(25, 118, 210, 0.1)" }
        }}
    >
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, pl: 1, scrollMarginTop: '16px' }}>
            Grupo {parseInt(clusterId) + 1} — {images.length} imágenes
        </Typography>
                    <Grid container spacing={2}>
                        {images.map(img => {
                            const isSelected = correctionSelection.has(img.id);
                            return (
                            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={img.id}>
                                    <Paper
                                        onClick={() => toggleCorrectionSelection(img.id)}
                                        variant="outlined"
                                        sx={{
                                            overflow: 'hidden',
                                            cursor: 'pointer',
                                            border: isSelected ? '2px solid' : '1px solid',
                                            borderColor: isSelected ? 'primary.main' : 'divider',
                                        }}
                                    >
                                        <Box component="img" src={img.signed_url} alt={img.nombre_archivo} sx={{ width: '100%', height: 150, objectFit: 'contain', backgroundColor: '#f5f5f5', display: 'block' }} />
                                    </Paper>
                                </Grid>
                            );
                        })}
                    </Grid>
                </Box>
            ))}
        </Box>
    );
};


function MetricDisplay({ title, value, subtitle, sx }) {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 1, 
        textAlign: 'center', 
        height: '100%',
        backgroundColor: '#b2cbe6ff', // celeste suave
        color: 'text.primary',       // fuerza color oscuro para el texto
        ...sx
      }}
    >
      <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography variant="h4" component="p" fontWeight="bold" sx={{ my: 1 }}>
        {value ?? '—'} 
      </Typography>
      <Typography variant="body2">
        {subtitle}
      </Typography>
    </Paper>
  );
}



// ====================================================================
// --- PÁGINA PRINCIPAL DE CLUSTERING ---
// ====================================================================
export default function ClusteringPage() {
    // ... (Todos tus estados y funciones están perfectos, no necesitan cambios) ...
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [clusteringStep, setClusteringStep] = useState('config');
    const [clusteringResults, setClusteringResults] = useState(null);
    const [selectedImageIds, setSelectedImageIds] = useState(new Set());
    const [nClusters, setNClusters] = useState(5);
    const [correctionSelection, setCorrectionSelection] = useState(new Set());
    const [nClustersInput, setNClustersInput] = useState('5'); // string
    const [isSaveModalOpen, setSaveModalOpen] = useState(false);
    const [isSaveSuccessModalOpen, setSaveSuccessModalOpen] = useState(false);
    const [savedModelId, setSavedModelId] = useState(null); 
    const [datasetName, setDatasetName] = useState('');
    const [isMetricsModalOpen, setMetricsModalOpen] = useState(false); 
    const [helpPopoverAnchor, setHelpPopoverAnchor] = useState(null);
    const [modelNames, setModelNames] = useState({
    

    
        projectName: '',
        modelDisplayName: ''
    });
    
    useEffect(() => {
        const fetchImages = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                 const detailsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/details`, { 
                    headers: { 'Authorization': `Bearer ${session.access_token}` } 
                });
                const detailsResult = await detailsResponse.json();
                if (detailsResult.success) {
                    setDatasetName(detailsResult.data.dataset_name);
                }
                const url = `${import.meta.env.VITE_API_URL}/api/vision-lab/dataset/${datasetId}`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);
                const analysisList = result.analysisData || [];
                const imageList = result.imageData || [];
                const imageMap = new Map();
                imageList.forEach(img => imageMap.set(img.id, img));
                const combinedData = analysisList.map(item => {
                    const imageData = imageMap.get(item.image_id);
                    return { ...item, id: item.image_id, signed_url: imageData?.signed_url || null, storage_path: imageData?.storage_path || null, nombre_archivo: imageData?.nombre_archivo || 'desconocido' };
                });
                setImages(combinedData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (datasetId) fetchImages();
    }, [datasetId]);

    const handleOpenHelpPopover = (event) => {
    setHelpPopoverAnchor(event.currentTarget);
};

    const handleCloseHelpPopover = () => {
    setHelpPopoverAnchor(null);
};

const isHelpPopoverOpen = Boolean(helpPopoverAnchor);

   const handleOpenMetricsModal = () => {
    setMetricsModalOpen(true);
};

const handleCloseMetricsModal = () => {
    setMetricsModalOpen(false);
};

    const handleOpenSaveModal = () => {
    // Creamos nombres por defecto para sugerirle al usuario
    const defaultProjectName = `Proyecto de Clustering`;
    const defaultModelName = `Resultado de ${clusteringResults.n_clusters} Grupos`;
    
    setModelNames({
        projectName: defaultProjectName,
        modelDisplayName: defaultModelName
    });
    setSaveModalOpen(true); // Abre el modal
};

    const handleStartClustering = async () => {
    if (selectedImageIds.size === 0) { 
        showNotification("Por favor, selecciona al menos una imagen.", "warning"); 
        return; 
    }
   
    setClusteringStep('loading');
    try {
        // ... tu código de try que está perfecto ...
        const selectedImagesData = images.filter(img => selectedImageIds.has(img.id));
        const image_storage_paths = selectedImagesData.map(img => img.storage_path);
        const formData = new FormData();
        image_storage_paths.forEach(path => formData.append('image_storage_paths', path));
        formData.append('n_clusters', nClusters);
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/v1/cluster/run_kmeans`;
        const response = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${session.access_token}` }, body: formData });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        setClusteringResults(result);
        setClusteringStep('results');
        showNotification(`¡Agrupamiento completado! Se encontraron ${result.n_clusters} grupos.`, "success");
    } catch (err) {
        setError(err.message);
        setClusteringStep('config');
        showNotification(`Error al agrupar: ${err.message}`, "error");

       
    }
};
    
    const handleSaveResults = async (names) => {
    if (!names.projectName || !names.modelDisplayName) {
        showNotification("El nombre del proyecto y del modelo son obligatorios.", "warning");
        return;
    }

    setClusteringStep('loading');
    setSaveModalOpen(false);

    try {
        const payload = {
            projectId: projectId,
            projectName: names.projectName,
            datasetId: datasetId,
            modelDisplayName: names.modelDisplayName,
            clusteringDetails: clusteringResults
        };

        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/v1/cluster/approve_and_save`;
        const response = await fetch(url, {
            method: 'POST', // 1. Le decimos que es una petición POST
            headers: {      // 2. Le damos las cabeceras necesarias
                'Authorization': `Bearer ${session.access_token}`, // para la autenticación
                'Content-Type': 'application/json'                // para decirle que enviamos JSON
            },
            body: JSON.stringify(payload) // 3. Le damos el cuerpo de la petición (tus datos convertidos a string)
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        
        showNotification("Agrupación guardada con éxito!", "success");
      
        // 1. Guardamos el ID del modelo nuevo.
        setSavedModelId(result.model_id);
        
        // 2. Quitamos el "Procesando...". Dejamos la UI en la vista de resultados.
        setClusteringStep('results');
        
        // 3. Abrimos el modal de "próximos pasos".
        setSaveSuccessModalOpen(true);

    } catch (err) {
        showNotification(`Error al guardar: ${err.message}`, "error");
        setClusteringStep('results'); // En caso de error, también volvemos a la vista de resultados.
    }
};

    const handleRetry = () => {
        
        setClusteringResults(null);
        setSelectedImageIds(new Set());
        setCorrectionSelection(new Set());
        setClusteringStep('config');
    };
    const toggleSelection = (imageId) => {
        setSelectedImageIds(prevSet => { const newSet = new Set(prevSet); if (newSet.has(imageId)) newSet.delete(imageId); else newSet.add(imageId); return newSet; });
    };
    const handleSelectAll = () => setSelectedImageIds(new Set(images.map(img => img.id)));
    const handleDeselectAll = () => setSelectedImageIds(new Set());
    const toggleCorrectionSelection = (imageId) => {
        setCorrectionSelection(prev => { const newSet = new Set(prev); if (newSet.has(imageId)) newSet.delete(imageId); else newSet.add(imageId); return newSet; });
    };
    const handleMoveImages = (targetClusterId) => {
        if (correctionSelection.size === 0 || targetClusterId === "") return;
        const idsToMove = Array.from(correctionSelection);
        const pathsToMove = images.filter(img => idsToMove.includes(img.id)).map(img => img.storage_path);
        setClusteringResults(prev => {
            const newResults = { ...prev };
            newResults.results = prev.results.map(res => { if (pathsToMove.includes(res.storage_path)) { return { ...res, cluster_id: parseInt(targetClusterId) }; } return res; });
            return newResults;
        });
        showNotification(`${idsToMove.length} imágenes movidas al Grupo ${parseInt(targetClusterId) + 1}`, "success");
        setCorrectionSelection(new Set());
    };
    
    const groupedImages = useMemo(() => {
        if (clusteringStep !== 'results' || !clusteringResults) return {};
        const clusterMap = new Map();
        clusteringResults.results.forEach(item => clusterMap.set(item.storage_path, item.cluster_id));
        const allImagesWithCluster = images.map(img => ({ ...img, cluster_id: clusterMap.get(img.storage_path) })).filter(img => img.cluster_id !== undefined);
        return allImagesWithCluster.reduce((acc, img) => { (acc[img.cluster_id] = acc[img.cluster_id] || []).push(img); return acc; }, {});
    }, [images, clusteringResults, clusteringStep]);

   
    if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;

    // --- 3. FUNCIÓN RENDER RIGHT PANEL (AÑADIDA) ---
    const renderRightPanel = () => {
        switch (clusteringStep) {
            case 'loading':
                return <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress sx={{ mb: 2 }} /><Typography>Procesando...</Typography></Paper>;
            case 'results':
                return (
                    <Paper sx={{ p: 2, borderRadius: 2, border: '1px solid',          // grosor y tipo de borde
    borderColor: 'primary.main',  display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                        <Typography variant="h6">Resultados del Agrupamiento</Typography>
                       
                         <Button 
                variant="contained" 
                color="info" 
                onClick={handleOpenMetricsModal} // <-- Llama a la nueva función
                sx={{ mt: 1 }}
            >
                Ver Métricas y Gráfico
            </Button>
            
                        <Typography variant="subtitle2" sx={{ mt: 1 }}>Resumen de Grupos</Typography>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <List>
                                {Object.entries(groupedImages).sort(([a], [b]) => a - b).map(([clusterId, images]) => (
                                    <ListItemButton
                                    
                                       key={clusterId}
                                      onClick={() => {
                                       const element = document.getElementById(`cluster-${clusterId}`);
                                       if (element) {
                                      element.classList.add("highlighted");
                                      element.scrollIntoView({ behavior: "smooth", block: "center" });
                                      setTimeout(() => element.classList.remove("highlighted"), 1500);
                                      }
                                      }}
                                      
                                      >
                                        <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: `hsl(${clusterId * 60}, 70%, 50%)` }}>
                                        {parseInt(clusterId) + 1}
                                      </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                         primary={`Grupo ${parseInt(clusterId) + 1}`}
                                         secondary={`${images.length} imágenes`}
                                          />
                                    </ListItemButton>

                                ))}
                            </List>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
                            <Button variant="outlined" fullWidth onClick={handleRetry}>Reintentar</Button>
                            <Button variant="contained" fullWidth onClick={handleOpenSaveModal}>Guardar</Button>
                        </Box>
                    </Paper>
                );
            case 'config':
            default:
                return (
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}>
                        <Typography variant="h6">Configurar Agrupamiento</Typography>
                        <Typography variant="body2" color="text.secondary">Selecciona las imágenes y el número de grupos deseado.</Typography>
                        <Paper variant="outlined" sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="h5" fontWeight="bold">{selectedImageIds.size}</Typography>
                            <Typography variant="body2" color="text.secondary">imágenes seleccionadas</Typography>
                        </Paper>
                         <Box sx={{ px: 1, flexGrow: 1 ,p:2 }}>
  <Typography gutterBottom>Número de Grupos</Typography>
  <TextField
    fullWidth
    label="Número de Grupos"
    type="number"
    value={nClusters}
    onChange={(e) => {
        // Lógica para asegurar que el número sea válido
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 2; // Si no es un número, vuelve a 2
        if (val < 2) val = 2;    // El mínimo es 2
        
        // El máximo de grupos no puede ser mayor que el número de imágenes seleccionadas
        const maxClusters = selectedImageIds.size > 1 ? selectedImageIds.size : 2;
        if (val > maxClusters) val = maxClusters;

        setNClusters(val);
    }}
    // Ayuda visual para el usuario
    helperText={`Mínimo: 2, Máximo: ${selectedImageIds.size > 1 ? selectedImageIds.size : 2}`}
    // Deshabilita el campo si no hay imágenes seleccionadas
    disabled={selectedImageIds.size < 2}
/>
</Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0 }}>
                            <Button size="small" fullWidth variant="contained" onClick={handleSelectAll}>Seleccionar Todo</Button>
                            <Button size="small" fullWidth variant="contained" onClick={handleDeselectAll}>Deseleccionar</Button>
                        </Box>
                        <Button variant="contained" color="primary" size="large" onClick={handleStartClustering} disabled={selectedImageIds.size === 0}>Iniciar Agrupamiento</Button>
                    </Paper>
                );
        }
    };
    
    // --- JSX Final (sin cambios) ---
    return (
         <PaginaConAsistente nombreModulo="clustering">
        <Box sx={{ height: '100vh', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 2, p: 2, pt: 'calc(72px + 1px)' }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: "linear-gradient(135deg, #26717a, #44a1a0)", borderRadius: 2, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', mb: 2, color: '#ffffff', py: 1, px: 3, flexShrink: 0 }}>
            <Box>
                <Typography variant="h5" fontWeight="bold">Asistente de Agrupación Inteligente</Typography>
                <Typography variant="body2" color="white">
                    Dataset: {loading ? 'Cargando...' : (datasetName || datasetId)}
                </Typography>
            </Box>
                <Button
                 variant="contained"
                 sx={{
                  backgroundColor: "#005f73",
                  border: "2px solid #ffffff",
                  color: "#ffffff"
                        }}
                  onClick={() => {
                   if (!projectId || !datasetId) return;

                   const params = new URLSearchParams();
                    if (savedModelId) params.append("clusterResultId", savedModelId);

                    navigate(`/project/${projectId}/vision-lab/${datasetId}/explorer?${params.toString()}`);
                    }}
                   >
                  Etiquetado y Prediccion
                  </Button>
                
            </Box>
                                                                                                                                              
            <Box sx={{ display: "flex", gap: 3, flexGrow: 1, overflow: "hidden", }}>
                <Paper sx={{ flex: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden',border: '1px solid',          // grosor y tipo de borde
    borderColor: 'primary.main',  }}>
                    {clusteringStep === 'results' ? (
                        <GroupedGallery groupedImages={groupedImages} correctionSelection={correctionSelection} toggleCorrectionSelection={toggleCorrectionSelection} />
                    ) : (
                        <ConfigImageGallery images={images} selectedIds={selectedImageIds} toggleSelection={toggleSelection} />
                    )}
                </Paper>

                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2,border: '1px solid',          // grosor y tipo de borde
    borderColor: 'primary.main',  }}>
                    {renderRightPanel()}
                    {clusteringStep === 'results' && correctionSelection.size > 0 && (
                        <Paper sx={{ p: 2 }}>
                            <Typography variant="subtitle2" fontWeight="bold">{correctionSelection.size} imágenes seleccionadas</Typography>
                            <FormControl fullWidth sx={{ mt: 2 }}>
                                <InputLabel>Mover a...</InputLabel>
                                <Select label="Mover a..." defaultValue="" onChange={(e) => handleMoveImages(e.target.value)}>
                                    {Object.keys(groupedImages).sort((a,b) => a-b).map(clusterId => (
                                        <MenuItem key={clusterId} value={clusterId}>
                                            Grupo {parseInt(clusterId) + 1}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Paper>
                    )}
                </Box>
            </Box>
             {/* --- ¡NUEVO MODAL DE GUARDADO! --- */}
            <Dialog open={isSaveModalOpen} onClose={() => setSaveModalOpen(false)}>
                <DialogTitle>Guardar Resultado del Agrupamiento</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Asigna un nombre a este resultado para identificarlo fácilmente en tu lista de modelos.
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="projectName"
                        label="Nombre del Proyecto"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={modelNames.projectName}
                        onChange={(e) => setModelNames(prev => ({ ...prev, projectName: e.target.value }))}
                    />
                    <TextField
                        margin="dense"
                        id="modelDisplayName"
                        label="Nombre para este Resultado/Modelo"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={modelNames.modelDisplayName}
                        onChange={(e) => setModelNames(prev => ({ ...prev, modelDisplayName: e.target.value }))}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveModalOpen(false)}>Cancelar</Button>
                    <Button 
                        variant="contained"
                        onClick={() => handleSaveResults(modelNames)}
                    >
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={isSaveSuccessModalOpen} onClose={() => setSaveSuccessModalOpen(false)}>
    <DialogTitle>🎉 ¡Agrupación Guardada!</DialogTitle>
    <DialogContent>
        <DialogContentText>
            Tu resultado de clustering ha sido guardado como un nuevo modelo. ¿Qué te gustaría hacer ahora?
        </DialogContentText>
    </DialogContent>
    <DialogActions>
         <Button onClick={() => navigate('/models')}>
            Ver Mis Modelos
        </Button>
        <Button 
            variant="contained" 
             onClick={() => navigate(`/project/${projectId}/vision-lab/${datasetId}/explorer?clusterResultId=${savedModelId}`)} 
            autoFocus
        >
            Ir a Etiquetado
        </Button>
    </DialogActions>
</Dialog>

{/* === MODAL DE RESULTADOS DE CLUSTERING (Versión No Invasiva) === */}
<Dialog 
    open={isMetricsModalOpen} 
    // Al cerrar el modal, ejecutamos la misma lógica que el botón "Reintentar"
    onClose={handleCloseMetricsModal} 
    fullWidth 
    maxWidth="lg"
>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Typography variant="h6" component="div" fontWeight="bold" sx={{ flexGrow: 1 }}>
        {clusteringStep === 'results' && "  Métricas de Calidad Detalladas"}
        {clusteringStep === 'loading' && "Procesando Agrupamiento"}
    </Typography>
    {/* --- Botón de Ayuda Añadido --- */}
    {clusteringStep === 'results' && (
        <IconButton onClick={handleOpenHelpPopover} size="small">
            <HelpOutlineIcon />
        </IconButton>
    )}
</DialogTitle>

    <DialogContent>
        {/* --- Muestra un spinner mientras clusteringStep es 'loading' --- */}
        {clusteringStep === 'loading' && (
           <Box
             sx={{
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
    p: 4,
    gap: 2,
      backgroundColor: "#d0e7ff",  // celeste suave
    borderRadius: 3,                   // bordes redondeados
    boxShadow: 2,                      // sombra ligera
    width: "100%",                      // ocupa todo el ancho del contenedor
  }}
>
                <CircularProgress size={60} />
                <Typography>
                    Agrupando imágenes y calculando métricas...
                </Typography>
            </Box>
        )}

       {clusteringStep === 'results' && clusteringResults && (
  <Box>

  
    {/* --- Métricas alineadas --- */}
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'stretch',
        mb: 3, // espacio antes del título del gráfico
      }}
    >
      
      <MetricDisplay
        title="Silhouette Score"
        value={clusteringResults.metrics?.silhouette_score?.toFixed(3) ?? 'N/A'}
        subtitle="un valor alto significa 
                  un mejor desempeño (máx. 1)"
        sx={{
          flex: 1,
          minWidth: 180,
          backgroundColor: 'success.light',
          borderRadius: 3,
          p: 2,
          boxShadow: 2,
          color: 'success.contrastText',
        }}
      />
      <MetricDisplay
        title="Davies-Bouldin"
        value={clusteringResults.metrics?.davies_bouldin_index?.toFixed(3) ?? 'N/A'}
        subtitle="Un valor bajo implica un mejor desempeño (ideal 0)"
        sx={{
          flex: 1,
          minWidth: 180,
          backgroundColor: 'warning.light',
          borderRadius: 3,
          p: 2,
          boxShadow: 2,
          color: 'warning.contrastText',
        }}
      />
      <MetricDisplay
        title="Calinski-Harabasz"
        value={Math.round(clusteringResults.metrics?.calinski_harabasz_index) ?? 'N/A'}
        subtitle="Un valor alto implica mejor separación entre clusters"
        sx={{
          flex: 1,
          minWidth: 180,
          backgroundColor: 'info.light',
          borderRadius: 3,
          p: 2,
          boxShadow: 2,
          color: 'info.contrastText',
        }}
      />
      <MetricDisplay
        title="Grupos Encontrados"
        value={clusteringResults.n_clusters}
        subtitle="Cantidad de clusters generados por el modelo"
        sx={{
          flex: 1,
          minWidth: 180,
          backgroundColor: 'primary.light',
          borderRadius: 3,
          p: 2,
          boxShadow: 2,
          color: 'primary.contrastText',
        }}
      />
    </Box>

     {/* --- 2. EL ACORDEÓN AHORA SOLO CONTIENE EL GRÁFICO --- */}
    <Accordion
      sx={{
         backgroundColor: 'primary.main', 
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 1,
        borderRadius: 2,
        "&:before": { display: "none" },
      }}
      // defaultExpanded // Puedes quitar esto si quieres que empiece cerrado
    >
      {/* a. El título (summary) */}
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
        aria-controls="scatter-plot-content"
        id="scatter-plot-header"
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Ver Gráfico de Dispersión
        </Typography>
      </AccordionSummary>

      {/* b. El contenido (details) */}
      <AccordionDetails sx={{ mt: 1 }}>
        <ClusterScatterPlot data={clusteringResults.results} />
      </AccordionDetails>
    </Accordion>
</Box>

)}

    </DialogContent>

</Dialog>
 <ClusteringHelpPopover
        open={isHelpPopoverOpen}
        anchorEl={helpPopoverAnchor}
        onClose={handleCloseHelpPopover}
    />
        </Box>

        </PaginaConAsistente>
    );
    
}