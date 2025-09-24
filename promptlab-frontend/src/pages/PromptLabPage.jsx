import React, { useState, useEffect, useCallback } from 'react'; 
import { useNavigate,useLocation, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext'; 
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import ImageIcon from '@mui/icons-material/Image'; 



// Importaciones de Componentes de Material-UI
import {
  Box,
  Alert,
  Button,
  Paper,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  DialogContentText,
} from '@mui/material';


import ScienceIcon from '@mui/icons-material/Science';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

import ContextColumn from '../components/promptlab/ContextColumn';
import InteractionColumn from '../components/promptlab/InteractionColumn';
import ConfigColumn from '../components/promptlab/ConfigColumn';


const drawerWidth = 240; 
const headerHeight = '72px';

function PromptLabPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { projectId, datasetId } = useParams();

    // --- ESTADOS DEL COMPONENTE (CON CORRECCIONES) ---
    const [isSaving, setIsSaving] = useState(false);
    const [context, setContext] = useState('');
    const [originalContext, setOriginalContext] = useState('');
    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('Eres un asistente de IA servicial y experto.');
    const [userPrompt, setUserPrompt] = useState('');
    const [result, setResult] = useState(null);
    const [isModelsLoading, setIsModelsLoading] = useState(true); 
    const [isDonating, setIsDonating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // --- Estados para el DIÁLOGO DE GUARDADO (estos SÍ se quedan) ---
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [saveTitle, setSaveTitle] = useState("");
    const [isSavingHistory, setIsSavingHistory] = useState(false);

    // --- Estado para el MODO LOTE (este SÍ se queda) ---
    const [isBatchMode, setIsBatchMode] = useState(false);

      // --- NUEVOS ESTADOS PARA LA GENERACIÓN DE IMÁGENES ---
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatedImage, setGeneratedImage] = useState(null); // Guardará { url, blob }
    const [imageGenerationError, setImageGenerationError] = useState(null);
    const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
    const [isSavingVisual, setIsSavingVisual] = useState(false);
    const { showNotification } = useNotification();
    const [isSavingAndNavigating, setIsSavingAndNavigating] = useState(false);
      // =========================================================
    // --- NUEVO MANEJADOR PARA GENERAR LA IMAGEN ---
    // =========================================================
    const handleGenerateImage = async () => {
        if (!userPrompt.trim()) return;

        setIsGeneratingImage(true);
        setGeneratedImage(null);
        setImageGenerationError(null);
        setIsImageDialogOpen(true); // Abrimos el diálogo para mostrar el progreso

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const accessToken = session.access_token;

            const url = `${import.meta.env.VITE_API_URL}/api/generate-image`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: userPrompt })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Fallo al generar la imagen.");
            }

            // La respuesta es un blob de imagen, no un JSON
            const imageBlob = await response.blob();
            const localUrl = URL.createObjectURL(imageBlob);
            
            setGeneratedImage({ url: localUrl, blob: imageBlob });

        } catch (error) {
            console.error("Error generando la imagen:", error);
            setImageGenerationError(error.message);
        } finally {
            setIsGeneratingImage(false);
        }
    };
    
    const handleCloseImageDialog = () => {
  if (generatedImage?.url) {
    URL.revokeObjectURL(generatedImage.url);
  }
  setIsImageDialogOpen(false);
};


     const handleSaveAndGoToStudio = async () => {
    // 1. Validación inicial - OK
    if (!generatedImage?.blob) {
        showNotification("No hay imagen para procesar.", "error");
        return;
    }
    
    // 2. Activar spinner - OK
    setIsSavingAndNavigating(true);
    
    try {
        // 3. Obtener sesión y preparar FormData - OK
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        const formData = new FormData();
        // ... (append está bien)

        // 4. Llamada a la API para guardar - OK
        const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        }); // <-- Aquí los paréntesis están correctos
        
        // 5. Manejo de la respuesta - OK
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "No se pudo guardar la imagen antes de editar.");
        }
        
        // 6. Notificación y obtención de datos - OK
        showNotification("¡Imagen guardada! Redirigiendo al estudio...", "success");
        const savedImageData = result.data; 

        // 7. Navegación con los datos correctos - OK
        navigate('/estudio-creativo', {
            state: {
                image: savedImageData 
            }
        });

    } catch (error) {
        // 8. Manejo de errores - OK
        console.error("Error en Guardar y Editar:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        // 9. Desactivar spinner - OK
        setIsSavingAndNavigating(false);
    }
}; 


    const handleSaveImageToGallery = async () => {
    if (!generatedImage?.blob) {
        console.error("No hay blob de imagen para guardar.");
        return;
    }

    setIsSavingVisual(true); // Para mostrar un spinner en el botón

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // 1. Crear un objeto FormData
        const formData = new FormData();

        // 2. Añadir el blob de la imagen. El 'image' debe coincidir con request.files['image'] en Flask
        formData.append('image', generatedImage.blob, 'generated-image.png');
        
        // 3. Añadir los metadatos como campos de texto
        formData.append('type', 'generada');
        formData.append('prompt', userPrompt);
        formData.append('project_id', projectId); 
        // formData.append('tags', JSON.stringify({})); // Puedes añadir otros campos si los tienes

        const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                // ¡IMPORTANTE! No pongas 'Content-Type'. El navegador lo hará automáticamente
                // por ti cuando usas FormData, incluyendo el 'boundary' correcto.
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "No se pudo guardar la imagen.");
        }

        
        // Aquí podrías mostrar una notificación de éxito
        
        setIsImageDialogOpen(false); // Cierra el diálogo después de guardar
        showNotification("¡Imagen guardada en tu galería!", "success");
        } catch (error) {
            showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsSavingVisual(false);
    }
};
    
   useEffect(() => {
    // Definimos las funciones de carga de datos primero.
    const fetchModels = async () => {
        setIsModelsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const accessToken = session.access_token;
            const url = `${import.meta.env.VITE_API_URL}/api/promptlab/text-models`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error("Error de red al cargar modelos.");
            const result = await response.json();
            
            if (result.success && result.models.length > 0) {
                setModels(result.models);
                // Si no estamos restaurando un modelo, ponemos el primero por defecto.
                if (!location.state?.modelName) {
                    setSelectedModel(result.models[0].id);
                }
            }
        } catch (error) {
            console.error("Error al cargar modelos:", error);
        } finally {
            setIsModelsLoading(false);
        }
    };

    const fetchContext = async () => {
        if (!datasetId) return; // No hacer nada si no hay datasetId
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const accessToken = session.access_token;
            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-dataset-content`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                 const contextText = result.textContent || ""; 
                 setContext(contextText);
                setOriginalContext(contextText);
            }
        } catch (error) {
            console.error("Fallo al cargar el contexto:", error);
        }
    };

    // --- LÓGICA PRINCIPAL ---

    // Primero, comprobamos si venimos de una navegación con estado.
    const hasStateToRestore = location.state?.selectedPrompt || location.state?.context || location.state?.systemPrompt;

    if (hasStateToRestore) {
        
        
        // Restauramos todos los datos que existan
        if (location.state.selectedPrompt) {
            setUserPrompt(location.state.selectedPrompt);
        }
        if (location.state.context) {
            setContext(location.state.context);
            setOriginalContext(location.state.context);
        }
        if (location.state.systemPrompt) {
            setSystemPrompt(location.state.systemPrompt);
        }
        if (location.state.modelName) {
            setSelectedModel(location.state.modelName);
        }

        // MUY IMPORTANTE: Limpiamos el estado DESPUÉS de haber leído todos los datos.
        navigate(location.pathname, { replace: true, state: {} });
        
        // Cargamos los modelos igualmente, por si el modelo guardado ya no existe.
        fetchModels();

    } else {
        // Si no hay estado que restaurar, cargamos todo de forma normal.
        fetchModels();
        fetchContext();
    }

}, [datasetId, location.state, navigate]); // Dependencias simplificadas```

    // --- Lógica derivada (¡Perfecta!) ---
    const hasChanges = context !== originalContext;

    // --- MANEJADORES DE EVENTOS (¡Perfectos!) ---
    const handleSaveContext = async () => {
        setIsSaving(true);
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) throw new Error(sessionError?.message || "Sesión no válida.");
            const accessToken = session.access_token;
            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ textContent: context })
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Error al guardar.");

            setOriginalContext(context); 
           

        } catch (error) {
            console.error("Error al guardar el contexto:", error);
        } finally {
            setIsSaving(false);
        }
    };

  const handleDonate = async (historyIdToDonate) => {
    if (!historyIdToDonate) {
        console.error("No hay ID de historial para donar.");
        return;
    }

    setIsDonating(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/promptlab/donate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ history_entry_id: historyIdToDonate })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error al donar.");

        
        // showNotification("¡Gracias por contribuir!", "success");
        
        // Opcional: Actualizar el estado 'result' para que el botón se deshabilite o cambie
        setResult(prev => ({ ...prev, donated: true }));

    } catch (error) {
        console.error("Error en la donación:", error);
        // showNotification(error.message, "error");
    } finally {
        setIsDonating(false);
    }
};
// --- MANEJADORES DE EVENTOS ---

   const handleExecutePrompt = async () => {
         if (!userPrompt.trim()) return;
       
         setIsLoading(true);
         setResult(null); // Limpiamos el resultado anterior
       
         try {
           // Obtenemos sesión de Supabase
           const { data: { session }, error: sessionError } = await supabase.auth.getSession();
           if (sessionError || !session) throw new Error("Sesión no válida.");
           const accessToken = session.access_token;
       
           if (isBatchMode) {
             // --- LÓGICA PARA MODO LOTE ---
             const promptsArray = userPrompt.split("\n").filter(p => p.trim() !== "");
             if (promptsArray.length === 0) {
               setIsLoading(false); // <- stop loading si no hay prompts
               return;
             }
       
             const url = `${import.meta.env.VITE_API_URL}/api/promptlab/execute-batch`;
             const bodyPayload = {
               model_name: selectedModel,
               system_prompt: systemPrompt,
               context: context,
               prompts: promptsArray,
               dataset_id: datasetId,
             };
                
             const response = await fetch(url, {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${accessToken}`,
                 "Content-Type": "application/json",
               },
               body: JSON.stringify(bodyPayload),
             });
              
             const responseData = await response.json();
             
             if (!response.ok) {
               throw new Error(responseData.error || `Error del servidor: ${response.status}`);
             }
              
             // --- 🚀 CAMBIO MÁGICO: navegar a página de resultados ---
             navigate("/promptlab/batch-results", {
               state: {
                 batchResults: responseData.data, // mandamos TODO el objeto
               },
             });
       
           } else {
             // --- LÓGICA PARA MODO INDIVIDUAL ---
             const url = `${import.meta.env.VITE_API_URL}/api/promptlab/execute`;
       
             const bodyPayload = {
               model_name: selectedModel,
               system_prompt: systemPrompt,
               context: context,
               prompt: userPrompt,
               dataset_id: datasetId,
             };
       
             const response = await fetch(url, {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${accessToken}`,
                 "Content-Type": "application/json",
               },
               body: JSON.stringify(bodyPayload),
             });
       
             const responseData = await response.json();
             if (!response.ok) {
               throw new Error(responseData.error || `Error del servidor: ${response.status}`);
             }
       
             
             setResult({ success: true, ...responseData.data });
           }
         } catch (error) {
           console.error("Error al ejecutar el prompt:", error);
           setResult({ success: false, error: error.message });
         } finally {
           setIsLoading(false);
         }
       };

   // CÓDIGO CORREGIDO Y MÁS ROBUSTO
  
  const handleSavePrompt = () => {
    // Deshabilitamos el guardado para el modo lote por ahora
    if (isBatchMode) {
        alert("La función de guardado solo está disponible en el modo individual.");
        return;
    }

    if (!result || !result.success) return;
    
    // Pre-rellenamos el título y abrimos el diálogo
    setSaveTitle(userPrompt.substring(0, 50)); 
    setIsSaveDialogOpen(true);
};

const handleConfirmSave = useCallback(async () => {
    if (!result || !result.success || !saveTitle.trim()) {
        console.error("No hay resultado o título para guardar.");
        return;
    }
    setIsSavingHistory(true);
    setIsSaveDialogOpen(false);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/promptlab/save-history`;

        const payload = {
            model_name: result.model_used,
            system_prompt: systemPrompt,
            context: context,
            user_prompt: userPrompt,
            ai_response: result.ai_response,
            titulo_personalizado: saveTitle,
            project_id: projectId, 
            dataset_id: datasetId
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || "Error al guardar.");

       
        setResult(prev => ({ ...prev, history_id: responseData.history_id, titulo_personalizado: saveTitle }));


    } catch (error) {
        console.error("Error al guardar el prompt:", error);
        // Opcional: mostrar una notificación de error al usuario
    } finally {
        setIsSavingHistory(false);
        setSaveTitle(""); // Limpiamos el título para la próxima vez
    }
}, [result, systemPrompt, context, userPrompt, saveTitle, projectId, datasetId]);

 
  return (
   <PaginaConAsistente nombreModulo="promptlab">
     <Box
        sx={{
          height: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          pt: 'calc(72px + 1px)', // Asumiendo que esto es para un header fijo
          background: "linear-gradient(135deg, #26717a, #44a1a0)",
          overflow: 'hidden' // Evita el scroll en la página completa
        }}
      >
        {/* --- Cabecera (se mantiene fija en la parte superior) --- */}
        <Paper
          elevation={1}
          sx={{
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 2,
            border: '2px solid #2196f3',
            mb: 2,
            flexShrink: 0 // Evita que la cabecera se encoja
          }}
        >
          <Typography variant="h5" fontWeight="bold" display="flex" alignItems="center">
            <ScienceIcon sx={{ mr: 1 }} /> Laboratorio de Prompts
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
              Volver
            </Button>
            <Button
              variant="contained"
              startIcon={<HistoryIcon />}
              onClick={() => navigate('/historial-prompts')}
            >
              Historial
            </Button>
          </Box>
        </Paper>


        <Grid
          container
          columns={12}
          spacing={3} // 'spacing' es más común que columnSpacing y rowSpacing por separado
          sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', // Permite el scroll vertical SOLO en esta área
            width: '100%' 
          }}
        >
      <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
        <ContextColumn
          context={context}
          setContext={setContext}
          onSave={handleSaveContext}
          isSaving={isSaving}
          hasChanges={hasChanges}
          onRestore={() => setContext(originalContext)}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', overflowY: 'auto', flexDirection: 'column', gap: 3 }}>
        <InteractionColumn
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          handleExecutePrompt={handleExecutePrompt}
          isLoading={isLoading || isModelsLoading} // <-- ¡LA SOLUCIÓN FINAL!
          result={result}
          onDonate={handleDonate}
          isDonating={isDonating}
          onSave={handleSavePrompt}
          isSaving={isSavingHistory}
          isBatchMode={isBatchMode}
          setIsBatchMode={setIsBatchMode}
          handleGenerateImage={handleGenerateImage}
          isGeneratingImage={isGeneratingImage}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <ConfigColumn
          models={models}
          selectedModel={selectedModel} // ✅ CORREGIDO
          setSelectedModel={setSelectedModel}
          systemPrompt={systemPrompt}
          setSystemPrompt={setSystemPrompt}
        />
      </Grid>
    </Grid>

    {/* --- Diálogo para Guardar con Título --- */}
    <Dialog open={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)}>
      <DialogTitle>Guardar en Historial</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
        Ingresa un título para identificar esta ejecución.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Título del Prompt"
          type="text"
          fullWidth
          variant="standard"
          value={saveTitle}
          onChange={(e) => setSaveTitle(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsSaveDialogOpen(false)}>Cancelar</Button>
         <Button 
        onClick={() => handleConfirmSave(itemToSave)} //sin argumento tener en cuenta por si no funciona
        variant="contained" 
        disabled={isSaving} // <-- Usa el estado correcto que ya tienes (isSavingHistory)
    >
      {isSaving ? 'Guardando...' : 'Guardar'}
    </Button>

      </DialogActions>
    </Dialog>
               {/* ================================================================ */}
                {/* --- DIÁLOGO FINAL Y COMPLETO PARA LA IMAGEN GENERADA --- */}
                {/* ================================================================ */}
                <Dialog 
                    open={isImageDialogOpen} 
                    // Usa la nueva función de cierre aquí
                    onClose={handleCloseImageDialog}
                    maxWidth="md"
                >
                    <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
                        <ImageIcon sx={{ mr: 1 }} />
                        Resultado de la Imagen
                    </DialogTitle>
                    <DialogContent>
                        <Box sx={{ minHeight: 400, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {isGeneratingImage && <CircularProgress size={60} />}
                            
                            {imageGenerationError && (
                                <Alert severity="error">{imageGenerationError}</Alert>
                            )}

                            {generatedImage && (
                                <Box 
                                    component="img"
                                    src={generatedImage.url}
                                    alt="Imagen generada por IA"
                                    sx={{ maxWidth: '100%', height: 'auto', borderRadius: 2 }}
                                />
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
                        {/* El botón de cerrar también usa la nueva función */}
                        <Button onClick={handleCloseImageDialog}>Cerrar</Button>
                        
                        {/* Esta lógica ya estaba perfecta */}
                          {generatedImage && (
            <Box sx={{ display: 'flex', gap: 1 }}>
                {/* Botón secundario: Solo guardar */}
                <Button 
                    variant="outlined" // Lo hacemos secundario
                    onClick={handleSaveImageToGallery}
                    disabled={isSavingVisual || isSavingAndNavigating}
                >
                    {isSavingVisual ? <CircularProgress size={24} /> : "Solo Guardar"}
                </Button>
                
                {/* Botón principal: Guardar Y Editar */}
                <Button 
                    variant="contained" 
                    onClick={handleSaveAndGoToStudio} // <-- Llama a la nueva función
                    disabled={isSavingVisual || isSavingAndNavigating}
                >
                    {isSavingAndNavigating ? <CircularProgress size={24} /> : "Guardar y Editar en Estudio"}
                </Button>
            </Box>
                        )}
                    </DialogActions>
                </Dialog>
            </Box>
        </PaginaConAsistente>
    );
}

export default PromptLabPage; 