// En src/pages/VisionExplorerPage.jsx


import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import { 
    Box, Paper, List, ListItemButton, ListItemText, Typography, CircularProgress, 
    Alert, Chip, Divider, Tooltip, IconButton, TextField, Button, Grid, Accordion, AccordionSummary, AccordionDetails,
    Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow // <-- AÑADE ESTOS
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // 
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; 
import { FixedSizeGrid as GridVirt } from 'react-window'; // Usamos un alias para no confundir con Grid de MUI
import AutoSizer from 'react-virtualized-auto-sizer'; // Para que la grilla ocupe el espacio disponible
import InputAdornment from "@mui/material/InputAdornment";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { supabase } from '../supabaseClient'; 
import { useNotification } from '../context/NotificationContext';
import ConfusionMatrixChart from "../components/dashboard/ConfusionMatrixChart";
import ResultsModal from '../components/dashboard/ResultsModal'; 

const CELL_IMAGE_HEIGHT = 150; // La altura de la imagen
const CELL_PADDING = 8; // El padding en píxeles
const CELL_ROW_HEIGHT = CELL_IMAGE_HEIGHT + (CELL_PADDING * 2); // Altura total de la fila


const GridCell = ({ columnIndex, rowIndex, style, data }) => {
  // Sacamos los datos que pasamos a través de itemData
  const { items, selectedIds, toggleSelection, handleEnterDetailView, columnCount } = data;
  const index = rowIndex * columnCount + columnIndex;
  const img = items[index];

  if (!img) return null; // No renderiza celdas vacías al final

  // El 'style' que nos da react-window es para el posicionamiento y es crucial.
  // Añadimos un poco de padding interno.
  const cellStyle = {
    ...style,
     padding: `${CELL_PADDING}px`, 
  };

  return (
    <div style={cellStyle}>
      <Paper
        variant="outlined"
        sx={{
          height: '100%', // <-- Ocupa toda la altura de la celda
          border: selectedIds.has(img.image_id) ? '2px solid' : '1px solid',
          borderColor: selectedIds.has(img.image_id) ? 'primary.main' : 'divider',
          overflow: 'hidden',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex', // Para centrar la imagen si es necesario
          flexDirection: 'column'
        }}
        onClick={() => toggleSelection(img.image_id)}
        onDoubleClick={() => handleEnterDetailView(img)}
      >
        <Box
  component="img"
  src={img.signed_image_url}
  alt={img.nombre_archivo}
  sx={{
    width: '100%',
    height: CELL_IMAGE_HEIGHT,
    objectFit: 'contain', // 🔹 mantiene proporciones
    display: 'block',
    backgroundColor: '#f5f5f5' // 🔹 color de fondo para relleno (puedes cambiarlo)
  }}
/>
        <Typography
          variant="caption"
          sx={{
            p: 0.5,
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            color: 'white',
            textAlign: 'center'
          }}
        >
          {img.nombre_archivo}
        </Typography>
      </Paper>
    </div>
  );
};

function MetricDisplay({ title, value, subtitle }) {
  return (
    <Paper variant="outlined" sx={{ p: 1, textAlign: 'center', height: '100%' }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
        {title}
      </Typography>
      <Typography variant="h4" component="p" fontWeight="bold" sx={{ my: 1 }}>
        {value ?? '—'} 
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {subtitle}
      </Typography>
    </Paper>
  );
}



  
export default function VisionExplorerPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { showNotification } = useNotification();

    // --- ESTADOS DE LA PÁGINA (ORGANIZADOS) ---
    // Datos principales
    const [analysisData, setAnalysisData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estados de la UI
    const [viewMode, setViewMode] = useState('gallery');
    const [selectedImage, setSelectedImage] = useState(null); 
    const [selectedImageIds, setSelectedImageIds] = useState(new Set());
    
    // Estados para el modo Etiquetado Normal
    const [customTags, setCustomTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [bulkTag, setBulkTag] = useState("");
    
    // Estados para el modo Etiquetado por Grupos (Post-Clustering)
    const [groupedImages, setGroupedImages] = useState(null);
    const [activeGroupKey, setActiveGroupKey] = useState(null);
    const [searchParams] = useSearchParams();
    const clusterResultId = searchParams.get('clusterResultId');
    const [confirmedTagKey, setConfirmedTagKey] = useState(null);

    // Estados para el modo Entrenamiento
    const [isTaggingComplete, setTaggingComplete] = useState(false);
    const [isTrainingModalOpen, setTrainingModalOpen] = useState(false);
    const [trainingConfig, setTrainingConfig] = useState({ model_arch: 'resnet34', epochs: 5 });
    const [trainingState, setTrainingState] = useState({ step: 'config', results: null, error: null });
    const [modelDisplayName, setModelDisplayName] = useState('');
    const [groupTags, setGroupTags] = useState({});
    const [availableModels, setAvailableModels] = useState([]);
    const [datasetName, setDatasetName] = useState('');
    const [projectName, setProjectName] = useState(''); 
   
    useEffect(() => {
    const fetchAllPageData = async () => {
        if (!datasetId) return;

        setLoading(true);
        setError(null);
        setGroupedImages(null);
        setAnalysisData([]);
        setGroupTags({}); // Limpiamos etiquetas previamente

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const fetchOptions = { headers: { Authorization: `Bearer ${session.access_token}` } };

            // URLs de dataset y clustering
            const datasetUrl = `${import.meta.env.VITE_API_URL}/api/vision-lab/dataset/${datasetId}`;
            const clusterUrl = clusterResultId ? `${import.meta.env.VITE_API_URL}/api/models/clustering/${clusterResultId}` : null;

            const [datasetRes, clusterRes] = await Promise.all([
                fetch(datasetUrl, fetchOptions),
                clusterUrl ? fetch(clusterUrl, fetchOptions) : Promise.resolve(null)
            ]);

            if (!datasetRes.ok) throw new Error(`Error del servidor (imágenes): ${datasetRes.status}`);
            const datasetResult = await datasetRes.json();
                   if (!datasetResult.success) throw new Error(datasetResult.error || "Error en API de imágenes.");
                  setDatasetName(datasetResult.dataset_name || datasetId);

            let masterAnalysisList = datasetResult.analysisData || [];
            const imageList = datasetResult.imageData || [];
            const imageMap = new Map(imageList.map(img => [img.id, img.signed_url]));

            // --- DEPURACIÓN: Rutas de almacenamiento ---
         
           // masterAnalysisList.forEach(img => console.log(img.storage_path));

            let groups = null;
            if (clusterResultId && clusterRes && clusterRes.ok) {
                const clusterResultData = await clusterRes.json();
                if (clusterResultData.success && Array.isArray(clusterResultData.data?.results)) {

                    const path_to_cluster_map = new Map(
                        clusterResultData.data.results.map(item => [item.storage_path, item.cluster_id])
                    );

                    // Asignamos cluster_id a cada imagen del dataset
                    masterAnalysisList = masterAnalysisList.map(image => ({
                        ...image,
                        cluster_id: path_to_cluster_map.get(image.storage_path) ?? null
                    }));

                    // Generamos grupos
                    groups = clusterResultData.data.results.reduce((acc, item) => {
                        const key = item.cluster_id;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(item.storage_path);
                        return acc;
                    }, {});

                    setGroupedImages(groups);
                    const firstGroupKey = Object.keys(groups)[0];
                    if (firstGroupKey !== undefined) setActiveGroupKey(firstGroupKey);
                }
            }

            // --- ✅ HIDRATAR EL ESTADO DE ETIQUETAS POR GRUPO ---
            if (groups) {
                const initialGroupTags = {};
                for (const groupId in groups) {
                    const pathsInGroup = groups[groupId];
                    const firstImageInGroup = masterAnalysisList.find(img => img.storage_path === pathsInGroup[0]);

                    if (firstImageInGroup?.custom_tags?.length > 0) {
                        initialGroupTags[groupId] = firstImageInGroup.custom_tags[0];
                    }
                }
                setGroupTags(initialGroupTags);
            }

            // --- COMBINAMOS URLs firmadas ---
            const combinedData = masterAnalysisList.map(item => ({
                ...item,
                signed_image_url: imageMap.get(item.image_id) || null
            }));

            setAnalysisData(combinedData);

        } catch (err) {
            console.error("ERROR FINAL CAPTURADO:", err);
            setError(`Falló la comunicación con el servidor. (${err.message})`);
        } finally {
            setLoading(false);
        }
    };

    fetchAllPageData();
}, [datasetId, clusterResultId]);



useEffect(() => {
    let imageToLoad = null;

    // Modo galería con solo una imagen seleccionada
    if (viewMode === 'gallery' && selectedImageIds.size === 1) {
        const firstId = Array.from(selectedImageIds)[0];
        imageToLoad = analysisData.find(img => img.image_id === firstId);
    }
    // Modo detalle
    else if (viewMode === 'detail' && selectedImage) {
        imageToLoad = selectedImage;
    }

    // Solo actualizamos si es una imagen nueva
    if (imageToLoad && selectedImage?.image_id !== imageToLoad.image_id) {
        setSelectedImage(imageToLoad);
        fetchCustomTags(imageToLoad.image_id);
    } 
    // Si no hay imagen para mostrar, limpiar estados
    else if (!imageToLoad) {
        setSelectedImage(null);
        setCustomTags([]);
    }

}, [viewMode, selectedImageIds, analysisData, selectedImage]);


// Tu useEffect ya está bien
useEffect(() => {
  const fetchAvailableModels = async () => {
    try {
      const url = `${import.meta.env.VITE_API_URL}/api/vision/available-models`;
      const response = await fetch(url);
      const result = await response.json();

      if (result.success && Array.isArray(result.models)) {
        setAvailableModels(result.models);
      } else {
        setAvailableModels([]); // fallback seguro
      }
    } catch (error) {
      console.error("Error al cargar los modelos disponibles:", error);
      setAvailableModels([]); // fallback si hay error
    }
  };

  fetchAvailableModels();
}, []);

  // Helper para mostrar nombres amigables
const getModelDisplayName = (modelKey) => {
  const mapping = {
    "resnet18": "ResNet-18",
    "resnet50": "ResNet-50",
    "mobilenet_v2": "MobileNet V2",
    "efficientnet_b0": "EfficientNet B0",
    "efficientnet_b1": "EfficientNet B1",
    // agrega más según los que devuelva tu backend
  };

  return mapping[modelKey] || modelKey; // fallback: muestra el key crudo
};

   const areTagsReady = useMemo(() => {
        if (groupedImages) {
            // En modo clustering, si al menos un grupo tiene una etiqueta no vacía
            return Object.values(groupTags).some(tag => tag && tag.trim() !== '');
        }
        // En modo normal, si hay una etiqueta masiva y imágenes seleccionadas
        return bulkTag.trim() !== '' && selectedImageIds.size > 0;
    }, [groupTags, groupedImages, bulkTag, selectedImageIds]);


  const commonTags = useMemo(() => {
    // Usa .size en lugar de .length
    if (selectedImageIds.size === 0) return [];

    // Convierte el Set a un Array para poder usar .map()
    const ids = Array.from(selectedImageIds);

    const selectedObjects = ids
      .map(id => analysisData.find(img => img.image_id === id))
      .filter(Boolean);

    const tagCounts = {};
    selectedObjects.forEach(img => {
      img.tags_ia?.forEach(tag => {
        tagCounts[tag.descripcion] = (tagCounts[tag.descripcion] || 0) + 1;
      });
    });

    return Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([tag]) => tag);
}, [selectedImageIds, analysisData]);
  

    

    const displayedGalleryImages = useMemo(() => {
        if (groupedImages && activeGroupKey !== null) {
            const activeGroupPaths = new Set(groupedImages[activeGroupKey]);
            return analysisData.filter(img => img.storage_path && activeGroupPaths.has(img.storage_path));
        }
        return analysisData;
    }, [analysisData, groupedImages, activeGroupKey]);
     

     
    // --- 4. CONDICIONES DE RETORNO TEMPRANO (DESPUÉS DE TODOS LOS HOOKS) ---
    
    if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
    if (!loading && analysisData.length === 0) return <Alert severity="info" sx={{ m: 4 }}>No hay imágenes en este dataset.</Alert>;
    
    const handleApplyBulkTag = async (tagsToApply, imageIdsToTag) => {
        if (!tagsToApply || imageIdsToTag.length === 0) return;
        const tagName = tagsToApply.trim();
        try {
            const { data: { session } } = await supabase.auth.getSession();
            // Esta es una función genérica que puede ser llamada desde varios sitios
            for (const imageId of imageIdsToTag) {
                await fetch(`${import.meta.env.VITE_API_URL}/api/images/${imageId}/tags`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tagName })
                });
            }
            showNotification(`Etiqueta "${tagName}" aplicada a ${imageIdsToTag.length} imágenes.`, "success");
            return true;
        } catch (error) {
            showNotification(error.message, "error");
            return false;
        }
    };
    
   // --- LÓGICA DE SELECCIÓN MÚLTIPLE (CORREGIDA) ---
       const toggleSelection = (imageId) => {
       setSelectedImageIds(prevSet => {
           const newSet = new Set(prevSet); // Crea una copia para no mutar el estado
           if (newSet.has(imageId)) {
               newSet.delete(imageId); // Si ya existe, lo quita
           } else {
               newSet.add(imageId); // Si no existe, lo añade
           }
           return newSet;
       });
   };
   
    

    const handleApplyGroupTag = async () => {
        if (!groupTag.trim() || activeGroupKey === null) return;
        const groupPaths = groupedImages[activeGroupKey];
        const imageIdsInGroup = analysisData
            .filter(img => groupPaths.includes(img.storage_path))
            .map(img => img.image_id);
        
        const success = await handleApplyBulkTag(groupTag, imageIdsInGroup);
        if (success) {
            setGroupTag("");
            // Opcional: podrías "marcar" el grupo como etiquetado en la UI
        }
    };


  const fetchCustomTags = async (imageId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/images/${imageId}/tags`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await response.json();
      if (result.success) setCustomTags(result.tags || []);
    } catch (e) {
      showNotification("Error al cargar etiquetas manuales", "error");
    }
  };

  const handleAddTag = async (tagName) => {
    if (!tagName.trim() || !selectedImage?.image_id) return;
    if (customTags.includes(tagName)) {
      showNotification(`La etiqueta "${tagName}" ya existe.`, "info");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/images/${selectedImage.image_id}/tags`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tagName })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setCustomTags(prev => [...prev, tagName]);
      setNewTag('');
      showNotification("Etiqueta guardada", "success");
    } catch (e) {
      showNotification(`Error al guardar etiqueta: ${e.message}`, "error");
    }
  };

  const handleAddTagFromSuggestion = async (tagName) => {
    if (customTags.includes(tagName)) {
      showNotification(`La etiqueta "${tagName}" ya está añadida.`, "info");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/images/${selectedImage.image_id}/tags`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      setCustomTags(prev => [...prev, tagName]);
      showNotification("Etiqueta añadida desde sugerencia.", "success");
    } catch (e) {
      showNotification(`Error al guardar etiqueta: ${e.message}`, "error");
    }
  };
   
   
    const handleDeleteTag = async (tagToDelete) => {
    if (!selectedImage?.image_id) return; 

    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // La URL incluye el nombre de la etiqueta al final, como definiste en el backend
      const url = `${import.meta.env.VITE_API_URL}/api/images/${selectedImage.image_id}/tags/${encodeURIComponent(tagToDelete)}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${session.access_token}`
            }
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "Error desconocido del servidor");

        // Actualizar el estado local SOLO si la API tuvo éxito
        setCustomTags(prev => prev.filter(tag => tag !== tagToDelete));
        showNotification(`Etiqueta "${tagToDelete}" eliminada`, "success");

    } catch (e) {
        showNotification(`Error al eliminar la etiqueta: ${e.message}`, "error");
    }
};
   
 const handleSaveTags = async () => {
    // --- CASO 1: Etiquetado por Grupos (Clustering) ---
    if (groupedImages && clusterResultId && Object.keys(groupTags).length > 0) {
        
        showNotification("Guardando etiquetas de los grupos...", "info");
        
        // Ahora, este bloque tiene su propio try/catch para la llamada a la API
        try {
            const endpoint = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/bulk-tag-by-cluster`;
            const payload = {
                clusterResultId: clusterResultId,
                group_labels: groupTags
            };

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Error del servidor.");
            }

            showNotification(result.message || "Etiquetas guardadas. Actualizando...", "success");
            window.location.reload(); // Recargamos al tener éxito

        } catch (err) {
            showNotification(`Error al guardar etiquetas: ${err.message}`, "error");
        }

    // --- CASO 2: Etiquetado Masivo (Selección Múltiple) ---
    } else if (selectedImageIds.size > 0 && bulkTag.trim()) {
        
        // Este bloque ya era correcto y se queda igual.
        try {
            const idsToTag = Array.from(selectedImageIds);
            const success = await handleApplyBulkTag(bulkTag, idsToTag);

            if (success) {
                showNotification("Etiquetas aplicadas. Actualizando la vista...", "success");
                setBulkTag("");
                setSelectedImageIds(new Set());
                window.location.reload();
            }
        } catch (err) {
            showNotification(`Error en el etiquetado masivo: ${err.message}`, "error");
        }

    // --- CASO 3: No hay nada que guardar ---
    } else {
        showNotification("No hay etiquetas nuevas para guardar.", "info");
    }
};

    const handleStartTraining = async () => {
    setTrainingState({ step: 'loading', results: null, error: null });
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/train`;

        // --- ¡NUEVA LÓGICA PARA CONSTRUIR EL PAYLOAD! ---
        
        // 1. Creamos el payload base que siempre se envía.
        const payload = {
            training_config: trainingConfig
        };

        // 2. Si estamos en modo clustering (clusterResultId existe) Y hemos etiquetado al menos un grupo...
        if (clusterResultId && Object.keys(groupTags).length > 0) {
            
            // 3. ...añadimos la información extra que el backend ahora espera.
            payload.source_cluster_result_id = clusterResultId;
            payload.group_labels = groupTags;
        }

        // 4. Enviamos el payload (que será diferente dependiendo del modo).
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) // <-- Enviamos nuestro payload dinámico
        });
        
        const result = await response.json();
       
        if (!response.ok || !result.success) throw new Error(result.error);

        // ... El resto de tu función para manejar los resultados del modal sigue igual ...
        const defaultModelName = `Clasificador de ${result.training_results.confusion_matrix_labels.join(', ')}`;
        setModelDisplayName(defaultModelName);
        setTrainingState({ step: 'results', results: result.training_results, error: null });

    } catch(err) {
        setTrainingState({ step: 'error', results: null, error: `Error al entrenar: ${err.message}` });
    }
};

   const handleSaveModel = async () => {
    // 1, 2. Validación y extracción del ID (sin cambios)
    if (!modelDisplayName.trim()) { /* ... */ return; }
    const tempId = trainingState.results?.temp_training_id;
    if (!tempId) { /* ... */ return; }

    // 3. Crear el "objeto modelo fantasma" (sin cambios)
    const phantomModel = {
        id: tempId,
        isPhantom: true,
        modelName: modelDisplayName,
        projectName: projectName || "Proyecto Actual",
        problemType: "vision_classification",
        mainMetric: `${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`,
        createdAt: new Date().toISOString(),
        // ¡Importante! Añade el sourceDatasetId que necesitarás para navegar de vuelta
        sourceDatasetId: datasetId,
        projectId: projectId
    };

    // --- ¡CAMBIOS AQUÍ! ---

    // 4. Guardar el modelo fantasma en sessionStorage
    //    Lo convertimos a string porque sessionStorage solo guarda strings.
    sessionStorage.setItem('phantomModel', JSON.stringify(phantomModel));

    // 5. Notificar, cerrar y NAVEGAR (sin pasar estado)
    showNotification("¡Modelo listo para probar! Se guardará en segundo plano.", "success");
    handleCloseModal();
    navigate('/models'); // Navegamos a la página de modelos

    // 6. Preparar payload para el guardado real en backend
    const payload = {
        model_display_name: modelDisplayName,
        temp_training_id: tempId,
        training_results: {
            ...trainingState.results,
            artifacts_bytes: undefined,
            temp_training_id: undefined
        },
        source_dataset_id: datasetId,
        projectId: projectId 
    };

    // 7. Guardado real en segundo plano
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/save-model`;

        fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(async res => {
            const result = await res.json();
            if (!res.ok || !result.success) {
                console.warn("Error al guardar en backend:", result.error);
                showNotification("El guardado en servidor falló, pero tu modelo sigue disponible localmente.", "warning");
            }
        }).catch(err => {
            console.error("Fallo en el guardado de fondo:", err);
        });
    } catch (err) {
        console.error("Error preparando guardado real:", err);
    }
};


    // --- Resetear estado del modal al cerrarlo ---
    const handleCloseModal = () => {
        setTrainingModalOpen(false);
        // Pequeño delay para que el contenido no desaparezca bruscamente
        setTimeout(() => {
            setTrainingState({ step: 'config', results: null, error: null });
            setModelDisplayName('');
        }, 300);
    };

    
    const handleEnterDetailView = (imageObject) => {
    setSelectedImage(imageObject);
    setViewMode('detail');
    // Limpia la selección con un Set vacío, no un Array
    setSelectedImageIds(new Set()); 
};

    const handleReturnToGallery = () => {
    // 1. Limpia la imagen seleccionada
    setSelectedImage(null);

    // 2. Vuelve al modo galería
    setViewMode('gallery');
};

   const handleSelectAll = () => {
    const allImageIds = analysisData.map(img => img.image_id);
    setSelectedImageIds(new Set(allImageIds));
};


   const handleDeselectAll = () => {
    setSelectedImageIds(new Set());
};

    const handleCopyText = (text) => {
        navigator.clipboard.writeText(text);
        showNotification("Texto copiado al portapapeles", "success");
    };

   
    const renderRightPanel = () => {
    // --- VISTA PRIORITARIA: MODO DE ETIQUETADO POR GRUPOS ---
    if (groupedImages) {
        return (
            <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                <Typography variant="h6">Etiquetado por Grupos</Typography>
                <Typography variant="body2" color="text.secondary">
                    Selecciona un grupo para ver sus imágenes <br /> y aplicar una etiqueta a todo el lote.
                </Typography>
                <List sx={{ flexGrow: 1, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    {/* Corrección: Ordenamos los grupos numéricamente */}
                    {Object.entries(groupedImages).sort(([a], [b]) => parseInt(a) - parseInt(b)).map(([clusterId, images]) => (
                        <ListItemButton 
                            key={clusterId} 
                            selected={activeGroupKey === clusterId}
                            // Corrección: Usamos setActiveGroupKey
                            onClick={() => setActiveGroupKey(clusterId)}
                        >
                            <ListItemText 
                                primary={`Grupo ${parseInt(clusterId) + 1}`}
                                secondary={`${images.length} imágenes`}
                            />
                        </ListItemButton>
                    ))}
                </List>

                {/* Panel para aplicar la etiqueta al grupo activo */}
                {activeGroupKey !== null && (
                    <Box sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        <Typography fontWeight="bold" gutterBottom>Etiquetar Grupo {parseInt(activeGroupKey) + 1}</Typography>
                        <TextField
            fullWidth
            size="small"
            label="Etiqueta para este grupo"
            value={groupTags[activeGroupKey] || ""}
            
            // 👇 --- ¡ESTA ES LA LÍNEA QUE NECESITAS CORREGIR! ---
            onChange={(e) => {
                const newLabel = e.target.value;
                setGroupTags(prevTags => ({
                    ...prevTags,
                    [activeGroupKey]: newLabel
                }));
            }}
            InputProps={{
        endAdornment: (
            <InputAdornment position="end">
                {confirmedTagKey === activeGroupKey ? (
                    <CheckCircleIcon color="success" /> // Muestra check si está confirmada
                ) : (
                    <div style={{ width: '24px' }} /> // Espacio reservado para que no salte
                )}
            </InputAdornment>
        ),
    }}
/>
              </Box>
                )}
            </Paper>
        );
    }

    // --- VISTA NORMAL: SI NO HAY GRUPOS CARGADOS ---

    // CASO 1: No hay nada seleccionado
    if (viewMode === 'gallery' && selectedImageIds.size === 0) {
        return (
            <Paper sx={{ p: 1, height: '100%' }}>
                <Typography variant="h6">Panel de Acciones</Typography>
                <Typography variant="body2" color="text.secondary">
                    Selecciona una o más imágenes para etiquetarlas.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Haz doble clic en una imagen para verla en detalle.
                </Typography>
            </Paper>
        );
    }

    // CASO 2: Hay una o más imágenes seleccionadas
    if (viewMode === 'gallery' && selectedImageIds.size > 0) {
        // Sub-caso 2.1: Etiquetado masivo (más de 1 seleccionada)
        if (selectedImageIds.size > 1) {
            return (
                <Paper sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Typography variant="h6">{selectedImageIds.size} imágenes seleccionadas</Typography>
                    <Divider />
                    <Typography variant="subtitle2" fontWeight="bold">Etiquetas Comunes Sugeridas</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {commonTags.slice(0, 10).map((tag, idx) => (
                            <Chip key={idx} label={tag} onClick={() => setBulkTag(tag)} sx={{ cursor: 'pointer' }}/>
                        ))}
                    </Box>
                    <Divider sx={{ mt: 1 }}/>
                    <Typography variant="subtitle2" fontWeight="bold">Añadir Etiqueta a Todas</Typography>
                    <TextField
                        label="Etiqueta para el lote"
                        value={bulkTag}
                        onChange={e => setBulkTag(e.target.value)}
                        // Corrección: Le pasamos los argumentos a handleApplyBulkTag
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyBulkTag(bulkTag, Array.from(selectedImageIds))}
                        fullWidth
                        size="small"
                    />
                    <Button 
                        variant="contained" 
                        color="primary" 
                        // Corrección: Le pasamos los argumentos a handleApplyBulkTag
                        onClick={() => handleApplyBulkTag(bulkTag, Array.from(selectedImageIds))}
                    >
                        Aplicar a {selectedImageIds.size}
                    </Button>
                </Paper>
            );
        }
    }
    
      // ---- CASO 3: UNA SOLA IMAGEN SELECCIONADA o VISTA DE DETALLE ----
    let imageToShow = null;
    if (viewMode === 'detail') {
        imageToShow = selectedImage;
    } else if (selectedImageIds.size === 1) {
        const firstId = Array.from(selectedImageIds)[0];
        imageToShow = analysisData.find(img => img.image_id === firstId);
    }

    if (!imageToShow) return null; // Fallback de seguridad

    return (
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            <Typography variant="h6">Etiquetado Individual</Typography>
            <Typography variant="body2" color="text.secondary">{imageToShow.nombre_archivo}</Typography>
            <Divider />

            <Typography variant="subtitle2" fontWeight="bold">Etiquetas Sugeridas (IA)</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {imageToShow.tags_ia?.map((tag, idx) => (
                    <Chip
                        key={idx}
                        label={`${tag.descripcion} (${tag.score.toFixed(2)})`}
                        onClick={() => handleAddTagFromSuggestion(tag.descripcion)}
                        color={customTags.includes(tag.descripcion) ? "success" : "default"}
                        sx={{ cursor: 'pointer' }}
                        size="small"
                    />
                ))}
            </Box>

            <Divider sx={{ mt: 1 }}/>
            <Typography variant="subtitle2" fontWeight="bold">Etiquetas Manuales</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                    label="Nueva etiqueta..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag(newTag)}
                    fullWidth
                    size="small"
                />
                <IconButton color="primary" onClick={() => handleAddTag(newTag)}><AddCircleOutlineIcon /></IconButton>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {customTags.map(tag => (
                    <Chip key={tag} label={tag} onDelete={() => handleDeleteTag(tag)} color="primary" />
                ))}
            </Box>
        </Paper>
    );
   }

  const handleOpenModalAndTrain = () => {
       setTrainingModalOpen(true); // 1. Abre el modal
       handleStartTraining();      // 2. Inmediatamente empieza a entrenar
 };
   
 
  return (
  // 1. EL CONTENEDOR MÁS EXTERNO: Su única misión es definir el alto total y ser una columna flex.
      <Box
         sx={{
             height: '100vh',
             width: '100%',
             boxSizing: 'border-box',
             display: 'flex',
             flexDirection: 'column',
             gap: 2,
             p: 2,
             pt: 'calc(64px + 1px)',                // bordes redondeados
             boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera
     
         }}
     >
    
         <Box
     sx={{
    display: 'flex',
    justifyContent: 'space-between', // <-- Esto es lo que alinea todo
    alignItems: 'center',
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    borderRadius: 2,
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    mb: 2,
    color: '#ffffff',
    py: 1,
    px: 3,
    flexShrink: 0
  }}
>
  {/* ---- ESTA PARTE YA LA TIENES ---- */}
  <Box>
      <Typography variant="h5" fontWeight="bold">Laboratorio de Etiquetado y Entrenamiento</Typography>
      <Typography variant="body2" color="white">
  Dataset: {loading ? 'Cargando...' : datasetName}
</Typography>
  </Box>

  {/* ---- ¡ NUEVO BOTÓN! ---- */}
  <Button
    variant="contained"
    startIcon={<AutoAwesomeIcon />}
    sx={{
      backgroundColor: "#005f73",
      border: "2px solid #ffffff",
      color: "#ffffff",
      '&:hover': {
        backgroundColor: '#004c5d'
      }
    }}
      onClick={() => navigate(`/project/${projectId}/vision-lab/${datasetId}/clustering`)}
    
  >
    Agrupación Automática
  </Button>

  {viewMode === 'detail' && (
                <Button variant="contained"
      sx={{
              backgroundColor: " #005f73",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }} 
            onClick={handleReturnToGallery}>Volver a la Galería</Button>
            )}
     
</Box>
     
      

    {/* --- Contenedor Principal --- */}
      {/* 3. EL CONTENEDOR DE PANELES: Este es el que debe CRECER para llenar el espacio sobrante. */}
    <Box sx={{ 
      display: "flex", 
      gap: 3, 
      flexGrow: 1, // <-- ¡LA CLAVE ESTÁ AQUÍ!
      overflow: "hidden" // El overflow se maneja aquí
    }}
    
    >
    {/* === PANEL IZQUIERDO: Galería Virtualizada o Visor de Detalle === */}
     <Paper sx={{ flex: 3, p: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',border: '1px solid',          // grosor y tipo de borde
    borderColor: 'primary.main', borderRadius: 2,   }}> 

    {/* El contenedor de la galería ahora ocupa el espacio restante */}
    <Box sx={{ flexGrow: 1, width: '100%', height: '100%' }}>
      {viewMode === 'gallery' && (
        <AutoSizer>
          {({ height, width }) => {
            // La variable `displayedGalleryImages` se calcula arriba en el useMemo
            const columnCount = 4;
            const columnWidth = width / columnCount;
            const rowCount = Math.ceil(displayedGalleryImages.length / columnCount);

            return (
              <GridVirt
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={height}
                rowCount={rowCount}
                rowHeight={CELL_ROW_HEIGHT}
                width={width}
                itemData={{
                  // --- ¡CAMBIO CLAVE! ---
                toggleSelection: toggleSelection,

                                    items: displayedGalleryImages, 
                                    selectedIds: selectedImageIds,
                                    handleEnterDetailView: handleEnterDetailView,
                                    columnCount: columnCount
                }}
              >
                {GridCell}
              </GridVirt>
            );
          }}
        </AutoSizer>
      )}

      {viewMode === 'detail' && selectedImage && (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box
            component="img"
            src={selectedImage.signed_image_url}
            alt={selectedImage.nombre_archivo}
            sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
          />
        </Box>
      )}
    </Box>
</Paper>

     {/* === PANEL DERECHO: Flujo por Pasos (CORREGIDO) === */}
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2,border: '1px solid',  p:2,        // grosor y tipo de borde
    borderColor: 'primary.main',  borderRadius: 2,  }}>

    {/* --- PASO 1: ETIQUETADO --- */}
    {!isTaggingComplete ? (
        <>
            {/* Muestra el panel de acciones de etiquetado normal */}
            <Box>
                {renderRightPanel()}
            </Box>

            <Paper 
            sx={{ 
              p: 1, 
               mt: 'auto', 
               borderRadius: 2, 
               boxShadow: '0 2px 6px rgba(0,0,0,0.1)' 
                  }}
                 >
                   {/* Barra de herramientas de selección (esto ya lo tenías y está bien) */}
                  {viewMode === 'gallery' && (
         <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleSelectAll}
            >
                Seleccionar Todo
            </Button>
            <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleDeselectAll}
            >
                Deseleccionar Todo
            </Button>
        </Box>
    )}

    {/* --- Los DOS ÚNICOS botones de acción que necesitas --- */}
    <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
            variant="outlined"
            color="primary"
            fullWidth
            onClick={handleSaveTags} // Llama a la función que solo guarda
            // Se habilita/deshabilita automáticamente gracias a tu lógica en areTagsReady
            disabled={!areTagsReady}
        >
            Guardar Etiquetas
        </Button>

        <Button
            variant="contained"
            color="secondary"
            fullWidth
            // Solo cambia la vista al panel de entrenamiento
            onClick={() => {
                if (!areTagsReady) {
                    showNotification("Por favor, aplica al menos una etiqueta antes de continuar.", "info");
                    return;
                }
                setTaggingComplete(true);
            }}
        >
            Entrenamiento
        </Button>
    </Box>
    
</Paper>

        </>
    ) : (

        /* --- PASO 2: ENTRENAMIENTO --- */
        <>
            {/* Botón para volver al paso anterior */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Panel de Entrenamiento</Typography>
                <Button
                    size="small"
                    onClick={() => setTaggingComplete(false)}
                >
                    Editar Etiquetas
                </Button>
            </Box>

            {/* El panel de entrenamiento ahora ocupa todo el espacio */}
            <Paper sx={{ flex: 1, p: 3, overflowY: "auto", minHeight: 0 }} elevation={3}>
                <Paper variant="outlined" sx={{ p: 2, mb: 3, textAlign: "center" }}>
                    <Typography>Imágenes a Entrenar: {analysisData.length}</Typography>
                </Paper>

                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>1. Configurar Modelo</Typography>
               
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Arquitectura</InputLabel>
                  <Select
                     value={trainingConfig.model_arch}
                     label="Arquitectura"
                     onChange={(e) => setTrainingConfig(prev => ({ ...prev, model_arch: e.target.value }))}
                  >
                    {availableModels.map((modelKey) => (
                      <MenuItem key={modelKey} value={modelKey}>
                      {/* Puedes tener un pequeño helper para darle nombres amigables */}
                     {getModelDisplayName(modelKey)}
                      </MenuItem>
                   ))}
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  type="number"
                  label="Épocas de Entrenamiento"
                  value={trainingConfig.epochs}
                  onChange={(e) => setTrainingConfig(prev => ({ ...prev, epochs: parseInt(e.target.value) || 1 }))}
                  sx={{ mb: 3 }}
                />

                <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>2. Iniciar Experimento</Typography>
                <Button
                  variant="contained"
                  color="secondary"
                  size="large"
                  fullWidth
                  startIcon={<AutoAwesomeIcon />}
                  onClick={handleOpenModalAndTrain}
                >
                  Entrenar 
                </Button>
            </Paper>
        </>
    )}
</Box>
    </Box> {/* <-- cierra contenedor principal */}

    {/* === DIALOGO DE ENTRENAMIENTO === */}
    <Dialog open={isTrainingModalOpen} onClose={handleCloseModal} fullWidth maxWidth="md">
      <DialogTitle fontWeight="bold">
        {trainingState.step === "results" ? "¡Entrenamiento Completado!" : "Laboratorio de Entrenamiento"}
      </DialogTitle>

      <DialogContent>
        {trainingState.step === "loading" && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", p: 4, gap: 2 }}>
            <CircularProgress size={60} />
            <Typography>
              {trainingState.results ? "Guardando modelo..." : "Entrenando modelo,  puede tardar varios minutos..."}
            </Typography>
          </Box>
        )}

        {trainingState.step === "error" && (
          <Alert severity="error" sx={{ my: 2 }}>{trainingState.error}</Alert>
        )}


        {trainingState.step === "results" && trainingState.results && (
  <Box>
    {/* --- SECCIÓN 1: Métricas Principales --- */}
     <Grid container spacing={2} sx={{ mb: 2 }}>
      <Grid size={{ xs: 12,  md: 6 }}>
        
        <MetricDisplay 
          title="Precisión General (Accuracy)"
          value={`${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`}
          subtitle="Porcentaje de imágenes clasificadas correctamente en el set de prueba."
        />
      </Grid>
      <Grid size={{ xs: 12,  md: 6 }}>
        {/* Este espacio puede quedar libre o puedes añadir otra métrica principal si la tienes */}
      </Grid>
    </Grid>

    {/* === ACORDEÓN 1: Rendimiento por Categoría === */}
<Accordion
  sx={{
    backgroundColor: "#d5e3f5ff",
    boxShadow: 2,
    borderRadius: 2,
    mb: 2,
    "&:before": { display: "none" }
  }}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "primary.main" }} />}>
    <Typography variant="subtitle1" fontWeight={700} color="text.primary">
      Rendimiento por Categoría
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    {/* Tabla de métricas */}
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            
            <TableCell sx={{ fontWeight: "bold" }}>Categoría</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>Precisión</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>Recall</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>F1-Score</TableCell>
            <TableCell align="right" sx={{ fontWeight: "bold" }}>Nº Imágenes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
  {Object.keys(trainingState.results.classification_report)
    .filter(key => !['accuracy', 'macro avg', 'weighted avg'].includes(key))
    .map(label => {
      const metrics = trainingState.results.classification_report[label];
      return (
        <TableRow key={label}>
          <TableCell>{label}</TableCell>
          <TableCell align="right">{(metrics.precision * 100).toFixed(1)}%</TableCell>
          <TableCell align="right">{(metrics.recall * 100).toFixed(1)}%</TableCell>
          <TableCell align="right">{(metrics["f1-score"] * 100).toFixed(1)}%</TableCell>
          <TableCell align="right">{metrics.support}</TableCell>
        </TableRow>
      );
    })}

  {/* Promedio Ponderado */}
  <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
    <TableCell component="th" scope="row" sx={{ fontWeight: "bold" }}>
      Promedio Ponderado
    </TableCell>
    <TableCell align="right" sx={{ fontWeight: "bold" }}>
      {(trainingState.results.classification_report["weighted avg"].precision * 100).toFixed(1)}%
    </TableCell>
    <TableCell align="right" sx={{ fontWeight: "bold" }}>
      {(trainingState.results.classification_report["weighted avg"].recall * 100).toFixed(1)}%
    </TableCell>
    <TableCell align="right" sx={{ fontWeight: "bold" }}>
      {(trainingState.results.classification_report["weighted avg"]["f1-score"] * 100).toFixed(1)}%
    </TableCell>
    <TableCell align="right" sx={{ fontWeight: "bold" }}>
      {trainingState.results.classification_report["weighted avg"].support}
    </TableCell>
  </TableRow>
</TableBody>

      </Table>
    </TableContainer>
  </AccordionDetails>
</Accordion>


{/* === ACORDEÓN 2: Matriz de Confusión === */}
<Accordion
  sx={{
    backgroundColor: "#d5e3f5ff",
    boxShadow: 2,
    borderRadius: 2,
    mb: 2,
    "&:before": { display: "none" }
  }}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle1" fontWeight={700}>
      Ver Matriz de Confusión
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Box sx={{ height: "100%", minHeight: "250px" }}>
      <ConfusionMatrixChart
        data={trainingState.results.confusion_matrix}
        labels={trainingState.results.confusion_matrix_labels}
      />
    </Box>
  </AccordionDetails>
</Accordion>


{/* === ACORDEÓN 3: Guardar Modelo === */}
<Accordion
  sx={{
    backgroundColor: "#d5e3f5ff",
    boxShadow: 2,
    borderRadius: 2,
    mb: 2,
    "&:before": { display: "none" }
  }}
>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography variant="subtitle1" fontWeight={700}>
      Guardar Modelo
    </Typography>
  </AccordionSummary>
  <AccordionDetails>
    <Typography sx={{ mb: 2 }}>
      Selecciona un nombre para identificar al modelo antes de guardarlo.
    </Typography>
    <TextField
      fullWidth
      label="Nombre para tu Modelo"
      value={modelDisplayName}
      onChange={(e) => setModelDisplayName(e.target.value)}
      helperText="Ejemplo: Clasificador de Camisas v1"
      variant="outlined"
    />
  </AccordionDetails>
</Accordion>

  </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: "0 24px 16px" }}>
        <Button onClick={handleCloseModal}>
          {trainingState.step === "results" ? "Descartar" : "Cancelar"}
        </Button>

        {trainingState.step === "config" && (
          <Button variant="contained" onClick={handleStartTraining}>Iniciar Entrenamiento</Button>
        )}

        {trainingState.step === "results" && (
          <Button
            variant="contained"
            color="success"
            onClick={handleSaveModel}
            disabled={!modelDisplayName.trim() || trainingState.step === 'loading'}
          >
            {trainingState.step === 'loading' && trainingState.results ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Guardar Modelo"
            )}
          </Button>
        )}

        {trainingState.step === "error" && (
          <Button variant="contained" onClick={handleStartTraining}>Reintentar</Button>
        )}
      </DialogActions>
    </Dialog>
  </Box>
);
}