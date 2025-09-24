// src/pages/DocumentEditor.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useLocation,  useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  CircularProgress,
  Alert,
  TextField,
  Button,
  Typography, ToggleButton,
  ToggleButtonGroup,Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import { v4 as uuidv4 } from 'uuid'; // SUGERENCIA: Asegúrate de tener esta importación
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import TextActionsCard from '../components/dashboard/TextActionsCard';
import AnalysisResultModal from '../components/AnalysisResultModal';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article'; // Para la vista simple
import ViewStreamIcon from '@mui/icons-material/ViewStream'; // Para la vista por secciones
import SectionsEditor from '../components/dashboard/SectionsEditor'; // <-- AÑADE ESTA LÍNEA
import TextModificationModal from '../components/dashboard/TextModificationModal.jsx';
import SectionsEditorImage from '../components/dashboard/SectionsEditorImage.jsx';
import DocumentControlPanel from  '../components/dashboard/DocumentControlPanel';

export default function DocumentEditor() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const location = useLocation(); // <-- 1. Usamos el hook

    // --- ESTADOS ---
    const [loadState, setLoadState] = useState({ loading: true, error: null });
    const [datasetType, setDatasetType] = useState(location.state?.datasetType);
     const [editorMode, setEditorMode] = useState('text'); // 'text' o 'image'
    const [textContent, setTextContent] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    // --- NUEVO: Estados para Buscar y Reemplazar ---
    const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
    const [findTerm, setFindTerm] = useState('');
    const [replaceTerm, setReplaceTerm] = useState('');
    const [findMatches, setFindMatches] = useState([]); // Almacenará los índices de inicio de las coincidencias
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1); // Índice en findMatches
    const [viewMode, setViewMode] = useState('simple'); // Puede ser 'simple' o 'sections'
    const [documentSections, setDocumentSections] = useState([]); // Array de objetos, ej: [{ id: '1', content: 'Párrafo 1' }]
    const [modificationModalState, setModificationModalState] = useState({ open: false, data: null, title: '' });
    const [analysisModalState, setAnalysisModalState] = useState({ open: false, data: null, title: '' });
    const returnPath = location.state?.from || `/project/${projectId}`;
    const [activeSectionId, setActiveSectionId] = useState(null);
    const [userImages, setUserImages] = useState([]); 
    const [originalDocumentSections, setOriginalDocumentSections] = useState([]);
      
    
    // --- ESTADOS DE IA QUE PASAREMOS AL PANEL DE CONTROL (puedes conectarlos a los tuyos) ---
    const [models, setModels] = useState([]); // Deberías llenarlo desde tu API
    const [selectedModel, setSelectedModel] = useState('');
    const [systemPrompt, setSystemPrompt] = useState('');
    const [userPrompt, setUserPrompt] = useState('');

    const hasChanges = viewMode === 'simple'
      ? textContent !== originalText
      : JSON.stringify(documentSections) !== JSON.stringify(originalDocumentSections);

    const [textStats, setTextStats] = useState({
        chars: 0,
        words: 0,
        tokens: 0,
    });

  useEffect(() => {
      // Definimos la función de carga dentro del efecto
      const loadContent = async () => {
          setLoadState({ loading: true, error: null });
  
          // --- ¡LA LÓGICA HÍBRIDA EMPIEZA AQUÍ! ---
          const incomingText = location.state?.initialTextContent;
          const incomingType = location.state?.datasetType; // <-- ¡Leemos el tipo!
  
          if (incomingText !== undefined && incomingText !== null) {
              // CASO 1: ¡Recibimos texto de una columna!
              // Lo usamos y saltamos la llamada a la API.
              
              
              setTextContent(incomingText);
              setOriginalText(incomingText); // Importante para la lógica de "hay cambios"
              setDatasetType(incomingType);
              const initialSections = splitTextIntoSections(result.textContent);
              setDocumentSections(initialSections);
              setOriginalDocumentSections(initialSections); // Guardamos el estado original
              setLoadState({ loading: false, error: null });
  
              // Limpiamos el estado de la navegación para que el texto no reaparezca
              // si el usuario actualiza la página o navega hacia atrás y adelante.
              window.history.replaceState({}, document.title);
  
          } else {
              // CASO 2: No recibimos texto.
              // Ejecutamos la lógica original de la página para cargar el documento completo.
              
              try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Sesión no válida.");
  
                  const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-document-text-content`;
                  const response = await fetch(url, {
                      headers: { 'Authorization': `Bearer ${session.access_token}` }
                  });
  
                  const result = await response.json();
                  if (!result.success) throw new Error(result.error || `Error del servidor: ${response.status}`);
  
                  setTextContent(result.textContent);
                  setOriginalText(result.textContent);
                  setLoadState({ loading: false, error: null });
                  setDatasetType(result.datasetType); // El backend ya nos lo da aquí
  
              } catch (err) {
                  setLoadState({ loading: false, error: err.message });
              }
          }
      };
  
      if (datasetId) {
          loadContent();
      }
  }, [datasetId, location.state]);
  

   useEffect(() => {
    const calculateStats = () => {
      const chars = textContent.length;
      // Filtramos elementos vacíos que resultan de múltiples espacios
      const words = textContent.split(/\s+/).filter(Boolean).length;
      // Una aproximación simple y efectiva para tokens
      const tokens = Math.round(chars / 3.5); 
      
      // Si el texto está vacío, reseteamos las palabras a 0
      if (textContent.trim() === '') {
        setTextStats({ chars, words: 0, tokens });
      } else {
        setTextStats({ chars, words, tokens });
      }
    };
    
    calculateStats();
  }, [textContent]); // Se ejecuta cada vez que 'textContent' cambia

   useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        // Usamos la función toggle para asegurar que el estado se limpie al cerrar
        toggleFindReplaceBar(); 
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []); // El array de dependencias puede estar vacío, ya que toggleFindReplaceBar no cambia.

  // --- NUEVO: Efecto para enfocar el input de búsqueda al abrir ---
    useEffect(() => {
      if (isFindReplaceOpen && findTermRef.current) {
        findTermRef.current.focus();
    }
  }, [isFindReplaceOpen]);

  
   useEffect(() => {
    const loadUserImages = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // --- CORRECCIÓN 1: Usamos la URL correcta de tu API ---
            // Le añadimos per_page=100 para traer bastantes imágenes de una vez.
            const url = `${import.meta.env.VITE_API_URL}/api/visuals?per_page=100`; 

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            const result = await response.json();

            // --- CORRECCIÓN 2: Leemos el array desde result.visuals y adaptamos los nombres de campo ---
            if (result.success && Array.isArray(result.visuals)) {
                // Mapeamos el resultado para que coincida con lo que el frontend espera (id, url)
                const formattedImages = result.visuals.map(visual => ({
                    id: visual.id,
                    url: visual.public_url // Tu API lo llama public_url, lo usamos.
                }));
                setUserImages(formattedImages);
            } else {
                console.error("La respuesta de la API de galería no tiene el formato esperado.");
            }
        } catch (error) {
            console.error("Error al cargar la galería de imágenes:", error);
            showNotification("No se pudo cargar tu galería de imágenes.", "error");
        }
    };

    loadUserImages();
}, []); // El array vacío asegura que esto solo se ejecute una vez, cuando el componente se monta.

    const handleSectionMove = (sectionId, direction) => {
  setDocumentSections(prevSections => {
    const index = prevSections.findIndex(s => s.id === sectionId);

    // Si la sección no se encuentra, o si se intenta mover más allá de los límites, no hacer nada.
    if (index === -1) return prevSections;
    if (direction === 'up' && index === 0) return prevSections;
    if (direction === 'down' && index === prevSections.length - 1) return prevSections;

    const newSections = [...prevSections];
    const sectionToMove = newSections[index];

    // Elimina el elemento de su posición original
    newSections.splice(index, 1);

    // Inserta el elemento en la nueva posición
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    newSections.splice(newIndex, 0, sectionToMove);

    return newSections;
  });
  showNotification("Sección movida.", "info");
};

    const handleGoBack = () => {
        // Leemos la dirección de retorno que nos envió la página anterior.
        const returnPath = location.state?.from;

        if (returnPath) {
            // Si hay una dirección, la usamos.
            navigate(returnPath);
        } else {
            // Si no (por ejemplo, si el usuario refrescó la página),
            // lo llevamos a la página principal del proyecto como respaldo.
            navigate(`/project/${projectId}`);
        }
    };

   const handleSectionAddAtStart = () => {
    // Creamos la misma sección de texto vacía que antes
    const newSection = {
        id: uuidv4(),
        type: 'text',
        content: ''
    };

    // Usamos la sintaxis de "spread" para añadir el nuevo elemento al inicio del array
    setDocumentSections(prevSections => [newSection, ...prevSections]);

    showNotification("Nueva sección añadida al principio.", "success");
};

   const handleImageSelect = (imageUrl) => {
    const newImageSection = {
        id: uuidv4(),
        type: 'image',
        content: {
            src: imageUrl,
            alt: 'Nueva imagen',
            size: 100,
            align: 'center',
        }
    };

    if (viewMode !== 'sections') {
        setViewMode('sections');
    }

    setDocumentSections(prevSections => {
        const activeIndex = prevSections.findIndex(section => section.id === activeSectionId);

        // Si hay una sección activa...
        if (activeIndex !== -1) {
            const activeSection = prevSections[activeIndex];

            // ¡LÓGICA MEJORADA! Si la sección activa es un texto vacío, la reemplazamos.
            if (activeSection.type === 'text' && activeSection.content.trim() === '') {
                const newSections = [...prevSections];
                newSections[activeIndex] = newImageSection; // Reemplaza el elemento
                return newSections;
            } else {
                // Si no, la insertamos después (comportamiento original)
                const newSections = [...prevSections];
                newSections.splice(activeIndex + 1, 0, newImageSection);
                return newSections;
            }
        } else {
            // Si no hay ninguna activa, la añadimos al final
            return [...prevSections, newImageSection];
        }
    });
    
    showNotification("Imagen añadida al documento.", "success");
};

    
    const handleSectionAdd = (targetId) => {
    // Creamos una nueva sección de texto vacía. Es el punto de partida más flexible.
    const newSection = {
        id: uuidv4(), // Necesitas tener uuid instalado y importado
        type: 'text',
        content: ''
    };

    setDocumentSections(prevSections => {
        // Buscamos el índice de la sección donde se hizo clic
        const targetIndex = prevSections.findIndex(section => section.id === targetId);

        // Si no encontramos la sección (esto no debería pasar, pero es una buena práctica)
        if (targetIndex === -1) {
            return [...prevSections, newSection]; // La añadimos al final
        }

        // Creamos una copia del array para no mutar el estado directamente
        const newSections = [...prevSections];
        
        // Usamos splice para insertar la nueva sección justo después de la seleccionada
        newSections.splice(targetIndex + 1, 0, newSection);
        
        return newSections;
    });

    showNotification("Nueva sección añadida.", "success");
};



    const handleGenerateImage = async () => {
    if (!userPrompt.trim()) {
        showNotification("Por favor, describe la imagen que quieres crear.", "warning");
        return;
    }
    setIsLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // --- CORRECCIÓN: Llamamos al NUEVO endpoint ---
        const url = `${import.meta.env.VITE_API_URL}/api/generate-save-image`; // <-- La nueva URL

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ prompt: userPrompt })
        });

        const result = await response.json();

        // --- CORRECCIÓN: Leemos la URL desde result.imageUrl ---
        if (!result.success || !result.imageUrl) {
            throw new Error(result.error || "La IA no pudo generar la imagen.");
        }

        handleImageSelect(result.imageUrl);
        setUserPrompt('');
    } catch (error) {
        console.error("Error al generar imagen:", error);
        showNotification(error.message, "error");
    } finally {
        setIsLoading(false);
    }
};


  const handleTextSelection = () => {
    if (typeof window === 'undefined') return;
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    } else {
      setSelectedText('');
    }
  };

   
const handleLegacyAnalysis = async (action, text, options = {}) => {
    if (!text || !text.trim()) {
        showNotification("El texto no puede estar vacío.", "warning");
        return;
    }

    setIsLoading(true);
    setAnalysisModalState({ open: false, data: null, title: '' });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sesión no válida.");

        const endpointMap = {
            summary: '/api/analysis/summary', sentiment: '/api/analysis/sentiment',
            entities: '/api/analysis/entities', topics: '/api/analysis/topics',
            statistics: '/api/analysis/statistics', clauses: '/api/analysis/clauses',
            legal: '/api/analysis/profile/legal', marketing: '/api/analysis/profile/marketing',
            writing: '/api/analysis/profile/writing'
        };
        const endpointUrl = endpointMap[action] || action;
        const resultTitle = options.profileLabel || `Resultado de ${action}`;

        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpointUrl}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify({ text })
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Error del servidor.');
        
        // --- ¡EL CAMBIO CLAVE ESTÁ AQUÍ! ---
        // Simplemente pasamos la respuesta completa del backend al modal.
        // El modal es lo suficientemente inteligente para saber qué hacer con ella.
        setAnalysisModalState({
            open: true,
            title: resultTitle,
            data: responseData // <-- ¡YA NO MANIPULAMOS LA RESPUESTA!
        });

    } catch (error) {
        console.error("Error en handleLegacyAnalysis:", error);
        showNotification(error.message || 'Error inesperado en el análisis', "error");
    } finally {
        setIsLoading(false);
    }
};

// --- FUNCIÓN 2: Para la traducción ---
 

const handleTranslate = async (text) => { // <-- 1. Ya no necesita el parámetro 'direction'
    if (!text || !text.trim()) {
        showNotification("El texto para traducir no puede estar vacío.", "warning");
        return;
    }

    setIsLoading(true);
    setModificationModalState({ open: false, data: null, title: '' });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sesión no válida.");
        
        // --- INICIO DE LA RESTAURACIÓN ---

        // 2. La URL vuelve a ser la original y específica
        const url = `${import.meta.env.VITE_API_URL}/api/translate/es-en`;

        // 3. El cuerpo de la petición vuelve a ser el original y simple
        const body = JSON.stringify({
            texto: text // La clave vuelve a ser 'texto'
        });
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: body
        });
        
        // --- FIN DE LA RESTAURACIÓN ---

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Error del servidor de traducción.');

        const resultText = responseData.translation || "No se recibió una traducción válida.";

        // El resto de la función para mostrar el modal no cambia.
        setModificationModalState({
            open: true,
            title: 'Resultado de la Traducción',
            data: { action: 'translate', originalText: text, data: { ai_response: resultText } }
        });

    } catch (error) {
        console.error("Error en handleTranslate:", error);
        showNotification(error.message || 'Error inesperado al traducir', "error");
    } finally {
        setIsLoading(false);
    }
};

// --- FUNCIÓN 3: Para las nuevas recetas de IA ---
    const handleAiRecipe = async (action, text, options = {}) => {
    if (!text || !text.trim()) {
        showNotification("El texto no puede estar vacío.", "warning");
        return;
    }

    setIsLoading(true);
    setModificationModalState({ open: false, data: null, title: '' });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Sesión no válida.");
        
        // Esta parte de tu código está perfecta, la dejamos tal cual
        const titleMap = {
            simplify: 'Sugerencia de Simplificación', correct_grammar: 'Sugerencia de Corrección',
            generate_title: 'Sugerencia de Título', extract_keywords: 'Palabras Clave Extraídas',
        };
        let resultTitle = titleMap[action] || `Sugerencia para ${action}`;
        if (action === 'change_tone') {
             const displayTone = options.tone || 'desconocido';
             resultTitle = `Sugerencia de Tono (${displayTone.charAt(0).toUpperCase() + displayTone.slice(1)})`;
        }

        // --- ¡AQUÍ ESTÁ EL ÚNICO CAMBIO! ---
        // Construimos el body explícitamente para asegurarnos de que el backend
        // recibe la estructura correcta: { recipe, text, options: { ... } }
        const body_payload = {
            recipe: action,
            text: text,
            options: options // 'options' ya contiene el { tone: 'formal' }
        };

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analysis/prompt-recipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
            body: JSON.stringify(body_payload) // <-- Usamos nuestro payload bien construido
        });
        
        // El resto de tu función se queda exactamente igual, no se toca nada más.
        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || 'Error del servidor de IA.');

        const resultText = responseData.data?.ai_response || "La IA no generó una respuesta válida.";

        setModificationModalState({
            open: true,
            title: resultTitle,
            data: { action, originalText: text, data: { ai_response: resultText } }
        });

    } catch (error) {
        console.error("Error en handleAiRecipe:", error);
        showNotification(error.message || 'Error inesperado con la IA', "error");
    } finally {
        setIsLoading(false);
    }
};



   const handleSectionChange = (updatedSections) => {
  setDocumentSections(updatedSections);
};


  const handleSectionDelete = (idToDelete) => {
  const updatedSections = documentSections.filter(section => section.id !== idToDelete);
  setDocumentSections(updatedSections);
  showNotification("Sección eliminada.", "info");
};

  const handleSectionDuplicate = (idToDuplicate) => {
  const newSections = [];
  documentSections.forEach(section => {
    newSections.push(section); // Añade la sección original
    if (section.id === idToDuplicate) {
      // Si es la que queremos duplicar, añade una nueva justo después
      newSections.push({
        ...section, // Copia el contenido
        id: `section-${Date.now()}`, // Pero dale un ID nuevo y único
      });
    }
  });
  setDocumentSections(newSections);
  showNotification("Sección duplicada.", "success");
};


    const handleReplaceText = (original,
sugerencia) => {
    // --- INICIO DE DEPURACIÓN ---
    console.group("--- DEBUG: handleReplaceText ---");
   
    // --- FIN DE DEPURACIÓN ---

    if (original) {
        // Lógica para reemplazar solo la selección
        const nuevoTexto = textContent.replace(original, sugerencia);
        
        // --- INICIO DE DEPURACIÓN ---
        
        console.groupEnd();
        // --- FIN DE DEPURACIÓN ---

        setTextContent(nuevoTexto);
    } else {
        // Lógica si no había selección (reemplazar todo)
        // --- INICIO DE DEPURACIÓN ---
        
        console.groupEnd();
        // --- FIN DE DEPURACIÓN ---
        setTextContent(sugerencia);
    }

    // Cerramos el modal
    setModificationModalState({ open: false, data: null, title: '' });
};

   const handleNavigateToPromptLab = () => {
  // 1. Decidimos qué contexto es el más relevante: la selección del usuario tiene prioridad.
   const contextToSend = selectedText.trim() || textContent;

  // 2. Una pequeña validación para no ir a la página si no hay nada que analizar.
  if (!contextToSend) {
    showNotification("No hay texto para llevar al laboratorio.", "warning");
    return;
  }

  // 3. Navegamos usando la RUTA COMPLETA y pasando el contexto en el 'state' de la navegación.
  // Esto es mucho más seguro y eficiente que pasarlo en la URL.
  navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`, {
    state: {
      context: contextToSend, // La página PromptLabPage leerá este estado.
    },
  });
};

  const handleNavigateToPromptLabWithSelection = (textForLab) => {
    if (!textForLab || !textForLab.trim()) {
        showNotification("Debes seleccionar texto para usar esta función.", "warning");
        return;
    }
    
    navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`, {
        state: { context: textForLab }
    });
};
  
  const findTermRef = useRef(null); 
  const editorRef = useRef(null); 

  const findAllMatches = (text, term) => {
    if (!term) return [];
    const matches = [];
    let lastIndex = 0;
    while (lastIndex !== -1) {
        lastIndex = text.toLowerCase().indexOf(term.toLowerCase(), lastIndex);
        if (lastIndex !== -1) {
            matches.push(lastIndex);
            lastIndex += term.length; // Mueve el índice de búsqueda más allá de la coincidencia actual
        }
    }
    return matches;
};

  const handleFindTermChange = (e) => {
    const newFindTerm = e.target.value;
    setFindTerm(newFindTerm);
    if (newFindTerm) {
        const matches = findAllMatches(textContent, newFindTerm);
        setFindMatches(matches);
        if (matches.length > 0) {
            setCurrentMatchIndex(0); // Va a la primera coincidencia
            highlightMatch(matches[0]);
        } else {
            setCurrentMatchIndex(-1);
        }
    } else {
        setFindMatches([]);
        setCurrentMatchIndex(-1);
    }
};

  const handleReplaceTermChange = (e) => {
    setReplaceTerm(e.target.value);
};

  const highlightMatch = (startIndex) => {
    if (editorRef.current && startIndex !== undefined && startIndex !== -1) {
        const textarea = editorRef.current.querySelector('textarea');
        if (textarea) {
            textarea.focus();
            // Desplazar la vista al inicio de la coincidencia
            // Esto es un poco rudimentario para un textarea, pero funciona
            textarea.setSelectionRange(startIndex, startIndex + findTerm.length);
            // Para asegurar que el scroll se ajuste, a veces es necesario hacer esto
            const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight);
            textarea.scrollTop = textarea.selectionStart * lineHeight / 20; // Aproximación
        }
    }
};

  const handleFindNext = () => {
    if (findMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % findMatches.length;
    setCurrentMatchIndex(nextIndex);
    highlightMatch(findMatches[nextIndex]);
};

  const handleFindPrevious = () => {
    if (findMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + findMatches.length) % findMatches.length;
    setCurrentMatchIndex(prevIndex);
    highlightMatch(findMatches[prevIndex]);
};

  const handleReplaceCurrent = () => {
    if (currentMatchIndex === -1 || findMatches.length === 0 || !findTerm || !replaceTerm) return;

    const startIndex = findMatches[currentMatchIndex];
    const textBefore = textContent.substring(0, startIndex);
    const textAfter = textContent.substring(startIndex + findTerm.length);

    const newText = textBefore + replaceTerm + textAfter;
    setTextContent(newText);
    setOriginalText(newText); // Actualizar para que los cambios persistan al guardar

    // Recalcular las coincidencias después del reemplazo
    const updatedMatches = findAllMatches(newText, findTerm);
    setFindMatches(updatedMatches);

    // Intentar ir a la siguiente coincidencia si aún quedan
    if (updatedMatches.length > 0) {
        if (currentMatchIndex >= updatedMatches.length) {
            setCurrentMatchIndex(0); // Volver al inicio si la actual fue la última
            highlightMatch(updatedMatches[0]);
        } else {
            highlightMatch(updatedMatches[currentMatchIndex]);
        }
    } else {
        setCurrentMatchIndex(-1); // No hay más coincidencias
    }
    showNotification("Texto reemplazado.", "success");
};

  const handleReplaceAll = () => {
    if (findMatches.length === 0 || !findTerm || !replaceTerm) return;

    // Usamos una expresión regular para reemplazar todas las ocurrencias, insensible a mayúsculas/minúsculas
    const regex = new RegExp(findTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); // Escapar caracteres especiales y 'gi' para global e insensible
    const newText = textContent.replace(regex, replaceTerm);
    
    setTextContent(newText);
    setOriginalText(newText); // Actualizar para que los cambios persistan al guardar

    setFindMatches([]); // Ya no hay coincidencias del término original
    setCurrentMatchIndex(-1);
    
    showNotification(`Se reemplazaron todas las ${findMatches.length} coincidencias.`, "success");
};
   

  const handleToggleEditorMode = () => {
        const newMode = editorMode === 'text' ? 'image' : 'text';
        setEditorMode(newMode);

        // Si cambiamos al modo imagen, forzamos la vista de secciones
        if (newMode === 'image') {
            // Convierte el texto simple a secciones si estamos en esa vista
            if (viewMode === 'simple') {
                setDocumentSections(splitTextIntoSections(textContent));
            }
            setViewMode('sections');
        }
    };



  const toggleFindReplaceBar = () => {
    setIsFindReplaceOpen(prev => {
        // Al cerrar, limpiar la búsqueda
        if (prev) {
            setFindTerm('');
            setReplaceTerm('');
            setFindMatches([]);
            setCurrentMatchIndex(-1);
        }
        return !prev;
    });
};

  const splitTextIntoSections = (text) => {
  if (!text) return [];

  // Expresión regular para detectar imágenes en formato Markdown: ![alt](src)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/;

  return text
    .split(/\n\n+/)
    .filter(paragraph => paragraph.trim() !== '')
    .map((paragraph, index) => {
      const imageMatch = paragraph.match(imageRegex);

      // Si es una imagen...
      if (imageMatch) {
        return {
          id: `section-${Date.now()}-${index}`,
          type: 'image',
          content: {
            src: imageMatch[2], // La URL está en el segundo grupo de captura
            alt: imageMatch[1], // El texto alternativo está en el primero
            size: 100,          // Estilos por defecto
            align: 'center',
          },
        };
      }

      // Si no, es texto normal
      return {
        id: `section-${Date.now()}-${index}`,
        type: 'text',
        content: paragraph,
      };
    });
};

const joinSectionsIntoText = (sections = []) => {
  if (!Array.isArray(sections)) return '';

  return sections
    .map(section => {
      if (!section) return '';

      // IMAGEN
      if (section.type === 'image') {
        const alt = (section.content?.alt || section.alt || 'imagen')
          .toString()
          .replace(/\]/g, '\\]'); // evita romper Markdown si hay ]
        // obtener src posible (support: section.content.src | section.src | objetos File/Blob)
        let src = section.content?.src || section.src || '';
        if (typeof src === 'object' && src !== null) {
          // si recibiste un objeto File/Blob o un objeto con url/preview
          src = src.url || src.preview || src.path || '';
        }
        src = String(src || '').trim();
        // encode paréntesis que rompen Markdown
        src = src.replace(/\)/g, '%29').replace(/\(/g, '%28');

        return `![${alt}](${src})`;
      }

      // TEXTO (soporta content string o content.text o section.text)
      if (typeof section.content === 'string') return section.content;
      if (section.content?.text) return section.content.text;
      if (section.text) return section.text;

      // fallback: intentar serializar de forma segura
      try {
        return JSON.stringify(section.content || section);
      } catch (e) {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n\n');
};

const handleSave = async () => {
  setIsSaving(true);

  try {
    // 1) Preparar contenido
    let contentToSave = textContent;
    if (viewMode === 'sections') {
      contentToSave = joinSectionsIntoText(documentSections);
    }

    // 2) Validaciones básicas
    if (!import.meta?.env?.VITE_API_URL) {
      throw new Error('VITE_API_URL no configurada en el entorno.');
    }
    if (!datasetId) {
      throw new Error('datasetId indefinido.');
    }

    // 3) Sesión supabase
    const sessionRes = await supabase.auth.getSession();
    const session = sessionRes?.data?.session;
    if (!session) throw new Error('Sesión no válida. Iniciá sesión de nuevo.');
    const token = session.access_token || session.provider_token || session.token;
    if (!token) throw new Error('Token de sesión no disponible.');

    // 4) Preguntar tipo de dataset (con chequeo de status)
    
    const detailsUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/details`;
    const detailsResponse = await fetch(detailsUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!detailsResponse.ok) {
      const text = await detailsResponse.text().catch(() => null);
      throw new Error(`Error al obtener detalles: ${detailsResponse.status} ${text || detailsResponse.statusText}`);
    }
    const detailsJson = await detailsResponse.json().catch(() => null);
    if (!detailsJson?.success) {
      throw new Error(detailsJson?.error || 'No se pudo obtener el tipo de dataset.');
    }
    const datasetType = detailsJson.data?.dataset_type || detailsJson.dataset_type;
    if (!datasetType) throw new Error('Tipo de dataset indefinido en la respuesta.');
   

    // 5) Verificar que no hay blob: URLs (imágenes locales) en el contenido
    if (typeof contentToSave === 'string' && contentToSave.includes('blob:')) {
      throw new Error('El contenido incluye URLs "blob:" (imágenes locales). Subí las imágenes al servidor y usá su URL pública antes de guardar.');
    }

    // 6) Preparar endpoint según tipo
    let url;
    let method;
    let payload;
    if (['docx', 'pdf', 'text', 'json'].includes(datasetType)) {
      url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/content`;
      method = 'PUT';
      payload = { newContent: contentToSave };
    } else {
      url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
      method = 'POST';
      payload = { textContent: contentToSave };
    }

    

    // 7) Llamada de guardado (chequeo de status y body seguro)
    const saveResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!saveResponse.ok) {
      const text = await saveResponse.text().catch(() => null);
      throw new Error(`Error al guardar: ${saveResponse.status} ${text || saveResponse.statusText}`);
    }

    const result = await saveResponse.json().catch(() => null);
    if (!result?.success) {
      throw new Error(result?.error || 'Error desconocido al guardar.');
    }

    // 8) Actualizar estado local
    setTextContent(contentToSave);
    setOriginalText(contentToSave);
    setOriginalDocumentSections(documentSections); // Actualizamos el "original" de las secciones
    showNotification('¡Guardado con éxito!', 'success');

  } catch (error) {
    console.error('Error al guardar:', error);
    showNotification(error?.message || 'Error desconocido al guardar.', 'error');
  } finally {
    setIsSaving(false);
  }
};

  const handleViewModeChange = (event, newMode) => {
  if (newMode === null) return; // Previene que se deseleccionen todos los botones

  // Si cambiamos a la vista por secciones...
  if (newMode === 'sections') {
    // ...convertimos el texto plano actual en secciones.
    const sections = splitTextIntoSections(textContent);
    setDocumentSections(sections);
    setOriginalDocumentSections(sections); 
  } 
  // Si volvemos a la vista simple...
  else if (newMode === 'simple') {
    // ...unimos las secciones (si es que hubo cambios) en un solo texto.
    const newText = joinSectionsIntoText(documentSections);
    setTextContent(newText);
  }

  setViewMode(newMode);
};

   if (loadState.loading) {
  return (
    
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          // Ajustamos la altura para que ocupe el espacio disponible
          height: 'calc(100vh - 72px)', // Altura completa menos el header
          width: '100%' 
        }}
      >
        <CircularProgress size={60} />
        <Typography sx={{ mt: 2, color: 'text.secondary' }}>
          Cargando documento...
        </Typography>
      </Box>
    
  );
}


  return (
  <Box
    sx={{
      height: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      p: 3,
      pt: 'calc(72px + 1px)', background: "linear-gradient(135deg, #26717a, #44a1a0)",                // bordes redondeados
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera
    }}
  >
    {/* ───────────────────────────────
        Encabezado con título y botones
    ─────────────────────────────── */}
    <Paper
      elevation={0}
      sx={{
        p: 2,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid',
        borderColor: '#2196f3',
        background: ' #005f73',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" fontWeight="bold" sx={{ color: 'white' }}> {/* <-- AÑADE ESTO */}
         Editor de Documento
      </Typography>

        {/* --- CENTRO: Selectores de Vista y Modo --- */}
        <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {/* --- Selector de VISTA (Simple / Secciones) --- */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="Modo de vista del editor"
            // LÓGICA CLAVE: Se deshabilita si estamos en modo imagen
            disabled={editorMode === 'image'}
          >
            <ToggleButton value="simple" aria-label="vista simple" sx={{ color: 'rgba(255, 255, 255, 0.7)', borderColor: 'rgba(255, 255, 255, 0.5)', '&.Mui-selected': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.2)' }, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
              <ArticleIcon sx={{ mr: 1 }} />
              Simple
            </ToggleButton>
            <ToggleButton value="sections" aria-label="vista por secciones" sx={{ color: 'rgba(255, 255, 255, 0.7)', borderColor: 'rgba(255, 255, 255, 0.5)', '&.Mui-selected': { color: 'white', backgroundColor: 'rgba(255, 255, 255, 0.2)' }, '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}>
              <ViewStreamIcon sx={{ mr: 1 }} />
              Secciones
            </ToggleButton>
          </ToggleButtonGroup>

          {/* --- Selector de MODO (Texto / Imágenes) --- */}
          {/* Este es el botón que yo había sugerido, que ahora convivirá con el otro */}
          <Tooltip title={editorMode === 'text' ? 'Activar gestión de imágenes' : 'Volver a edición de texto'}>
            <Button
              variant="outlined"
              startIcon={editorMode === 'text' ? <PhotoLibraryIcon /> : <TextFieldsIcon />}
              onClick={handleToggleEditorMode}
              sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)' } }}
            >
              {editorMode === 'text' ? 'Imágenes' : 'Texto'}
            </Button>
          </Tooltip>
        </Box>

      {/* Botones de acción */}
     <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <Tooltip title="Volver a la página anterior">
    <Button
        variant="outlined" // O "contained" si lo prefieres
        startIcon={<ArrowBackIcon />}
        onClick={handleGoBack} // <-- Usamos la función inteligente
    >
        Volver
    </Button>
</Tooltip>


 <Button 
 
                variant="contained" 
                // Le decimos que navegue a nuestra ruta de regreso inteligente
                onClick={() => navigate(returnPath)} 
            >
                {/* Opcional: El texto del botón ahora puede ser más claro */}
                Volver Pdf Extractor
            </Button>


        <Button
          variant="contained"
         
          onClick={handleNavigateToPromptLab}
           sx={{
            mr: 2,
            ml: 1,
            }}
        >
          PromptLab
        </Button>

        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!hasChanges || isSaving}
          onClick={handleSave}
        >
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </Box>
    </Paper>

    {/* ───────────────────────────────
        Cuerpo principal
    ─────────────────────────────── */}
    <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden' }}>
      
      {/* Columna izquierda */}
      <Box 
        onMouseUp={handleTextSelection} 
        sx={{ 
        flex: 2, 
        minWidth: 0, 
        display: 'flex',          // <-- AÑADE ESTO
        flexDirection: 'column'   // <-- Y AÑADE ESTO
       }}
      >
        
        {/* Barra de buscar y reemplazar */}
        {isFindReplaceOpen && (
          <Paper
            elevation={3}
            sx={{
              p: 2,
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              boxShadow: 3,
            }}
          >
            <TextField
              size="small"
              placeholder="Buscar..."
              value={findTerm}
              onChange={handleFindTermChange}
              sx={{ flexGrow: 1 }}
              inputRef={(el) => {
                if (el && findTermRef.current === null) findTermRef.current = el;
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ minWidth: 60, textAlign: 'center' }}
            >
              {findMatches.length > 0
                ? `${currentMatchIndex + 1} de ${findMatches.length}`
                : '0 de 0'}
            </Typography>
            <ButtonGroup size="small">
              <Button onClick={handleFindPrevious} disabled={findMatches.length === 0}>
                &lt;
              </Button>
              <Button onClick={handleFindNext} disabled={findMatches.length === 0}>
                &gt;
              </Button>
            </ButtonGroup>
            <TextField
              size="small"
              placeholder="Reemplazar con..."
              value={replaceTerm}
              onChange={handleReplaceTermChange}
              sx={{ flexGrow: 1 }}
            />
            <ButtonGroup size="small">
              <Button
                onClick={handleReplaceCurrent}
                disabled={currentMatchIndex === -1 || !replaceTerm}
              >
                Reemplazar
              </Button>
              <Button
                onClick={handleReplaceAll}
                disabled={findMatches.length === 0 || !replaceTerm}
              >
                Reemplazar todo
              </Button>
            </ButtonGroup>
            <IconButton onClick={toggleFindReplaceBar} size="small">
              <CloseIcon />
            </IconButton>
          </Paper>
        )}

     
           {/* Área de edición (LÓGICA ACTUALIZADA) */}
                    <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
                        {(viewMode === 'simple' && editorMode === 'text') ? (
         
            <Paper
              elevation={0}
              sx={{
                height: '100%',
                borderRadius: 2,
                border: '1px solid',
                borderColor: '#2196f3',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                <TextField
                  inputRef={editorRef}
                  multiline
                  fullWidth
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                    '& .MuiOutlinedInput-root': { alignItems: 'flex-start' },
                    '& .MuiOutlinedInput-input': {
                      p: 2,
                      fontFamily: 'monospace',
                    },
                  }}
                />
              </Box>

              {/* Indicador de tamaño del contexto */}
              <Box
                sx={{
                  p: 1,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'background.default',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Caracteres: {textStats.chars}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Palabras: {textStats.words}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Tokens (Aprox.): {textStats.tokens}
                </Typography>
              </Box>
            </Paper>
          ) : (
                 // El editor de secciones SÓLO necesita saber cómo manejar las secciones que le pasas
                   <SectionsEditorImage // <-- Asegúrate de que este es el nombre correcto del componente
                       sections={documentSections}
                       onSectionChange={handleSectionChange}
                       onSectionDelete={handleSectionDelete}
                       onSectionDuplicate={handleSectionDuplicate}
                       onSectionAdd={handleSectionAdd}
                       onSectionAddAtStart={handleSectionAddAtStart}
                       activeSectionId={activeSectionId}
                       onSectionFocus={setActiveSectionId}
                       onSectionMove={handleSectionMove} // <-- ¡AÑADE ESTA NUEVA PROP!
                   />
                            
                        )}
                    </Box>
                </Box>

       {/* --- 4. Columna derecha (CONDICIONAL) --- */}
              
        <Box sx={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          {editorMode === 'text' ? (
            <TextActionsCard
              selectedText={selectedText}
              onLegacyAnalysis={handleLegacyAnalysis}
              onTranslate={handleTranslate}
              onAiRecipe={handleAiRecipe}
              fullTextContent={textContent}
              onNavigateWithSelection={handleNavigateToPromptLabWithSelection}
            />
          ) : (
            <DocumentControlPanel
              models={models}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              userPrompt={userPrompt}
              setUserPrompt={setUserPrompt}
              handleGenerateImage={handleGenerateImage}
              isLoading={isLoading}
              userImages={userImages}
              onImageSelect={handleImageSelect}
            />
          )}
        </Box>
      </Box>

    {/* ───────────────────────────────
        Modal de resultados
    ─────────────────────────────── */}
    <TextModificationModal
            open={modificationModalState.open}
            onClose={() => setModificationModalState({ ...modificationModalState, open: false })}
            title={modificationModalState.title}
            data={modificationModalState.data}
            onReplace={handleReplaceText}
        />

        <AnalysisResultModal
            open={analysisModalState.open}
            onClose={() => setAnalysisModalState({ ...analysisModalState, open: false })}
            title={analysisModalState.title}
            data={analysisModalState.data}
            isLoading={isLoading}
        />
  </Box>
);
}