import React, { useState, useEffect } from 'react'; 
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { PaginaConAsistente } from '../../layouts/PaginaConAsistente';
import { Box, Button, Typography, Grid, CircularProgress, Alert } from '@mui/material';

// --- Importamos nuestros 3 componentes de columna ---
import InteractivePdfViewer from './InteractivePdfViewer';
import ChatHistoryPanel from './ChatHistoryPanel';
import PdfControlPanel from './PdfControlPanel';

function PdfActionIa() {
    const navigate = useNavigate();
    const { datasetId } = useParams();

    // --- ESTADOS ---
    const [analysisData, setAnalysisData] = useState(null);
    const [context, setContext] = useState('');
    const [componentError, setComponentError] = useState(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // El estado de carga principal

    const [models, setModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('Eres un asistente de IA experto en analizar documentos. Responde de forma concisa y directa.');
    const [userPrompt, setUserPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Para la carga de prompts
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);

   

    useEffect(() => {
        const loadAllData = async () => {
            if (!datasetId) {
                setComponentError("No se ha proporcionado un ID de documento.");
                return;
            }
            setIsLoadingInitialData(true);
            setComponentError(null);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                const token = session.access_token;

                // --- TAREA 1: Cargar Modelos y el TEXTO para la IA (en paralelo para más velocidad) ---
                const modelsPromise = fetch(`${import.meta.env.VITE_API_URL}/api/promptlab/available-models`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json());
                const textContextPromise = fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-document-text-content`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json());

                // --- TAREA 2: Descargar el archivo PDF (necesario para el análisis visual) ---
                const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
                const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!fileResponse.ok) throw new Error(`Error al descargar PDF: ${fileResponse.status}`);
                const pdfBlob = await fileResponse.blob();
                
                // --- TAREA 3: Enviar el PDF para obtener los DATOS VISUALES ---
                const analyzeUrl = `${import.meta.env.VITE_API_URL}/api/pdf/extract-structured-data`;
                const formData = new FormData();
                formData.append('pdf_file', new File([pdfBlob], "document.pdf", { type: "application/pdf" }));
                const analysisPromise = fetch(analyzeUrl, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData }).then(res => res.json());

                // --- Esperamos a que TODAS las tareas terminen ---
                const [modelsResult, textContextResult, analysisResult] = await Promise.all([modelsPromise, textContextPromise, analysisPromise]);

                // --- PROCESAMOS LOS RESULTADOS ---
                // Modelos
                if (modelsResult.success && modelsResult.models.length > 0) {
                    const allowedModelNames = ['Google Gemini Pro'];
                    const filteredModels = modelsResult.models.filter(model => allowedModelNames.includes(model.name));
                    setModels(filteredModels);
                    if (filteredModels.length > 0) setSelectedModel(filteredModels[0].id);
                } else { throw new Error("No se pudieron cargar los modelos de IA."); }

                // Texto para la IA
                if (textContextResult.success && textContextResult.textContent) {
                    
                    setContext(textContextResult.textContent);
                } else { throw new Error("No se pudo cargar el contenido de texto del documento para la IA."); }

                // Datos para el visor
                if (analysisResult.success && analysisResult.pdf_analysis) {
                    
                    setAnalysisData(analysisResult.pdf_analysis);
                } else { throw new Error("No se pudo cargar el análisis visual del documento."); }

            } catch (err) {
                console.error("Error cargando los datos iniciales:", err);
                setComponentError(err.message);
            } finally {
                setIsLoadingInitialData(false);
            }
        };

        loadAllData();
    }, [datasetId]);



    
    const handleExecutePrompt = async () => {
        if (!userPrompt.trim()) return;

        const userMessage = { sender: 'user', type: 'text', text: userPrompt };
        setMessages(prev => [...prev, userMessage]);
        
        setIsLoading(true);
        const currentPrompt = userPrompt;
        setUserPrompt('');
       
        try {
            if (!context) {
                throw new Error("El contexto del documento está vacío. No se puede procesar la pregunta.");
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            
            const url = `${import.meta.env.VITE_API_URL}/api/promptlab/execute`;
            const bodyPayload = {
               model_name: selectedModel,
               system_prompt: systemPrompt,
               context: context,
               prompt: currentPrompt,
               dataset_id: datasetId,
            };
       
            const response = await fetch(url, {
               method: "POST",
               headers: { "Authorization": `Bearer ${session.access_token}`, "Content-Type": "application/json" },
               body: JSON.stringify(bodyPayload),
            });

            const responseData = await response.json();
            if (!response.ok) throw new Error(responseData.error || "Error del servidor.");
       
            const aiMessage = { sender: 'ai', type: 'text', text: responseData.data.ai_response };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error en handleExecutePrompt:", error);
            const errorMessage = { sender: 'ai', type: 'text', text: `Error: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
   
    
    const handleGenerateImage = async () => {
        if (!userPrompt.trim()) return;

        const userMessage = { sender: 'user', type: 'text', text: userPrompt };
        setMessages(prev => [...prev, userMessage]);
        
        setIsLoading(true);
        const currentPrompt = userPrompt; // Guardamos el prompt actual
        setUserPrompt('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/generate-image`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: currentPrompt }) // Usamos la variable guardada
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Fallo al generar la imagen.");
            }

            const imageBlob = await response.blob();
            const localUrl = URL.createObjectURL(imageBlob);

            const aiImageMessage = {
                sender: 'ai',
                type: 'image',
                url: localUrl,
                text: `Imagen basada en: "${currentPrompt.substring(0, 50)}..."`,
                blob: imageBlob // Guardamos el blob para una futura acción de "Guardar"
            };
            setMessages(prev => [...prev, aiImageMessage]);

        } catch (error) {
            const errorMessage = { sender: 'ai', type: 'text', text: `Lo siento, hubo un error al generar la imagen: ${error.message}` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

        // --- PANTALLAS DE CARGA Y ERROR ---
    if (isLoading) {
        return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /><Typography>Cargando Asistente de IA...</Typography></Box>;
    }
    if (componentError) {
        return <Box sx={{ p: 4 }}><Alert severity="error">{componentError}</Alert></Box>;
    }
    if (!analysisData) {
        // Esta pantalla no debería verse mucho, pero es una buena guarda de seguridad
        return <Box sx={{ p: 4 }}><Typography>Preparando documento...</Typography></Box>;
    }
    
    // Si el código llega hasta aquí, estamos 100% seguros de que analysisData.pages existe y tiene contenido.
     return (
  <PaginaConAsistente nombreModulo="pdf-ia">
    <Box sx={{ height: 'calc(100vh - 72px - 1px)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Contenedor principal como flex row */}
      <Box
        sx={{
          display: 'flex',
          flexGrow: 1,
          overflow: 'hidden',
          height: '100%',
          flexWrap: 'nowrap',
          gap: 3, // reemplaza spacing={3} de Grid
        }}
      >
        {/* PDF Viewer */}
         <Box sx={{ flex: 5, height: '100%' }}>
          <InteractivePdfViewer
            currentPage={analysisData.pages[selectedPageIndex]}
            totalPages={analysisData.pages.length}
            selectedPageIndex={selectedPageIndex}
            onPageChange={setSelectedPageIndex}
          />
        </Box>

        {/* Chat History Panel */}
          <Box sx={{ flex: 4, height: '100%' }}>
          <ChatHistoryPanel
            messages={messages}
            isLoading={
              isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1]?.sender === 'user'
            }
          />
        </Box>

        {/* PDF Control Panel */}
          <Box sx={{ flex: 3, height: '100%' }}>
          <PdfControlPanel
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            systemPrompt={systemPrompt}
            setSystemPrompt={setSystemPrompt}
            userPrompt={userPrompt}
            setUserPrompt={setUserPrompt}
            handleExecutePrompt={handleExecutePrompt}
            handleGenerateImage={handleGenerateImage}
             isLoading={isLoading || isLoadingInitialData}
          />
        </Box>
      </Box>
    </Box>
  </PaginaConAsistente>
);
}

export default PdfActionIa;