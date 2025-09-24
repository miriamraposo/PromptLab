import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { Box, Typography, Paper, Grid, Button, CircularProgress, Alert,Tooltip } from '@mui/material';
import { supabase } from '../supabaseClient'; // Asegúrate que la ruta sea correcta
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ScienceIcon from '@mui/icons-material/Science';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';

// --- CORRECCIÓN 1: Importamos los componentes correctos y eliminamos los que no se usan ---
import PdfVisualizer from '../components/pdf/PdfVisualizer';
import CatalogItemEditor from '../components/pdf/CatalogItemEditor'; // Usaremos este
import ActionWidget from '../components/pdf/ActionWidget';
import UploadImagesModal from '../components/dashboard/UploadImagesModal';
import InteractiveDocumentEditor from './InteractiveDocumentEditor';


export default function PdfDataExtractorPage() {
    const { projectId, datasetId } = useParams();
    const [pdfData, setPdfData] = useState(null); // Almacenará todos los datos del PDF (páginas, análisis, etc.)
   

    // --- Estados (sin cambios, ya estaban bien) ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [analysisData, setAnalysisData] = useState(null);
    const [originalAnalysisData, setOriginalAnalysisData] = useState(null);
    const [selectedPageIndex, setSelectedPageIndex] = useState(0);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [imagesForModal, setImagesForModal] = useState([]);
    const [datosTabularesExtraidos, setDatosTabularesExtraidos] = useState([]);
    const [isEditMode, setIsEditMode] = useState(false); 
    const navigate = useNavigate();
    const location = useLocation(); //
    const hasChanges = JSON.stringify(analysisData) !== JSON.stringify(originalAnalysisData);

    // --- useEffect de Carga (Sin cambios, ya estaba perfecto) ---
    useEffect(() => {
        const fetchAndAnalyzePdf = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                const token = session.access_token;

                const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
                const analyzeUrl = `${import.meta.env.VITE_API_URL}/api/pdf/extract-structured-data`;

                const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
                if (!fileResponse.ok) throw new Error(`Error al descargar PDF: ${fileResponse.status}`);
                
                const pdfBlob = await fileResponse.blob();
                const pdfFile = new File([pdfBlob], "document.pdf", { type: "application/pdf" });
                
                const formData = new FormData();
                formData.append('pdf_file', pdfFile);

                const analysisResponse = await fetch(analyzeUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });
                if (!analysisResponse.ok) throw new Error(`Error del servidor de análisis: ${analysisResponse.status}`);
                
                const result = await analysisResponse.json();
                if (!result.success) throw new Error(result.error || "El análisis del PDF falló.");
                
                setAnalysisData(result.pdf_analysis);
                setOriginalAnalysisData(result.pdf_analysis);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        if (datasetId) fetchAndAnalyzePdf();
    }, [datasetId]);

    // --- CORRECCIÓN 2: Arreglamos handleSave para que use la URL y el token correctos ---
    const handleSave = async () => {
        if (!hasChanges) return;
        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const token = session.access_token;
            
            const url = `${import.meta.env.VITE_API_URL}/api/save-analysis`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    dataset_id: datasetId,
                    name: `Análisis de ${analysisData.filename}`,
                    pages: analysisData.pages
                })
            });
            
            const result = await response.json();
            if (!result.success) throw new Error(result.error || "El guardado falló.");

            setOriginalAnalysisData(analysisData);
            alert("¡Guardado con éxito!");
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- CORRECCIÓN 3: Eliminamos handleFieldChange y nos quedamos solo con la de 'items' ---
    const handleItemFieldChange = (itemId, fieldKey, newValue) => {
        const updatedData = JSON.parse(JSON.stringify(analysisData));
        const pageToUpdate = updatedData.pages[selectedPageIndex];
        const itemToUpdate = pageToUpdate.analysis.extracted_items.find(item => (item.item_id || item.index) === itemId);
        if (itemToUpdate) {
            itemToUpdate[fieldKey] = newValue;
            setAnalysisData(updatedData);
        }
    };

    // --- CORRECCIÓN 4: Arreglamos handleExtractImages (URL y token) ---
    const handleExtractImages = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const token = session.access_token;

            const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
            const extractUrl = `${import.meta.env.VITE_API_URL}/api/pdf/extract-images`;
            
            const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!fileResponse.ok) throw new Error("No se pudo descargar el PDF para la extracción.");

            const pdfBlob = await fileResponse.blob();
            const pdfFile = new File([pdfBlob], "document.pdf", { type: "application/pdf" });
            const formData = new FormData();
            formData.append('pdf_file', pdfFile);

            const extractionResponse = await fetch(extractUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            const result = await extractionResponse.json();
            if (!result.success) throw new Error(result.error);

            setImagesForModal(result.images);
            setIsUploadModalOpen(true);
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    };
    
    // La función handleExportToCsv ya estaba correcta, no se toca
    const handleExportToCsv = async () => {
        // ... (sin cambios)
    };
    
    const handleUploadComplete = () => {
       
    };

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!analysisData) return <Typography>No hay datos de análisis para mostrar.</Typography>;

   return (
  <Box sx={{ p: 10}}>
    {/* --- CABECERA --- */}
    <Paper
      sx={{
        p: 0,
        mb: 2,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1.5,
        }}
      >
        {/* --- 👇 TÍTULO DINÁMICO 👇 --- */}
        <Typography variant="h5">
          {isEditMode
            ? 'Editor Visual de Documentos'
            : `Extracción de Datos: ${analysisData.filename}`}
        </Typography>

        {/* --- 👇 GRUPO DE BOTONES 👇 --- */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {isEditMode ? (
            // --- Botón cuando está en MODO EDICIÓN ---
            <Button variant="contained" onClick={() => setIsEditMode(false)}>
              Volver a Extracción
            </Button>
          ) : (
            <>
              {/* Botón Guardar Cambios */}
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </Button>

             <Tooltip title="Editar todo el contenido del documento como texto plano">
            <Button
                variant="contained"
                color="secondary"
                startIcon={<TextFieldsIcon />}
                // --- ¡ESTA ES LA LÍNEA MÁS IMPORTANTE! ---
                onClick={() => navigate(
        `/project/${projectId}/document/${datasetId}`,
        { 
            state: { 
                from: location.pathname,
                // --- 👇 ¡AÑADE ESTA LÍNEA! 👇 ---
                datasetType: 'pdf' // Le decimos explícitamente que es un PDF
            } 
        }
    )}
            >
              Editor de Texto
            </Button>
        
        </Tooltip>

              {/* Botón para activar el MODO EDICIÓN */}
              <Tooltip title="Editar visualmente el texto y las imágenes del documento">
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<TextFieldsIcon />}
                  onClick={() => setIsEditMode(true)}
                >
                  Editor Visual
                </Button>
              </Tooltip>

              {/* Botón PromptLab */}
              <Tooltip title="Usar el contenido del documento en el Laboratorio de Prompts">
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<ScienceIcon />}
                  onClick={() =>
                    navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`)
                  }
                >
                  PromptLab
                </Button>
              </Tooltip>

              {/* Botón Predicciones */}
              <Tooltip title="Utilizar los datos extraídos para generar predicciones (facturas, catálogos, etc.)">
                <span>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<OnlinePredictionIcon />}
                    onClick={() =>
                      navigate(`/project/${projectId}/predict/${datasetId}`)
                    }
                    disabled={!datosTabularesExtraidos}
                  >
                    Predicciones
                  </Button>
                </span>
              </Tooltip>
            </>
          )}
        </Box>
      </Box>
    </Paper>

    {isEditMode ? (
    // Si estamos en modo edición, renderizamos el editor.
    // Le pasamos el datasetId que ya tenemos en esta página.
    <InteractiveDocumentEditor datasetId={datasetId} />
) : (
    // Si no, mostramos la vista de extracción de datos que ya existía.
    <Grid container spacing={3}>
        <Grid item xs={12} md={9}>
            <PdfVisualizer 
                pages={analysisData.pages}
                selectedPageIndex={selectedPageIndex}
                onPageChange={setSelectedPageIndex}
            />
        </Grid>

        <Grid item xs={12} md={3}>
            <CatalogItemEditor
                items={analysisData.pages[selectedPageIndex]?.analysis.extracted_items}
                onFieldChange={handleItemFieldChange}
            />
            <ActionWidget 
                onExtractImages={handleExtractImages}
                onExportToCsv={handleExportToCsv}
            />
        </Grid>
    </Grid>
)}

    {/* --- MODAL SUBIDA DE IMÁGENES --- */}
    <UploadImagesModal
      open={isUploadModalOpen}
      onClose={() => setIsUploadModalOpen(false)}
      projectId={projectId}
      onUploadComplete={handleUploadComplete}
      initialFiles={imagesForModal}
    />
  </Box>
);
}

------------------------------------------




import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom'; 
import { Box, Paper, CircularProgress, Alert, Button, Typography ,Tooltip} from '@mui/material';
import { supabase } from '../supabaseClient'; // Ajusta la ruta
import PageRenderer from '../components/pdf/PageRenderer'; // <-- El componente que vamos a crear
import GalleryModal from '../components/pdf/GalleryModal'



export default function InteractiveDocumentEditor({ datasetId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // --- ESTADOS PARA MANEJAR EL DOCUMENTO ---
    const [docId, setDocId] = useState(null); // El ID que nos devuelve el POST
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageData, setPageData] = useState(null); // Los elementos de la página actual
    
    // --- ESTADOS PARA MODALES Y ACCIONES ---
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [targetImageId, setTargetImageId] = useState(null);
    const { projectId } = useParams(); // Ahora tenemos el projectId desde la URL
    const navigate = useNavigate();      // Ahora tenemos la función de navegación
    
    
    const handleSelectAndNavigate = (textContent) => {
        if (!textContent) return;

       ;
        
        // Navegamos al DocumentEditor, pasando el texto en el 'state'
        navigate(`/project/${projectId}/document/${datasetId}`, {
            state: {
                initialTextContent: textContent // Tu DocumentEditor ya sabe leer esto
            }
        });
    };

    // --- FASE 1: SUBIR EL PDF Y OBTENER EL doc_id ---
    useEffect(() => {
        const uploadAndInitialize = async () => {
            setLoading(true);
            setError(null);
            try {
                // 1. Obtener token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");

                // 2. Descargar el PDF original desde nuestro storage
                const downloadUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/download`;
                const fileResponse = await fetch(downloadUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                if (!fileResponse.ok) throw new Error("No se pudo descargar el PDF.");
                
                const pdfBlob = await fileResponse.blob();
                const pdfFile = new File([pdfBlob], "document.pdf");

                // 3. Subirlo al nuevo endpoint /reconstruct con POST
                const formData = new FormData();
                formData.append('pdf_file', pdfFile);

                const reconstructUrl = `${import.meta.env.VITE_API_URL}/api/pdf/reconstruct`;
                const reconstructResponse = await fetch(reconstructUrl, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                    body: formData,
                });
                const result = await reconstructResponse.json();
                if (!result.success) throw new Error(result.error);

                // 4. Guardar los datos clave del documento
                setDocId(result.doc_id);
                setTotalPages(result.pages);
                
            } catch (err) {
                setError(err.message);
                setLoading(false);
            }
        };
        uploadAndInitialize();
    }, [datasetId]);

    // --- FASE 2: CARGAR LA PÁGINA ACTUAL CADA VEZ QUE CAMBIA ---
    useEffect(() => {
        // No hacer nada si aún no tenemos el doc_id
        if (!docId) return;

        const loadPageData = async () => {
            setLoading(true); // O un spinner más sutil para el cambio de página
            try {
                // 1. Obtener token
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");

                // 2. Llamar a /reconstruct con GET para obtener los elementos de la página
                const pageUrl = `${import.meta.env.VITE_API_URL}/api/pdf/reconstruct?doc_id=${docId}&page=${currentPage}`;
                const response = await fetch(pageUrl, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const result = await response.json();
                if (!result.success) throw new Error(result.error);

                setPageData(result);
                
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadPageData();
    }, [docId, currentPage]); // Se ejecuta cuando tenemos un docId y cuando cambiamos de página

    // --- LÓGICA DE ACCIONES ---
    const handleElementUpdate = (elementId, newContent) => {
        // Actualiza el contenido de un elemento de texto en el estado 'pageData'
        setPageData(currentData => {
            const newElements = currentData.elements.map(el => 
                el.id === elementId ? { ...el, content: newContent } : el
            );
            return { ...currentData, elements: newElements };
        });
    };
    
    const handleImageReplace = (imageId) => {
        // Abre el modal de la galería para reemplazar una imagen
        setTargetImageId(imageId);
        setIsGalleryOpen(true);
    };

    const handleImageSelectFromGallery = (newImageUrl) => {
        // Cuando se elige una imagen de la galería, actualiza el elemento
        // Aquí, en lugar de base64, ¡simplemente cambiamos la URL!
        setPageData(currentData => {
            const newElements = currentData.elements.map(el => 
                el.id === targetImageId ? { ...el, new_url: newImageUrl } : el
            );
            return { ...currentData, elements: newElements };
        });
        setIsGalleryOpen(false);
    };

    // --- RENDERIZADO ---
    if (loading && !pageData) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!pageData) return null; // Aún no se ha cargado nada

    return (
        <Box>
            {/* Aquí podrías tener una barra de herramientas */}
            
            <PageRenderer 
                pageData={pageData}
                onElementSelect={handleSelectAndNavigate} // <-- ¡Conectamos la nueva función!
            />
            
            
            {/* Controles de paginación */}
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center' }}>
                <Button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>Anterior</Button>
                <Typography sx={{ mx: 2 }}>Página {currentPage} de {totalPages}</Typography>
                <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
            </Box>

            <GalleryModal 
                open={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onImageSelect={handleImageSelectFromGallery}
            />
        </Box>
    );
}

-----------------------------------------



// En src/pages/VisionLabHubPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; 
import { Box, Typography, Paper, Grid, Button, Icon, Skeleton } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Importa los iconos que vamos a usar
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups'; // Icono para Clustering
import RuleIcon from '@mui/icons-material/Rule'; // Icono para Evaluación
import ScienceIcon from '@mui/icons-material/Science'; // Icono para Prueba
import { supabase } from '../supabaseClient';
import PdfDataExtractor from './PdfDataExtractorPage'
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import { IconButton } from '@mui/material';


const ActionCard = ({ icon, title, description, buttonText, onClick, disabled = false }) => (
  <Grid item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
    <Paper 
      elevation={3}
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        flexGrow: 1,          // ocupa todo el alto del Grid
        height: "100%",       // asegura que todas igualen
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}
    >
      <Box sx={{ flexGrow: 1, mb: 3 }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ whiteSpace: "pre-line" }}
        >
          {description}
        </Typography>
      </Box>
      <Button 
        variant="contained" 
        onClick={onClick}
        disabled={disabled}
        sx={{ mt: 'auto' }}
      >
        {buttonText}
      </Button>
    </Paper>
  </Grid>
);

// --- Componente Principal de la Página ---
export default function VisionLabHubPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const clusterResultId = searchParams.get('clusterResultId');
    const [modelDetails, setModelDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true)
    const [activeView, setActiveView] = useState('hub');
       // --- ¡CAMBIO CLAVE 1: LEEMOS EL modelId DE LA URL! ---
    // Este ID puede ser el real (UUID) o el temporal del modelo fantasma.
    const modelId = searchParams.get('modelId');
 
    // Este useEffect se encarga de cargar los detalles del dataset
    // para poder mostrar su nombre en la cabecera.
    useEffect(() => {
    // Definimos una única función para cargar todo lo que esta página necesita
    const fetchPageData = async () => {
        setLoading(true);

        try {
            // --- 1. Cargar detalles del DATASET (esto ya lo tenías) ---
            // (Aquí estoy usando tu lógica de simulación, si tienes una llamada real, úsala)
            setDataset({ 
                id: datasetId, 
                name: `Análisis de Imágenes (${datasetId.substring(0, 8)}...)` 
            });

            // --- 2. Cargar detalles del MODELO (si hay un modelId) ---
            if (modelId) {
                // Primero, comprobamos si es un modelo fantasma en sessionStorage
                if (modelId.startsWith("temp_")) {
                    const phantomString = sessionStorage.getItem("phantomModel");
                    if (phantomString) {
                        // Si lo encontramos, usamos esos datos
                        setModelDetails(JSON.parse(phantomString));
                    } else {
                        // Si no está en sessionStorage (ej: el usuario refrescó la página 
                        // mucho después), podemos mostrar un aviso.
                        console.warn(`Modelo temporal ${modelId} no encontrado en sessionStorage.`);
                        setModelDetails(null); // O un objeto de error
                    }
                } else {
                    // Si no es temporal, es un ID real, así que llamamos a la API
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error("Sesión no válida para obtener detalles del modelo.");

                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelId}`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    const result = await response.json();

                    if (result.success) {
                        setModelDetails(result.data);
                    } else {
                        throw new Error(result.error || "No se pudieron cargar los detalles del modelo.");
                    }
                }
            } else {
                // Si no hay modelId en la URL, nos aseguramos de que modelDetails sea nulo
                setModelDetails(null);
            }

        } catch (error) {
            console.error("Error al cargar datos para VisionLabHub:", error);
            // Aquí podrías usar tu showNotification
        } finally {
            setLoading(false);
        }
    };

    fetchPageData();

// El array de dependencias es clave: este efecto se ejecuta si el datasetId o el modelId de la URL cambian.
}, [datasetId, modelId]);

    // --- Lógica de Navegación ---
    const handleNavigation = (path, isExternalModule = false) => {
    if (isExternalModule) {
        // Para el botón que necesita ir a un módulo diferente y pasar el ID como parámetro
        navigate(`${path}?datasetId=${datasetId}`);
    } else {
        // Para los botones de Etiquetado y Clustering que usan rutas completas
        navigate(path);
    }
};
    
    // --- Datos para nuestras tarjetas ---
const actionCardsData = [
  {
    icon: <RuleIcon sx={{ fontSize: 40 }} />,
    title: "Evaluar Modelo",
    description:
      "Mide el rendimiento del modelo con un nuevo dataset y obtén métricas detalladas como la precisión.",
    buttonText: "Iniciar Evaluación",
    onClick: () =>
      navigate(`/models/vision/${modelId}/evaluate`, {
        state: { model: modelDetails },
      }),
    disabled: !modelId,
  },
  {
    icon: <ScienceIcon sx={{ fontSize: 40 }} />,
    title: "Prueba Interactiva",
    description:
      "Clasificador de imagenes con un modelo de IA en tiempo real. Ideal para pruebas rápidas.",
    buttonText: "Probar Predicción",
    onClick: () =>
      navigate(`/models/vision/${modelId}/predict`, {
        state: { model: modelDetails },
      }),
    disabled: !modelId,
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    title: "Descubrir Grupos (Clustering)",
    description:
      "Agrupa automáticamente imágenes similares para encontrar patrones visuales ocultos en los datos.",
    buttonText: "Ejecutar Clustering",
    onClick: () => navigate("clustering"),
    disabled: false,
  },
  {
    icon: <ImageSearchIcon sx={{ fontSize: 40 }} />,
    title: "Etiquetado y Entrenamiento",
    description:
      "Agregar etiquetas a las imagenes y entrenar un nuevo modelo de clasificación desde cero.",
    buttonText: "Etiquetado y Prediccion",
    onClick: () => {
      let explorerPath = "explorer";
      if (clusterResultId) {
        explorerPath += `?clusterResultId=${clusterResultId}`;
      }
      navigate(explorerPath);
    },
    disabled: false, // 👈 faltaba también cerrar el objeto
  },
];

const pdfActionCardsData = [
  {
    icon: <DescriptionIcon sx={{ fontSize: 40, color: "#1976d2" }} />,
    title: "Extracción de Datos Estructurados",
    description:
      "Obtén automáticamente los datos clave del documento PDF, listos para análisis o reporte.",
    buttonText: "Iniciar Extracción",
    onClick: () => setActiveView('extraction'),
  },
  {
    icon: <TextFieldsIcon sx={{ fontSize: 40, color: "#9c27b0" }} />,
    title: "Análisis de Contenido de Texto",
    description:
      "Extrae todo el contenido textual y encuentra patrones, palabras clave o información relevante.",
    buttonText: "Analizar Texto",
    onClick: () => setActiveView('text'),
  },
  {
    icon: <ImageIcon sx={{ fontSize: 40, color: "#ff9800" }} />,
    title: "Editor Interactivo de Documentos",
    description:
      "Edita el texto, reemplaza imágenes y modifica la estructura del documento de forma visual.",
    buttonText: "Abrir Editor",
    // --- ¡EL CAMBIO CLAVE! ---
    onClick: () => navigate(`/project/${projectId}/document/${datasetId}/edit`),
  
  },

];


    return (
  <Box sx={{ p: 1, flexGrow: 1, mt: "72px" }}>
    
    {/* --- CABECERA --- */}
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        background: "linear-gradient(135deg, #26717a, #44a1a0)",
        borderRadius: 2,
        boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
        mb: 4,
        color: "#ffffff",
      }}
    >
      {searchParams.get("datasetType")?.toLowerCase() === "pdf" &&
        activeView !== "hub" && (
          <IconButton
            onClick={() => setActiveView("hub")}
            sx={{ color: "white", mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
        )}

      <Box>
        <Typography variant="h5" fontWeight="bold">
          Laboratorio de Visión
        </Typography>
        {loading ? (
          <Skeleton width="250px" sx={{ bgcolor: "grey.700" }} />
        ) : (
          <Typography variant="body1">
            Dataset: <strong>{dataset?.name || datasetId}</strong>
          </Typography>
        )}
      </Box>
    </Box>

    {/* --- CONTENIDO DINÁMICO --- */}
    {(() => {
      const datasetType = searchParams.get("datasetType");

      if (datasetType?.toLowerCase() === "pdf") {
        switch (activeView) {
          case "extraction":
            return <PdfDataExtractor projectId={projectId} datasetId={datasetId} />;
          case "text":
            return <FullTextAnalyzer projectId={projectId} datasetId={datasetId} />;
          case "images":
            return <ImageExtractor projectId={projectId} datasetId={datasetId} />;
          case "hub":
          default:
            // --- Hub PDF: cards centradas ---
            return (
              <Grid container spacing={5} alignItems="stretch" justifyContent="center">
                {pdfActionCardsData.map((card, index) => (
                  <Grid item key={index} xs={12} sm={6} md={4}>
                    <ActionCard {...card} />
                  </Grid>
                ))}
              </Grid>
            );
        }
    
      } else {
        // --- Grid para datasets que NO son PDF ---
        return (
          <Grid container spacing={5} alignItems="stretch">
            {actionCardsData.map((card, index) => (
              <ActionCard
                key={index}
                icon={card.icon}
                title={card.title}
                description={card.description}
                buttonText={card.buttonText}
                onClick={card.onClick}
                disabled={card.disabled}
              />
            ))}
          </Grid>
        );
      }
    })()}
  </Box>
);
}






import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, Paper, Typography, Divider, Button, Stack, CircularProgress,  Grid ,Dialog, DialogTitle, IconButton, Tooltip, DialogContent, DialogContentText, DialogActions } from '@mui/material'; // <-- MODIFICA ESTA LÍNEA
import FactCheckIcon from '@mui/icons-material/FactCheck'; 
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics'; 
import AdsClickIcon from '@mui/icons-material/AdsClick';
import { supabase } from '../../supabaseClient';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import RefreshIcon from '@mui/icons-material/Refresh'; 
import { useQualityCheck } from "../../hooks/useQualityCheck"; 
import ScienceIcon from '@mui/icons-material/Science';

// Componente MetadataDisplay (sin cambios)
function MetadataDisplay({ type, metadata }) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return <Typography variant="body2" color="inherit">No hay datos detallados para este archivo.</Typography>;
    }
    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };
    const renderDetail = (label, value) => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="inherit">{label}:</Typography>
            <Typography variant="body2" fontWeight="500" sx={{ textAlign: 'right' }}>{value ?? 'N/A'}</Typography>
        </Box>
    );
    switch (type?.toLowerCase()) {
        case 'tabular':
        case 'csv':
        case 'xlsx':
        case 'parquet':
        case 'vision_analysis': // <-- ¡AÑADIDO!
            return (
                <>
                    {renderDetail("Filas", metadata.rows)}
                    {renderDetail("Columnas", metadata.columns)}
                    {renderDetail("Tamaño", formatSize(metadata.sizeBytes))}
                </>
            );
        case 'text':
        case 'pdf':
        case 'docx':
        case 'md':
             return (
                <>
                    {renderDetail("Caracteres", metadata.length)}
                    {renderDetail("Tamaño", formatSize(metadata.sizeBytes))}
                </>
            );
        default:
            return <>{renderDetail("Tamaño", formatSize(metadata.sizeBytes))}</>;
    }
}
MetadataDisplay.propTypes = { type: PropTypes.string, metadata: PropTypes.object };


export default function DatasetPropertiesPanel({ dataset, onRename, onDelete, onRefresh}) {
    const [parsedMetadata, setParsedMetadata] = useState(null);
    const navigate = useNavigate();
    const { projectId } = useParams();
    const [isCheckingQuality, setIsCheckingQuality] = useState(false);
    const { isChecking, qualityResult, runQualityCheck, resetQualityResult } = useQualityCheck();

    const handleCheck = () => {
        runQualityCheck(dataset?.datasetId);
    };

    const handleCloseModal = () => {
        resetQualityResult();
    };
    
    
  const handlePdfNavigation = (target) => {
    if (!projectId || !dataset?.datasetId) return;

    const { datasetId, datasetType } = dataset;

    if (target === 'vision_lab') {
        // Opción A: Ir al laboratorio de IA
        const targetUrl = `/project/${projectId}/vision-lab/${datasetId}?datasetType=${datasetType}`;
        navigate(targetUrl);
    } else if (target === 'document_viewer') {
        // Opción B: Ir al visor de texto simple
        const targetPath = `/project/${projectId}/document/${datasetId}`;
        navigate(targetPath, { state: { datasetType: datasetType } });
    }
};



    const handleNavigateToPromptLab = () => {
    if (!dataset?.datasetId || !projectId) return;

    // Simplemente navegamos a la página. PromptLabPage se encargará
    // de llamar al backend para obtener el contenido del archivo.
    navigate(`/project/${projectId}/dataset/${dataset.datasetId}/promptlab`);
};

    const navigateToPredictiveModule = () => {
       if (!projectId || !dataset?.datasetId) return; // chequeo simple
          navigate(`/project/${projectId}/predict/${dataset.datasetId}`);
    };

     const navigateToVisionLab = () => {
    // 1. Verificación inicial (igual que en tu función)
    if (!dataset || !projectId) {
        console.error("Intento de navegación a Vision Lab sin dataset o projectId.");
        return;
    }

    // 2. Desestructuración segura de las propiedades del dataset (igual que en tu función)
    const { datasetId, datasetType } = dataset;

    // 3. Verificaciones de las propiedades extraídas (igual que en tu función)
    if (!datasetId) {
        console.error("Error: No se puede navegar a Vision Lab porque datasetId no está definido.", dataset);
        return;
    }

    if (!datasetType) {
        console.error("Error: No se puede navegar a Vision Lab porque datasetType no está definido.", dataset);
        // Opcional: Notificar al usuario que el tipo de archivo es desconocido.
        alert("El tipo de archivo no está definido, no se puede abrir en Vision Lab.");
        return;
    }

    // 4. Si todas las verificaciones pasan, construimos la URL y navegamos.
    const targetUrl = `/project/${projectId}/vision-lab/${datasetId}?datasetType=${datasetType}`;
    
    
    navigate(targetUrl);
};


    useEffect(() => {
        if (!dataset || !dataset.metadata) {
            setParsedMetadata(null); return;
        }
        if (typeof dataset.metadata === 'string') {
            try { setParsedMetadata(JSON.parse(dataset.metadata)); } 
            catch (e) { console.error("Error parsing metadata JSON:", e); setParsedMetadata(null); }
        } else { setParsedMetadata(dataset.metadata); }
    }, [dataset]);

    const handleNavigateToAnalysis = () => {
        if (!dataset || !projectId) return;

        const { datasetId, datasetType } = dataset; 
    
        if (!datasetId) {
            console.error("Error: datasetId no definido.", dataset);
            return;
        }

        let targetPath = '';

        switch (datasetType?.toLowerCase()) {
            
            case 'tabular':
            case 'csv':
            case 'xlsx':
            case 'parquet':
                targetPath = `/project/${projectId}/dataprep/${datasetId}`;
                break;
            case 'text':
            case 'md':
            case 'docx':
                targetPath = `/project/${projectId}/document/${datasetId}`;
            // Al navegar, le adjuntamos el 'datasetType' en el estado de la ruta.
                navigate(targetPath, { state: { datasetType: datasetType } });
            break;
                break;
            default:
                alert(`El tipo de archivo '${datasetType}' no tiene una vista de análisis definida.`);
                return;
        }
        
        navigate(targetPath);
    };

    // --- 👇 ESTE ES EL BLOQUE QUE FALTABA 👇 ---
    if (!dataset || Object.keys(dataset).length === 0) {
        return (
            <Paper 
                variant="outlined"
                sx={{
                    height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', p: 1, borderColor: 'primary',
                    backgroundColor: 'transparent',
                }}
            >
                <AdsClickIcon color="primary" sx={{ fontSize: '3rem', mb: 2 }} />
                <Typography variant="h6" color="primary" fontWeight="500">
                    Panel de Detalles
                </Typography>
                <Typography color="primary" textAlign="center" sx={{ maxWidth: '300px', mt: 0.5 }}>
                    Selecciona un archivo para consultar sus propiedades y acciones disponibles.
                </Typography>
            </Paper>
        );
    }
    // --- 👆 FIN DEL BLOQUE QUE FALTABA 👆 ---

    return (
        <Paper variant="outlined" sx={{ height: '100%',  width: '100%',p: 3, display: 'flex', flexDirection: 'column', background: '#002f4b', borderColor: '#2196f3', borderWidth: 1, borderStyle: 'solid' }}>
              <Box
  sx={{
    mb: 1,
    p: 2,
    borderRadius: 1.5,
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',
    display: "flex",
    justifyContent: "center",  // centra horizontalmente
    alignItems: "center"       // centra verticalmente
  }}
>
                <Typography
    variant="subtitle1"
    fontWeight="bold"
    sx={{
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontSize: '0.95rem',
    }}
  >
                  Detalles del Archivo
                </Typography>
              </Box>
                <Box sx={{ p: 1, mt: 1, borderRadius: 1, bgcolor: '#44a1a0', color : '#fff'  }}>
                    <MetadataDisplay type={dataset.datasetType} metadata={parsedMetadata} />
                </Box>
                <Box
  sx={{
    flexShrink: 0,
    pt: 1,
    mt: 1,
    borderRadius: 2,
    p: 0,
  }}
>
  <Divider sx={{ mb: 2 }} />

  <Box
    sx={{
      mb: 1,
      p: 2,
      borderRadius: 1.5,
      background: "linear-gradient(135deg, #26717a, #44a1a0)",
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      borderLeft: '3px solid #26717a',
      display: "flex",
      justifyContent: "center",   // centra horizontalmente
      alignItems: "center",       // centra verticalmente
    }}
  >
    <Typography
      variant="subtitle1"
      fontWeight="bold"
      sx={{
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontSize: '0.95rem',
      }}
    >
      Acciones
    </Typography>
  </Box>
{/* 1. Un ÚNICO Grid container para TODOS los botones.
       El 'spacing' ahora controla el espacio horizontal Y vertical de manera uniforme. */}
<Box sx={{ display: 'flex',borderRadius: 1.5, flexDirection: 'column', gap: 2, p: 2,background: "linear-gradient(135deg, #26717a, #44a1a0)", }}>
 

  {/* Botón 1 */}
  <Button 
    fullWidth 
    size="medium" 
    variant="contained" 
    color="secondary"
    sx={{
    border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
    },
  }}
    startIcon={<FactCheckIcon />}
    onClick={handleCheck}
  >
    Diagnóstico
  </Button>
  
  {/* Botón 2 */}
  <Button 
    fullWidth 
    variant="contained" 
    size="medium" 
    color="secondary"
    sx={{
    border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
    },
  }}
    startIcon={<AnalyticsIcon />}
    onClick={handleNavigateToAnalysis}
  >
    Procesar & Editar
  </Button>

  

  {/* Botones 3 y 4 en fila */}
  <Box sx={{ display: 'flex', gap: 2 }}>

  
    <Button 
      fullWidth 
      size="medium" 
      variant="contained"
      sx={{
              backgroundColor: " #005f73",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }}
      startIcon={<OnlinePredictionIcon />}
      onClick={navigateToPredictiveModule}
    >
    Predicciones
    </Button>
      {/* --- ¡AQUÍ ESTÁ EL NUEVO BOTÓN CON LÓGICA CONDICIONAL! --- */}
    {['vision_analysis', 'pdf'].includes(dataset?.datasetType?.toLowerCase()) && (
    <Button 
      fullWidth 
      size="medium" 
      variant="contained" 
      color="success" // Usamos un color distintivo
      sx={{
        border: "2px solid #ffffff",
        color: "#ffffff",
        backgroundColor: "#2e7d32", // Un verde vibrante
        "& .MuiSvgIcon-root": { color: "#ffffff" },
        "&:hover": {
          backgroundColor: "#1b5e20", // Verde más oscuro
          borderColor: "#ffffff",
        },

      }}
      startIcon={<ScienceIcon />} // O un icono de ojo/cámara
      onClick={navigateToVisionLab}
    >
      VisiónLab
    </Button>
  )}
    <Button 
      fullWidth 
      size="medium" 
      variant="contained"
      sx={{
              backgroundColor: " #005f73",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }}
      startIcon={<ScienceIcon />}
      onClick={handleNavigateToPromptLab}
    >
      PromptLab
    </Button>
  </Box>

  

  {/* Botones 5 y 6 en fila */}
  <Box sx={{ display: 'flex', gap: 2 }}>
    <Button 
    
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: " #26717a",
                borderColor: "#ffffff",
              },
            }}
      fullWidth 
      size="medium" 
      variant="outlined" 
      startIcon={<EditIcon />}
      onClick={onRename}
    >
      Renombrar
    </Button>
    <Button 
      fullWidth 
      size="medium" 
      variant="outlined" 
       color="secondary"
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: " #26717a",
                borderColor: "#ffffff",
              },
            }}
      startIcon={<DeleteIcon />}
      onClick={onDelete}
    >
      Eliminar
    </Button>
  </Box>
</Box>

            </Box>

             {/* --- INICIO: PEGAR ESTE BLOQUE JSX AL FINAL --- */}
               <Dialog open={!!qualityResult} onClose={handleCloseModal}>
                <DialogTitle>Resultado del Diagnóstico</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {qualityResult?.success ?
                            "¡Excelente! El dataset cumple con los criterios de calidad necesarios para continuar con el análisis." :
                            `${qualityResult?.message || "Recomendamos limpiarlo antes de continuar."}`
                        }
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cerrar</Button>
                    {qualityResult?.success ? (
                        <Button onClick={navigateToPredictiveModule} variant="contained">
                            Ir al Módulo Predictivo
                        </Button>
                    ) : (
                        <Button onClick={handleNavigateToAnalysis} variant="contained">
                            Ir a Analizar y Procesar Archivo
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
            {/* --- FIN: PEGAR ESTE BLOQUE JSX AL FINAL --- */}
        </Paper>
    );
}

DatasetPropertiesPanel.propTypes = {
    dataset: PropTypes.shape({
        datasetId: PropTypes.string,
        datasetName: PropTypes.string,
        datasetType: PropTypes.string,
        metadata: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    }),
    onRename: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onRefresh: PropTypes.func,
};




// src/components/dashboard/UploadImagesModal.jsx (VERSIÓN MEJORADA)

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Asegúrate que la ruta sea correcta
import { useNotification } from '../../context/NotificationContext'; // Usamos tu sistema de notificaciones
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import {
    Box, Modal, Typography, Button, IconButton, CircularProgress,
    List, ListItem, ListItemText, ListItemIcon, Paper, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';

// --- ESTILOS ---
const style = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'clamp(400px, 60vw, 600px)', // Ancho adaptable
    bgcolor: 'background.paper',
    borderRadius: 2, boxShadow: 24, p: 3,
    display: 'flex', flexDirection: 'column'
};

const dropzoneStyle = {
    border: '2px dashed',
    borderColor: 'divider',
    borderRadius: 1,
    p: 3,
    textAlign: 'center',
    cursor: 'pointer',
    bgcolor: 'action.hover',
    transition: 'background-color 0.2s',
    '&:hover': { bgcolor: 'action.selected' }
};

// --- CONSTANTES ---
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE_MB = 10;

export default function UploadImagesModal({ open, onClose, projectId, onUploadComplete }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    
    // ---> CAMBIO 2: Cambiar el nombre de 'loading' a 'isUploading' para mayor claridad
    const [isUploading, setIsUploading] = useState(false);
    
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // useCallback para optimizar el rendimiento y evitar re-creaciones de la función
    const handleFileChange = useCallback((acceptedFiles) => {
        const files = Array.from(acceptedFiles);
        const validFiles = [];
        const newErrors = [];

        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
                newErrors.push(`"${file.name}": Tipo de archivo no permitido.`);
            } else if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
                newErrors.push(`"${file.name}": Excede el límite de ${MAX_IMAGE_SIZE_MB} MB.`);
            } else {
                validFiles.push(file);
            }
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        setErrors(newErrors);
    }, []);

    const handleRemoveFile = (fileName) => {
        setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    };
    
    // --- FUNCIÓN ORIGINAL PARA SOLO DATASET ---
     const handleDatasetOnlyUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para analizar.", "warning");
        return;
    }
    if (isUploading) return;

    // ---> 1. PONER EN 'TRUE' AQUÍ PARA BLOQUEAR <---
    setIsUploading(true); 
    setErrors([]);


    try {
        // 1. OBTENER TOKEN DE AUTENTICACIÓN
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        // 2. ENDPOINT ORIGINAL
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/analyze-and-create-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error desconocido del servidor");

        showNotification(result.message || "¡Dataset creado con éxito!", "success");

        // 3. REDIRECCIÓN AL NUEVO DATASET
        const newDatasetId = result.new_dataset.dataset_id;
        navigate(`/project/${projectId}/dataprep/${newDatasetId}`);

        // Limpieza
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error al subir y analizar:", err);
        showNotification(err.message, "error");
    } finally {
       setIsUploading(false);
    }
};

   const handleHybridUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para procesar.", "warning");
        return;
    }
    // ---> CAMBIO 3: Verificar si ya se está subiendo
    if (isUploading) {
        showNotification("Ya hay una subida en proceso.", "info");
        return;
    }

    setIsUploading(true); // <--- Bloqueamos la UI
    setErrors([]);
    showNotification("Procesando imágenes... Esto puede tardar.", "info");

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/upload-for-gallery-and-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) { // <-- Lógica de error mejorada
             // Si el servidor devuelve errores de procesamiento específicos, los mostramos
            if (result.processing_errors && result.processing_errors.length > 0) {
                const errorMessages = result.processing_errors.map(e => `${e.archivo}: ${e.error}`).join('\n');
                throw new Error(`Algunos archivos fallaron:\n${errorMessages}`);
            }
            throw new Error(result.error || "Error desconocido del servidor");
        }
        
        showNotification(result.message || "¡Proceso completado con éxito!", "success");

        // ---> CAMBIO 4: ELIMINAMOS LA REDIRECCIÓN
        // navigate("/galeria"); // <-- LÍNEA ELIMINADA

        // ---> CAMBIO 5: LLAMAMOS A LA FUNCIÓN DEL PADRE
        // Esto le dice a la página que lo abrió: "Oye, ya terminé, actualiza tu lista de datasets"
        if (onUploadComplete) {
            onUploadComplete();
        }
        
        // Limpieza y cierre del modal
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error en el proceso híbrido:", err);
        showNotification(err.message, "error", { autoHideDuration: 10000 }); // Más tiempo para leer errores largos
    } finally {
        setIsUploading(false); // <--- Desbloqueamos la UI, pase lo que pase
    }
};
    
    // Función para manejar el drop de archivos
    const onDrop = (e) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files);
    };

    return (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        borderRadius: 3,
        boxShadow: 6,
        overflow: "hidden",
      },
    }}
  >
    {/* --- TÍTULO --- */}
    <DialogTitle
      sx={{
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontWeight: "bold",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      Crear Dataset desde Imágenes
      <IconButton onClick={onClose} sx={{ color: "inherit" }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    {/* --- CONTENIDO --- */}
    <DialogContent sx={{ p: 4 }}>
      {/* ZONA DE SUBIDA (DROPZONE) */}
      <Paper
        variant="outlined"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input-images").click()}
        sx={{
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
      >
        <input
          id="file-input-images"
          type="file"
          accept={ALLOWED_IMAGE_EXTENSIONS.map((e) => `image/${e}`).join(",")}
          multiple
          hidden
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography>
          Arrastra y suelta imágenes aquí, o haz clic para seleccionar
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Máximo {MAX_IMAGE_SIZE_MB}MB por archivo
        </Typography>
      </Paper>

      {/* LISTA DE ARCHIVOS SELECCIONADOS */}
      {selectedFiles.length > 0 && (
        <Box
          sx={{
            mt: 2,
            flexGrow: 1,
            overflowY: "auto",
            maxHeight: "30vh",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Archivos seleccionados:
          </Typography>
          <List dense>
            {selectedFiles.map((file) => (
              <ListItem key={file.name}>
                <ListItemIcon>
                  <ImageIcon />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <Tooltip title="Quitar archivo">
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* MOSTRAR ERRORES */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((err, i) => (
            <Typography key={i} variant="body2" color="error">
              • {err}
            </Typography>
          ))}
        </Box>
      )}
    </DialogContent>

   {/* --- BOTONES --- */}
<DialogActions
  sx={{
    p: 3,
    pt: 2,
    justifyContent: "space-between", // Alineamos los botones a los extremos
    borderTop: 1,
    borderColor: "divider",
  }}
>
  {/* Botón secundario a la izquierda */}
  <Tooltip title="Crea un archivo CSV con el análisis de las imágenes, sin añadirlas a tu galería creativa.">
      <span> {/* El <span> es necesario para que el Tooltip funcione en un botón deshabilitado */}
        <Button 
            onClick={handleDatasetOnlyUpload} 
             disabled={isUploading || selectedFiles.length === 0} 
        >
            Solo Analizar para Dataset
        </Button>
      </span>
  </Tooltip>

  {/* Botón principal a la derecha */}
  <Tooltip title="Analiza las imágenes para crear un dataset Y las añade a 'Mi Galería' para edición creativa.">
      <span>
          <Button
            variant="contained"
            onClick={handleHybridUpload} // Llama a la nueva función
             disabled={isUploading || selectedFiles.length === 0}
            startIcon={
                    // ---> ¡AQUÍ ESTÁ LA CORRECCIÓN! <---
                    isUploading ? <CircularProgress size={20} color="inherit" /> : null
                
            }
          >
             {isUploading 
              ? "Procesando..."
              : `Analizar y Añadir a Galería (${selectedFiles.length})`}
          </Button>
      </span>
  </Tooltip>
</DialogActions>
  </Dialog>
);

}

// Actualizamos los propTypes
UploadImagesModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    projectId: PropTypes.string.isRequired,
    onUploadComplete: PropTypes.func 
};// src/components/dashboard/UploadImagesModal.jsx (VERSIÓN MEJORADA)

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Asegúrate que la ruta sea correcta
import { useNotification } from '../../context/NotificationContext'; // Usamos tu sistema de notificaciones
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import {
    Box, Modal, Typography, Button, IconButton, CircularProgress,
    List, ListItem, ListItemText, ListItemIcon, Paper, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';

// --- ESTILOS ---
const style = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'clamp(400px, 60vw, 600px)', // Ancho adaptable
    bgcolor: 'background.paper',
    borderRadius: 2, boxShadow: 24, p: 3,
    display: 'flex', flexDirection: 'column'
};

const dropzoneStyle = {
    border: '2px dashed',
    borderColor: 'divider',
    borderRadius: 1,
    p: 3,
    textAlign: 'center',
    cursor: 'pointer',
    bgcolor: 'action.hover',
    transition: 'background-color 0.2s',
    '&:hover': { bgcolor: 'action.selected' }
};

// --- CONSTANTES ---
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE_MB = 10;

export default function UploadImagesModal({ open, onClose, projectId, onUploadComplete }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    
    // ---> CAMBIO 2: Cambiar el nombre de 'loading' a 'isUploading' para mayor claridad
    const [isUploading, setIsUploading] = useState(false);
    
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // useCallback para optimizar el rendimiento y evitar re-creaciones de la función
    const handleFileChange = useCallback((acceptedFiles) => {
        const files = Array.from(acceptedFiles);
        const validFiles = [];
        const newErrors = [];

        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
                newErrors.push(`"${file.name}": Tipo de archivo no permitido.`);
            } else if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
                newErrors.push(`"${file.name}": Excede el límite de ${MAX_IMAGE_SIZE_MB} MB.`);
            } else {
                validFiles.push(file);
            }
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        setErrors(newErrors);
    }, []);

    const handleRemoveFile = (fileName) => {
        setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    };
    
    // --- FUNCIÓN ORIGINAL PARA SOLO DATASET ---
     const handleDatasetOnlyUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para analizar.", "warning");
        return;
    }
    if (isUploading) return;

    // ---> 1. PONER EN 'TRUE' AQUÍ PARA BLOQUEAR <---
    setIsUploading(true); 
    setErrors([]);


    try {
        // 1. OBTENER TOKEN DE AUTENTICACIÓN
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        // 2. ENDPOINT ORIGINAL
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/analyze-and-create-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error desconocido del servidor");

        showNotification(result.message || "¡Dataset creado con éxito!", "success");

        // 3. REDIRECCIÓN AL NUEVO DATASET
        const newDatasetId = result.new_dataset.dataset_id;
        navigate(`/project/${projectId}/dataprep/${newDatasetId}`);

        // Limpieza
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error al subir y analizar:", err);
        showNotification(err.message, "error");
    } finally {
       setIsUploading(false);
    }
};

   const handleHybridUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para procesar.", "warning");
        return;
    }
    // ---> CAMBIO 3: Verificar si ya se está subiendo
    if (isUploading) {
        showNotification("Ya hay una subida en proceso.", "info");
        return;
    }

    setIsUploading(true); // <--- Bloqueamos la UI
    setErrors([]);
    showNotification("Procesando imágenes... Esto puede tardar.", "info");

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/upload-for-gallery-and-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) { // <-- Lógica de error mejorada
             // Si el servidor devuelve errores de procesamiento específicos, los mostramos
            if (result.processing_errors && result.processing_errors.length > 0) {
                const errorMessages = result.processing_errors.map(e => `${e.archivo}: ${e.error}`).join('\n');
                throw new Error(`Algunos archivos fallaron:\n${errorMessages}`);
            }
            throw new Error(result.error || "Error desconocido del servidor");
        }
        
        showNotification(result.message || "¡Proceso completado con éxito!", "success");

        // ---> CAMBIO 4: ELIMINAMOS LA REDIRECCIÓN
        // navigate("/galeria"); // <-- LÍNEA ELIMINADA

        // ---> CAMBIO 5: LLAMAMOS A LA FUNCIÓN DEL PADRE
        // Esto le dice a la página que lo abrió: "Oye, ya terminé, actualiza tu lista de datasets"
        if (onUploadComplete) {
            onUploadComplete();
        }
        
        // Limpieza y cierre del modal
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error en el proceso híbrido:", err);
        showNotification(err.message, "error", { autoHideDuration: 10000 }); // Más tiempo para leer errores largos
    } finally {
        setIsUploading(false); // <--- Desbloqueamos la UI, pase lo que pase
    }
};
    
    // Función para manejar el drop de archivos
    const onDrop = (e) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files);
    };

    return (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        borderRadius: 3,
        boxShadow: 6,
        overflow: "hidden",
      },
    }}
  >
    {/* --- TÍTULO --- */}
    <DialogTitle
      sx={{
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontWeight: "bold",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      Crear Dataset desde Imágenes
      <IconButton onClick={onClose} sx={{ color: "inherit" }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    {/* --- CONTENIDO --- */}
    <DialogContent sx={{ p: 4 }}>
      {/* ZONA DE SUBIDA (DROPZONE) */}
      <Paper
        variant="outlined"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input-images").click()}
        sx={{
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
      >
        <input
          id="file-input-images"
          type="file"
          accept={ALLOWED_IMAGE_EXTENSIONS.map((e) => `image/${e}`).join(",")}
          multiple
          hidden
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography>
          Arrastra y suelta imágenes aquí, o haz clic para seleccionar
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Máximo {MAX_IMAGE_SIZE_MB}MB por archivo
        </Typography>
      </Paper>

      {/* LISTA DE ARCHIVOS SELECCIONADOS */}
      {selectedFiles.length > 0 && (
        <Box
          sx={{
            mt: 2,
            flexGrow: 1,
            overflowY: "auto",
            maxHeight: "30vh",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Archivos seleccionados:
          </Typography>
          <List dense>
            {selectedFiles.map((file) => (
              <ListItem key={file.name}>
                <ListItemIcon>
                  <ImageIcon />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <Tooltip title="Quitar archivo">
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* MOSTRAR ERRORES */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((err, i) => (
            <Typography key={i} variant="body2" color="error">
              • {err}
            </Typography>
          ))}
        </Box>
      )}
    </DialogContent>

   {/* --- BOTONES --- */}
<DialogActions
  sx={{
    p: 3,
    pt: 2,
    justifyContent: "space-between", // Alineamos los botones a los extremos
    borderTop: 1,
    borderColor: "divider",
  }}
>
  {/* Botón secundario a la izquierda */}
  <Tooltip title="Crea un archivo CSV con el análisis de las imágenes, sin añadirlas a tu galería creativa.">
      <span> {/* El <span> es necesario para que el Tooltip funcione en un botón deshabilitado */}
        <Button 
            onClick={handleDatasetOnlyUpload} 
             disabled={isUploading || selectedFiles.length === 0} 
        >
            Solo Analizar para Dataset
        </Button>
      </span>
  </Tooltip>

  {/* Botón principal a la derecha */}
  <Tooltip title="Analiza las imágenes para crear un dataset Y las añade a 'Mi Galería' para edición creativa.">
      <span>
          <Button
            variant="contained"
            onClick={handleHybridUpload} // Llama a la nueva función
             disabled={isUploading || selectedFiles.length === 0}
            startIcon={
                    // ---> ¡AQUÍ ESTÁ LA CORRECCIÓN! <---
                    isUploading ? <CircularProgress size={20} color="inherit" /> : null
                
            }
          >
             {isUploading 
              ? "Procesando..."
              : `Analizar y Añadir a Galería (${selectedFiles.length})`}
          </Button>
      </span>
  </Tooltip>
</DialogActions>
  </Dialog>
);

}

// Actualizamos los propTypes
UploadImagesModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    projectId: PropTypes.string.isRequired,
    onUploadComplete: PropTypes.func 
};

return de hubpage

 return (
    // Contenedor principal de la página, ocupa todo el espacio
     <Box sx={{ p: 1, flexGrow: 1, mt: "72px" }}>
        
        {/* --- CABECERA (Inspirada en tu otro diseño) --- */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            mb: 4, // Margen inferior para separar de las tarjetas
            color: '#ffffff'
          }}
        >
          <Box>
              <Typography variant="h5" fontWeight="bold">
                Laboratorio de Visión
              </Typography>
              {loading ? (
                    <Skeleton width="250px" sx={{ bgcolor: 'grey.700' }} />
                ) : (
                    <Typography variant="body1">
                        {/* Pequeña mejora opcional para el título */}
                        Dataset: <strong>{dataset?.name || (datasetType === 'pdf' ? `Documento PDF` : `Análisis de Imágenes`)}</strong>
                    </Typography>
              )}
          </Box>
        </Box>

        {/* --- GRID DE TARJETAS (Ahora centrado y responsivo) --- */}
        <Grid container spacing={5} alignItems="stretch">
              {cardsToDisplay.map((card, index) => (
                <ActionCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    buttonText={card.buttonText}
                    onClick={card.onClick}
                    disabled={card.disabled}
                />
            ))}
        </Grid>
    </Box>
);
}-------


// En src/pages/VisionLabHubPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; 
import { Box, Typography, Paper, Grid, Button, Icon, Skeleton } from '@mui/material';

// Importa los iconos que vamos a usar
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups'; // Icono para Clustering
import RuleIcon from '@mui/icons-material/Rule'; // Icono para Evaluación
import ScienceIcon from '@mui/icons-material/Science'; // Icono para Prueba


const ActionCard = ({ icon, title, description, buttonText, onClick, disabled = false }) => (
  <Grid item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
    <Paper 
      elevation={3}
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        flexGrow: 1,          // ocupa todo el alto del Grid
        height: "100%",       // asegura que todas igualen
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}
    >
      <Box sx={{ flexGrow: 1, mb: 3 }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ whiteSpace: "pre-line" }}
        >
          {description}
        </Typography>
      </Box>
      <Button 
        variant="contained" 
        onClick={onClick}
        disabled={disabled}
        sx={{ mt: 'auto' }}
      >
        {buttonText}
      </Button>
    </Paper>
  </Grid>
);

// --- Componente Principal de la Página ---
export default function VisionLabHubPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const clusterResultId = searchParams.get('clusterResultId');
    const [modelDetails, setModelDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(true)
    
       // --- ¡CAMBIO CLAVE 1: LEEMOS EL modelId DE LA URL! ---
    // Este ID puede ser el real (UUID) o el temporal del modelo fantasma.
    const modelId = searchParams.get('modelId');
 
    // Este useEffect se encarga de cargar los detalles del dataset
    // para poder mostrar su nombre en la cabecera.
    useEffect(() => {
    // Definimos una única función para cargar todo lo que esta página necesita
    const fetchPageData = async () => {
        setLoading(true);

        try {
            // --- 1. Cargar detalles del DATASET (esto ya lo tenías) ---
            // (Aquí estoy usando tu lógica de simulación, si tienes una llamada real, úsala)
            setDataset({ 
                id: datasetId, 
                name: `Análisis de Imágenes (${datasetId.substring(0, 8)}...)` 
            });

            // --- 2. Cargar detalles del MODELO (si hay un modelId) ---
            if (modelId) {
                // Primero, comprobamos si es un modelo fantasma en sessionStorage
                if (modelId.startsWith("temp_")) {
                    const phantomString = sessionStorage.getItem("phantomModel");
                    if (phantomString) {
                        // Si lo encontramos, usamos esos datos
                        setModelDetails(JSON.parse(phantomString));
                    } else {
                        // Si no está en sessionStorage (ej: el usuario refrescó la página 
                        // mucho después), podemos mostrar un aviso.
                        console.warn(`Modelo temporal ${modelId} no encontrado en sessionStorage.`);
                        setModelDetails(null); // O un objeto de error
                    }
                } else {
                    // Si no es temporal, es un ID real, así que llamamos a la API
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) throw new Error("Sesión no válida para obtener detalles del modelo.");

                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelId}`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                    });
                    const result = await response.json();

                    if (result.success) {
                        setModelDetails(result.data);
                    } else {
                        throw new Error(result.error || "No se pudieron cargar los detalles del modelo.");
                    }
                }
            } else {
                // Si no hay modelId en la URL, nos aseguramos de que modelDetails sea nulo
                setModelDetails(null);
            }

        } catch (error) {
            console.error("Error al cargar datos para VisionLabHub:", error);
            // Aquí podrías usar tu showNotification
        } finally {
            setLoading(false);
        }
    };

    fetchPageData();

// El array de dependencias es clave: este efecto se ejecuta si el datasetId o el modelId de la URL cambian.
}, [datasetId, modelId]);

    // --- Lógica de Navegación ---
    const handleNavigation = (path, isExternalModule = false) => {
    if (isExternalModule) {
        // Para el botón que necesita ir a un módulo diferente y pasar el ID como parámetro
        navigate(`${path}?datasetId=${datasetId}`);
    } else {
        // Para los botones de Etiquetado y Clustering que usan rutas completas
        navigate(path);
    }
};
    
    // --- Datos para nuestras tarjetas ---
const actionCardsData = [
  {
    icon: <RuleIcon sx={{ fontSize: 40 }} />,
    title: "Evaluar Modelo",
    description:
      "Mide el rendimiento del modelo con un nuevo dataset y obtén métricas detalladas como la precisión.",
    buttonText: "Iniciar Evaluación",
    onClick: () =>
      navigate(`/models/vision/${modelId}/evaluate`, {
        state: { model: modelDetails },
      }),
    disabled: !modelId,
  },
  {
    icon: <ScienceIcon sx={{ fontSize: 40 }} />,
    title: "Prueba Interactiva",
    description:
      "Clasificador de imagenes con un modelo de IA en tiempo real. Ideal para pruebas rápidas.",
    buttonText: "Probar Predicción",
    onClick: () =>
      navigate(`/models/vision/${modelId}/predict`, {
        state: { model: modelDetails },
      }),
    disabled: !modelId,
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    title: "Descubrir Grupos (Clustering)",
    description:
      "Agrupa automáticamente imágenes similares para encontrar patrones visuales ocultos en los datos.",
    buttonText: "Ejecutar Clustering",
    onClick: () => navigate("clustering"),
    disabled: false,
  },
  {
    icon: <ImageSearchIcon sx={{ fontSize: 40 }} />,
    title: "Etiquetado y Entrenamiento",
    description:
      "Agregar etiquetas a las imagenes y entrenar un nuevo modelo de clasificación desde cero.",
    buttonText: "Etiquetado y Prediccion",
    onClick: () => {
      let explorerPath = "explorer";
      if (clusterResultId) {
        explorerPath += `?clusterResultId=${clusterResultId}`;
      }
      navigate(explorerPath);
    },
    disabled: false, // 👈 faltaba también cerrar el objeto
  },
];

    return (
    // Contenedor principal de la página, ocupa todo el espacio
     <Box sx={{ p: 1, flexGrow: 1, mt: "72px" }}>
        
        {/* --- CABECERA (Inspirada en tu otro diseño) --- */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            mb: 4, // Margen inferior para separar de las tarjetas
            color: '#ffffff'
          }}
        >
          <Box>
              <Typography variant="h5" fontWeight="bold">
                Laboratorio de Visión
              </Typography>
              {loading ? (
                    <Skeleton width="250px" sx={{ bgcolor: 'grey.700' }} />
                ) : (
                    <Typography variant="body1">
                        Dataset: <strong>{dataset?.name || datasetId}</strong>
                    </Typography>
              )}
          </Box>
        </Box>

        {/* --- GRID DE TARJETAS (Ahora centrado y responsivo) --- */}
        <Grid container spacing={5} alignItems="stretch">
            {actionCardsData.map((card, index) => (
                <ActionCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    buttonText={card.buttonText}
                    onClick={card.onClick}
                    disabled={card.disabled}
                />
            ))}
        </Grid>
    </Box>
);
}
----------------------------------------------------





// En src/pages/ClusteringPage.jsx
import React, { useState, useEffect, useMemo } from 'react'; // <-- 1. Import combinado
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box, Paper, Typography, CircularProgress, Alert, Button, Grid,   TextField,
    List, ListItemButton, ListItemText, Select, MenuItem, FormControl, InputLabel,
    Dialog, DialogTitle, DialogContent, DialogContentText,DialogActions
} from '@mui/material';
import { FixedSizeGrid as GridVirt } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import {  ListItemAvatar, Avatar } from '@mui/material';
import { supabase } from '../supabaseClient'; 
import { useNotification } from '../context/NotificationContext';

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
                                <Grid item key={img.id} xs={12} sm={6} md={3}>
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
        if (selectedImageIds.size === 0) { showNotification("Por favor, selecciona al menos una imagen.", "warning"); return; }
        setClusteringStep('loading');
        try {
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

    if (loading && images.length === 0) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;

    // --- 3. FUNCIÓN RENDER RIGHT PANEL (AÑADIDA) ---
    const renderRightPanel = () => {
        switch (clusteringStep) {
            case 'loading':
                return <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress sx={{ mb: 2 }} /><Typography>Procesando...</Typography></Paper>;
            case 'results':
                return (
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                        <Typography variant="h6">Resultados del Agrupamiento</Typography>
                        <Alert severity="success" icon={false}>¡Listo! Se encontraron <strong>{clusteringResults.n_clusters}</strong> grupos.</Alert>
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
        <Button onClick={() => navigate('/my-models')}>
            Ver Mis Modelos
        </Button>
        <Button 
            variant="contained" 
            onClick={() => navigate(`/project/${projectId}/vision-lab/${datasetId}?clusterResultId=${savedModelId}`)} 
            autoFocus
        >
            Ir a Etiquetado
        </Button>
    </DialogActions>
</Dialog>

        </Box>
    );
}



// En src/pages/VisionExplorerPage.jsx Ultima version


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

            let masterAnalysisList = datasetResult.analysisData || [];
            const imageList = datasetResult.imageData || [];
            const imageMap = new Map(imageList.map(img => [img.id, img.signed_url]));

            // --- DEPURACIÓN: Rutas de almacenamiento ---
            console.log("--- Rutas en `masterAnalysisList` ---");
            masterAnalysisList.forEach(img => console.log(img.storage_path));

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
     

     console.log("IMÁGENES A MOSTRAR:", displayedGalleryImages);
    console.log("GRUPO ACTIVO:", activeGroupKey);
    // --- 4. CONDICIONES DE RETORNO TEMPRANO (DESPUÉS DE TODOS LOS HOOKS) ---
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
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
          console.log("RESPUESTA COMPLETA DEL ENTRENAMIENTO:", result);
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
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
            <Paper sx={{ p: 2, height: '100%' }}>
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
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
      <Typography variant="body2" color="white">Dataset: {loading ? 'Cargando...' : (datasetName || datasetId)}</Typography>
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
    
    <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
        Guarda tus etiquetas para usarlas más tarde o continúa para entrenar un modelo.
    </Typography>
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
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Precisión General (Accuracy)"
          value={`${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`}
          subtitle="Porcentaje de imágenes clasificadas correctamente en el set de prueba."
        />
      </Grid>
      <Grid item xs={12} md={6}>
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
}-------------------------------------------------------------------------------------

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

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const fetchOptions = { headers: { Authorization: `Bearer ${session.access_token}` } };

            const datasetUrl = `${import.meta.env.VITE_API_URL}/api/vision-lab/dataset/${datasetId}`;
            const clusterUrl = clusterResultId ? `${import.meta.env.VITE_API_URL}/api/models/clustering/${clusterResultId}` : null;

            const [datasetRes, clusterRes] = await Promise.all([
                fetch(datasetUrl, fetchOptions),
                clusterUrl ? fetch(clusterUrl, fetchOptions) : Promise.resolve(null)
            ]);

            if (!datasetRes.ok) throw new Error(`Error del servidor (imágenes): ${datasetRes.status}`);
            const datasetResult = await datasetRes.json();
            if (!datasetResult.success) throw new Error(datasetResult.error || "Error en API de imágenes.");
            
            let analysisList = datasetResult.analysisData || [];
            const imageList = datasetResult.imageData || [];
            const imageMap = new Map(imageList.map(img => [img.id, img.signed_url]));

            // --- DEPURACIÓN: Ver qué rutas de almacenamiento tenemos en los datos principales ---
            console.log("--- PASO 1: Rutas en `analysisList` (Dataset Principal) ---");
            analysisList.forEach(img => console.log(img.storage_path));
            // --------------------------------------------------------------------------

            if (clusterResultId && clusterRes && clusterRes.ok) {
                const clusterResultData = await clusterRes.json();
                if (clusterResultData.success && Array.isArray(clusterResultData.data?.results)) {
                    
                    const path_to_cluster_map = new Map(
                        clusterResultData.data.results.map(item => [item.storage_path, item.cluster_id])
                    );

                    // --- DEPURACIÓN: Ver qué rutas de almacenamiento tenemos en el mapa de clustering ---
                    console.log("--- PASO 2: Rutas en `path_to_cluster_map` (Clustering) ---");
                    for (const key of path_to_cluster_map.keys()) {
                        console.log(key);
                    }
                    // --------------------------------------------------------------------------------

                    analysisList = analysisList.map(image => {
                        const clusterId = path_to_cluster_map.get(image.storage_path);
                        return {
                            ...image,
                            cluster_id: clusterId ?? null
                        };
                    });

                    // --- DEPURACIÓN: Ver el resultado final del cruce ---
                    console.log("--- PASO 3: `analysisList` después del cruce (revisa si `cluster_id` se añadió) ---");
                    console.log(analysisList);
                    // ----------------------------------------------------

                    const groups = clusterResultData.data.results.reduce((acc, item) => {
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
            
            const combinedData = analysisList.map(item => ({
                ...item,
                signed_image_url: imageMap.get(item.image_id) || null,
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
     

     console.log("IMÁGENES A MOSTRAR:", displayedGalleryImages);
    console.log("GRUPO ACTIVO:", activeGroupKey);
    // --- 4. CONDICIONES DE RETORNO TEMPRANO (DESPUÉS DE TODOS LOS HOOKS) ---
    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
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
          console.log("RESPUESTA COMPLETA DEL ENTRENAMIENTO:", result);
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
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
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
            <Paper sx={{ p: 2, height: '100%' }}>
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
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
             pt: 'calc(72px + 1px)',                // bordes redondeados
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
      <Typography variant="body2" color="white">Dataset: {loading ? 'Cargando...' : (datasetName || datasetId)}</Typography>
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
     <Paper sx={{ flex: 3, p: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 

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
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

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
            Continuar a Entrenamiento
        </Button>
    </Box>
    
    <Typography variant="caption" display="block" sx={{ textAlign: 'center', mt: 1.5, color: 'text.secondary' }}>
        Guarda tus etiquetas para usarlas más tarde o continúa para entrenar un modelo.
    </Typography>
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
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Precisión General (Accuracy)"
          value={`${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`}
          subtitle="Porcentaje de imágenes clasificadas correctamente en el set de prueba."
        />
      </Grid>
      <Grid item xs={12} md={6}>
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
-----------------------------------------------------

// En src/pages/VisionExplorerPage.jsx

import React, { useState, useEffect, useMemo} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
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
    const { showNotification } = useNotification();

    // --- Estados Corregidos y Unificados ---
    const [analysisData, setAnalysisData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estado para la VISTA DE DETALLE (una sola imagen)
    const [selectedImage, setSelectedImage] = useState(null); 
    
    // Estado para la SELECCIÓN MÚLTIPLE
   const [selectedImageIds, setSelectedImageIds] = useState(new Set());
    
    // Estados para el etiquetado
    const [customTags, setCustomTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [bulkTag, setBulkTag] = useState("");
    const [viewMode, setViewMode] = useState('gallery');

    // Estados para el entrenamiento (sin cambios)
    const [isTrainingModalOpen, setTrainingModalOpen] = useState(false);
    const [trainingConfig, setTrainingConfig] = useState({ model_arch: 'resnet34', epochs: 5 });
    const [trainingState, setTrainingState] = useState({ step: 'config', results: null, error: null });
    const [modelDisplayName, setModelDisplayName] = useState('');
    const [isTaggingComplete, setTaggingComplete] = useState(false);

    
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
  
    const handleApplyBulkTag = async () => {
    const idsToTag = Array.from(selectedImageIds);
    if (!bulkTag.trim() || idsToTag.length === 0) return;
    const tagName = bulkTag.trim();

    // Añadimos un estado de carga para el botón
    setLoading(true); 

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const successfulIds = [];
        const failedIds = [];

        for (const imageId of idsToTag) {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/images/${imageId}/tags`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tagName })
                });

                if (response.ok) {
                    successfulIds.push(imageId);
                } else {
                    // Si falla, guardamos el ID para mantenerlo seleccionado
                    failedIds.push(imageId);
                }
            } catch (error) {
                console.error(`Error de red para la imagen ${imageId}:`, error);
                failedIds.push(imageId);
            }
        }

        // --- Lógica de Feedback ---
        if (successfulIds.length > 0) {
            showNotification(`Etiqueta "${tagName}" aplicada a ${successfulIds.length} imágenes.`, "success");
        }
        if (failedIds.length > 0) {
            showNotification(`${failedIds.length} etiquetas no se pudieron aplicar. Las imágenes fallidas permanecen seleccionadas.`, "error");
            // Actualizamos el estado para que solo las fallidas queden seleccionadas
            setSelectedImageIds(new Set(failedIds));
        } else {
            // Si todo fue un éxito, limpiamos la selección
            setSelectedImageIds(new Set());
        }

        setBulkTag("");

    } catch (error) {
        showNotification(error.message, "error");
    } finally {
        setLoading(false); // Quitamos el estado de carga
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

  useEffect(() => {
    let imageToLoad = null;

    // Si estamos en modo detalle, esa es la imagen que manda.
    if (viewMode === 'detail' && selectedImage) {
        imageToLoad = selectedImage;
    } 
    // Si estamos en modo galería Y SOLO hay una imagen seleccionada,
    // esa es la que mostramos en el panel de detalle.
    else if (viewMode === 'gallery' && selectedImageIds.size === 1) {
        const firstId = Array.from(selectedImageIds)[0];
        imageToLoad = analysisData.find(img => img.image_id === firstId);
    }

    // Actualizamos el estado de la imagen de detalle
    setSelectedImage(imageToLoad);

    // Si tenemos una imagen para cargar, pedimos sus etiquetas manuales.
    // Si no, fetchCustomTags se llamará con 'null' y el useEffect de etiquetas limpiará el estado.
    if (imageToLoad) {
        fetchCustomTags(imageToLoad.image_id);
    } else {
        setCustomTags([]); // Limpia explícitamente si no hay imagen
    }

}, [viewMode, selectedImageIds, analysisData]); // Depende de estos tres estados

  // --- Carga de datos principal ---
  useEffect(() => {
    const fetchAnalysisData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        
        const url = `${import.meta.env.VITE_API_URL}/api/vision-lab/dataset/${datasetId}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const analysisList = result.analysisData || [];
        const imageList = result.imageData || [];
        const imageMap = new Map();
        imageList.forEach(img => imageMap.set(img.id, img.signed_url));

        const combinedData = analysisList.map(item => ({
          ...item,
          signed_image_url: imageMap.get(item.image_id) || null
        }));

        setAnalysisData(combinedData);
        setSelectedImage(null);
        setViewMode('gallery');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) fetchAnalysisData();
  }, [datasetId]);

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


    const handleStartTraining = async () => {
        setTrainingState({ step: 'loading', results: null, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/train`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trainingConfig)
            });
            const result = await response.json();

            if (!response.ok || !result.success) throw new Error(result.error);

            // Guardamos el nombre por defecto para el modelo basado en las etiquetas
            const defaultModelName = `Clasificador de ${result.training_results.confusion_matrix_labels.join(', ')}`;
            setModelDisplayName(defaultModelName);
            setTrainingState({ step: 'results', results: result.training_results, error: null });

        } catch (err) {
            setTrainingState({ step: 'error', results: null, error: err.message });
        }
    };

   const handleSaveModel = async () => {
    if (!modelDisplayName.trim()) {
        showNotification("Por favor, dale un nombre a tu modelo.", "warning");
        return;
    }
    setTrainingState(prev => ({ ...prev, step: 'loading' }));

    try {
        const artifactsBytes = trainingState.results.artifacts_bytes;
        let artifacts_bytes_b64;

        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        // Comprobamos si los "bytes" ya son un string (probablemente Base64)
        if (typeof artifactsBytes === 'string') {
            // Si ya es un string, lo usamos directamente.
            artifacts_bytes_b64 = artifactsBytes;
        } else if (Array.isArray(artifactsBytes)) {
            // Si es un array (el comportamiento antiguo), hacemos la conversión.
            const binaryString = artifactsBytes.map(byte => String.fromCharCode(byte)).join('');
            artifacts_bytes_b64 = btoa(binaryString);
        } else {
            // Si no es ni un string ni un array, hay un problema con los datos.
            throw new Error("El formato de los artefactos del modelo no es válido.");
        }

        const payload = {
            model_display_name: modelDisplayName,
            artifacts_bytes_b64: artifacts_bytes_b64,
            training_results: { ...trainingState.results, artifacts_bytes: undefined },
            problem_type: 'vision_classification'
        };
        
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/save-model`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        
        showNotification("¡Modelo guardado con éxito!", "success");
        setTrainingModalOpen(false);
        navigate('/my-models');

    } catch(err) {
        // Ahora el mensaje de error será más claro, como "El formato... no es válido"
        setTrainingState(prev => ({ ...prev, step: 'error', error: `Error al guardar: ${err.message}` }));
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

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
    if (analysisData.length === 0) return <Alert severity="info" sx={{ m: 4 }}>No hay datos de análisis en este dataset.</Alert>;

    const renderRightPanel = () => {
    // ---- CASO 1: NINGUNA IMAGEN SELECCIONADA (usa .size) ----
    if (viewMode === 'gallery' && selectedImageIds.size === 0) {
        return (
            <Paper sx={{ p: 2, /* ... */ }}>
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

    // ---- CASO 2: MÁS DE UNA IMAGEN SELECCIONADA (etiquetado masivo) ----
    if (viewMode === 'gallery' && selectedImageIds.size > 0) {
         // Si solo hay una seleccionada, la mostramos en el panel de etiquetado individual.
         // Así que este bloque solo se ejecuta para 2 o más.
        if (selectedImageIds.size > 1) {
            return (
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyBulkTag()}
                        fullWidth
                        size="small"
                    />
                    <Button variant="contained" color="primary" onClick={handleApplyBulkTag}>
                        Aplicar a {selectedImageIds.size} {/* <-- Usa .size */}
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
             pt: 'calc(72px + 1px)',                // bordes redondeados
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
      <Typography variant="body2" color="white">Dataset: {datasetId}</Typography>
  </Box>

  {/* ---- ¡AQUÍ ESTÁ EL NUEVO BOTÓN! ---- */}
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
    onClick={() => navigate(`/project/${projectId}/dataset/${datasetId}/clustering`)}
    
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
    }}>

    {/* === PANEL IZQUIERDO: Galería Virtualizada o Visor de Detalle === */}
<Paper sx={{ flex: 3, p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 

    

    {/* El contenedor de la galería ahora ocupa el espacio restante */}
    <Box sx={{ flexGrow: 1, width: '100%', height: '100%' }}>
      {viewMode === 'gallery' && (
        <AutoSizer>
          {({ height, width }) => {
            const columnCount = 4; // Puedes ajustar esto dinámicamente si quieres
            const columnWidth = width / columnCount;
            const rowCount = Math.ceil(analysisData.length / columnCount);

            return (
              <GridVirt
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={height}
                rowCount={rowCount}
                 rowHeight={CELL_ROW_HEIGHT} // <-- USA LA CONSTANTE CALCULADA
                width={width}
                // ¡Importante! Pasamos todos los datos y funciones que GridCell necesita
                itemData={{
                  items: analysisData,
                  selectedIds: selectedImageIds,
                  toggleSelection: toggleSelection,
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
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

    {/* --- PASO 1: ETIQUETADO --- */}
    {!isTaggingComplete ? (
        <>
            {/* Muestra el panel de acciones de etiquetado normal */}
            <Box>
                {renderRightPanel()}
            </Box>

            <Paper 
  sx={{ 
    p: 2, 
    mt: 'auto', 
    borderRadius: 2, 
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)' 
  }}
>
  {/* Barra de herramientas arriba de Confirmar */}
  {viewMode === 'gallery' && (
    <Box sx={{ display: 'flex', gap: 2, mb: 2, flexShrink: 0 }}>
      <Button
        variant="contained"
        size="small"
        sx={{
          flex: 1,
          backgroundColor: " #005f73",
          color: "#fff",
          borderRadius: 2,
          textTransform: "none",
          fontWeight: "bold",
          "&:hover": {
            backgroundColor: "#2e7d7d"
          }
        }}
        onClick={handleSelectAll}
      >
        Seleccionar Todo
      </Button>

      <Button
        variant="contained"
        size="small"
        sx={{
          flex: 1,
          backgroundColor:" #005f73",
          color: "#fff",
          borderRadius: 2,
          textTransform: "none",
          fontWeight: "bold",
          "&:hover": {
            backgroundColor: "#9e3227"
          }
        }}
        onClick={handleDeselectAll}
      >
        Deseleccionar Todo
      </Button>
    </Box>
  )}

  {/* Botón principal */}
  <Button
    variant="contained"
    color="primary"
    fullWidth
    size="large"
    sx={{
      borderRadius: 2,
      fontWeight: "bold",
      textTransform: "none",
      py: 1.5
    }}
    onClick={() => setTaggingComplete(true)}
  >
    Confirmar Etiquetas y Entrenar
  </Button>
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
                    <MenuItem value="resnet34">ResNet34 (Recomendado)</MenuItem>
                    <MenuItem value="mobilenet_v2">MobileNetV2 (Más Rápido)</MenuItem>
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
                  Entrenar y Revisar
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
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Precisión General (Accuracy)"
          value={`${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`}
          subtitle="Porcentaje de imágenes clasificadas correctamente en el set de prueba."
        />
      </Grid>
      <Grid item xs={12} md={6}>
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
------------------------------------------------------
// En src/pages/MyModelsPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  Chip, CircularProgress, Alert, IconButton, Tooltip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';
import CategoryIcon from '@mui/icons-material/Category';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import DeleteIcon from '@mui/icons-material/Delete';

const DataDisplayWrapper = ({ loading, error, children }) => {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  return children;
};

export default function MyModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No estás autenticado.");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudieron cargar los modelos.');
        }
        setModels(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

     const handleModelActionClick = (model) => {
        // Leemos el tipo de problema, usando el nombre correcto (camelCase)
        const problemType = model.problemType; 

        switch (problemType) {
            case 'vision_classification':
            case 'clustering':
                const projectId = model.projectId;
                const datasetId = model.sourceDatasetId;
                
                if (projectId && datasetId) {
                       navigate(`/project/${projectId}/vision-lab/${datasetId}`);
                } else {
                    alert("Error: Faltan datos (proyecto o dataset ID) para navegar al laboratorio.");
                }
                break;
            
            case 'clasificacion':
            case 'regresion':
                // Para los modelos tabulares, navegamos a la página de análisis
                navigate(`/models/${model.id}/analyze`);
                break;
            
            default:
                alert(`Acción no disponible para el tipo de modelo: "${problemType}"`);
        }
    };

  const handleOpenDeleteDialog = (model) => { setModelToDelete(model); setOpenDeleteDialog(true); };
  const handleCloseDeleteDialog = () => { setOpenDeleteDialog(false); setModelToDelete(null); };
  const handleConfirmDelete = async () => { /* Tu función de borrado está perfecta, no cambia */ 
      if (!modelToDelete) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No estás autenticado.");
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo eliminar el modelo.');
          setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
          alert(result.message);
      } catch (err) {
          alert(`Error: ${err.message}`);
          setError(err.message);
      } finally {
          handleCloseDeleteDialog();
      }
  };

  // --- ¡FUNCIÓN DE CHIP ACTUALIZADA! ---
  const getProblemTypeChip = (problemType) => {
    switch (problemType) {
        case 'clasificacion': return <Chip icon={<CategoryIcon />} label="Clasificación" color="secondary" size="small" variant="outlined" />;
        case 'regresion': return <Chip icon={<FunctionsIcon />} label="Regresión" color="primary" size="small" variant="outlined" />;
        case 'vision_classification': return <Chip icon={<CameraAltIcon />} label="Visión" color="success" size="small" variant="outlined" />;
        case 'clustering': return <Chip icon={<GroupsIcon />} label="Clustering" color="info" size="small" variant="outlined" />;
        default: return <Chip label={problemType || 'Desconocido'} size="small" />;
    }
};


  // --- ¡FUNCIÓN DE MÉTRICA ACTUALIZADA! ---
  const getMainMetric = (model) => {
    return model.mainMetric || 'N/A';
};
  
  return (
  <Box
  sx={{
    height: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    pt: 'calc(72px + 1px)', 
    px: 3,
    pb: 3,
  }}
>
    {/* --- Sección del Encabezado de la Página --- */}
    <Box sx={{ flexShrink: 0, mb: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
        Mis Modelos Predictivos
      </Typography>
      <Typography sx={{ color: 'white' }}>
       Esta sección muestra todos los modelos guardados. Selecciona el botón ‘Analizar’ para examinar las predicciones generadas por cada modelo.
      </Typography>
    </Box>

    {/* --- Sección del Contenido Principal (la tabla) --- */}
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      <DataDisplayWrapper loading={loading} error={error}>
        {models.length > 0 ? (
          <Paper sx={{ boxShadow: 3, borderRadius: 2 }}>
            <TableContainer>
              {/* Tu tabla <Table>... </Table> va aquí, sin cambios */}
              <Table aria-label="tabla de modelos">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 'bold' } }}>
                    <TableCell>Nombre del Modelo</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo de Problema</TableCell>
                    <TableCell>Métrica Principal</TableCell>
                    <TableCell>Fecha de Creación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow
                    key={model.id}
                    hover
                    sx={{
                   '& td, & th': { borderBottom: '2px solid rgba(224, 224, 224, 1)' }, 
                   '&:last-child td, &:last-child th': { border: 0 } // quita la última línea
                    }}
                    >
                      <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                        {model.modelName}
                      </TableCell>
                      <TableCell>{model.projectName}</TableCell>
                      <TableCell>{getProblemTypeChip(model.problemType)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                        {model.mainMetric}
                      </TableCell>
                      <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                    <Tooltip title="Analizar Modelo">
                        <Button
            variant="contained"
            startIcon={<AssessmentIcon />}
            onClick={() => handleModelActionClick(model)}
            size="small"
            sx={{ mr: 1 }}        >
            Analizar
                       </Button>

                    </Tooltip>
                    {/* --- NUEVO BOTÓN DE ELIMINAR --- */}
                    <Tooltip title="Eliminar Modelo">
                        <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(model)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                  </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Alert severity="info">
            No existe ningún modelo guardado
          </Alert>
        )}
      </DataDisplayWrapper>
       {/* --- NUEVO DIÁLOGO DE CONFIRMACIÓN (ponlo al final, antes del cierre de Box) --- */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que quieres eliminar el modelo 
                        <strong> "{modelToDelete?.modelName}"</strong>? 
                        Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
  </Box>
);
}
--------------------------
// src/components/dashboard/UploadImagesModal.jsx (VERSIÓN MEJORADA)

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Asegúrate que la ruta sea correcta
import { useNotification } from '../../context/NotificationContext'; // Usamos tu sistema de notificaciones
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';

import {
    Box, Modal, Typography, Button, IconButton, CircularProgress,
    List, ListItem, ListItemText, ListItemIcon, Paper, Tooltip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ImageIcon from '@mui/icons-material/Image';
import DeleteIcon from '@mui/icons-material/Delete';

// --- ESTILOS ---
const style = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'clamp(400px, 60vw, 600px)', // Ancho adaptable
    bgcolor: 'background.paper',
    borderRadius: 2, boxShadow: 24, p: 3,
    display: 'flex', flexDirection: 'column'
};

const dropzoneStyle = {
    border: '2px dashed',
    borderColor: 'divider',
    borderRadius: 1,
    p: 3,
    textAlign: 'center',
    cursor: 'pointer',
    bgcolor: 'action.hover',
    transition: 'background-color 0.2s',
    '&:hover': { bgcolor: 'action.selected' }
};

// --- CONSTANTES ---
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_SIZE_MB = 10;

export default function UploadImagesModal({ open, onClose, projectId }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // useCallback para optimizar el rendimiento y evitar re-creaciones de la función
    const handleFileChange = useCallback((acceptedFiles) => {
        const files = Array.from(acceptedFiles);
        const validFiles = [];
        const newErrors = [];

        files.forEach(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
                newErrors.push(`"${file.name}": Tipo de archivo no permitido.`);
            } else if (file.size / (1024 * 1024) > MAX_IMAGE_SIZE_MB) {
                newErrors.push(`"${file.name}": Excede el límite de ${MAX_IMAGE_SIZE_MB} MB.`);
            } else {
                validFiles.push(file);
            }
        });

        setSelectedFiles(prev => [...prev, ...validFiles]);
        setErrors(newErrors);
    }, []);

    const handleRemoveFile = (fileName) => {
        setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    };
    
    // --- FUNCIÓN ORIGINAL PARA SOLO DATASET ---
  const handleDatasetOnlyUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para analizar.", "warning");
        return;
    }

    setLoading(true);
    setErrors([]);

    try {
        // 1. OBTENER TOKEN DE AUTENTICACIÓN
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        // 2. ENDPOINT ORIGINAL
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/analyze-and-create-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error desconocido del servidor");

        showNotification(result.message || "¡Dataset creado con éxito!", "success");

        // 3. REDIRECCIÓN AL NUEVO DATASET
        const newDatasetId = result.new_dataset.dataset_id;
        navigate(`/project/${projectId}/dataprep/${newDatasetId}`);

        // Limpieza
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error al subir y analizar:", err);
        showNotification(err.message, "error");
    } finally {
        setLoading(false);
    }
};

// --- NUEVA FUNCIÓN PARA EL FLUJO HÍBRIDO ---
  const handleHybridUpload = async () => {
    if (selectedFiles.length === 0) {
        showNotification("No hay archivos válidos para procesar.", "warning");
        return;
    }

    setLoading(true);
    setErrors([]);

    try {
        // 1. OBTENER TOKEN DE AUTENTICACIÓN
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        selectedFiles.forEach(file => formData.append("images", file));

        // 2. ENDPOINT HÍBRIDO
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/upload-for-gallery-and-dataset`;
        const response = await fetch(url, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error desconocido del servidor");

        showNotification(result.message || "¡Proceso completado!", "success");

        // 3. REDIRECCIÓN A LA GALERÍA
        navigate("/galeria");

        // Limpieza
        setSelectedFiles([]);
        onClose();

    } catch (err) {
        console.error("Error en el proceso híbrido:", err);
        showNotification(err.message, "error");
    } finally {
        setLoading(false);
    }
};

    
    // Función para manejar el drop de archivos
    const onDrop = (e) => {
      e.preventDefault();
      handleFileChange(e.dataTransfer.files);
    };

    return (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="sm"
    PaperProps={{
      sx: {
        borderRadius: 3,
        boxShadow: 6,
        overflow: "hidden",
      },
    }}
  >
    {/* --- TÍTULO --- */}
    <DialogTitle
      sx={{
        bgcolor: "primary.main",
        color: "primary.contrastText",
        fontWeight: "bold",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      Crear Dataset desde Imágenes
      <IconButton onClick={onClose} sx={{ color: "inherit" }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>

    {/* --- CONTENIDO --- */}
    <DialogContent sx={{ p: 4 }}>
      {/* ZONA DE SUBIDA (DROPZONE) */}
      <Paper
        variant="outlined"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => document.getElementById("file-input-images").click()}
        sx={{
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 2,
          p: 4,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: "primary.main",
            bgcolor: "action.hover",
          },
        }}
      >
        <input
          id="file-input-images"
          type="file"
          accept={ALLOWED_IMAGE_EXTENSIONS.map((e) => `image/${e}`).join(",")}
          multiple
          hidden
          onChange={(e) => handleFileChange(e.target.files)}
        />
        <CloudUploadIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
        <Typography>
          Arrastra y suelta imágenes aquí, o haz clic para seleccionar
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Máximo {MAX_IMAGE_SIZE_MB}MB por archivo
        </Typography>
      </Paper>

      {/* LISTA DE ARCHIVOS SELECCIONADOS */}
      {selectedFiles.length > 0 && (
        <Box
          sx={{
            mt: 2,
            flexGrow: 1,
            overflowY: "auto",
            maxHeight: "30vh",
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Archivos seleccionados:
          </Typography>
          <List dense>
            {selectedFiles.map((file) => (
              <ListItem key={file.name}>
                <ListItemIcon>
                  <ImageIcon />
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                />
                <Tooltip title="Quitar archivo">
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveFile(file.name)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* MOSTRAR ERRORES */}
      {errors.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {errors.map((err, i) => (
            <Typography key={i} variant="body2" color="error">
              • {err}
            </Typography>
          ))}
        </Box>
      )}
    </DialogContent>

   {/* --- BOTONES --- */}
<DialogActions
  sx={{
    p: 3,
    pt: 2,
    justifyContent: "space-between", // Alineamos los botones a los extremos
    borderTop: 1,
    borderColor: "divider",
  }}
>
  {/* Botón secundario a la izquierda */}
  <Tooltip title="Crea un archivo CSV con el análisis de las imágenes, sin añadirlas a tu galería creativa.">
      <span> {/* El <span> es necesario para que el Tooltip funcione en un botón deshabilitado */}
        <Button 
            onClick={handleDatasetOnlyUpload} 
            disabled={loading || selectedFiles.length === 0}
        >
            Solo Analizar para Dataset
        </Button>
      </span>
  </Tooltip>

  {/* Botón principal a la derecha */}
  <Tooltip title="Analiza las imágenes para crear un dataset Y las añade a 'Mi Galería' para edición creativa.">
      <span>
          <Button
            variant="contained"
            onClick={handleHybridUpload} // Llama a la nueva función
            disabled={loading || selectedFiles.length === 0}
            startIcon={
              loading ? <CircularProgress size={20} color="inherit" /> : null
            }
          >
            {loading
              ? "Procesando..."
              : `Analizar y Añadir a Galería (${selectedFiles.length})`}
          </Button>
      </span>
  </Tooltip>
</DialogActions>
  </Dialog>
);

}

// Actualizamos los propTypes
UploadImagesModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    projectId: PropTypes.string.isRequired,
};

-------------------------------------------------------

// src/pages/WorkspacePage.jsx (VERSIÓN FINAL, LIMPIA Y CORRECTA)
  
  import React, { useState, useEffect } from 'react';
  
  import { Box, CircularProgress, Alert, Typography, Button, Paper } from '@mui/material';
  import AddIcon from '@mui/icons-material/Add';
  import { supabase } from '../supabaseClient';
  
  import DatasetList from '../components/dashboard/DatasetList';
  import DatasetPropertiesPanel from '../components/dashboard/DatasetPropertiesPanel';
  import RenameDatasetModal from '../components/dashboard/RenameDatasetModal';
  import ConfirmDeleteDatasetModal from '../components/dashboard/ConfirmDeleteDatasetModal';
  import UploadDatasetModal from '../components/dashboard/UploadDatasetModal';
  import { useParams, useNavigate } from 'react-router-dom';
  import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
  import ImageIcon from '@mui/icons-material/Image'; 
  import UploadImagesModal from '../components/dashboard/UploadImagesModal'; 
  import { useTheme } from '@mui/material/styles';

  export default function WorkspacePage() {
      const { projectId } = useParams();
      const navigate = useNavigate();
      const theme = useTheme()
      // --- Estados ---
     
      const [project, setProject] = useState(null);
      const [datasets, setDatasets] = useState([]);
      const [activeDataset, setActiveDataset] = useState(null);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [isUploadModalOpen, setUploadModalOpen] = useState(false);
      const [isRenameModalOpen, setRenameModalOpen] = useState(false);
      const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
      const [isUploadImagesModalOpen, setUploadImagesModalOpen] = useState(false);
  
      // --- EL ÚNICO Y CORRECTO useEffect PARA CARGAR Y SINCRONIZAR DATOS ---
      useEffect(() => {
         
    const fetchData = async () => {
       console.log("Intentando cargar datos para el proyecto con ID:", projectId); 
        if (!projectId) {
            setError("No se ha proporcionado un ID de proyecto.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        try {
            // Usamos nuestra nueva función segura para ambas llamadas
            const [projectResult, datasetsResult] = await Promise.all([
                authenticatedFetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}`),
                authenticatedFetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets`)
            ]);

            if (!projectResult.success) throw new Error(projectResult.error || 'Proyecto no encontrado.');
            
            const newDatasets = datasetsResult.success ? (datasetsResult.data || []) : [];

            setProject(projectResult.data);
            setDatasets(newDatasets);

            // La lógica para mantener el dataset activo sigue igual y es correcta
            setActiveDataset(currentActiveDataset => 
                currentActiveDataset ? (newDatasets.find(d => d.datasetId === currentActiveDataset.datasetId) || null) : null
            );

        } catch (err) {
            console.error("Fallo en fetchData:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    fetchData();
}, [projectId]);
  
      // --- Handlers de acciones (simplificados) ---
      const refreshPage = () => window.location.reload();
      const handleRename = () => setRenameModalOpen(true);
      const handleDelete = () => setDeleteModalOpen(true);
      const handleSelectDataset = (dataset) => {
      // La única responsabilidad de esta función es actualizar el dataset activo.
      setActiveDataset(dataset);
  };
  
      const renameDatasetConfirmed = async (newName) => {
      if (!activeDataset || !projectId) return;
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/${activeDataset.datasetId}`, {
              method: 'PATCH',
              headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ dataset_name: newName })
          });
  
          const result = await response.json();
  
          if (!result.success) {
              throw new Error(result.error || "Falló la actualización en el servidor.");
          }
  
          // --- ¡LA MAGIA OCURRE AQUÍ! ---
          // Actualiza el estado local sin recargar la página
          const updatedDataset = result.data; // El dataset con el nombre ya cambiado
          setDatasets(currentDatasets => 
              currentDatasets.map(d => 
                  d.datasetId === updatedDataset.datasetId ? updatedDataset : d
              )
          );
          setActiveDataset(updatedDataset); // Actualiza el dataset activo
          setRenameModalOpen(false); // Cierra el modal
  
      } catch (error) {
          console.error("Error al renombrar:", error);
          // Aquí podrías mostrar una notificación de error al usuario
      }
  };
  
  
      const deleteDatasetConfirmed = async () => {
      if (!activeDataset || !projectId) return;
  
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/${activeDataset.datasetId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
  
          // 1. Verificamos que el backend respondió correctamente
          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Falló la eliminación en el servidor.");
          }
  
          // --- 2. ¡LA MAGIA OCURRE AQUÍ! ---
          // Guardamos el ID del dataset que vamos a borrar
          const deletedDatasetId = activeDataset.datasetId;
  
          // Actualizamos la lista de datasets, quitando el que fue eliminado
          setDatasets(currentDatasets =>
              currentDatasets.filter(d => d.datasetId !== deletedDatasetId)
          );
  
          // Limpiamos el dataset activo, porque ya no existe.
          // Esto hará que el panel de propiedades muestre el mensaje de "Selecciona un archivo".
          setActiveDataset(null);
  
          // 3. Cerramos el modal de confirmación
          setDeleteModalOpen(false);
  
          // NO MÁS REFRESH! La página se actualiza sola gracias a React.
  
      } catch (error) {
          console.error("Error al eliminar:", error);
          // Opcional: mostrar un alert o una notificación al usuario
          alert(`Error al eliminar el archivo: ${error.message}`);
      }
  };
    
    const authenticatedFetch = async (url) => {
    // 1. Obtiene la sesión FRESCA justo antes de la llamada
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
        throw new Error(sessionError?.message || "Sesión no válida o expirada.");
    }
    
    // 2. Realiza el fetch con el token fresco
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    // 3. Maneja errores de red y devuelve la respuesta
    if (!response.ok) {
        // Intenta obtener un mensaje de error más detallado del backend
        const errorBody = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorBody.error || `Error en la petición: ${response.statusText}`);
    }
    
    return response.json(); // Devuelve los datos ya parseados como JSON
};
      // --- Renderizado ---
      if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
      if (error) return <Alert severity="error">{error}</Alert>;
        console.log("Desde WorkspacePage, pasando a PropertiesPanel:", activeDataset);
        
  return (
         <PaginaConAsistente nombreModulo="general">
          <Box sx={{ height: '100vh', boxSizing: 'border-box', display: 'flex',  backgroundColor: theme.palette.mode === 'dark' ? '#393b3dff' : 'primary',
           flexDirection: 'column', pt: `calc(60px + 0px)`, px: 2, pb: 3, }}>
              {/* Encabezado */}
          <Box
  sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',          // centra verticalmente
    px: 4,                          // padding horizontal más compacto
    py: 2,                          // padding vertical más compacto
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    borderRadius: 2,                // bordes redondeados
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera
    mb: 1,                          // margen inferior para separar del contenido
    flexWrap: 'wrap',               // para que sea responsivo
    gap: 2,                         // espacio entre elementos si se apilan
  }}
>
  {/* Título */}
  <Typography
    variant="h6"
    fontWeight="bold"
    color="#ffffff"
  >
    Proyecto: {project?.projectName || '...'}
  </Typography>

  {/* Botones de acción */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
    <Button
      variant="contained"
      startIcon={<ImageIcon />}
      size="medium"
      onClick={() => setUploadImagesModalOpen(true)}
     sx={{
        background: 'linear-gradient(180deg, #002f4b, #005f73)',
        borderColor: '#00e5ff',
        color: "#fff",
        '&:hover': {
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
        },
      }}
    >
      Crear desde Imágenes
    </Button>

    <Button
      variant="contained"
      startIcon={<AddIcon />}
      size="medium"
      onClick={() => setUploadModalOpen(true)}
      sx={{
        background: 'linear-gradient(180deg, #002f4b, #005f73)',
        borderColor: '#00e5ff',
        color: "#fff",
        '&:hover': {
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
        },
      }}
    >
      Importar archivos
    </Button>
  </Box>
</Box>
              {/* Layout */}
              <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', }}>
                    <Box sx={{ flex: '2 1 0', minWidth: 0, height: '100%' }}>
                    <DatasetList datasets={datasets} activeDataset={activeDataset} onSelectDataset={handleSelectDataset} />
</Box>
                   <Box 
                        sx={{
                       flex: '1 1 0',
                       minWidth: 0,
                       height: '100%',
                       background: 'linear-gradient(180deg, #002f4b 0%, #004d66 100%)',
                       color: '#ffffff',           // texto blanco para contraste
                                      // padding interno
                       borderRadius: 2,   
                       border: '2px solid #ffffff',         // opcional, bordes suaves
                       overflowY: 'auto',          // scroll si hay mucho contenido
                       display: 'flex',          // 👈 importante
                       flexDirection: 'column', 
                       }}
                       >
                      <DatasetPropertiesPanel dataset={activeDataset} onRename={handleRename} onDelete={handleDelete} onRefresh={refreshPage}/>
                  </Box>
              </Box>
  
              {/* Modales */}
              <UploadDatasetModal open={isUploadModalOpen} onClose={() => setUploadModalOpen(false)} onDatasetUploaded={refreshPage} projectId={projectId} />
              {activeDataset && (
                  <>
                      <RenameDatasetModal open={isRenameModalOpen} onClose={() => setRenameModalOpen(false)} onRenameConfirmed={renameDatasetConfirmed} dataset={activeDataset} />
                      <ConfirmDeleteDatasetModal open={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)} onDeleteConfirmed={deleteDatasetConfirmed} dataset={activeDataset} />
                  </>
                  
              )}
              <UploadImagesModal 
                open={isUploadImagesModalOpen} 
                onClose={() => setUploadImagesModalOpen(false)} 
                projectId={projectId} // Lo pasamos por si lo necesitamos para la redirección
                />
               </Box>
               </PaginaConAsistente>
      );
  }
  

--------------------------------------------------------
// RUTA: src/components/analysis/SensitivityAnalysis.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, TextField, 
    CircularProgress, Alert, Paper, Slider, Grid, Card, CardContent, Stack,
    CardActions, Divider, Avatar
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FunctionsIcon from '@mui/icons-material/Functions';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';


const SummaryCard = ({ title, value, icon, color, explanation }) => (
  <Grid item xs={12} md={6}>
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,           // bordes redondeados
        boxShadow: 3,              // sombra inicial
        transition: '0.3s',        // transición suave
        "&:hover": {
          boxShadow: 6,            // sombra más intensa al pasar el mouse
          transform: 'translateY(-4px)', // efecto flotante
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography color="text.secondary" variant="body2">{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {typeof value === 'number' ? value.toFixed(4) : '...'}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, flexGrow: 1 }}>
        {explanation}
      </Typography>
    </Paper>
  </Grid>
);



export default function SensitivityAnalysis({ model }) {
    // --- LÓGICA (SIN CAMBIOS) ---
    const [featureToVary, setFeatureToVary] = useState('');
    const [baseDataPoint, setBaseDataPoint] = useState({});
    const [simulationRange, setSimulationRange] = useState([50, 150]);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const numericFeatures = useMemo(() => model.features.filter(f => f.type === 'numeric'), [model.features]);
    const otherFeatures = useMemo(() => model.features.filter(f => f.name !== featureToVary), [model.features, featureToVary]);

    // ===========================================================================
    // === SOLUCIÓN 1: CÁLCULO DE ESTADÍSTICAS EN EL FRONTEND                  ===
    // ===========================================================================
    // Usamos useMemo para calcular las estadísticas solo cuando chartData cambia.
    // Esto soluciona el problema de 'NaN' y los datos vacíos.
    const summaryStats = useMemo(() => {
        if (!chartData?.sensitivity_results || chartData.sensitivity_results.length === 0) {
            return { min: null, max: null, avg: null, impact: null };
        }
        const predictions = chartData.sensitivity_results.map(d => d.prediction);
        const min = Math.min(...predictions);
        const max = Math.max(...predictions);
        const avg = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
        const impact = max - min;
        return { min, max, avg, impact };
    }, [chartData]);


    useEffect(() => {
        const initialValues = {};
        model.features.forEach(feature => {
            initialValues[feature.name] = feature.type === 'numeric' ? 0 : feature.options?.[0] || '';
        });
        setBaseDataPoint(initialValues);
        
        setFeatureToVary('');
        setChartData(null);
        setError(null);
    }, [model.id, model.features]);

    const handleFeatureToVaryChange = (event) => {
        setFeatureToVary(event.target.value);
        setChartData(null);
        setError(null);
    };

    const handleBaseDataChange = (featureName, value) => {
        setBaseDataPoint(prev => ({ ...prev, [featureName]: value }));
    };

    const handleRunAnalysis = async () => {
        setLoading(true); setError(null); setChartData(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const cleanedBaseDataPoint = {};
            for (const key in baseDataPoint) {
                cleanedBaseDataPoint[key.trim()] = baseDataPoint[key];
            }

            const payload = {
                feature_to_vary: featureToVary.trim(),
                variation_range: { start: simulationRange[0], end: simulationRange[1], steps: 30 },
                base_data_point: cleanedBaseDataPoint
            };
            
            console.log("🚀 PAYLOAD ENVIADO A LA API:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/sensitivity`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Ocurrió un error en el análisis.');
            setChartData(result.data);

        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };


     
    // ===========================================================================
    // === SOLUCIÓN 2: CORRECCIÓN DEL LAYOUT DE LAS COLUMNAS                  ===
    // ===========================================================================
    return (
        <Grid container spacing={5}> {/* Reducimos un poco el espaciado */}
            
            {/* === COLUMNA IZQUIERDA: CONTROLES --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 33% en desktop (md=4) */}
               <Grid xs={12} md={4} >
                <Stack spacing={2} sx={{ height: '100%' }}>
                    <Box  sx={{
                         p: 2,}}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem',  color:"white" }}>Simulador Interactivo</Typography>
                        <Typography variant="body1" sx={{ mb: 1, color: "white" }}>
                        Selecciona una característica,
                        establece un escenario inicial<br />
                        y simula los resultados.
                         </Typography>
                    </Box>

                    <Paper
                        elevation={2}
                        sx={{
                         p: 2,
                         borderRadius: 3, 
                          border: '1px solid',
                          borderColor: 'primary.main',            // bordes redondeados
                         boxShadow: 3,                      // sombra inicial
                          transition: "0.3s",
                          backgroundColor: 'background.paper', // fondo
                            "&:hover": {
                          boxShadow: 6,                   // sombra más intensa al hover
                          transform: "translateY(-2px)"   // efecto leve de “flotante”
                           }
                         }}
                         >
                        <Typography
                          variant="subtitle1"
                          color="text.primary"   // 👈 se adapta al modo
                          sx={{ fontWeight: 'bold', mb: 1.5 }}
                          >
                          Paso 1: Selección de la característica a simular
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Característica Numérica</InputLabel>
                            <Select value={featureToVary} label="Característica Numérica" onChange={handleFeatureToVaryChange}>
                                {numericFeatures.map(feature => (
                                    <MenuItem key={feature.name} value={feature.name}>{feature.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Paper>

                    {featureToVary && (
                        <>
                            <Paper
                                elevation={2}
                                sx={{
                                p: 2,
                                borderRadius: 3,                   // bordes redondeados
                                boxShadow: 3,                      // sombra inicial
                                transition: "0.3s",
                                 border: '1px solid',
                                borderColor: 'primary.main',
                                backgroundColor: 'background.paper', // fondo
                                "&:hover": {
                                boxShadow: 6,                   // sombra más intensa al hover
                                transform: "translateY(-2px)"   // efecto leve de “flotante”
                                 }
                                }}
                                 >
                                <Typography 
                                 variant="subtitle1"
                                 color="text.primary"   // 👈 se adapta al modo
                                 sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                    Paso 2: Escenario Base
                                </Typography>
                                <Box sx={{ maxHeight: 300, overflowY: "auto", pr: 1 }}>
                                    {otherFeatures.map(feature => (
                                        <Box key={feature.name} sx={{ mb: 2 }}>
                                            {feature.options ? (
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>{feature.name}</InputLabel>
                                                    <Select
                                                        label={feature.name}
                                                        value={baseDataPoint[feature.name] || ""}
                                                        onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                    >
                                                        {feature.options.map(option => (
                                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                <TextField
                                                    fullWidth type="number" label={feature.name} size="small"
                                                    value={baseDataPoint[feature.name] || ""}
                                                    onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                            
                            <Card elevation={2} sx={{  border: '1px solid',borderColor: 'primary.main', borderRadius: 2, flexShrink: 0 , p: 4}}>
                                 <CardContent>
                                      <Typography 
                                        variant="subtitle1"
                                        color="text.primary"   // 👈 se adapta al modo
                                        sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                     </Typography>
                                     <Typography 
                                       variant="body2" 
                                       color="text.secondary" 
                                       sx={{ mt: 5 }}
                                         >
                                        Rango para <strong>{featureToVary}</strong>:
                                     </Typography>
                                     <Box sx={{ px: 1 }}>
                                       <Slider
                                         value={simulationRange}
                                         onChange={(e, newValue) => setSimulationRange(newValue)}
                                         valueLabelDisplay="auto" min={0} max={200} step={1}
                                       />
                                     </Box>
                                 </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: "center", p: 2 }}>
                                    <Button
                                        variant="contained" size="large"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                                        onClick={handleRunAnalysis} disabled={loading || !featureToVary}
                                    >
                                        {loading ? "Analizando..." : "Ejecutar Simulación"}
                                    </Button>
                                </CardActions>
                            </Card>
                        </>
                    )}
                </Stack>
            </Grid>

            {/* === COLUMNA DERECHA: RESULTADOS --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 67% en desktop (md=8) */}
                 <Grid xs={12} md={8} >
                   <Paper 
                    sx={{ 
                     p: 4, 
                     height: '100%', 
                     display: "flex", 
                     flexDirection: "column",
                     minWidth: 0,       // evita que fuerce más ancho
                     overflowX: 'auto',  // scroll si el gráfico se pasa
                     borderRadius:3
                    
                   }}
                 >
                    <Typography
                    variant="h6"
                      sx={{
                       fontSize: "1.1rem",
                       mb: 3,
                       mt: 2,
                       textAlign: "center", // 👈 centra el texto dentro de su contenedor
                        }}
                         >
                             Resultado de la Simulación
                    </Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {loading ? (
                        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CircularProgress /><Typography sx={{ ml: 2 }}>Realizando simulación...</Typography>
                        </Box>
                    ) : chartData ? (
                        <Stack spacing={3}>
                            <Alert severity="info" icon={<ScienceIcon fontSize="inherit" />} sx={{ mb: 2 }}>
                                Este gráfico muestra cómo cambia la **predicción**   al modificar los 
                               valores de **{chartData.feature_analyzed}**.
                            </Alert>

                            <Box sx={{ flexGrow: 1, minHeight: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.sensitivity_results} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="feature_value" name={chartData.feature_analyzed} />
                                        <YAxis />
                                        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value} />
                                        <Legend />
                                        <Line type="monotone" dataKey="prediction" name="Predicción" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>

                       <Box>
  <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>Resumen</Typography>

  <Box
      sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, // 1 col en mobile, 2 cols en desktop
      gap: 2,
    }}
  >
    <SummaryCard
      title="Predicción Mínima"
      value={summaryStats.min}
      icon={<ArrowDownwardIcon />}
      color="error"
      explanation={
        <>

          Es el resultado más bajo  que  <br />
         se obtuvo al variar "{chartData.feature_analyzed}".
        </>
      }
    />
    <SummaryCard
      title="Predicción Máxima"
      value={summaryStats.max}
      icon={<ArrowUpwardIcon />}
      color="success"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Es el valor más alto que alcanzó <br />
          la predicción durante la simulación.
        </>
      }
    />

    <SummaryCard
      title="Predicción Promedio"
      value={summaryStats.avg}
      icon={<FunctionsIcon />}
      color="info"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Representa el valor central o el más<br />
           probable de todos los resultados.
        </>
      }
    />

    <SummaryCard
      title="Impacto de la Variable"
      value={summaryStats.impact}
      icon={<CompareArrowsIcon />}
      color="warning"
      explanation={
        <>
          Muestra cuánto cambió la predicción. <br />
          Un valor alto significa que esta <br />
          variable es muy influyente.
        </>
      }
    />
  </Box>
</Box>

                        </Stack>
                    ) : (
                         <Box sx={{ 
                flexGrow: 1, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                textAlign: "center", 
                p: 3, 
                border: "2px dashed", 
                borderColor: "divider", 
                borderRadius: 2,
                backgroundColor: 'grey.50' // Un fondo muy sutil para diferenciarlo
            }}>
                <Typography color="body1">Una vez ejecutada la simulación, los resultados obtenidos se presentaran en este<br />
                panel para que puedan ser analizarlos fácilmente.</Typography>
            </Box>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}




import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Box,
  Drawer,
  CssBaseline,
  Toolbar,
  List,
  Divider,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import Header from './Header';
import logo from '../assets/promptLabLogos.png';

// --- Iconos ---
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import HistoryIcon from '@mui/icons-material/History';


const drawerWidth = 210;
const customAppBarHeight = '55px';

export default function Layout() {
  const menuItems = [
    { text: 'Mis Proyectos', icon: <FolderCopyIcon />, path: '/dashboard' },
    { text: 'Mis Modelos', icon: <ModelTrainingIcon />, path: '/models' },
    { text: 'Mis Prompts', icon: <HistoryIcon />, path: '/historial-prompts' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header />

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            background: 'linear-gradient(180deg, #002f4b, #005f73)', // 🎨 degradado pro
            color: 'white',
          },
        }}
      >
        <Toolbar sx={{ minHeight: customAppBarHeight }} />

        {/* Logo y nombre */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src={logo}
            alt="PromptLab Logo"
           sx={{ height: 32, mr: 1.5,transform: 'skewX(-10deg)' }}
          />
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ fontStyle: 'italic', color: '#00e5ff' }}
          >
            PromptLab
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

        {/* Menú principal */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <List sx={{ p: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#00e5ff33' : 'transparent',
                    borderLeft: isActive ? '4px solid #00e5ff' : '4px solid transparent',
                  })}
                  sx={{
                    borderRadius: 1,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#00e5ff22',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Footer */}
       
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${drawerWidth}px)`,
          backgroundColor: '#f9f9f9',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

----------------------------------

//components/promptlab/InteractionColumns

import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  IconButton, Tooltip, Divider, FormControlLabel, Switch, Grid
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import ReactMarkdown from 'react-markdown';
import SaveIcon from '@mui/icons-material/Save';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const InteractionColumn = ({
  userPrompt,
  setUserPrompt,
  handleExecutePrompt,
  isLoading,
  result,
  onDonate,
  isDonating,
  onSave,
  isSaving,
  isBatchMode,      // <-- Nueva prop
  setIsBatchMode    // <-- Nueva prop
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (result?.ai_response) {
      navigator.clipboard.writeText(result.ai_response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1}}>
    {/* --- PANEL DE ENTRADA --- */}
  <Paper 
      sx={{ 
        minWidth: 400, 
        p: 2, 
        borderRadius: 2, 
        boxShadow: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        border: '2px solid #2196f3', // 👈 grosor + estilo + color
        flexGrow: 1,      // 1. Le dice al Paper que CREZCA
        overflow: 'hidden' // 2. Evita que el Paper tenga su propio scroll
      }}
    >
       <Typography variant="h6" sx={{ flexShrink: 0 }}> {/* flexShrink es buena práctica para títulos */}
       Explora prompts con IA
      </Typography>
      {/* Switch para cambiar entre modo simple y batch */}
      <FormControlLabel
        control={
          <Switch
            checked={isBatchMode}
            onChange={(e) => setIsBatchMode(e.target.checked)}
          />
        }
        label="Modo Lote (un prompt por línea)"
        sx={{ alignSelf: 'flex-start', flexShrink: 0 }} // También para el Switch
      
      />

      <TextField
        multiline
        rows={isBatchMode ? 15 : 10}
        maxRows={isBatchMode ? 15 : 10} 
        fullWidth
        value={userPrompt || ""}
        sx={{ flexGrow: 1, minHeight: 0 }}
        onChange={(e) => setUserPrompt(e.target.value)}
        placeholder={
          isBatchMode
            ? "Cada línea es un prompt separado:\n¿Cuál es la capital de Francia?\nResume el siguiente texto...\nTraduce 'hola' al inglés..."
            : "Escribe tu prompt aquí..."
        }
      />
      <Button
        variant="contained"
        size="large"
        onClick={handleExecutePrompt}
        disabled={isLoading}
      >
        {isLoading
          ? <CircularProgress size={24} color="inherit" />
          : (isBatchMode ? "Ejecutar Lote" : "Ejecutar Prompt")}
      </Button>
    </Paper>

    {/* --- PANEL DE SALIDA (SOLO MODO SIMPLE) --- */}
    {!isBatchMode && (
      <Paper sx={{ p: 2,  border: '2px solid #2196f3',  flexGrow: 1, borderRadius: 2, boxShadow: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* 1. CABECERA */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" ,border:'primary'}}>
          <Typography variant="h6">Resultado</Typography>
          {result?.success && result.ai_response && (
            <Tooltip title="Copiar Resultado">
              <IconButton onClick={() => navigator.clipboard.writeText(result.ai_response)} size="small">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider sx={{ my: 1 }} />

        {/* 2. CONTENIDO PRINCIPAL */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
            </Box>
          )}

          {result?.success && result.ai_response && (
            <ReactMarkdown components={{ p: ({ children }) => <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{children}</Typography> }}>
              {result.ai_response}
            </ReactMarkdown>
          )}

          {result && !result.success && (
            <Typography color="error" sx={{ whiteSpace: 'pre-wrap' }}>Error: {result.error}</Typography>
          )}

          {!isLoading && !result && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
              El resultado de tu prompt aparecerá aquí.
            </Typography>
          )}
        </Box>

        {/* 3. MÉTRICAS Y FOOTER */}
        {result?.success && result.ai_response && (
          <>
            {/* 3.A. Accordion de métricas */}
            <Accordion
              sx={{
              mt: 2,
              boxShadow: 'none',
             '&:before': { display: 'none' },
              backgroundColor: 'primary', // celeste claro
              }}
              >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Métricas</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                {result.meta ? (
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2"><strong>Modelo:</strong></Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontFamily="monospace">{result.meta.model_id}</Typography></Grid>
                    {/* Aquí podés agregar más filas para latencia, tokens, costo, etc. */}
                  </Grid>
                ) : (
                  <Grid container spacing={1}>
                    <Grid item xs={6}><Typography variant="body2"><strong>Modelo:</strong></Typography></Grid>
                    <Grid item xs={6}><Typography variant="body2" fontFamily="monospace">{result.model_used}</Typography></Grid>
                    <Grid item xs={12}><Typography variant="caption" color="text.secondary">Métricas detalladas no disponibles.</Typography></Grid>
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>

            {/* 3.B. Footer simplificado con botones */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={onSave}
                  disabled={isSaving || Boolean(result.history_id)}
                >
                  {result.history_id ? "Guardado" : "Guardar"}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isDonating ? <CircularProgress size={16} /> : <VolunteerActivismIcon />}
                  onClick={() => onDonate(result.history_id)}
                  disabled={isDonating || Boolean(result?.donated) || !result.history_id}
                >
                  {result.donated ? "¡Gracias!" : "Donar Prompt"}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    )}
  </Box>
);

};

export default InteractionColumn;


-----------------------------------------------------

import React, { useState, useEffect, useCallback } from 'react'; 
import { useNavigate,useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext'; 
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';

// Importaciones de Componentes de Material-UI
import {
  Box,
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
    
   useEffect(() => {
    // Definimos las funciones de carga de datos primero.
    const fetchModels = async () => {
        setIsModelsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const accessToken = session.access_token;
            const url = `${import.meta.env.VITE_API_URL}/api/promptlab/available-models`;
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
            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-document-text-content`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                setContext(result.textContent);
                setOriginalContext(result.textContent);
            }
        } catch (error) {
            console.error("Fallo al cargar el contexto:", error);
        }
    };

    // --- LÓGICA PRINCIPAL ---

    // Primero, comprobamos si venimos de una navegación con estado.
    const hasStateToRestore = location.state?.selectedPrompt || location.state?.context || location.state?.systemPrompt;

    if (hasStateToRestore) {
        console.log("Restaurando estado desde el historial...", location.state);
        
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
            console.log("¡Contexto guardado con éxito!");

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

        console.log("¡Donación exitosa!", result.message);
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
                console.log("🚀 Iniciando fetch para /execute-batch con payload:", bodyPayload);
             const response = await fetch(url, {
               method: "POST",
               headers: {
                 "Authorization": `Bearer ${accessToken}`,
                 "Content-Type": "application/json",
               },
               body: JSON.stringify(bodyPayload),
             });
              console.log("📥 Respuesta recibida del servidor. Estado:", response.status, response.statusText);
             const responseData = await response.json();
             console.log("✅ Respuesta convertida a JSON exitosamente."); // <--- Log clave
             if (!response.ok) {
               throw new Error(responseData.error || `Error del servidor: ${response.status}`);
             }
              console.log("Respuesta COMPLETA recibida del backend en PromptLabPage:", responseData);
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
       
             console.log("DATOS RECIBIDOS DEL BACKEND AL EJECUTAR:", responseData);
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

        console.log("¡Guardado con éxito!", responseData.message);
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
        onClick={() => handleConfirmSave(itemToSave)} 
        variant="contained" 
        disabled={isSaving}
    >
      {isSaving ? 'Guardando...' : 'Guardar'}
    </Button>

      </DialogActions>
    </Dialog>
  </Box>
  </PaginaConAsistente>
);
}

export default PromptLabPage;


------------------------------------


// src/pages/EstudioCreativoPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InputAdornment from "@mui/material/InputAdornment";
import { useNotification } from '../context/NotificationContext'; 
import { supabase } from '../supabaseClient'; // Asegúrate de tener esta importación
import SaveIcon from '@mui/icons-material/Save'; // Importa el icono de guardar



export default function EstudioCreativoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Estado para la imagen con la que estamos trabajando
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Cuando el componente carga, revisa si se pasó una imagen desde la galería
    if (location.state?.image) {
      console.log("Imagen recibida desde la galería:", location.state.image);
      setActiveImage(location.state.image);
    }
    setLoading(false);
  }, [location.state]);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }

   const handleCreateMeme = async () => {
    if (!activeImage) return;

    setIsCreatingMeme(true);
    
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // Creamos el FormData
        const formData = new FormData();
        
        // ¡Enviamos la URL de la imagen activa!
        formData.append('image_url', activeImage.public_url); 
        formData.append('topText', topText);
        formData.append('bottomText', bottomText);

        const url = `${import.meta.env.VITE_API_URL}/api/create-meme`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "No se pudo crear el meme.");
        }
        
        // La respuesta es el blob del nuevo meme
        const memeBlob = await response.blob();
        const memeUrl = URL.createObjectURL(memeBlob);
        
        // Actualizamos el lienzo con la nueva imagen (el meme)
        // Guardamos el blob para poder guardarlo en la galería si el usuario quiere
        setActiveImage(prev => ({ 
            ...prev, // Mantenemos los datos antiguos (como el prompt original)
            public_url: memeUrl, // Actualizamos la URL visible
            blob: memeBlob,      // Guardamos el nuevo blob
            type: 'meme'         // Actualizamos el tipo
        }));

        showNotification("¡Meme creado! Ahora puedes guardarlo en tu galería.", "success");

    } catch (error) {
        console.error("Error creando el meme:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsCreatingMeme(false);
    }
};

    const handleSaveToGallery = async () => {
        if (!activeImage) {
            showNotification("No hay nada que guardar.", "warning");
            return;
        }

        // Si la imagen activa no tiene un 'blob', significa que es la original
        // y necesitamos obtenerlo primero. (Esto es para un caso avanzado, por ahora asumimos que el blob existe)
        if (!activeImage.blob) {
            showNotification("Por favor, aplica una transformación (como crear un meme) antes de guardar.", "info");
            // Opcional: podrías implementar una descarga del `public_url` para obtener el blob
            return; 
        }

        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const formData = new FormData();
            
            // Usamos el blob guardado en el estado 'activeImage'
            formData.append('image', activeImage.blob, `creative-studio-image.png`);
            formData.append('type', activeImage.type || 'editada'); // Usa el tipo actualizado o uno genérico
            
            // Si la imagen original tenía un prompt, lo mantenemos
            if (activeImage.prompt) {
                formData.append('prompt', activeImage.prompt);
            }
            if (activeImage.project_id) {
                 formData.append('project_id', activeImage.project_id);
            }


            const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo guardar la imagen.");
            }

            showNotification("¡Guardado en tu galería con éxito!", "success");
            navigate('/galeria'); // Navegamos de vuelta a la galería

        } catch (error) {
            console.error("Error guardando en galería:", error);
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };
    

  return (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      pt: `calc(72px + 1px)`,
      px: 2,
      pb: 1,
      gap: 2,
      background: '#e3f2fd',
    }}
  >
    
    {/* --- Columna Izquierda: Imagen y Textos para Meme --- */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Cabecera */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0, }}>
        <Typography variant="h5" fontWeight="bold">Estudio Creativo</Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/galeria')}>
          Volver a la Galería
        </Button>
         <Button 
                        variant="contained" 
                        startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                        onClick={handleSaveToGallery}
                        disabled={isSaving || !activeImage?.blob} // Solo se puede guardar si hay un 'blob' (una edición)
                    >
                        Guardar en Galería
                    </Button>
      </Paper>

      {/* Contenedor principal: Imagen a la izquierda y TextBoxes a la derecha */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 , maxHeight: '78vh',}}>
        {/* Imagen */}
        <Paper sx={{ flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1, overflow: 'hidden' }}>
          {activeImage ? (
            <Box
              component="img"
              src={activeImage.public_url}
              alt="Imagen activa"
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          ) : (
            <Typography color="text.secondary">
              Sube una imagen o genérala para empezar a editar.
            </Typography>
          )}
        </Paper>

        {/* Textos para Meme */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box   sx={{  p: 2 }}>
        <Typography variant="body1" fontWeight="bold">
    Texto Superior
  </Typography>
     <TextField
  variant="outlined"
  fullWidth
  multiline
  minRows={12}   // 👈 arranca con 8 líneas
  value={topText}
  onChange={(e) => setTopText(e.target.value)}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <VerticalAlignTopIcon />
      </InputAdornment>
    ),
  }}
  sx={{
    "& textarea": {
      overflow: "auto",   // 👈 habilita scroll
      maxHeight: "200px", // 👈 altura máxima antes del scroll
    },
  }}
/>

  </Box>
   <Box   sx={{  p: 2 }}>
 <Typography variant="body1" fontWeight="bold">
    Texto Inferior
  </Typography>
<TextField
  variant="outlined"
  fullWidth
  multiline
  minRows={12}   // 👈 altura inicial (10 líneas)
  value={bottomText}
     onChange={(e) => setBottomText(e.target.value)}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <VerticalAlignBottomIcon />
      </InputAdornment>
    ),
  }}
  sx={{
    "& textarea": {
      overflow: "auto",   // 👈 scroll interno
      maxHeight: "200px", // 👈 altura máxima antes de scroll
    },
  }}
/>

</Box>

          
        </Box>
      </Box>
    </Box>

    {/* --- Columna Derecha: Caja de Herramientas --- */}
    <Paper sx={{ width: '350px', flexShrink: 0, p: 3, overflowY: 'auto' ,gap:1}}>
      <Typography variant="h6" gutterBottom>Herramientas</Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Generador de Imágenes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Contenido del generador */}
        </AccordionDetails>
      </Accordion>

      <Accordion>
    {/* Mejora: Añadimos un icono al título del Accordion */}
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TextFieldsIcon />
            <Typography>Laboratorio de Memes</Typography>
        </Box>
    </AccordionSummary>
    <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Mejora: Hacemos el botón de "usar prompt" más visible y claro */}
            {activeImage?.prompt && (
                <Button 
                    variant="outlined" 
                    size="small" 
                     onClick={() => setBottomText(activeImage.prompt)}
                    startIcon={<AutoFixHighIcon />}
                >
                    Usar prompt como texto inferior
                </Button>
            )}

             <Button
          variant="contained"
          fullWidth
          onClick={handleCreateMeme}
          disabled={!activeImage || isCreatingMeme}
          sx={{ mb: 2 }} // Margen para separarlo del resto
      >
          {isCreatingMeme ? <CircularProgress size={24} /> : "Aplicar Textos a la Imagen"}
      </Button>
        </Box>
    </AccordionDetails>
</Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Removedor de Fondo</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Contenido del removedor de fondo */}
        </AccordionDetails>
      </Accordion>
    </Paper>
  </Box>
);
}

--------------------------------------------------------

// src/pages/GaleriaPage.jsx

import React, { useState, useEffect,useCallback } from 'react';
import { useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Pagination , DialogContentText,ToggleButton, 
  ToggleButtonGroup
} from '@mui/material';
import IconButton from "@mui/material/IconButton";
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from "@mui/material/Tooltip";
import PaletteIcon from '@mui/icons-material/Palette'; // Icono para el Estudio Creativo
import DeleteIcon from '@mui/icons-material/Delete'; // Importa el icono
import { useNotification } from '../context/NotificationContext'; 
import { Divider } from "@mui/material";
import CircleIcon from '@mui/icons-material/Circle'; // Para el iconito central

// Un componente para la tarjeta de cada imagen
const VisualCard = ({ visual, onClick }) => (
  <Grid xs={12} sm={6} md={4} lg={3}>
    <Paper 
      onClick={onClick}
      elevation={3}
      sx={{ 
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 2,
        '&:hover .overlay': { opacity: 1 },
        '&:hover img': { transform: 'scale(1.05)' }
      }}
    >
      <Box
        component="img"
        src={visual.public_url}
        alt={visual.prompt || 'Imagen generada'}
        sx={{
          width: '100%',
          height: '250px',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.3s ease-in-out',
          backgroundColor: '#f0f0f0'
        }}
      />
      {/* Overlay que aparece al hacer hover */}
      <Box 
        className="overlay"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1.5,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          color: 'white',
          opacity: 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        <Typography variant="body2" noWrap fontWeight="bold">
          {visual.prompt || `Tipo: ${visual.type}`}
        </Typography>
      </Box>
    </Paper>
  </Grid>
);



export default function GaleriaPage() {
  const [visuals, setVisuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVisual, setSelectedVisual] = useState(null);
  const navigate = useNavigate();

  // --- NUEVOS ESTADOS PARA LA PAGINACIÓN ---
  const [colorFilter, setColorFilter] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 12; // Muestra 12 imágenes por página
  const { showNotification } = useNotification();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [debouncedColorFilter, setDebouncedColorFilter] = useState(colorFilter);

    const handleOpenConfirmDialog = () => {
        setConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!selectedVisual) return;
        setIsDeleting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/visuals/${selectedVisual.id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error);

            // Actualiza la UI al instante, sin recargar la página
            setVisuals(prevVisuals => prevVisuals.filter(v => v.id !== selectedVisual.id));
            showNotification("Imagen eliminada con éxito", "success");

        } catch (error) {
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsDeleting(false);
            handleCloseConfirmDialog();
            handleCloseDetail(); // Cierra también el diálogo de detalles
        }
    };

    const handleFilterChange = (event, newFilter) => {
        // El ToggleButtonGroup puede devolver null si se deselecciona todo.
        // Con esta línea nos aseguramos de que siempre haya un valor.
        if (newFilter !== null) {
            setFilterType(newFilter);
            setPage(1); // Reinicia a la página 1 al cambiar el filtro
        }
    };


    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);

    
  // NUEVO: useEffect para el debounce del filtro de color
  useEffect(() => {
    const timerId = setTimeout(() => {
        setDebouncedColorFilter(colorFilter);
        setPage(1); // Reinicia la página al filtrar por color
    }, 500);
    return () => clearTimeout(timerId);
  }, [colorFilter]);
    
  // AHORA MODIFICAMOS EL useEffect PRINCIPAL
  useEffect(() => {
    const fetchVisuals = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");
            
            const params = new URLSearchParams({
                page: page,
                per_page: itemsPerPage,
            });
            
            if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
            if (filterType && filterType !== 'todos') params.append('type', filterType);
            
            // AÑADIDO: Incluimos el filtro de color en la llamada a la API
            if (debouncedColorFilter) params.append('color', debouncedColorFilter);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visuals?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            // ... (el resto de la función es perfecta y no cambia) ...
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo cargar la galería.');
            }
            setVisuals(result.visuals);
            setTotalPages(Math.ceil(result.total_count / itemsPerPage));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    fetchVisuals();
  // AÑADIDO: Nueva dependencia para que se recargue al cambiar el filtro de color
  }, [page, debouncedSearchTerm, filterType, debouncedColorFilter]); 

  
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleOpenDetail = (visual) => {
    setSelectedVisual(visual);
  };

  const handleCloseDetail = () => {
    setSelectedVisual(null);
  };
  
  const handleGoToStudio = () => {
      if (!selectedVisual) return;
      navigate('/estudio-creativo', { state: { image: selectedVisual } });
  }

  const filteredVisuals = useMemo(() => {
    if (!colorFilter.trim()) {
        return visuals; // Si no hay filtro de color, devuelve todas las imágenes
    }
    
    // Si hay filtro, devuelve solo las que incluyan el texto del color
    return visuals.filter(visual => 
        visual.color_dominante && visual.color_dominante.toLowerCase().includes(colorFilter.toLowerCase())
    );
}, [visuals, colorFilter])
 

  return (
  <>
    <Box sx={{ display: "flex", height: "100vh", pt: "72px" ,  pt: 'calc(72px + 1px)', background:'#eaeff1'  }}>


    {/* ========================================================= */}
{/* --- Columna Izquierda: Panel de Control (Filtros) --- */}
{/* ========================================================= */}

 <Paper
  elevation={4}
  sx={{
    width: "280px",
    p: 4,
    m: 2,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxHeight: 'calc(100vh - 64px)',
    overflowY: 'auto',
    order: 2,
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',
    color: '#ffffff', // texto blanco fijo
  }}
>
  <Typography variant="h6" gutterBottom fontWeight="bold">
    Filtros
  </Typography>

  {/* --- Filtro 1: Búsqueda por Texto --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    BUSCAR EN PROMPTS
  </Typography>
  <TextField
    fullWidth
    label="Buscar ..."
    variant="outlined"
    size="small"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ color: '#ffffff' }} />
        </InputAdornment>
      ),
    }}
    sx={{
      mb: 2,
      '& .MuiOutlinedInput-root': { borderRadius: 2, color: '#ffffff' },
      '& .MuiInputLabel-root': { color: '#ffffff' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
    }}
  />

  {/* --- Divider con degradado y icono central --- */}
  <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
    <CircleIcon sx={{ mx: 1, fontSize: 10, color: '#ffffff' }} />
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
  </Box>

  {/* --- Filtro 2: Tipo de Imagen --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    TIPO DE IMAGEN
  </Typography>
  <ToggleButtonGroup
    color="primary"
    value={filterType}
    exclusive
    onChange={handleFilterChange}
    fullWidth
    size="small"
    sx={{
      mb: 2,
      '& .MuiToggleButton-root': {
        borderRadius: 2,
        textTransform: 'none',
        color: '#ffffff', // texto blanco
        borderColor: 'rgba(255,255,255,0.5)',
      },
      '& .Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' },
    }}
  >
    <ToggleButton value="todos">Todos</ToggleButton>
    <ToggleButton value="generada">Generadas</ToggleButton>
    <ToggleButton value="meme">Memes</ToggleButton>
  </ToggleButtonGroup>

  {/* --- Divider con degradado y icono central --- */}
  <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
    <CircleIcon sx={{ mx: 1, fontSize: 10, color: '#ffffff' }} />
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
  </Box>

  {/* --- Filtro 3: Color Dominante --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    COLOR DOMINANTE
  </Typography>
  <TextField
    fullWidth
    label="Filtrar por color (HEX)"
    variant="outlined"
    size="small"
    value={colorFilter}
    onChange={(e) => setColorFilter(e.target.value)}
    placeholder="#26717a"
    sx={{
      '& .MuiOutlinedInput-root': { borderRadius: 2, color: '#ffffff' },
      '& .MuiInputLabel-root': { color: '#ffffff' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
    }}
  />
</Paper>




      {/* Columna Derecha: Galería */}
      <Box
        sx={{
          order: 1,
          flexGrow: 1,
          p: 2,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          sx={{ mb: 2, color:'black' }}
        >
          Mi Galería
        </Typography>

        {/* Caja de contenido que crece */}
        <Box sx={{ flexGrow: 1 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && (
            <Grid container spacing={2}>
              {visuals.length > 0 ? (
                visuals.map((visual) => (
                  <Grid key={visual.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <VisualCard
                      visual={visual}
                      onClick={() => handleOpenDetail(visual)}
                    />
                  </Grid>
                ))
              ) : (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                      {debouncedSearchTerm 
                        ? `No se encontraron resultados para "${debouncedSearchTerm}".`
                        : "Tu galería está vacía. ¡Empieza a crear imágenes!"
                      }
                      </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </Box>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 2,
              mt: "auto",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              variant="outlined"
              shape="rounded"
            />
          </Box>
        )}
      </Box>

      {/* Modal de Vista Rápida */}
      <Dialog
        open={Boolean(selectedVisual)}
        onClose={handleCloseDetail}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        {selectedVisual && (
          <>
            <DialogTitle sx={{ fontWeight: "bold" }}>
              Detalles de la Creación
            </DialogTitle>
            <DialogContent
              dividers
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 3,
                bgcolor: "background.default",
              }}
            >
              {/* Imagen Preview */}
              <Box
                component="img"
                src={selectedVisual.public_url}
                alt="Vista previa"
                sx={{
                  maxWidth: "50%",
                  borderRadius: 2,
                  boxShadow: 2,
                  objectFit: "contain",
                }}
              />

              {/* Info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ID: {selectedVisual.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Creado el:{" "}
                  {new Date(selectedVisual.created_at).toLocaleString()}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions
              sx={{
                justifyContent: "space-between",
                p: 2,
              }}
            >
              {/* Botón de Eliminar a la izquierda */}
              <Tooltip title="Eliminar Imagen">
                <IconButton
                  onClick={handleOpenConfirmDialog}
                  color="error"
                  size="large"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              {/* Acciones a la derecha */}
              <Box>
                <Button onClick={handleCloseDetail} sx={{ mr: 1 }}>
                  Cerrar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PaletteIcon />}
                  onClick={handleGoToStudio}
                >
                  Editar en Estudio Creativo
                </Button>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>

    {/* Modal de Confirmación */}
    <Dialog
      open={isConfirmDialogOpen}
      onClose={handleCloseConfirmDialog}
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle>Confirmar Eliminación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          ¿Confirma que desea eliminar esta imagen?<br />
  Esta acción no se puede deshacer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
        <Button
          onClick={handleConfirmDelete}
          color="error"
          variant="contained"
          disabled={isDeleting}
        >
          {isDeleting ? <CircularProgress size={24} /> : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
}-----------------------------------------------------



// src/pages/EstudioCreativoPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Slider, Select, MenuItem, InputLabel, FormControl, Tooltip , Box, Paper, Typography, TextField, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InputAdornment from "@mui/material/InputAdornment";
import { useNotification } from '../context/NotificationContext'; 
import { supabase } from '../supabaseClient'; // Asegúrate de tener esta importación
import SaveIcon from '@mui/icons-material/Save'; // Importa el icono de guardar



 const getMemeTextStyle = (fontFamily, fontColor, borderColor, fontSize) => ({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  textAlign: 'center',
  color: fontColor,
  fontWeight: 'bold',
  fontFamily: `${fontFamily}, sans-serif`,
  textTransform: 'uppercase',
  textShadow: `2px 2px 0 ${borderColor}, -2px -2px 0 ${borderColor}, 2px -2px 0 ${borderColor}, -2px 2px 0 ${borderColor}, 2px 0 0 ${borderColor}, -2px 0 0 ${borderColor}, 0 2px 0 ${borderColor}, 0 -2px 0 ${borderColor}`,
  letterSpacing: '1px',
  // Usamos el tamaño del estado y le añadimos 'px' para que sea una unidad CSS válida
  fontSize: `${fontSize}px`, 
  overflowWrap: 'break-word',
});


export default function EstudioCreativoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useNotification(); //`impact`)
  // Estado para la imagen con la que estamos trabajando
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fontColor, setFontColor] = useState('#FFFFFF'); // Blanco por defecto
  const [borderColor, setBorderColor] = useState('#000000'); // Negro por defecto
  const [fontName, setFontName] = useState('impact'); // Impact por defecto
  const [sourceImageUrl, setSourceImageUrl] = useState(null);
  const [fontSize, setFontSize] = useState(40);


   useEffect(() => {
    if (location.state?.image) {
      const imageFromGallery = location.state.image;
      setActiveImage(imageFromGallery);
      
      // CLAVE: Guardamos la URL firmada (y válida por 1h) que nos dio el backend
      setSourceImageUrl(imageFromGallery.public_url); 
    }
    setLoading(false);
  }, [location.state]);

  if (loading) {
    return <Box /* ... Círculo de carga ... */ />;
  }

  const handleCreateMeme = async () => {
    // Usamos la URL firmada guardada. Si no existe, no hacemos nada.
    if (!sourceImageUrl) {
      showNotification("Error: No se encontró la URL de la imagen de origen.", "error");
      return;
    }

    setIsCreatingMeme(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");

      const formData = new FormData();
      
      // USAMOS LA URL FIRMADA QUE GUARDAMOS. Esta SÍ es accesible para el backend.
      formData.append('image_url', sourceImageUrl); 
      
      // ... resto del formData (topText, bottomText, colores, etc.)
      formData.append('topText', topText);
      formData.append('bottomText', bottomText);
      formData.append('fontColor', fontColor);
      formData.append('borderColor', borderColor);
      formData.append('fontName', fontName);
      formData.append('fontSize', fontSize);

      const url = `${import.meta.env.VITE_API_URL}/api/create-meme`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear el meme.");
      }
      
      const memeBlob = await response.blob();
      const memeUrl = URL.createObjectURL(memeBlob);
      
      // Actualizamos la imagen visible con la nueva URL local "blob"
      // PERO MANTENEMOS la `sourceImageUrl` intacta para futuras ediciones.
      setActiveImage(prev => ({ 
        ...prev,
        public_url: memeUrl, // URL para mostrar en el <img>
        blob: memeBlob,      // El nuevo archivo binario para guardar
        type: 'meme'
      }));

      showNotification("¡Meme creado! Ahora puedes guardarlo en tu galería.", "success");

    } catch (error) {
      console.error("Error creando el meme:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCreatingMeme(false);
    }
  };

  
    const handleSaveToGallery = async () => {
        if (!activeImage) {
            showNotification("No hay nada que guardar.", "warning");
            return;
        }

        // Si la imagen activa no tiene un 'blob', significa que es la original
        // y necesitamos obtenerlo primero. (Esto es para un caso avanzado, por ahora asumimos que el blob existe)
        if (!activeImage.blob) {
            showNotification("Por favor, aplica una transformación (como crear un meme) antes de guardar.", "info");
            // Opcional: podrías implementar una descarga del `public_url` para obtener el blob
            return; 
        }

        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const formData = new FormData();
            
            // Usamos el blob guardado en el estado 'activeImage'
            formData.append('image', activeImage.blob, `creative-studio-image.png`);
            formData.append('type', activeImage.type || 'editada'); // Usa el tipo actualizado o uno genérico
            
            // Si la imagen original tenía un prompt, lo mantenemos
            if (activeImage.prompt) {
                formData.append('prompt', activeImage.prompt);
            }
            if (activeImage.project_id) {
                 formData.append('project_id', activeImage.project_id);
            }


            const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo guardar la imagen.");
            }

            showNotification("¡Guardado en tu galería con éxito!", "success");
            navigate('/galeria'); // Navegamos de vuelta a la galería

        } catch (error) {
            console.error("Error guardando en galería:", error);
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };
    
   const dynamicMemeTextStyle = getMemeTextStyle(fontName, fontColor, borderColor, fontSize);
   
  return (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      pt: `calc(72px + 1px)`,
      px: 2,
      pb: 1,
      gap: 2,
      background: '#e3f2fd',
    }}
  >
    
    {/* --- Columna Izquierda: Lienzo y Controles de Texto --- */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Cabecera (sin cambios) */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0, }}>
         <Typography variant="h5" fontWeight="bold">Estudio Creativo</Typography>
         <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/galeria')}>
          Volver a la Galería
        </Button>
         <Button 
            variant="contained" 
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveToGallery}
            disabled={isSaving || !activeImage?.blob}
        >
            Guardar en Galería
        </Button>
      </Paper>

      {/* Contenedor principal: Imagen a la izquierda y TextBoxes a la derecha */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 , maxHeight: '78vh',}}>
        
        {/* NUEVO: Contenedor para la imagen y la previsualización del texto */}
        <Paper sx={{ 
            flex: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 1, 
            overflow: 'hidden',
            position: 'relative' // ¡Importante para la previsualización!
        }}>
          {activeImage ? (
            <>
              <Box
                component="img"
                src={activeImage.public_url}
                alt="Imagen activa"
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              {/* Previsualización Texto Superior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, top: '5%' }}>
                {topText}
              </Typography>
              {/* Previsualización Texto Inferior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, bottom: '5%' }}>
                {bottomText}
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary">
              Selecciona una imagen de tu galería para empezar.
            </Typography>
          )}
        </Paper>

        {/* Textos para Meme y Botón de Aplicar */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2, background: '#fff', borderRadius: 1 }}>
            
            <Typography variant="h6" gutterBottom>Laboratorio de Memes</Typography>

            {/* Campo Texto Superior */}
            <TextField
                label="Texto Superior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignTopIcon />
                    </InputAdornment>
                    ),
                }}
            />

            {/* Campo Texto Inferior */}
            <TextField
                label="Texto Inferior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignBottomIcon />
                    </InputAdornment>
                    ),
                }}
            />
            
            {/* MOVIDO y MEJORADO: Botón para aplicar textos */}
            <Button
                variant="contained"
                fullWidth
                onClick={handleCreateMeme}
                disabled={!activeImage || isCreatingMeme}
                sx={{ mt: 2 }} // Margen superior para separarlo
            >
                {isCreatingMeme ? <CircularProgress size={24} /> : "Aplicar Textos a la Imagen"}
            </Button>
        </Box>
      </Box>
    </Box>

    {/* --- Columna Derecha: Caja de Herramientas --- */}
    <Paper sx={{ width: '350px', flexShrink: 0, p: 3, overflowY: 'auto' ,gap:1}}>
      <Typography variant="h6" gutterBottom>Herramientas</Typography>

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Generador de Imágenes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Contenido del generador */}
        </AccordionDetails>
      </Accordion>

      {/* MODIFICADO: Ahora este acordeón es para opciones y extras */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextFieldsIcon />
                <Typography>Opciones de Texto</Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}> {/* Aumentamos el gap */}
                
                {/* NUEVO: Selector de Fuente */}
                <FormControl fullWidth>
                  <InputLabel id="font-select-label">Fuente</InputLabel>
                  <Select
                    labelId="font-select-label"
                    value={fontName}
                    label="Fuente"
                    onChange={(e) => setFontName(e.target.value)}
                  >
                    <MenuItem value="impact">Impact</MenuItem>
                    <MenuItem value="arial">Arial</MenuItem>
                    <MenuItem value="comic_sans">Comic Sans</MenuItem>
                  </Select>
                </FormControl>

                 {/* NUEVO: Slider para el tamaño de la fuente */}
                <Box>
                  <Typography gutterBottom variant="body2">
                    Tamaño de Fuente: {fontSize}px
                  </Typography>
                  <Slider
                    value={fontSize}
                    onChange={(e, newValue) => setFontSize(newValue)}
                    aria-labelledby="font-size-slider"
                    valueLabelDisplay="auto"
                    step={2}
                    min={10}
                    max={120} // Puedes ajustar este rango
                  />
                </Box>

                {/* NUEVO: Selectores de Color */}
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Tooltip title="Color del Texto">
                    <TextField
                      label="Texto"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Tooltip>
                  <Tooltip title="Color del Borde">
                    <TextField
                      label="Borde"
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Tooltip>
                </Box>
                
                {/* El botón de usar prompt se mantiene */}
                {activeImage?.prompt && (
                     <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => setBottomText(activeImage.prompt)}
                        startIcon={<AutoFixHighIcon />}
                    >
                        Usar prompt como texto inferior
                    </Button>
                )}

            </Box>
        </AccordionDetails>
    </Accordion>


      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>Removedor de Fondo</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {/* Contenido del removedor de fondo */}
        </AccordionDetails>
      </Accordion>
    </Paper>
  </Box>
);
}







// RUTA: src/components/analysis/SensitivityAnalysis.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
    Box, Typography, FormControl, InputLabel, Select, MenuItem, Button, TextField, 
    CircularProgress, Alert, Paper, Slider, Grid, Card, CardContent, Stack,
    CardActions, Divider, Avatar
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FunctionsIcon from '@mui/icons-material/Functions';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';


const SummaryCard = ({ title, value, icon, color, explanation }) => (
  <Grid item xs={12} md={6}>
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,           // bordes redondeados
        boxShadow: 3,              // sombra inicial
        transition: '0.3s',        // transición suave
        "&:hover": {
          boxShadow: 6,            // sombra más intensa al pasar el mouse
          transform: 'translateY(-4px)', // efecto flotante
        },
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: `${color}.light`, color: `${color}.dark` }}>
          {icon}
        </Avatar>
        <Box>
          <Typography color="text.secondary" variant="body2">{title}</Typography>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {typeof value === 'number' ? value.toFixed(4) : '...'}
          </Typography>
        </Box>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, flexGrow: 1 }}>
        {explanation}
      </Typography>
    </Paper>
  </Grid>
);



export default function SensitivityAnalysis({ model }) {
    // --- LÓGICA (SIN CAMBIOS) ---
    const [featureToVary, setFeatureToVary] = useState('');
    const [baseDataPoint, setBaseDataPoint] = useState({});
    const [simulationRange, setSimulationRange] = useState([50, 150]);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const numericFeatures = useMemo(() => model.features.filter(f => f.type === 'numeric'), [model.features]);
    const otherFeatures = useMemo(() => model.features.filter(f => f.name !== featureToVary), [model.features, featureToVary]);

    // ===========================================================================
    // === SOLUCIÓN 1: CÁLCULO DE ESTADÍSTICAS EN EL FRONTEND                  ===
    // ===========================================================================
    // Usamos useMemo para calcular las estadísticas solo cuando chartData cambia.
    // Esto soluciona el problema de 'NaN' y los datos vacíos.
    const summaryStats = useMemo(() => {
        if (!chartData?.sensitivity_results || chartData.sensitivity_results.length === 0) {
            return { min: null, max: null, avg: null, impact: null };
        }
        const predictions = chartData.sensitivity_results.map(d => d.prediction);
        const min = Math.min(...predictions);
        const max = Math.max(...predictions);
        const avg = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
        const impact = max - min;
        return { min, max, avg, impact };
    }, [chartData]);


    useEffect(() => {
        const initialValues = {};
        model.features.forEach(feature => {
            initialValues[feature.name] = feature.type === 'numeric' ? 0 : feature.options?.[0] || '';
        });
        setBaseDataPoint(initialValues);
        
        setFeatureToVary('');
        setChartData(null);
        setError(null);
    }, [model.id, model.features]);

    const handleFeatureToVaryChange = (event) => {
        setFeatureToVary(event.target.value);
        setChartData(null);
        setError(null);
    };

    const handleBaseDataChange = (featureName, value) => {
        setBaseDataPoint(prev => ({ ...prev, [featureName]: value }));
    };

    const handleRunAnalysis = async () => {
        setLoading(true); setError(null); setChartData(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const cleanedBaseDataPoint = {};
            for (const key in baseDataPoint) {
                cleanedBaseDataPoint[key.trim()] = baseDataPoint[key];
            }

            const payload = {
                feature_to_vary: featureToVary.trim(),
                variation_range: { start: simulationRange[0], end: simulationRange[1], steps: 30 },
                base_data_point: cleanedBaseDataPoint
            };
            
            console.log("🚀 PAYLOAD ENVIADO A LA API:", JSON.stringify(payload, null, 2));

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/sensitivity`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'Ocurrió un error en el análisis.');
            setChartData(result.data);

        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };


     
    // ===========================================================================
    // === SOLUCIÓN 2: CORRECCIÓN DEL LAYOUT DE LAS COLUMNAS                  ===
    // ===========================================================================
    return (
        <Grid container spacing={5}> {/* Reducimos un poco el espaciado */}
            
            {/* === COLUMNA IZQUIERDA: CONTROLES --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 33% en desktop (md=4) */}
               <Grid xs={12} md={6} sx={{ mx: 'auto' }}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                    <Box>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem',  color:"white" }}>Simulador Interactivo</Typography>
                        <Typography variant="body2" sx={{ mb: 1,  color:"white" }}>
                          Selecciona una característica, establece un escenario inicial y simula los resultados.
                        </Typography>
                    </Box>

                    <Paper
                        elevation={2}
                        sx={{
                         p: 2,
                         borderRadius: 3, 
                          border: '1px solid',
                          borderColor: 'primary.main',            // bordes redondeados
                         boxShadow: 3,                      // sombra inicial
                          transition: "0.3s",
                          backgroundColor: 'background.paper', // fondo
                            "&:hover": {
                          boxShadow: 6,                   // sombra más intensa al hover
                          transform: "translateY(-2px)"   // efecto leve de “flotante”
                           }
                         }}
                         >
                        <Typography
                          variant="subtitle1"
                          color="text.primary"   // 👈 se adapta al modo
                          sx={{ fontWeight: 'bold', mb: 1.5 }}
                          >
                          Paso 1: Selección de la característica a simular
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Característica Numérica</InputLabel>
                            <Select value={featureToVary} label="Característica Numérica" onChange={handleFeatureToVaryChange}>
                                {numericFeatures.map(feature => (
                                    <MenuItem key={feature.name} value={feature.name}>{feature.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Paper>

                    {featureToVary && (
                        <>
                            <Paper
                                elevation={2}
                                sx={{
                                p: 2,
                                borderRadius: 3,                   // bordes redondeados
                                boxShadow: 3,                      // sombra inicial
                                transition: "0.3s",
                                 border: '1px solid',
                                borderColor: 'primary.main',
                                backgroundColor: 'background.paper', // fondo
                                "&:hover": {
                                boxShadow: 6,                   // sombra más intensa al hover
                                transform: "translateY(-2px)"   // efecto leve de “flotante”
                                 }
                                }}
                                 >
                                <Typography 
                                 variant="subtitle1"
                                 color="text.primary"   // 👈 se adapta al modo
                                 sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                    Paso 2: Escenario Base
                                </Typography>
                                <Box sx={{ maxHeight: 300, overflowY: "auto", pr: 1 }}>
                                    {otherFeatures.map(feature => (
                                        <Box key={feature.name} sx={{ mb: 2 }}>
                                            {feature.options ? (
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>{feature.name}</InputLabel>
                                                    <Select
                                                        label={feature.name}
                                                        value={baseDataPoint[feature.name] || ""}
                                                        onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                    >
                                                        {feature.options.map(option => (
                                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                <TextField
                                                    fullWidth type="number" label={feature.name} size="small"
                                                    value={baseDataPoint[feature.name] || ""}
                                                    onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                            
                            <Card elevation={2} sx={{  border: '1px solid',borderColor: 'primary.main', borderRadius: 2, flexShrink: 0 , p: 3}}>
                                 <CardContent>
                                      <Typography 
                                        variant="subtitle1"
                                        color="text.primary"   // 👈 se adapta al modo
                                        sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                     </Typography>
                                     <Typography 
                                       variant="body2" 
                                       color="text.secondary" 
                                       sx={{ mt: 3 }}
                                         >
                                        Rango para <strong>{featureToVary}</strong>:
                                     </Typography>
                                     <Box sx={{ px: 1 }}>
                                       <Slider
                                         value={simulationRange}
                                         onChange={(e, newValue) => setSimulationRange(newValue)}
                                         valueLabelDisplay="auto" min={0} max={200} step={1}
                                       />
                                     </Box>
                                 </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: "center", p: 2 }}>
                                    <Button
                                        variant="contained" size="large"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                                        onClick={handleRunAnalysis} disabled={loading || !featureToVary}
                                    >
                                        {loading ? "Analizando..." : "Ejecutar Simulación"}
                                    </Button>
                                </CardActions>
                            </Card>
                        </>
                    )}
                </Stack>
            </Grid>

            {/* === COLUMNA DERECHA: RESULTADOS --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 67% en desktop (md=8) */}
                 <Grid xs={12} md={6} sx={{ mx: 'auto' }}>
                   <Paper 
                    sx={{ 
                     p: 0, 
                     height: '100%', 
                     display: "flex", 
                     flexDirection: "column",
                     minWidth: 0,       // evita que fuerce más ancho
                     overflowX: 'auto',  // scroll si el gráfico se pasa
                    
                   }}
                 >
                    <Typography
                    variant="h6"
                      sx={{
                       fontSize: "1.1rem",
                       mb: 3,
                       mt: 2,
                       textAlign: "center", // 👈 centra el texto dentro de su contenedor
                        }}
                         >
                             Resultado de la Simulación
                    </Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {loading ? (
                        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CircularProgress /><Typography sx={{ ml: 2 }}>Realizando simulación...</Typography>
                        </Box>
                    ) : chartData ? (
                        <Stack spacing={3}>
                            <Alert severity="info" icon={<ScienceIcon fontSize="inherit" />} sx={{ mb: 2 }}>
                                Este gráfico muestra cómo cambia la **predicción**   al modificar los 
                               valores de **{chartData.feature_analyzed}**.
                            </Alert>

                            <Box sx={{ flexGrow: 1, minHeight: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.sensitivity_results} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="feature_value" name={chartData.feature_analyzed} />
                                        <YAxis />
                                        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value} />
                                        <Legend />
                                        <Line type="monotone" dataKey="prediction" name="Predicción" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>

                       <Box>
  <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>Resumen</Typography>

  <Box
      sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, // 1 col en mobile, 2 cols en desktop
      gap: 2,
    }}
  >
    <SummaryCard
      title="Predicción Mínima"
      value={summaryStats.min}
      icon={<ArrowDownwardIcon />}
      color="error"
      explanation={
        <>

          Es el resultado más bajo  que  <br />
         se obtuvo al variar "{chartData.feature_analyzed}".
        </>
      }
    />
    <SummaryCard
      title="Predicción Máxima"
      value={summaryStats.max}
      icon={<ArrowUpwardIcon />}
      color="success"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Es el valor más alto que alcanzó <br />
          la predicción durante la simulación.
        </>
      }
    />

    <SummaryCard
      title="Predicción Promedio"
      value={summaryStats.avg}
      icon={<FunctionsIcon />}
      color="info"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Representa el valor central o el más<br />
           probable de todos los resultados.
        </>
      }
    />

    <SummaryCard
      title="Impacto de la Variable"
      value={summaryStats.impact}
      icon={<CompareArrowsIcon />}
      color="warning"
      explanation={
        <>
          Muestra cuánto cambió la predicción. <br />
          Un valor alto significa que esta <br />
          variable es muy influyente.
        </>
      }
    />
  </Box>
</Box>

                        </Stack>
                    ) : (
                        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", p: 3, border: "2px dashed", borderColor: "divider", borderRadius: 2 }}>
                            <Typography color="text.secondary">Los resultados de tu simulación aparecerán aquí.</Typography>
                        </Box>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}


-----------------------------------------



// src/pages/DataPrepPage.jsx (VERSIÓN FINAL, LIMPIA Y FUNCIONAL)
import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Box, Typography, Paper, CircularProgress, Alert, Button, Dialog,
    DialogTitle, DialogContent, DialogActions, FormGroup, FormControlLabel,
    Checkbox, TextField,Divider,DialogContentText,Select, Tooltip
} from '@mui/material';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'; // O el icono que prefieras
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { supabase } from '../supabaseClient';
import DiagnosticCard from '../components/dashboard/DiagnosticCard';
import { TablePreview, TextPreview } from '../components/dashboard/DataPreviews';
import ColumnInspector from '../components/dashboard/ColumnInspector'; 
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; 
import CreateColumnModal from '../components/dashboard/CreateColumnModal';
import { useNotification } from '../context/NotificationContext'; 
import DuplicateColumnModal from '../components/dashboard/DuplicateColumnModal';
import ContentCopyIcon from '@mui/icons-material/ContentCopy'; 
import { useQualityCheck } from '../hooks/useQualityCheck'; 
import FactCheckIcon from '@mui/icons-material/FactCheck';
import ScienceIcon from '@mui/icons-material/Science';
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import DataToolbar from '../components/dashboard/DataToolbar';

const LazyDatasetVisualizer = React.lazy(() => import('../components/DatasetVisualizer'));

// --- COMPONENTE 1: MODAL PARA RENOMBRAR ---
const RenameColumnsDialog = ({ open, onClose, columns, onSave }) => {
    const [renames, setRenames] = useState({});
    
    useEffect(() => {
        if (open) setRenames({}); // Limpiar al abrir
    }, [open]);

    const handleRenameChange = (oldName, newName) => {
        setRenames(prev => ({ ...prev, [oldName]: newName.trim() }));
    };


    const handleSaveChanges = () => {
        // Filtramos para enviar solo los campos que realmente se cambiaron
        const renameMap = Object.entries(renames)
            .filter(([oldName, newName]) => newName && newName !== oldName)
            .reduce((acc, [oldName, newName]) => ({ ...acc, [oldName]: newName }), {});

        if (Object.keys(renameMap).length > 0) {
            onSave(renameMap);
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
            <DialogTitle>Renombrar Columnas</DialogTitle>
            <DialogContent dividers>
                {columns.map(col => (
                    <Box key={col} sx={{ display: 'flex', alignItems: 'center', my: 1.5 }}>
                        <Typography sx={{ minWidth: '150px', mr: 2, flexShrink: 0 }}>{col}</Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            size="small"
                            placeholder="Nuevo nombre..."
                            onChange={(e) => handleRenameChange(col, e.target.value)}
                        />
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Button
                  sx={{ width: 180 }} 
                  onClick={onClose} 
                  variant="contained" 
                  color="secondary" 
                  size="medium"
                  >
                  Cancelar
                  </Button>
                  <Button 
                   sx={{ width: 180,ml: 26 }} 
                  onClick={handleSaveChanges} 
                  variant="contained" 
                   color="primary" 
                   size="medium"
                 
                  >
                  Guardar Cambios
                 </Button>
               </Box>

            </DialogActions>
        </Dialog>
    );
};

// --- COMPONENTE 2: MODAL PARA ELIMINAR ---
const DeleteColumnsDialog = ({ open, onClose, columns, onSave }) => {
    const [columnsToDrop, setColumnsToDrop] = useState(new Set());

    useEffect(() => {
        if (open) setColumnsToDrop(new Set()); // Limpiar al abrir
    }, [open]);

    const handleToggleDrop = (column) => {
        setColumnsToDrop(prev => {
            const newSet = new Set(prev);
            if (newSet.has(column)) newSet.delete(column);
            else newSet.add(column);
            return newSet;
        });
    };
    
    const handleSaveChanges = () => {
        const columnsArray = Array.from(columnsToDrop);
        if (columnsArray.length > 0) {
            onSave(columnsArray);
        }
        onClose();
    };

    return (
          <Dialog
             open={open}
             onClose={onClose}
             fullWidth
             maxWidth="sm"           // mismo maxWidth en ambos
     
>
            <DialogTitle>Eliminar Columnas</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    Marque las columnas que desea eliminar 
                </Typography>
                <FormGroup>
                    {columns.map(col => (
                        <FormControlLabel
                            key={col}
                            control={<Checkbox checked={columnsToDrop.has(col)} onChange={() => handleToggleDrop(col)} />}
                            label={col}
                        />
                    ))}
                </FormGroup>
            </DialogContent>
            <DialogActions>
                <Box display="flex" justifyContent="space-between" gap={2}>
                  <Button
                   sx={{ width: 180 }} 
                  onClick={onClose} 
                  variant="contained" 
                  color="secondary" 
                  size="medium"
                  >
                  Cancelar
                  </Button>
                  <Button 
                   sx={{ width: 180,ml: 26 }} 
                  onClick={handleSaveChanges} 
                  variant="contained" 
                   color="primary" 
                   size="medium"
                 
                  >
                  Guardar Cambios
                 </Button>
               </Box>
           </DialogActions>
        </Dialog>
    );
};

 // --- COMPONENTE PRINCIPAL DE LA PÁGINA (VERSIÓN LIMPIA SIN updateStateWithNewData) ---
 export default function DataPrepPage() {
     console.log("✅ 1. DataPrepPage SE ESTÁ RENDERIZANDO");
     const { projectId, datasetId } = useParams();
     const navigate = useNavigate();
     const { showNotification } = useNotification(); // ¡Así de fácil!
     
     // --- ESTADOS ---
     const [loadState, setLoadState] = useState({ loading: true, error: null, data: null });
     const [selectedColumn, setSelectedColumn] = useState(null);
     const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
     const [isRenameModalOpen, setRenameModalOpen] = useState(false);
     const [storagePath, setStoragePath] = useState(null); // CORRECTO: Estado para la ruta
     const [isEditMode, setIsEditMode] = useState(false); // ¿Estamos en modo edición?
     const [textContent, setTextContent] = useState('');    // El texto que se está editando
     const [mode, setMode] = useState('diagnostics'); // Modos: 'diagnostics', 'inspector'
     const [columnKey, setColumnKey] = useState(0);
     const [overrideInspectorData, setOverrideInspectorData] = useState(null);
     const [tableKey, setTableKey] = useState(0);
     const deleteButtonRef = useRef(null);
     const renameButtonRef = useRef(null);
     const [isCreateColumnModalOpen, setCreateColumnModalOpen] = useState(false);
     const [createModalKey, setCreateModalKey] = useState(0);
     const [isDuplicateModalOpen, setDuplicateModalOpen] = useState(false);
     const [columnToDuplicate, setColumnToDuplicate] = useState(null); 
     const { isChecking, qualityResult, runQualityCheck, resetQualityResult } = useQualityCheck();
     const [enrichmentColumn, setEnrichmentColumn] = useState(''); 
     const [searchTerm, setSearchTerm] = useState(''); // Para el texto de búsqueda
     const [filteredData, setFilteredData] = useState(null); // Para guardar los datos filtrados   
     const handleRecheckQuality = () => {
        runQualityCheck(datasetId); // Usas el datasetId de la página actual
    };

    const handleCloseModal = () => {
        resetQualityResult();
    };

     useEffect(() => {
     // Si no hay datasetId, no hagas nada.
     if (!datasetId) {
         console.log("Esperando un datasetId válido...");
         return; 
     }
 
     const fetchAllData = async () => {
         // Reiniciamos todo al empezar una nueva carga
         setLoadState({ loading: true, error: null, data: null });
         setStoragePath(null); 
 
         try {
             // Hacemos UNA SOLA LLAMADA a nuestro backend, que ya nos da todo
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) throw new Error("Sesión no válida.");
             
             const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/diagnose`;
             const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
             
             if (!response.ok) {
                 const errorText = await response.text();
                 throw new Error(`Error del servidor (${response.status}): ${errorText}`);
             }
             
             const result = await response.json();
 
             // Si la llamada fue exitosa, actualizamos los estados directamente
             if (result.success && result.data) {
                 console.log("✅ Datos y ruta recibidos del backend.");
                 
                 // Normalizamos el nombre de la preview por si acaso
                 const dataWithPreview = { ...result.data };
                 if (dataWithPreview.preview) {
                     dataWithPreview.previewData = dataWithPreview.preview;
                     delete dataWithPreview.preview;
                 }
 
                 setLoadState({ loading: false, error: null, data: dataWithPreview });
                 
                 // Guardamos la storage_path que ahora viene en la respuesta
                 if (dataWithPreview.storage_path) {
                     setStoragePath(dataWithPreview.storage_path);
                 } else {
                     console.warn("Advertencia: El backend no devolvió la 'storage_path'.");
                 }
             } else {
                 throw new Error(result.error || "La respuesta del backend no fue exitosa.");
             }
 
         } catch (err) {
             console.error("💥 ERROR CRÍTICO durante la carga de datos:", err.message);
             setLoadState({ loading: false, error: err.message, data: null });
         }
     };
 
     fetchAllData();
 
    }, [datasetId]);

    useEffect(() => {
        // Si el modal de eliminar se acaba de cerrar...
        if (isDeleteModalOpen === false) {
            // ...devuelve el foco a su botón.
            deleteButtonRef.current?.focus();
        }
    }, [isDeleteModalOpen]); // Se ejecuta solo cuando `isDeleteModalOpen` cambia

    // Este useEffect vigila el modal de RENOMBRAR
    useEffect(() => {
        // Si el modal de renombrar se acaba de cerrar...
        if (isRenameModalOpen === false) {
            // ...devuelve el foco a su botón.
            renameButtonRef.current?.focus();
        }
    }, [isRenameModalOpen]);
    
 
   const handleSaveChangesEdition = async () => {
    console.log("Guardando cambios a través del backend...");
    setLoadState(prevState => ({ ...prevState, loading: true }));

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ textContent: textContent })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error en el servidor al guardar");

        // --- LÓGICA DE ÉXITO SIMPLIFICADA ---
        
        // 1. Muestra la notificación de éxito.
        showNotification("¡Cambios guardados con éxito! Refrescando datos...", "success");

        // 2. Espera un segundo y recarga la página.
        // No hacemos NADA MÁS. Dejamos que la recarga haga todo el trabajo.
        setTimeout(() => {
          window.location.reload();
        }, 1000); 

    } catch (error) {
        console.error("💥 ERROR al guardar los cambios:", error.message);
        // Si hay un error, SÍ que tenemos que quitar el loader para que el usuario
        // pueda intentar de nuevo sin tener que recargar.
        setLoadState(prevState => ({ ...prevState, loading: false, error: error.message }));
        showNotification(error.message, "error"); 
    }
};
 const handleEnterEditMode = async () => {
     if (isEditMode) return;
     console.log("Cargando texto a través del backend...");
 
     try {
         const { data: { session } } = await supabase.auth.getSession();
         if (!session) throw new Error("Sesión no válida.");
 
         // Nuestro endpoint de backend se encarga de todo:
         // comprobar si hay texto, si no, convertirlo.
         const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-text-content`;
         
         const response = await fetch(url, {
             headers: { 'Authorization': `Bearer ${session.access_token}` }
         });
         
         const result = await response.json();
         if (!result.success) throw new Error(result.error);
         
         setTextContent(result.textContent);
         setIsEditMode(true);
 
     } catch (error) {
         console.error("Error al entrar en modo edición:", error.message);
         alert(`No se pudo cargar el editor: ${error.message}`);
     }
 };
 
     const handleColumnEdit = async (payload) => {
         setLoadState(prevState => ({ ...prevState, loading: true, error: null }));
         try {
             const { data: { session } } = await supabase.auth.getSession();
             if (!session) throw new Error("Sesión no válida.");
 
             const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/edit-columns`, {
                 method: 'POST',
                 headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                 body: JSON.stringify(payload)
             });
             const result = await response.json();
 
             if (!result.success) throw new Error(result.error || "Error inesperado.");
             
             // Actualizar el estado directamente con los datos nuevos
             const mergedData = { ...loadState.data, ...result.data };
             if (mergedData.preview) {
                 mergedData.previewData = mergedData.preview;
                 delete mergedData.preview;
             }
 
             setLoadState({ loading: false, error: null, data: mergedData });
             setTableKey(prevKey => prevKey + 1);
 
         } catch (err) {
             console.error(`Error durante la acción ${payload.action}:`, err);
             setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
         }
     };
     
      const handleDuplicateColumn = async (newColumnName) => {
            if (!columnToDuplicate) { // <-- CAMBIA selectedColumn POR columnToDuplicate
            showNotification("No hay una columna seleccionada para duplicar.", "error");
            return;
        }

        setLoadState(prevState => ({ ...prevState, loading: true }));

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const payload = {
                columna_original: columnToDuplicate, // <-- CAMBIA ESTO TAMBIÉN
                nuevo_nombre_columna: newColumnName
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/duplicate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");

            // ¡ÉXITO! Actualizamos el estado con la respuesta completa del backend.
            setLoadState({
                loading: false,
                error: null,
                data: {
                    ...loadState.data,
                    diagnostics: result.data.diagnostics,
                    previewData: result.data.previewData,
                }
            });

            // Actualizamos la tabla, mostramos notificación y cerramos el modal.
            setTableKey(prevKey => prevKey + 1);
            showNotification(result.message, "success");
            setDuplicateModalOpen(false);
            setColumnToDuplicate(null); //

        } catch (err) {
            setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
            showNotification(err.message, "error");
        }
    };

 const handleCleanAction = (actionPayload) => {
    (async () => {
        setLoadState(prevState => ({ ...prevState, loading: true }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/clean`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(actionPayload)
            });

            const result = await response.json();

            // Lanza error si el backend falló
            if (!result.success) throw new Error(result.error || "Error inesperado en la limpieza.");

            // --- ¡LA ACTUALIZACIÓN ATÓMICA Y CORRECTA ESTÁ AQUÍ! ---
            setLoadState(prevState => ({
                loading: false, // Quitamos el loader
                error: null,    // Limpiamos errores previos
                data: {
                    ...prevState.data, // Mantenemos datos del padre que no cambian
                    diagnostics: result.data.diagnostics, // REEMPLAZAMOS con la nueva verdad
                    previewData: result.data.previewData, // REEMPLAZAMOS con la nueva verdad
                }
            }));

            // --- LÓGICA POST-ACCIÓN PARA EVITAR FANTASMAS ---

            // 1. Forzamos el refresco de la tabla (esto ya lo tenías y es perfecto)
            setTableKey(prevKey => prevKey + 1);

            // 2. Si se eliminó una columna, deseleccionamos para que no quede un fantasma
            if (actionPayload.action === 'general_drop_columns') {
                setSelectedColumn(null);
                setOverrideInspectorData(null);
                setMode('diagnostics'); // Volvemos al modo diagnóstico general
            }
            
        } catch (err) {
            setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
            // Aquí deberías tener una notificación al usuario del error
        }
    })();
};

    const handleSelectColumn = (columnName) => {
         setMode('inspector'); // Cambia al modo inspector
         setSelectedColumn(columnName);
         setOverrideInspectorData(null); // MUY IMPORTANTE: Resetea los datos para que el inspector sepa que debe buscar por su cuenta.
};

   const handleColumnCleanAction = async (payload) => {
          // 1. Mostramos el loader general.
                setLoadState(prevState => ({ ...prevState, loading: true }));
          
          try {
              // 2. Hacemos la llamada a la API.
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error("Sesión no válida.");
              
              const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/clean`, {
                  method: 'POST',
                  headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(payload)
              });
              
              const result = await response.json();
              if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");
      
              // 3. Mostramos la notificación de éxito.
              showNotification(result.message || "Acción aplicada con éxito", "success");
              
              // 4. ACTUALIZACIÓN ATÓMICA Y ÚNICA DEL ESTADO.
              //    Ponemos loading en false y actualizamos TODOS los datos de una vez.
              setLoadState({
                  loading: false, // ¡Quitamos el loader aquí!
                  error: null,
                  data: {
                      ...loadState.data,
                      diagnostics: result.data.diagnostics,
                      previewData: result.data.previewData,
                  }
              });
              
              // 5. LE PASAMOS LOS DATOS FRESCOS AL HIJO.
              //    Guardamos los datos específicos de la columna en nuestro estado de "override".
              setOverrideInspectorData(result.data.updatedColumnDetails);
              setTableKey(prevKey => prevKey + 1);
              setCreateColumnModalOpen(false);
              
      
          } catch (err) {
              // En caso de error, quitamos el loader y mostramos el mensaje.
              setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
              showNotification(err.message, "error");
          }
      };
 
   const renderRightPanel = () => {

    const columnDetailsForInspector = 
    overrideInspectorData || 
    (loadState.data?.diagnostics?.columnDetails?.[selectedColumn] || null);
        
     // La lógica del modo edición de texto tiene la máxima prioridad
     if (isEditMode) {
         return (
             <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <Typography variant="h6" component="h2" fontWeight="bold">Acciones de Edición</Typography>
                 <Button variant="contained" color="primary" onClick={handleSaveChangesEdition}>Guardar Cambios</Button>
                 <Button variant="outlined" color="secondary" onClick={() => setIsEditMode(false)}>Descartar y Volver</Button>
             </Paper>
         );
     }
 
     // ===> ¡LÓGICA NUEVA BASADA EN EL MODO! <===
     switch (mode) {
         case 'inspector':
         
             return (
                    <ColumnInspector 
                    key={columnKey} 
                    columnName={selectedColumn}
                    onApplyAction={handleColumnCleanAction}
                    
                    initialData={overrideInspectorData} 
                />
         );
 
         case 'diagnostics':
         default:
            
             return (
                 <Paper variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: 'divider' }}>
                     <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
                         <Typography variant="h6" component="h1" fontWeight="bold" sx={{ fontSize: '1.1rem' }}>
                             Diagnóstico y Acciones Rápidas
                         </Typography>
                     </Box>
                     <Box sx={{ flexGrow: 1, p: 1, overflowY: 'auto' }}>
                         <DiagnosticCard
                             data={loadState.data?.diagnostics}
                             fileType={loadState.data?.fileType}
                             onClean={handleCleanAction}
                         />
                     </Box>
                 </Paper>
             );
     }
 };
 
    const renderPreview = () => {

          if (mode === 'global_visualization') {
            return (
                <Suspense fallback={<CircularProgress sx={{ display: 'block', margin: 'auto', mt: 4 }} />}>
                    <LazyDatasetVisualizer 
                        columns={columnsWithTypes} // Esta es la variable que ya calculas con useMemo
                    />
                </Suspense>
            );
        }
        // --- FIN DEL NUEVO BLOQUE LÓGICO ---

     // Si estamos en modo edición, mostramos el editor de texto
     if (isEditMode) {
         return (
             <TextField
                 multiline
                 fullWidth
                 value={textContent}
                 onChange={(e) => setTextContent(e.target.value)}
                 sx={{ 
                     height: '100%',
                     '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                     '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: '0.9rem', p: 2 }
                 }}
             />
         );
     }
 
     // Si está cargando y no hay datos
     if (loadState.loading && !loadState.data) {
         return (
             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                 <CircularProgress />
             </Box>
         );
     }
 
     // Si hay un error
     if (loadState.error) {
         return <Alert severity="error">{loadState.error}</Alert>;
     }
 
     // Si no hay datos de vista previa
     if (!loadState.data || !loadState.data.previewData) {
         return <Typography sx={{ p: 2 }}>No hay datos de vista previa disponibles.</Typography>;
     }
 
     // Vista previa normal con datos
     const { previewData, diagnostics } = loadState.data;
     return (     
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* 1. Añadimos el nuevo Toolbar aquí, justo encima de la tabla */}
            <DataToolbar
                searchTerm={searchTerm}
                onSearchChange={(e) => setSearchTerm(e.target.value)}
                onApplySearch={handleSearch}
                onClearSearch={() => {
                    setSearchTerm('');
                    setFilteredData(null);
                }}
            />

            {/* 2. La tabla ahora ocupa el espacio restante y es desplazable */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TablePreview
                    key={tableKey} 
                    // Y aquí, pasamos los datos filtrados o los originales
                    data={filteredData || previewData}
                    problematicColumns={diagnostics?.columnDetails || []}
                    selectedColumn={selectedColumn}
                    onColumnSelect={handleSelectColumn}
                />
            </Box>
        </Box>
    );

 };

    const handleCreateColumn = async (payload) => {
    setLoadState(prevState => ({ ...prevState, loading: true }));
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        
        // 1. Llamamos a nuestro nuevo endpoint /columns/create
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/columns/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload) 
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error inesperado del servidor.");

        // 2. Lógica de actualización SIMPLE Y SEGURA.
        //    Como el backend siempre nos da los datos correctos, esto es directo.
        setLoadState(prevState => ({
            loading: false,
            error: null,
            data: {
                ...prevState.data, // Mantenemos fileType, etc.
                diagnostics: result.data.diagnostics, // <<-- Leemos la clave correcta
                previewData: result.data.previewData, // <<-- Leemos la clave correcta
            }
        }));

        // 3. Efectos secundarios
        setTableKey(prevKey => prevKey + 1);
        showNotification(result.message, "success");
        setCreateColumnModalOpen(false); // Cerramos el modal
        
    } catch (err) {
        setLoadState(prevState => ({ ...prevState, loading: false, error: err.message }));
        showNotification(err.message, "error");
    }
};
    const handleNavigateToPromptLab = async () => {
    // Si NO hay un filtro activo, simplemente navega como antes.
    if (!filteredData) {
        console.log("Navegando al laboratorio con el dataset completo.");
        navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`);
        return; // Termina la ejecución aquí
    }

    // --- LÓGICA NUEVA: SI SÍ HAY UN FILTRO ACTIVO ---
    console.log("Hay un filtro activo. Llevando solo la selección al laboratorio...");
    
    if (filteredData.length === 0) {
        showNotification("Tu filtro no produjo resultados. No hay nada que llevar al laboratorio.", "warning");
        return;
    }

    setLoadState(prevState => ({ ...prevState, loading: true }));

    try {
        // Convertimos los datos FILTRADOS a texto CSV
        const header = Object.keys(filteredData[0]).join(',');
        const rows = filteredData.map(row => Object.values(row).join(','));
        const csvContent = [header, ...rows].join('\n');

        // Reutilizamos el endpoint para guardar este CSV filtrado como "contenido editado"
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ textContent: csvContent })
        });
        
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        // ¡ÉXITO! Ahora navegamos. El laboratorio leerá nuestra selección.
        navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`);

    } catch (err) {
        showNotification(err.message, "error");
    } finally {
        setLoadState(prevState => ({ ...prevState, loading: false }));
    }
};

  const { columnsWithTypes, numericColumnsForModal } = React.useMemo(() => {
    // El punto de partida es la fuente original de datos.
    const infoArray = loadState.data?.diagnostics?.columns_info;

    // Si la fuente no es un array, devolvemos un estado seguro (listas vacías).
    if (!Array.isArray(infoArray)) {
        return { columnsWithTypes: [], numericColumnsForModal: [] };
    }

    // 1. Calculamos la lista completa para el visualizador.
    const allColumns = infoArray.map(detail => ({ name: detail.name, type: detail.type }));

    // 2. Usando esa lista recién creada, filtramos para obtener las numéricas del modal.
    const numericColumns = allColumns.filter(column => {
        if (!column || typeof column.type !== 'string') {
            return false;
        }
        const typeLowerCase = column.type.toLowerCase();
        return typeLowerCase.includes('int') || typeLowerCase.includes('float');
    });

    // Devolvemos ambas listas a la vez. O se calculan bien las dos, o ninguna.
    return {
        columnsWithTypes: allColumns,
        numericColumnsForModal: numericColumns
    };

}, [loadState.data?.diagnostics?.columns_info]); // La dependencia es ÚNICA y es la fuente original.

    const handleEnrichDataset = async () => {
    if (!enrichmentColumn) {
        showNotification("Por favor, selecciona una columna que contenga URLs de imágenes.", "warning");
        return;
    }

    // 1. Activar el estado de carga
    setLoadState(prevState => ({ ...prevState, loading: true, error: null }));
    
    try {
        // 2. Obtener la sesión y llamar al backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/enrich-with-image-urls`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ column_name: enrichmentColumn })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error en el servidor al enriquecer el dataset");

        // --- LÓGICA DE ÉXITO ---
        
        // 3. Mostrar notificación de éxito
        showNotification(result.message || "¡Dataset enriquecido creado con éxito!", "success");

        // 4. Redirigir al nuevo dataset
        const newDatasetId = result.new_dataset.dataset_id;
        navigate(`/project/${projectId}/dataprep/${newDatasetId}`);

    } catch (error) {
        // --- LÓGICA DE ERROR ---
        console.error("💥 ERROR al enriquecer el dataset:", error.message);
        setLoadState(prevState => ({ ...prevState, loading: false, error: error.message }));
        showNotification(error.message, "error"); 
    }
};

    const handleSearch = () => {
        if (!searchTerm) {
            setFilteredData(null); // Si la búsqueda está vacía, mostramos todos los datos
            return;
        }

        // Usamos los datos originales (loadState.data.previewData) como fuente de verdad
        const originalData = loadState.data?.previewData || [];
        
        const results = originalData.filter(row => 
            // Buscamos en TODAS las columnas (o solo en 'descripcion_ia' si prefieres)
            Object.values(row).some(value =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );

        setFilteredData(results);
    };

     const isAnalysisLocked = loadState.loading || isEditMode;
     const columns = loadState.data?.previewData?.[0] ? Object.keys(loadState.data.previewData[0]) : [];
     const isTabular = loadState.data?.fileType && ['csv', 'xlsx', 'parquet', 'tabular'].includes(loadState.data.fileType);

    

  return (
     <PaginaConAsistente nombreModulo="categoricas_numericas">
    <Box
    sx={{
        height: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
        pt: 'calc(72px + 1px)', background: "linear-gradient(135deg, #26717a, #44a1a0)",
        borderRadius: 2,                // bordes redondeados
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)', // sombra ligera

    }}
>
        {/* --- Cabecera de la Página --- */}
        <Paper 
        elevation={0}
         sx={{ 
        border: '2px solid',
        borderColor: 'primary.main', // azul fuerte del tema MUI
        borderRadius: 2,
        display: 'flex',
        justifyContent: 'space-between', // Mantenemos esto para separar título y botones
        alignItems: 'center',
        p: 1, 
        background: ' #005f73',
        flexWrap: 'wrap', 
        gap: 1, // Añadimos un gap para el espaciado en caso de que se envuelvan
        
    }}
>
    
    {/*  Envolvemos todo en un Box con display: 'flex' */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2,  flexWrap: 'nowrap',minWidth: '50px', justifyContent: 'flex-end'   }}> 
    {isTabular && (
        <>  
            {mode === 'diagnostics' ? (
                <>
                    {/* --- GRUPO 1: ACCIONES BÁSICAS --- */}
                    <Button variant="contained" size="small" color="error" startIcon={<ArrowBackIcon />} onClick={() => navigate(`/project/${projectId}`)}>
                        Volver 
                    </Button>
                    <Tooltip title="Vuelve a ejecutar el análisis de calidad sobre el dataset actual">
                        <Button   
                            variant="contained" 
                            size="small"
                            startIcon={isChecking ? <CircularProgress size={20} /> : <FactCheckIcon />}
                            onClick={handleRecheckQuality}
                            disabled={isChecking}
                        >
                            {isChecking ? 'Diagnosticando...' : 'Verificar Archivo'}
                        </Button>
                    </Tooltip>
                    
                    <Divider orientation="vertical" flexItem />

                    {/* --- GRUPO 2: MODOS DE ANÁLISIS --- */}
                    <Tooltip title="Cambia al modo de inspección para ver y limpiar columnas individuales">
                        <Button variant="contained" size="small" onClick={() => setMode('inspector')} disabled={isAnalysisLocked}>
                            Inspeccionar Columnas
                        </Button>
                    </Tooltip>
                    <Tooltip title="Genera visualizaciones interactivas de tus datos">
                        <Button variant="contained" size="small" onClick={() => setMode('global_visualization')} disabled={isAnalysisLocked}>
                            Analisis Visual
                        </Button>
                    </Tooltip>
                    <Tooltip title="Abre un editor de texto para modificar el contenido del archivo directamente">
                        <Button variant="contained" size="small" onClick={handleEnterEditMode} disabled={!storagePath || isEditMode}>
                            Edición de Archivo
                        </Button>
                    </Tooltip>

                    <Divider orientation="vertical" flexItem />

                    {/* --- GRUPO 3: HERRAMIENTAS DE IA --- */}
                    <Tooltip title="Experimenta con modelos de lenguaje usando los datos de tu dataset">
                        <Button
                            variant="contained"
                            sx={{ background: '#00e5ff'}}
                            size="small"
                            onClick={handleNavigateToPromptLab}
                            startIcon={<ScienceIcon />}
                        >
                            Prompt-Lab
                        </Button>
                    </Tooltip>
                     <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 'auto', alignSelf: 'stretch' }} />
                    {/* El nuevo bloque, ahora con mejor estilo y un Tooltip */}
                    <Tooltip title="Analiza imágenes desde una columna de URLs y añade los resultados como nuevas columnas">
                        <Paper variant="outlined" sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 0.5, borderColor: 'primary.main' }}>
                            <Select native value={enrichmentColumn} onChange={(e) => setEnrichmentColumn(e.target.value)} size="small" disabled={isAnalysisLocked} sx={{ border: 'none', '&:before': { border: 'none' }, '&:after': { border: 'none' }, '& .MuiSelect-select': { pb: '2px' }}}>
                                <option value="">Columna con URLs...</option>
                                {columns.map(col => <option key={col} value={col}>{col}</option>)}
                            </Select>
                            <Button variant="contained" color="primary" onClick={handleEnrichDataset} disabled={!enrichmentColumn || isAnalysisLocked} startIcon={<AutoAwesomeIcon />} size="small">
                                Enriquecer
                            </Button>
                        </Paper>
                    </Tooltip>
                            </>
                            
                        ) : (
                            <>
                                {/* --- BOTONES DEL MODO INSPECTOR (ACCIONES DE COLUMNA) --- */}
                                {/* 1. Selector de Columna */}
                               <Box 
  sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', // separa los dos grupos
    gap: 7,
    flexWrap: 'nowrap',
    width: '100%'
  }}
>
  {/* Grupo izquierdo */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <Button 
      variant="contained" 
      sx={{ ml: 2 }}  
      size="small" 
      color="error" 
      disabled={isAnalysisLocked} 
      onClick={() => { 
        setMode('diagnostics'); 
        setSelectedColumn(null); 
      }}
    >
      Volver a Diagnóstico
    </Button>

     <Button   
      variant="contained"
      size="small" 
      color="primary"
      startIcon={isChecking ? <CircularProgress size={20} /> : <FactCheckIcon />}
      onClick={handleRecheckQuality}
      disabled={isChecking}
    >
      {isChecking ? 'Diagnosticando' : 'Verificar Archivo'}
    </Button>
  </Box>
    <Divider orientation="vertical" flexItem sx={{ mx: 2, height: 'auto', alignSelf: 'stretch' }} />
  {/* Grupo derecho */}
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <Button 
      ref={deleteButtonRef}  
      variant="contained" 
      size="small" 
      color="secondary" 
      startIcon={<DeleteIcon />} 
      onClick={() => setDeleteModalOpen(true)} 
      disabled={isAnalysisLocked || columns.length === 0}
    >
      Eliminar Columna
    </Button>

    <Button 
      ref={renameButtonRef} 
      variant="contained" 
      color="secondary" 
      size="small" 
      startIcon={<DriveFileRenameOutlineIcon />} 
      onClick={() => setRenameModalOpen(true)} 
      disabled={isAnalysisLocked || columns.length === 0}
    >
      Renombrar Columna
    </Button>

    <Button 
      color="secondary"
      variant="contained" 
      size="small" 
      startIcon={<AddCircleOutlineIcon />}
      onClick={() => {
        setCreateColumnModalOpen(true);
        setCreateModalKey(prev => prev + 1);
      }}
      disabled={isAnalysisLocked}
    >
      Crear Columnas
    </Button>

    <Button
      variant="contained"
      size="small"
      color="secondary"
      startIcon={<ContentCopyIcon />}
      onClick={() => {
        if (selectedColumn) {
          setColumnToDuplicate(selectedColumn);
          setDuplicateModalOpen(true);
        } else {
          showNotification("Por favor, seleccione una columna de la tabla para duplicar.", "warning");
        }
      }}
      disabled={isAnalysisLocked || !selectedColumn}
    >
      Duplicar Columna
    </Button>
  </Box>
</Box>
                               
                            </>
                        )}
                    </>
                )}
            </Box>
        </Paper>
        {/* --- Contenido Principal (Paneles Izquierdo y Derecho) --- */}
        <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden'  }}>
            
            {/* Panel Izquierdo: Vista Previa */}
            <Box sx={{ flex: '2 1 0', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ flexGrow: 1, overflow: 'auto', position: 'relative', border: '1px solid', borderColor: ' #2193b0' }}>
                    {loadState.loading && loadState.data && (
                        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, bgcolor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                            <CircularProgress color="primary" />
                        </Box>
                    )}
                    {renderPreview()}
                </Paper>
            </Box>

            {/* Panel Derecho: Dinámico */}
            <Box sx={{ 
               flex: '1 1 0', 
                minWidth: 0, 
                display: 'flex', 
                flexDirection: 'column',
                borderRadius: 1,
                border: '1px solid #2193b0',
                overflow: 'hidden'
            }}>
               {renderRightPanel()}
            </Box>
        </Box>

        {/* Diálogos modales */}
        {isTabular && columns.length > 0 && (
            <>
                <RenameColumnsDialog
                    open={isRenameModalOpen}
                    onClose={() => setRenameModalOpen(false)}
                    columns={columns}
                    onSave={(renameMap) => handleColumnEdit({ action: 'rename_columns', params: { rename_map: renameMap } })}
                />
                <DeleteColumnsDialog
                    open={isDeleteModalOpen}
                    onClose={() => setDeleteModalOpen(false)}
                    columns={columns}
                    onSave={(columnsToDrop) => handleColumnEdit({ action: 'drop_columns', params: { columns: columnsToDrop } })}
                />
            </>

            
        )}

{/* Modal de creación de columna */}
    <CreateColumnModal
      key={createModalKey}
      open={isCreateColumnModalOpen}
      onClose={() => setCreateColumnModalOpen(false)}
      numericColumns={numericColumnsForModal}
      onSave={handleCreateColumn}
    />

    {columnToDuplicate && (
                <DuplicateColumnModal
                    open={isDuplicateModalOpen}
                    onClose={() => {
                        setDuplicateModalOpen(false);
                        setColumnToDuplicate(null); // Limpiamos al cerrar
                    }}
                    onSave={handleDuplicateColumn}
                    originalColumnName={columnToDuplicate}
                />                
            )}

            
    {/* 👇 AQUÍ VA EL DIÁLOGO, FUERA DE LA OTRA CONDICIÓN 👇 */}
    <Dialog open={!!qualityResult} onClose={handleCloseModal}>
        <DialogTitle>Resultado del Diagnóstico</DialogTitle>
        <DialogContent>
            <DialogContentText>
                {qualityResult?.message || "Diagnóstico completado con éxito."}
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseModal}>Cerrar</Button>
        </DialogActions>
    </Dialog>
    
  </Box> 
  </PaginaConAsistente>
);
}



// src/components/ColumnInspector.jsx (VERSIÓN FINAL CON UI DE DIAGNÓSTICO)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button
} from '@mui/material';
import { Tooltip, IconButton } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { supabase } from '../../supabaseClient';
import { FixedSizeList as List } from 'react-window';

// Componentes personalizados
import UniqueValuesModal from './UniqueValuesModal'; 
import StatisticsModal from './StatisticsModal';
import NumericCleaner from './NumericCleaner';
import CategoricalCleaner from './CategoricalCleaner';
import DateTimeCleaner from './DateTimeCleaner';
import ColumnVisualizer from './ColumnVisualizer'; 


// Iconos
import TagIcon from '@mui/icons-material/Tag';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import EventIcon from '@mui/icons-material/Event';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import FlareIcon from '@mui/icons-material/Flare';
import ScienceIcon from '@mui/icons-material/Science';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'; // Icono para editar

// Pequeño componente de ayuda para no repetir código
const StatItem = ({ label, value }) => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
        <Typography variant="body2" color="text.secondary">{label}:</Typography>
        <Typography variant="body2" fontWeight="bold">{String(value)}</Typography>
    </Box>
);

// --- FUNCIÓN DE AYUDA MODIFICADA ---
const generateStatsPreview = (analysis_type, statistics, advanced_analysis) => {
    // Si no hay datos, devuelve un array vacío
    if (!statistics || Object.keys(statistics).length === 0) {
        return [];
    }

    const preview = [];

    // --- Si es una columna NUMÉRICA ---
    if (analysis_type === 'numeric') {
        // (La lógica para numéricas se queda como estaba)
        if (statistics.skew !== undefined) {
            let skew_label = "Simétrica";
            if (statistics.skew > 1) skew_label = "Asimétrica positiva";
            if (statistics.skew < -1) skew_label = "Asimétrica negativa";
            preview.push({ label: "Distribución", value: skew_label });
        }
        if (statistics.std !== undefined && statistics.mean !== undefined && statistics.mean !== 0) {
            const coeff_variation = (statistics.std / Math.abs(statistics.mean)) * 100;
            let dispersion_label = "Baja";
            if (coeff_variation > 30) dispersion_label = "Moderada";
            if (coeff_variation > 60) dispersion_label = "Alta";
            preview.push({ label: "Dispersión de Datos", value: dispersion_label });
        }
    }
    
    // --- Si es una columna CATEGÓRICA (LÓGICA MEJORADA) ---
    if (analysis_type === 'categorical') {
        // 1. Interpretación de la Dominancia (como ya la tenías)
        if (statistics.count > 0 && statistics.freq) {
            const dominance = ((statistics.freq / statistics.count) * 100);
            let dominance_label = "Baja";
            if (dominance > 50) dominance_label = "Moderada";
            if (dominance > 80) dominance_label = "Alta (Desbalance)";
            preview.push({ label: "Dominancia del Top 1", value: `${dominance.toFixed(1)}% (${dominance_label})` });
        }

        // 2. ¡NUEVA INTERPRETACIÓN DE VALORES POCO FRECUENTES!
        // Usamos los datos de advanced_analysis que ya recibimos
        if (advanced_analysis && advanced_analysis.rare_values_count !== undefined && statistics.unique > 0) {
            const rare_percentage = ((advanced_analysis.rare_values_count / statistics.unique) * 100);
            let rare_label = "Bajo";
            if (rare_percentage > 30) rare_label = "Moderado";
            if (rare_percentage > 60) rare_label = "Alto (Cola Larga)";
             preview.push({ label: "Valores Poco Frecuentes", value: `${advanced_analysis.rare_values_count} (${rare_label})` });
        }
    }

    return preview.slice(0, 3); // Devolvemos las interpretaciones más importantes
};

  export default function ColumnInspector({ columnName, onApplyAction,initialData = null }) {
     console.log("1. Prop 'columnName' recibida:", columnName);
    // --- HOOKS Y ESTADOS --- (Esto se queda igual)
    const { datasetId, projectId } = useParams(); // <--projectId ahora se obtiene aquí
    const navigate = useNavigate(); // <-- useNavigate ahora se llama aquí
    
    const [inspectorState, setInspectorState] = useState({ loading: true, error: null, data: null });
    const [activeTab, setActiveTab] = useState(0);
    const [isUniqueValuesExpanded, setUniqueValuesExpanded] = useState(false);
    const [isOutliersExpanded, setOutliersExpanded] = useState(false);
    const [isModalOpen, setModalOpen] = useState(false);
    const [isStatsModalOpen, setStatsModalOpen] = useState(false);
   
    const [isLoadingLab, setIsLoadingLab] = useState(false);

    // --- FUNCIONES DEL COMPONENTE ---
    // <-- La función se declara ahora aquí, en el nivel superior.
    const handleUseColumnInLab = async () => {
        if (!columnName) return;

        setIsLoadingLab(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column/${encodeURIComponent(columnName)}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || "No se pudo obtener el contenido de la columna.");
            }

            navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`, {
                state: { context: result.textContent }
            });

        } catch (error) {
            // showNotification(`Error: ${error.message}`, 'error');
            console.error("Error al preparar la columna para el laboratorio:", error);
        } finally {
            setIsLoadingLab(false);
        }
    };

    useEffect(() => {
        // 1. MUEVE LA FUNCIÓN DE FETCH AQUÍ ARRIBA
        //    (Le cambiamos el nombre porque ya no hace polling)
        const fetchColumnDetails = async () => {
            setInspectorState({ loading: true, error: null, data: null });
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                
                const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column-details?column=${encodeURIComponent(columnName)}`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                const result = await response.json();
                
                if (!response.ok || !result.success) {
                    throw new Error(result.error || `Error del servidor (${response.status})`);
                }

                // Simplemente actualizamos el estado con los datos recibidos.
                setInspectorState({ loading: false, error: null, data: result.data });
            
            } catch (err) {
                setInspectorState({ loading: false, error: err.message, data: null });
            }
        };

        // 2. LÓGICA DE DECISIÓN CLARA Y SIMPLE

        // CASO A: El padre nos da los datos directamente (después de una limpieza).
        if (initialData) {
            console.log("Padre me dio los datos. Usándolos y evitando fetch.");
            setInspectorState({ loading: false, error: null, data: initialData });
            setActiveTab(0); // Reseteamos la pestaña
            return; // ¡Importante! Salimos para no hacer fetch.
        }
        
        // CASO B: No tenemos datos del padre, así que buscamos por nuestra cuenta.
        if (columnName) {
            console.log("No recibí datos del padre. Buscando por mi cuenta...");
            setActiveTab(0); // Reseteamos la pestaña
            fetchColumnDetails(); // Llamamos a nuestra función de fetch simple.
        } else {
            // CASO C: No hay columna seleccionada.
            setInspectorState({ loading: false, error: null, data: null });
        }

    }, [columnName, datasetId, initialData]); 
    

    // --- LÓGICA DE RENDERIZADO ---
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    if (!columnName) {
        return (
            <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <Typography color="text.secondary">Selecciona una columna para ver sus detalles.</Typography>
                
            </Paper>
        );
    }

    if (inspectorState.loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
    if (inspectorState.error) return <Alert severity="error">Error: {inspectorState.error}</Alert>;
    if (!inspectorState.data) return <Typography sx={{p: 2}}>No hay datos de inspección disponibles.</Typography>;

    // LÍNEA CORREGIDA Y SEGURA
   
        const { 
        analysis_type, 
        detected_type,
        statistics = {}, 
        outliers = {},
        null_count = 0 
    } = inspectorState.data;

    // Asignación segura para las claves que pueden no existir
    const advanced_analysis = inspectorState.data.advanced_analysis || {};
    const unique_values = inspectorState.data.unique_values || [];
    // 'total_unique_count' no parece usarse, pero lo dejamos por si acaso
    const total_unique_count = inspectorState.data.total_unique_count || 0;

    // --- EL RESTO DE TU LÓGICA ANTES DEL RETURN ---
    const numericColumns = inspectorState.data?.numeric_columns || [];
    const statsPreview = generateStatsPreview(analysis_type, statistics, advanced_analysis);
    const outlierTooltipText = "Los outliers se calculan dinámicamente. Al limpiar outliers, la distribución de los datos cambia, lo que puede hacer que nuevos valores se consideren outliers.\nPuede repetir la operación si es necesario.";

        
    return (
          <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
           {/* === INICIO DEL NUEVO ENCABEZADO ENRIQUECIDO === */}
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}> {/* <--- CAMBIO: Aumentado el margen inferior (mb) para más aire */}
           {/* Icono dinámico según el tipo de dato */}
           <Paper
               variant="outlined"
               sx={{
               p: 0.5,
               borderRadius: '50%',
               backgroundColor: 'action.hover',
               display: 'inline-flex'
            }}
            >
              {analysis_type === 'numeric' && <TagIcon color="primary" />}
              {analysis_type === 'categorical' && <TextFieldsIcon color="secondary" />}
              {analysis_type === 'datetime' && <EventIcon color="success" />} 
            </Paper>
  
          
        {/* Título y subtítulo */}
        <Box>
          <Typography variant="h6" component="h4" fontWeight="bold">
            {columnName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
            Columna de tipo: {analysis_type}
          </Typography>
        </Box>
      </Box>
  
      {/* Estadísticas clave de un vistazo */}
      <Paper variant="outlined" sx={{ display: 'flex', justifyContent: 'space-around', p: 1, mb: 1, backgroundColor: 'action.hover' }}> {/* <--- CAMBIO: Aumentado padding (p) y margen inferior (mb) */}
  
        {/* ---> AÑADE ESTE NUEVO BLOQUE <--- */}
      {analysis_type === 'datetime' && (
          <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon fontSize="small" sx={{ mr: 0.5, color: null_count > 0 ? 'warning.main' : 'inherit' }} />
                  Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                  {null_count}
              </Typography>
          </Box>
      )}
      {/* ---> FIN DEL BLOQUE AÑADIDO <--- */}
        
      {analysis_type === 'numeric' && statistics && (
          <>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                {null_count}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <FlareIcon fontSize="small" sx={{ mr: 0.5, color: outliers?.count > 0 ? 'error.main' : 'inherit' }} />
                Outliers (IQR)
                  <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{outlierTooltipText}</span>}>
                    <IconButton size="small" sx={{ ml: 0.5 }}>
                    <InfoIcon fontSize="inherit" />
                   </IconButton>
                 </Tooltip>
              </Typography>
              <Typography fontWeight="bold" color={outliers?.count > 0 ? 'error.main' : 'inherit'}>
                {outliers?.count || 0}
              </Typography>
            </Box>
          </>
        )}
        {analysis_type === 'categorical' && statistics && (
          <>
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                Valores Nulos
              </Typography>
              <Typography fontWeight="bold" color={inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit'}>
                {inspectorState.data.null_count || 0}
              </Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Valores Únicos</Typography>
              <Typography fontWeight="bold">{statistics.unique || 'N/A'}</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary">Dominancia Top</Typography>
              <Typography
                fontWeight="bold"
                color={statistics.freq / statistics.count > 0.7 ? 'warning.main' : 'inherit'}
              >
                {statistics.count > 0
                  ? `${((statistics.freq / statistics.count) * 100).toFixed(1)}%`
                  : 'N/A'
                }
              </Typography>
            </Box>
          </>
        )}
      </Paper>
  
      <Box sx={{ borderBottom: 1.5, borderColor: 'divider',mt:1 }}>
       <Tabs value={activeTab} onChange={handleTabChange} aria-label="inspector tabs">
    <Tab 
        label="Diagnóstico" 
        sx={{
            // Estilo cuando la pestaña NO está seleccionada
            color: 'text.secondary', // Un gris sutil para las inactivas
            fontWeight: 'normal',
             fontSize: '0.9rem',
            // Estilo cuando el ratón pasa por encima (sea activa o no)
            '&:hover': {
                color: 'primary.main', // Se pone azul al pasar el ratón
                opacity: 0.9
            },

            // --- ¡LA MAGIA! Estilo cuando la pestaña ESTÁ seleccionada ---
            '&.Mui-selected': {
                color: 'primary.main', // Usa el azul fuerte del tema
                fontWeight: 'bold'   // La ponemos en negrita para que destaque más
            }
        }} 
    />
    <Tab 
        label="Procesamiento" 
        sx={{
            color: 'text.secondary',
            fontSize: '0.9rem',
            fontWeight: 'normal',
            '&:hover': {
                color: 'primary.main',
                opacity: 0.9
            },
            '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'bold'
            }
        }} 
    />
    <Tab 
        label="Visualizaciones" 
        sx={{
            color: 'text.secondary',
             fontSize: '0.9rem',
            fontWeight: 'normal',
            '&:hover': {
                color: 'primary.main',
                opacity: 0.9
            },
            '&.Mui-selected': {
                color: 'primary.main',
                fontWeight: 'bold'
            }
        }} 
    />
</Tabs>
      </Box>
  
      {/* --- CAMBIO CLAVE PARA LA DISTRIBUCIÓN --- */}
      {/* Convertimos este Box en un contenedor flex para espaciar los acordeones con 'gap' */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {activeTab === 0 && (
          <Box>
            {/* === Acordeón para Estadísticas === */}
            {/* <--- CAMBIO: quitamos mb:2 porque ahora lo maneja el 'gap' del padre */}
              <Accordion elevation={0} variant="outlined">
      <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  mb: 2,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    color: 'primary.contrastText',
                  },
                  borderRadius: 1, // Redondeamos un poco los bordes
                  
                }}
              >
          <Typography>Estadísticas</Typography>
      </AccordionSummary>
      <AccordionDetails>
          {/* --- NUEVA VISTA PREVIA INTERPRETADA --- */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
              Resumen interpretado:
          </Typography>
          
          {statsPreview.length > 0 ? (
              statsPreview.map(item => (
                  <StatItem key={item.label} label={item.label} value={item.value} />
              ))
          ) : (
              <Typography variant="caption" color="text.secondary">No hay resumen disponible.</Typography>
          )}
  
          {/* --- EL BOTÓN PARA VER EL DETALLE COMPLETO SE MANTIENE --- */}
          <Button 
              variant="contained" 
              size="small"
              fullWidth
              onClick={() => setStatsModalOpen(true)}
              sx={{ mt: 2 }}
          >
              Ver Todas las Métricas
          </Button>
      </AccordionDetails>
  </Accordion>
  
            {/* === Acordeón para Numéricas: Outliers === */}
            {analysis_type === 'numeric' && outliers && (
              <Accordion
                expanded={isOutliersExpanded}
                onChange={() => setOutliersExpanded(!isOutliersExpanded)}
                elevation={0}
                variant="outlined"
              >
                <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    color: 'primary.contrastText',
                  },
                  borderRadius: 1, // Redondeamos un poco los bordes
                  
                }}
              >
                  <Typography variant="subtitle1" fontWeight="medium">Análisis de Outliers</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <StatItem label="Cantidad de Outliers" value={outliers.count} />
                  <StatItem label="Porcentaje" value={`${outliers.percentage}%`} />
                </AccordionDetails>
              </Accordion>
            )}
  
           {analysis_type === 'categorical' && (

    // Usamos un <Paper> para mantener el estilo de "tarjeta"
    // sx={{ mt: 1 }} le da un pequeño espacio para separarlo del acordeón de arriba
    <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>

        {/* El título, ahora visible permanentemente */}
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
            Valores Únicos
        </Typography>

        {/* La descripción, siempre visible */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Analiza la frecuencia y distribución de todas las categorías 
        </Typography>
        
        {/* El botón, siempre visible y ocupando todo el ancho */}
        <Button 
            variant="contained" 
            fullWidth
            onClick={() => setModalOpen(true)} // Asegúrate de que este onClick sea el correcto
        >
            Explorar todos los valores únicos 
        </Button>

    </Paper>
            )}
          </Box>
        )}
  
        {/* --- CONTENIDO DE LA PESTAÑA 1: PROCESAMIENTO --- */}
  
              
              {activeTab === 1 && (
                  <Box sx={{ p: 1 }}>
                      {/* Caso 1: La columna es NUMÉRICA */}
                      {analysis_type === 'numeric' && (
                          <NumericCleaner 
                              columnName={columnName}
                              null_count={null_count}
                              outliers_count={outliers?.count || 0}
                              onApplyAction={onApplyAction}
                          />
                      )}
  
                      {/* Caso 2: La columna es CATEGÓRICA */}
                      {analysis_type === 'categorical' && (
                          <CategoricalCleaner 
                              columnName={columnName}
                              null_count={null_count}
                              advanced_analysis={advanced_analysis}
                              onApplyAction={onApplyAction}
                              statistics={statistics}
                              unique_values={unique_values}
                          />
                      )}
  
                      {/* Caso 3: La columna es de FECHA */}
                      {analysis_type === 'datetime' && (
                          <DateTimeCleaner
                              columnName={columnName}
                              detectedType={detected_type}
                              onApplyAction={onApplyAction}
                          />
                      )}
                  </Box>
              )}
  
               {/* Pestaña 2: Visualización (CON LA LÓGICA INTELIGENTE) */}
                 
            {activeTab === 2 && (
                <ColumnVisualizer 
                    analysisType={analysis_type} // Le pasamos el tipo de análisis
                    columnName={columnName}     // Le pasamos el nombre de la columna
                />
            )}
               

  
          </Box> {/* <-- Cierre del contenedor principal del contenido de las pestañas */}
           <Box sx={{ flexShrink: 0, pt: 2, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
            <Button
                fullWidth
                variant="contained"
                color="secondary"
                startIcon={isLoadingLab ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                onClick={handleUseColumnInLab}
                disabled={isLoadingLab}
            >
                {isLoadingLab ? 'Preparando Columna...' : `Usar "${columnName}" en Laboratorio Prompt`}
            </Button>
        </Box>
  
          {/* === MODALES (Esto está perfecto, al final y fuera del contenedor con scroll) === */}
          <UniqueValuesModal
              open={isModalOpen}
              onClose={() => setModalOpen(false)}
              columnName={columnName}
              uniqueValues={unique_values}
          />
          <StatisticsModal
              open={isStatsModalOpen}
              onClose={() => setStatsModalOpen(false)}
              columnName={columnName}
              statistics={statistics}          
          />
  
      </Paper>
  );
  }
  // src/components/ColumnInspector.jsx (VERSIÓN FINAL CON UI DE DIAGNÓSTICO)
  import React, { useState, useEffect } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import {
    Box,
    Typography,
    Paper,
    CircularProgress,
    Alert,
    Divider,
    Tabs,
    Tab,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button
  } from '@mui/material';
  import { Tooltip, IconButton } from '@mui/material';
  import InfoIcon from '@mui/icons-material/Info';
  import { supabase } from '../../supabaseClient';
  import { FixedSizeList as List } from 'react-window';
  
  // Componentes personalizados
  import UniqueValuesModal from './UniqueValuesModal'; 
  import StatisticsModal from './StatisticsModal';
  import NumericCleaner from './NumericCleaner';
  import CategoricalCleaner from './CategoricalCleaner';
  import DateTimeCleaner from './DateTimeCleaner';
  import ColumnVisualizer from './ColumnVisualizer'; 
  
  
  // Iconos
  import TagIcon from '@mui/icons-material/Tag';
  import TextFieldsIcon from '@mui/icons-material/TextFields';
  import EventIcon from '@mui/icons-material/Event';
  import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
  import WarningIcon from '@mui/icons-material/Warning';
  import FlareIcon from '@mui/icons-material/Flare';
  import ScienceIcon from '@mui/icons-material/Science';
  import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline'; // Icono para editar
  
  // Pequeño componente de ayuda para no repetir código
  const StatItem = ({ label, value }) => (
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
          <Typography variant="body2" color="text.secondary">{label}:</Typography>
          <Typography variant="body2" fontWeight="bold">{String(value)}</Typography>
      </Box>
  );
  
  // --- FUNCIÓN DE AYUDA MODIFICADA ---
  const generateStatsPreview = (analysis_type, statistics, advanced_analysis) => {
      // Si no hay datos, devuelve un array vacío
      if (!statistics || Object.keys(statistics).length === 0) {
          return [];
      }
  
      const preview = [];
  
      // --- Si es una columna NUMÉRICA ---
      if (analysis_type === 'numeric') {
          // (La lógica para numéricas se queda como estaba)
          if (statistics.skew !== undefined) {
              let skew_label = "Simétrica";
              if (statistics.skew > 1) skew_label = "Asimétrica positiva";
              if (statistics.skew < -1) skew_label = "Asimétrica negativa";
              preview.push({ label: "Distribución", value: skew_label });
          }
          if (statistics.std !== undefined && statistics.mean !== undefined && statistics.mean !== 0) {
              const coeff_variation = (statistics.std / Math.abs(statistics.mean)) * 100;
              let dispersion_label = "Baja";
              if (coeff_variation > 30) dispersion_label = "Moderada";
              if (coeff_variation > 60) dispersion_label = "Alta";
              preview.push({ label: "Dispersión de Datos", value: dispersion_label });
          }
      }
      
      // --- Si es una columna CATEGÓRICA (LÓGICA MEJORADA) ---
      if (analysis_type === 'categorical') {
          // 1. Interpretación de la Dominancia (como ya la tenías)
          if (statistics.count > 0 && statistics.freq) {
              const dominance = ((statistics.freq / statistics.count) * 100);
              let dominance_label = "Baja";
              if (dominance > 50) dominance_label = "Moderada";
              if (dominance > 80) dominance_label = "Alta (Desbalance)";
              preview.push({ label: "Dominancia del Top 1", value: `${dominance.toFixed(1)}% (${dominance_label})` });
          }
  
          // 2. ¡NUEVA INTERPRETACIÓN DE VALORES POCO FRECUENTES!
          // Usamos los datos de advanced_analysis que ya recibimos
          if (advanced_analysis && advanced_analysis.rare_values_count !== undefined && statistics.unique > 0) {
              const rare_percentage = ((advanced_analysis.rare_values_count / statistics.unique) * 100);
              let rare_label = "Bajo";
              if (rare_percentage > 30) rare_label = "Moderado";
              if (rare_percentage > 60) rare_label = "Alto (Cola Larga)";
               preview.push({ label: "Valores Poco Frecuentes", value: `${advanced_analysis.rare_values_count} (${rare_label})` });
          }
      }
  
      return preview.slice(0, 3); // Devolvemos las interpretaciones más importantes
  };
  
    export default function ColumnInspector({ columnName, onApplyAction,initialData = null }) {
       console.log("1. Prop 'columnName' recibida:", columnName);
      // --- HOOKS Y ESTADOS --- (Esto se queda igual)
      const { datasetId, projectId } = useParams(); // <--projectId ahora se obtiene aquí
      const navigate = useNavigate(); // <-- useNavigate ahora se llama aquí
      
      const [inspectorState, setInspectorState] = useState({ loading: true, error: null, data: null });
      const [activeTab, setActiveTab] = useState(0);
      const [isUniqueValuesExpanded, setUniqueValuesExpanded] = useState(false);
      const [isOutliersExpanded, setOutliersExpanded] = useState(false);
      const [isModalOpen, setModalOpen] = useState(false);
      const [isStatsModalOpen, setStatsModalOpen] = useState(false);
     
      const [isLoadingLab, setIsLoadingLab] = useState(false);
  
      // --- FUNCIONES DEL COMPONENTE ---
      // <-- La función se declara ahora aquí, en el nivel superior.
      const handleUseColumnInLab = async () => {
          if (!columnName) return;
  
          setIsLoadingLab(true);
          try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) throw new Error("Sesión no válida.");
  
              const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column/${encodeURIComponent(columnName)}`;
              const response = await fetch(url, {
                  headers: { 'Authorization': `Bearer ${session.access_token}` }
              });
              const result = await response.json();
  
              if (!result.success) {
                  throw new Error(result.error || "No se pudo obtener el contenido de la columna.");
              }
  
              navigate(`/project/${projectId}/dataset/${datasetId}/promptlab`, {
                  state: { context: result.textContent }
              });
  
          } catch (error) {
              // showNotification(`Error: ${error.message}`, 'error');
              console.error("Error al preparar la columna para el laboratorio:", error);
          } finally {
              setIsLoadingLab(false);
          }
      };
  
      useEffect(() => {
          // 1. MUEVE LA FUNCIÓN DE FETCH AQUÍ ARRIBA
          //    (Le cambiamos el nombre porque ya no hace polling)
          const fetchColumnDetails = async () => {
              setInspectorState({ loading: true, error: null, data: null });
              try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) throw new Error("Sesión no válida.");
                  
                  const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/column-details?column=${encodeURIComponent(columnName)}`;
                  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                  const result = await response.json();
                  
                  if (!response.ok || !result.success) {
                      throw new Error(result.error || `Error del servidor (${response.status})`);
                  }
  
                  // Simplemente actualizamos el estado con los datos recibidos.
                  setInspectorState({ loading: false, error: null, data: result.data });
              
              } catch (err) {
                  setInspectorState({ loading: false, error: err.message, data: null });
              }
          };
  
          // 2. LÓGICA DE DECISIÓN CLARA Y SIMPLE
  
          // CASO A: El padre nos da los datos directamente (después de una limpieza).
          if (initialData) {
              console.log("Padre me dio los datos. Usándolos y evitando fetch.");
              setInspectorState({ loading: false, error: null, data: initialData });
              setActiveTab(0); // Reseteamos la pestaña
              return; // ¡Importante! Salimos para no hacer fetch.
          }
          
          // CASO B: No tenemos datos del padre, así que buscamos por nuestra cuenta.
          if (columnName) {
              console.log("No recibí datos del padre. Buscando por mi cuenta...");
              setActiveTab(0); // Reseteamos la pestaña
              fetchColumnDetails(); // Llamamos a nuestra función de fetch simple.
          } else {
              // CASO C: No hay columna seleccionada.
              setInspectorState({ loading: false, error: null, data: null });
          }
  
      }, [columnName, datasetId, initialData]); 
      
  
      // --- LÓGICA DE RENDERIZADO ---
      const handleTabChange = (event, newValue) => {
          setActiveTab(newValue);
      };
  
      if (!columnName) {
          return (
              <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <Typography color="text.secondary">Selecciona una columna para ver sus detalles.</Typography>
                  
              </Paper>
          );
      }
  
      if (inspectorState.loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress /></Box>;
      if (inspectorState.error) return <Alert severity="error">Error: {inspectorState.error}</Alert>;
      if (!inspectorState.data) return <Typography sx={{p: 2}}>No hay datos de inspección disponibles.</Typography>;
  
      // LÍNEA CORREGIDA Y SEGURA
     
          const { 
          analysis_type, 
          detected_type,
          statistics = {}, 
          outliers = {},
          null_count = 0 
      } = inspectorState.data;
  
      // Asignación segura para las claves que pueden no existir
      const advanced_analysis = inspectorState.data.advanced_analysis || {};
      const unique_values = inspectorState.data.unique_values || [];
      // 'total_unique_count' no parece usarse, pero lo dejamos por si acaso
      const total_unique_count = inspectorState.data.total_unique_count || 0;
  
      // --- EL RESTO DE TU LÓGICA ANTES DEL RETURN ---
      const numericColumns = inspectorState.data?.numeric_columns || [];
      const statsPreview = generateStatsPreview(analysis_type, statistics, advanced_analysis);
      const outlierTooltipText = "Los outliers se calculan dinámicamente. Al limpiar outliers, la distribución de los datos cambia, lo que puede hacer que nuevos valores se consideren outliers.\nPuede repetir la operación si es necesario.";
  
          
      return (
            <Paper variant="outlined" sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
             {/* === INICIO DEL NUEVO ENCABEZADO ENRIQUECIDO === */}
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}> {/* <--- CAMBIO: Aumentado el margen inferior (mb) para más aire */}
             {/* Icono dinámico según el tipo de dato */}
             <Paper
                 variant="outlined"
                 sx={{
                 p: 0.5,
                 borderRadius: '50%',
                 backgroundColor: 'action.hover',
                 display: 'inline-flex'
              }}
              >
                {analysis_type === 'numeric' && <TagIcon color="primary" />}
                {analysis_type === 'categorical' && <TextFieldsIcon color="secondary" />}
                {analysis_type === 'datetime' && <EventIcon color="success" />} 
              </Paper>
    
            
          {/* Título y subtítulo */}
          <Box>
            <Typography variant="h6" component="h4" fontWeight="bold">
              {columnName}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
              Columna de tipo: {analysis_type}
            </Typography>
          </Box>
        </Box>
    
        {/* Estadísticas clave de un vistazo */}
        <Paper variant="outlined" sx={{ display: 'flex', justifyContent: 'space-around', p: 1, mb: 1, backgroundColor: 'action.hover' }}> {/* <--- CAMBIO: Aumentado padding (p) y margen inferior (mb) */}
    
          {/* ---> AÑADE ESTE NUEVO BLOQUE <--- */}
        {analysis_type === 'datetime' && (
            <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                    <WarningIcon fontSize="small" sx={{ mr: 0.5, color: null_count > 0 ? 'warning.main' : 'inherit' }} />
                    Valores Nulos
                </Typography>
                <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                    {null_count}
                </Typography>
            </Box>
        )}
        {/* ---> FIN DEL BLOQUE AÑADIDO <--- */}
          
        {analysis_type === 'numeric' && statistics && (
            <>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                  Valores Nulos
                </Typography>
                <Typography fontWeight="bold" color={null_count > 0 ? 'warning.main' : 'inherit'}>
                  {null_count}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <FlareIcon fontSize="small" sx={{ mr: 0.5, color: outliers?.count > 0 ? 'error.main' : 'inherit' }} />
                  Outliers (IQR)
                    <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{outlierTooltipText}</span>}>
                      <IconButton size="small" sx={{ ml: 0.5 }}>
                      <InfoIcon fontSize="inherit" />
                     </IconButton>
                   </Tooltip>
                </Typography>
                <Typography fontWeight="bold" color={outliers?.count > 0 ? 'error.main' : 'inherit'}>
                  {outliers?.count || 0}
                </Typography>
              </Box>
            </>
          )}
          {analysis_type === 'categorical' && statistics && (
            <>
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon fontSize="small" sx={{ mr: 0.5, color: inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit' }} />
                  Valores Nulos
                </Typography>
                <Typography fontWeight="bold" color={inspectorState.data.null_count > 0 ? 'warning.main' : 'inherit'}>
                  {inspectorState.data.null_count || 0}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Valores Únicos</Typography>
                <Typography fontWeight="bold">{statistics.unique || 'N/A'}</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box textAlign="center">
                <Typography variant="caption" color="text.secondary">Dominancia Top</Typography>
                <Typography
                  fontWeight="bold"
                  color={statistics.freq / statistics.count > 0.7 ? 'warning.main' : 'inherit'}
                >
                  {statistics.count > 0
                    ? `${((statistics.freq / statistics.count) * 100).toFixed(1)}%`
                    : 'N/A'
                  }
                </Typography>
              </Box>
            </>
          )}
        </Paper>
    
        <Box sx={{ borderBottom: 1.5, borderColor: 'divider',mt:1 }}>
         <Tabs value={activeTab} onChange={handleTabChange} aria-label="inspector tabs">
      <Tab 
          label="Diagnóstico" 
          sx={{
              // Estilo cuando la pestaña NO está seleccionada
              color: 'text.secondary', // Un gris sutil para las inactivas
              fontWeight: 'normal',
               fontSize: '0.9rem',
              // Estilo cuando el ratón pasa por encima (sea activa o no)
              '&:hover': {
                  color: 'primary.main', // Se pone azul al pasar el ratón
                  opacity: 0.9
              },
  
              // --- ¡LA MAGIA! Estilo cuando la pestaña ESTÁ seleccionada ---
              '&.Mui-selected': {
                  color: 'primary.main', // Usa el azul fuerte del tema
                  fontWeight: 'bold'   // La ponemos en negrita para que destaque más
              }
          }} 
      />
      <Tab 
          label="Procesamiento" 
          sx={{
              color: 'text.secondary',
              fontSize: '0.9rem',
              fontWeight: 'normal',
              '&:hover': {
                  color: 'primary.main',
                  opacity: 0.9
              },
              '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 'bold'
              }
          }} 
      />
      <Tab 
          label="Visualizaciones" 
          sx={{
              color: 'text.secondary',
               fontSize: '0.9rem',
              fontWeight: 'normal',
              '&:hover': {
                  color: 'primary.main',
                  opacity: 0.9
              },
              '&.Mui-selected': {
                  color: 'primary.main',
                  fontWeight: 'bold'
              }
          }} 
      />
  </Tabs>
        </Box>
    
        {/* --- CAMBIO CLAVE PARA LA DISTRIBUCIÓN --- */}
        {/* Convertimos este Box en un contenedor flex para espaciar los acordeones con 'gap' */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto', pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {activeTab === 0 && (
            <Box>
              {/* === Acordeón para Estadísticas === */}
              {/* <--- CAMBIO: quitamos mb:2 porque ahora lo maneja el 'gap' del padre */}
                <Accordion elevation={0} variant="outlined">
        <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    mb: 2,
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiAccordionSummary-expandIconWrapper': {
                      color: 'primary.contrastText',
                    },
                    borderRadius: 1, // Redondeamos un poco los bordes
                    
                  }}
                >
            <Typography>Estadísticas</Typography>
        </AccordionSummary>
        <AccordionDetails>
            {/* --- NUEVA VISTA PREVIA INTERPRETADA --- */}
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Resumen interpretado:
            </Typography>
            
            {statsPreview.length > 0 ? (
                statsPreview.map(item => (
                    <StatItem key={item.label} label={item.label} value={item.value} />
                ))
            ) : (
                <Typography variant="caption" color="text.secondary">No hay resumen disponible.</Typography>
            )}
    
            {/* --- EL BOTÓN PARA VER EL DETALLE COMPLETO SE MANTIENE --- */}
            <Button 
                variant="contained" 
                size="small"
                fullWidth
                onClick={() => setStatsModalOpen(true)}
                sx={{ mt: 2 }}
            >
                Ver Todas las Métricas
            </Button>
        </AccordionDetails>
    </Accordion>
    
              {/* === Acordeón para Numéricas: Outliers === */}
              {analysis_type === 'numeric' && outliers && (
                <Accordion
                  expanded={isOutliersExpanded}
                  onChange={() => setOutliersExpanded(!isOutliersExpanded)}
                  elevation={0}
                  variant="outlined"
                >
                  <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiAccordionSummary-expandIconWrapper': {
                      color: 'primary.contrastText',
                    },
                    borderRadius: 1, // Redondeamos un poco los bordes
                    
                  }}
                >
                    <Typography variant="subtitle1" fontWeight="medium">Análisis de Outliers</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <StatItem label="Cantidad de Outliers" value={outliers.count} />
                    <StatItem label="Porcentaje" value={`${outliers.percentage}%`} />
                  </AccordionDetails>
                </Accordion>
              )}
    
             {analysis_type === 'categorical' && (
  
      // Usamos un <Paper> para mantener el estilo de "tarjeta"
      // sx={{ mt: 1 }} le da un pequeño espacio para separarlo del acordeón de arriba
      <Paper variant="outlined" sx={{ p: 2, mt: 1 }}>
  
          {/* El título, ahora visible permanentemente */}
          <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              Valores Únicos
          </Typography>
  
          {/* La descripción, siempre visible */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Analiza la frecuencia y distribución de todas las categorías 
          </Typography>
          
          {/* El botón, siempre visible y ocupando todo el ancho */}
          <Button 
              variant="contained" 
              fullWidth
              onClick={() => setModalOpen(true)} // Asegúrate de que este onClick sea el correcto
          >
              Explorar todos los valores únicos 
          </Button>
  
      </Paper>
              )}
            </Box>
          )}
    
          {/* --- CONTENIDO DE LA PESTAÑA 1: PROCESAMIENTO --- */}
    
                
                {activeTab === 1 && (
                    <Box sx={{ p: 1 }}>
                        {/* Caso 1: La columna es NUMÉRICA */}
                        {analysis_type === 'numeric' && (
                            <NumericCleaner 
                                columnName={columnName}
                                null_count={null_count}
                                outliers_count={outliers?.count || 0}
                                onApplyAction={onApplyAction}
                            />
                        )}
    
                        {/* Caso 2: La columna es CATEGÓRICA */}
                        {analysis_type === 'categorical' && (
                            <CategoricalCleaner 
                                columnName={columnName}
                                null_count={null_count}
                                advanced_analysis={advanced_analysis}
                                onApplyAction={onApplyAction}
                                statistics={statistics}
                                unique_values={unique_values}
                            />
                        )}
    
                        {/* Caso 3: La columna es de FECHA */}
                        {analysis_type === 'datetime' && (
                            <DateTimeCleaner
                                columnName={columnName}
                                detectedType={detected_type}
                                onApplyAction={onApplyAction}
                            />
                        )}
                    </Box>
                )}
    
                 {/* Pestaña 2: Visualización (CON LA LÓGICA INTELIGENTE) */}
                   
              {activeTab === 2 && (
                  <ColumnVisualizer 
                      analysisType={analysis_type} // Le pasamos el tipo de análisis
                      columnName={columnName}     // Le pasamos el nombre de la columna
                  />
              )}
                 
  
    
            </Box> {/* <-- Cierre del contenedor principal del contenido de las pestañas */}
             <Box sx={{ flexShrink: 0, pt: 2, mt: 'auto', borderTop: 1, borderColor: 'divider' }}>
              <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={isLoadingLab ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                  onClick={handleUseColumnInLab}
                  disabled={isLoadingLab}
              >
                  {isLoadingLab ? 'Preparando Columna...' : `Usar "${columnName}" en Laboratorio Prompt`}
              </Button>
          </Box>
    
            {/* === MODALES (Esto está perfecto, al final y fuera del contenedor con scroll) === */}
            <UniqueValuesModal
                open={isModalOpen}
                onClose={() => setModalOpen(false)}
                columnName={columnName}
                uniqueValues={unique_values}
            />
            <StatisticsModal
                open={isStatsModalOpen}
                onClose={() => setStatsModalOpen(false)}
                columnName={columnName}
                statistics={statistics}          
            />
    
        </Paper>
    );
    }



    ---------------------------------


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
      ToggleButtonGroup,
    } from '@mui/material';
    import SaveIcon from '@mui/icons-material/Save';
    import ArrowBackIcon from '@mui/icons-material/ArrowBack';
    import { supabase } from '../supabaseClient';
    import { useNotification } from '../context/NotificationContext';
    import TextActionsCard from '../components/dashboard/TextActionsCard';
    import AnalysisResultModal from '../components/AnalysisResultModal';
    import CloseIcon from '@mui/icons-material/Close';
    import ArticleIcon from '@mui/icons-material/Article'; // Para la vista simple
    import ViewStreamIcon from '@mui/icons-material/ViewStream'; // Para la vista por secciones
    import SectionsEditor from '../components/dashboard/SectionsEditor'; // <-- AÑADE ESTA LÍNEA
    import TextModificationModal from '../components/dashboard/TextModificationModal.jsx';
    
    export default function DocumentEditor() {
        const { projectId, datasetId } = useParams();
        const navigate = useNavigate();
        const { showNotification } = useNotification();
        const location = useLocation(); // <-- 1. Usamos el hook
    
        // --- ESTADOS ---
        const [loadState, setLoadState] = useState({ loading: true, error: null });
        const [datasetType, setDatasetType] = useState(location.state?.datasetType);
        
        const [textContent, setTextContent] = useState('');
        const [originalText, setOriginalText] = useState('');
        const [selectedText, setSelectedText] = useState('');
        const [isSaving, setIsSaving] = useState(false);
        const hasChanges = textContent !== originalText;
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
    
        const [textStats, setTextStats] = useState({
            chars: 0,
            words: 0,
            tokens: 0,
        });
    
      useEffect(() => {
        if (!datasetId) return;
    
        const fetchDocumentContent = async () => {
          setLoadState({ loading: true, error: null });
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
          } catch (err) {
            setLoadState({ loading: false, error: err.message });
          }
        };
    
        fetchDocumentContent();
      }, [datasetId]);
    
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
    
      const handleSave = async () => {
        setIsSaving(true);
    
        let contentToSave = textContent;
        if (viewMode === 'sections') {
            contentToSave = joinSectionsIntoText(documentSections);
        }
    
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
    
            // --- INICIO DE LA LÓGICA INTELIGENTE (SIN TOCAR useEffect) ---
            
            // 1. JUSTO ANTES DE GUARDAR, PREGUNTAMOS EL TIPO A LA API
            console.log("Preguntando el tipo de dataset antes de guardar...");
            const detailsUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/details`;
            const detailsResponse = await fetch(detailsUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            const detailsResult = await detailsResponse.json();
            if (!detailsResult.success) throw new Error(detailsResult.error || "No se pudo obtener el tipo de dataset.");
            
            const datasetType = detailsResult.data.dataset_type;
            console.log(`El tipo de dataset es: ${datasetType}`);
            
            // 2. AHORA, LA MISMA LÓGICA DE DECISIÓN QUE YA TENÍAMOS
            let url;
            let method;
            let body;
    
            if (['docx', 'pdf', 'text', 'json'].includes(datasetType)) {
                url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/content`;
                method = 'PUT';
                body = JSON.stringify({ newContent: contentToSave });
            } else {
                url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
                method = 'POST';
                body = JSON.stringify({ textContent: contentToSave });
            }
            
            console.log(`Enviando a: ${method} ${url}`);
            // --- FIN DE LA LÓGICA INTELIGENTE ---
    
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: body
            });
    
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || "Error desconocido al guardar.");
            }
    
            setTextContent(contentToSave); 
            setOriginalText(contentToSave);
            showNotification("¡Guardado con éxito!", "success");
    
        } catch (error) {
            console.error("Error al guardar:", error);
            showNotification(error.message, "error");
        } finally {
            setIsSaving(false);
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
        console.log("Texto Original a reemplazar:", original);
        console.log("Tipo de 'original':", typeof original);
        console.log("Sugerencia para insertar:", sugerencia);
        console.log("Tipo de 'sugerencia':", typeof sugerencia);
        console.log("Estado de 'textContent' ANTES:", textContent.substring(0, 200)); // Muestra los primeros 200 caracteres
        // --- FIN DE DEPURACIÓN ---
    
        if (original) {
            // Lógica para reemplazar solo la selección
            const nuevoTexto = textContent.replace(original, sugerencia);
            
            // --- INICIO DE DEPURACIÓN ---
            console.log("Estado de 'textContent' DESPUÉS:", nuevoTexto.substring(0, 200));
            console.groupEnd();
            // --- FIN DE DEPURACIÓN ---
    
            setTextContent(nuevoTexto);
        } else {
            // Lógica si no había selección (reemplazar todo)
            // --- INICIO DE DEPURACIÓN ---
            console.log("Reemplazando el texto completo.");
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
           return text
        .split(/\n\n+/) // Divide por dos o más saltos de línea (párrafos)
        .filter(paragraph => paragraph.trim() !== '') // Elimina párrafos vacíos
        .map((paragraph, index) => ({
          id: `section-${Date.now()}-${index}`, // ID único para la key de React
          content: paragraph,
        }));
    };
    
    /**
     * Toma un array de objetos de sección y lo une en un solo string.
     */
      const joinSectionsIntoText = (sections) => {
         return sections.map(section => section.content).join('\n\n');
    };
    
      const handleViewModeChange = (event, newMode) => {
      if (newMode === null) return; // Previene que se deseleccionen todos los botones
    
      // Si cambiamos a la vista por secciones...
      if (newMode === 'sections') {
        // ...convertimos el texto plano actual en secciones.
        const sections = splitTextIntoSections(textContent);
        setDocumentSections(sections);
      } 
      // Si volvemos a la vista simple...
      else if (newMode === 'simple') {
        // ...unimos las secciones (si es que hubo cambios) en un solo texto.
        const newText = joinSectionsIntoText(documentSections);
        setTextContent(newText);
      }
    
      setViewMode(newMode);
    };
    
       // --- RENDERIZADO ---
        if (loadState.loading) return <CircularProgress />;
        if (loadState.error) return <Alert severity="error">{loadState.error}</Alert>;
    
    
      return (
      <Box
        sx={{
          height: '100vh',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          p: 3,
          pt: 'calc(72px + 0px)',
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
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Editor de Documento
          </Typography>
    
          {/* Selector de modo de vista */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="Modo de vista del editor"
          >
            <ToggleButton value="simple" aria-label="vista simple">
              <ArticleIcon sx={{ mr: 1 }} />
              Simple
            </ToggleButton>
            <ToggleButton value="sections" aria-label="vista por secciones">
              <ViewStreamIcon sx={{ mr: 1 }} />
              Secciones
            </ToggleButton>
          </ToggleButtonGroup>
    
          {/* Botones de acción */}
          <Box>
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/project/${projectId}`)}
              sx={{ mr: 2 }}
            >
              Volver
            </Button>
    
            <Button
              variant="contained"
             
              onClick={handleNavigateToPromptLab}
               sx={{
                mr: 2,
                ml: 1,
                backgroundColor: '#9B59B6',
                color: '#fff',
                '&:hover': {
                backgroundColor: '#8e44ad'
                }
                }}
            >
              Laboratorio Prompt
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
    
            {/* Área de edición */}
            <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
              {viewMode === 'simple' ? (
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
                <SectionsEditor
                  sections={documentSections}
                  onSectionChange={handleSectionChange}
                  onSectionDelete={handleSectionDelete}
                  onSectionDuplicate={handleSectionDuplicate}
                />
              )}
            </Box>
          </Box>
    
          {/* Columna derecha */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              border: 1,
              borderColor: '#2196f3',
              borderStyle: 'solid',
              borderRadius: 2,
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            <TextActionsCard
             selectedText={selectedText}
             onLegacyAnalysis={handleLegacyAnalysis} // <-- NUEVA
             onTranslate={handleTranslate}         // <-- NUEVA
             onAiRecipe={handleAiRecipe}           // <-- NUEVA
             fullTextContent={textContent}
            onNavigateWithSelection={handleNavigateToPromptLabWithSelection} 
    />
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

    -----------------------------------

    
    // src/components/dashboard/ProjectPropertiesPanel.jsx (VERSIÓN CORREGIDA Y UNIFICADA)
    
    import React, { useEffect, useState } from 'react';
    import PropTypes from 'prop-types';
    import {
        Box, Paper, Typography, Divider, Button, Stack,
        List, ListItem, ListItemIcon, ListItemText, // <-- AQUÍ NO ESTÁ ListItemButton
        CircularProgress, Alert,Menu, MenuItem,ListItemButton,
    } from '@mui/material';
    import EditIcon from '@mui/icons-material/Edit';
    import DeleteIcon from '@mui/icons-material/Delete';
    import FolderZipIcon from '@mui/icons-material/FolderZip';
    import { useNavigate } from 'react-router-dom';
    import { supabase } from '../../supabaseClient';
    import AdsClickIcon from '@mui/icons-material/AdsClick'; // <-- Un icono más directo de "haz clic"
    
    
    
    // Componente principal (con lógica de selección y navegación restaurada)
    export default function ProjectPropertiesPanel({ project, onRename, onDelete }) {
      const navigate = useNavigate();
    
      // --- ESTADO ---
      const [datasets, setDatasets] = useState([]);
      const [loadingDatasets, setLoadingDatasets] = useState(true);
      const [errorDatasets, setErrorDatasets] = useState(null);
      const [menuAnchorEl, setMenuAnchorEl] = useState(null);
      const [selectedDataset, setSelectedDataset] = useState(null);
    
      // --- HANDLERS ---
      const handleMenuOpen = (event, dataset) => {
        setMenuAnchorEl(event.currentTarget);
        setSelectedDataset(dataset);
      };
    
      const handleMenuClose = () => {
        setMenuAnchorEl(null);
        setSelectedDataset(null);
      };
    
      const handleNavigate = () => {
        if (!selectedDataset) return;
        handleMenuClose();
        if (selectedDataset.datasetType === "tabular") {
          navigate(`/predictions/${selectedDataset.datasetId}`);
        } else if (selectedDataset.datasetType === "text") {
          navigate(`/prompt/${selectedDataset.datasetId}`);
        }
      };
    
      // --- FETCH DATASETS ---
      useEffect(() => {
        if (!project) {
          setDatasets([]);
          setLoadingDatasets(false);
          return;
        }
    
        const fetchDatasets = async () => {
          setLoadingDatasets(true);
          setErrorDatasets(null);
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
    
            const res = await fetch(
              `${import.meta.env.VITE_API_URL}/api/projects/${project.id}/datasets`,
              { headers: { Authorization: `Bearer ${session.access_token}` } }
            );
    
            const json = await res.json();
            if (!res.ok || !json.success) {
              throw new Error(json.error || "No se pudieron cargar los datasets.");
            }
            setDatasets(json.data || []);
          } catch (err) {
            setErrorDatasets(err.message);
          } finally {
            setLoadingDatasets(false);
          }
        };
    
        fetchDatasets();
      }, [project]);
    
      // --- SIN PROYECTO ---
      if (!project) {
        return (
          <Paper
            sx={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
              backgroundColor: "action.hover",
            }}
          >
            <AdsClickIcon sx={{ fontSize: "3rem", color: "#ffffff", mb: 2 }} />
            <Typography variant="h6" color="#ffffff" fontWeight="500">
              Panel de Detalles
            </Typography>
            <Typography
              sx={{
                color: "#ffffff",
                textAlign: "center",
                fontWeight: "medium",
              }}
            >
              Selecciona un proyecto de la lista para ver sus detalles y acciones.
            </Typography>
          </Paper>
        );
      }
    
      // --- LISTA DE DATASETS ---
      const renderDatasetList = () => {
        if (loadingDatasets) {
          return <CircularProgress size={20} />;
        }
        if (errorDatasets) {
          return (
            <Alert severity="warning" sx={{ fontSize: "0.8rem", p: 1 }}>
              {errorDatasets}
            </Alert>
          );
        }
        if (datasets.length === 0) {
          return <Typography color="#b8b4b4ff">Este proyecto no tiene archivos.</Typography>;
        }
    
        return (
          <List dense disablePadding sx={{ maxHeight: 150, overflowY: "hidden" }}>
            {datasets.map((ds) => (
              <ListItem
                key={ds.datasetId}
                button
                onClick={(event) => handleMenuOpen(event, ds)}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <FolderZipIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={ds.datasetName}
                  primaryTypographyProps={{
                    noWrap: true,
                    title: ds.datasetName,
                    variant: "body2",
                  }}
                />
              </ListItem>
            ))}
          </List>
        );
      };
    
      // --- RETURN ---
      return (
        <Paper
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            p: 1,
            borderRadius: 1,
            border: "1px solid rgba(33, 150, 243, 0.4)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background: "primary",
          }}
        >
          {/* Contenido principal */}
          <Box sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
            <Box
              sx={{
                mb: 1,
                p: 1.5,
                borderRadius: 1.5,
                background: "linear-gradient(135deg, #26717a, #44a1a0)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                borderLeft: "3px solid #26717a",
              }}
            >
              <Typography
                variant="subtitle1"
                fontWeight="bold"
                sx={{
                  color: "#ffffff",
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontSize: "0.95rem",
                }}
              >
                Archivos del Proyecto:
              </Typography>
            </Box>
    
            <Box
              sx={{
                borderRadius: 1,
                bgcolor: "rgba(0, 229, 255, 0.05)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                p: 1,
                mb: 2,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {renderDatasetList()}
            </Box>
          </Box>
    
          {/* Acciones */}
          <Box
            sx={{
              flexShrink: 0,
              pt: 2,
              mt: 2,
              borderRadius: 2,
              background: "linear-gradient(135deg, #26717a, #44a1a0)",
              p: 2,
            }}
          >
            <Typography variant="h6" fontWeight="bold" color="primary">
              Acciones
            </Typography>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                sx={{
                  border: "2px solid #ffffff",
                  color: "#ffffff",
                  "& .MuiSvgIcon-root": { color: "#ffffff" },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "#ffffff",
                  },
                }}
                onClick={() => navigate(`/project/${project.id}`)}
              >
                Importar y Procesar Archivos
              </Button>
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={onRename}
                sx={{
                  backgroundColor: "#c06443ff",
                  border: "2px solid #ffffff",
                  color: "#ffffff",
                }}
              >
                Renombrar Proyecto
              </Button>
              <Button
                sx={{
                  border: "2px solid #ffffff",
                  color: "#ffffff",
                  "& .MuiSvgIcon-root": { color: "#ffffff" },
                  "&:hover": {
                    backgroundColor: "rgba(255,255,255,0.1)",
                    borderColor: "#ffffff",
                  },
                }}
                variant="contained"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={onDelete}
              >
                Eliminar Proyectos
              </Button>
            </Stack>
          </Box>
    
          {/* --- MENU PARA SELECCIONAR DATASET --- */}
          <Menu
            anchorEl={menuAnchorEl}
            open={Boolean(menuAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleNavigate}>
              {selectedDataset?.datasetType === "tabular"
                ? "Ir a Predicciones"
                : "Ir a Prompt"}
            </MenuItem>
          </Menu>
        </Paper>
      );
    }
    
    
    // Los propTypes se quedan igual
    ProjectPropertiesPanel.propTypes = {
        project: PropTypes.object,
        onRename: PropTypes.func.isRequired,
        onDelete: PropTypes.func.isRequired,
    };


    ---

    import React from 'react';
    import { Paper, Typography, TextField, Box, Button, CircularProgress } from '@mui/material';
    import SaveIcon from '@mui/icons-material/Save';
    import RestoreIcon from '@mui/icons-material/Restore'; // Añade este import
    
    const ContextColumn = ({ context, setContext, onSave, isSaving, hasChanges, onRestore }) => (
      <Paper
      sx={{
        p: 2,
        flexGrow: 1,
        borderRadius: 2,
        boxShadow: 3,
        display: 'flex',
        flexDirection: 'column',
        border: '2px solid #2196f3', // 👈 grosor + estilo + color
        overflow: 'hidden',
      }}
    >
        <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>
          Editor de Contexto
        </Typography>
    
        {/* Usamos un Box para controlar el crecimiento del TextField */}
        <Box sx={{flexGrow: 1, minHeight: 0, position: 'relative' }}>
          <TextField
            multiline
            fullWidth
            value={context || ''}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Pega tu contexto aquí..."
            sx={{
              // Hacemos que el TextField ocupe el 100% del Box contenedor
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              // Y que su área de texto interna sea la que tenga el scroll
              '& .MuiOutlinedInput-root': { height: '100%' },
              '& .MuiInputBase-inputMultiline': { height: '100% !important', overflowY: 'auto !important' }
            }}
          />
        </Box>
    
       <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Botón Restaurar (solo aparece si hay cambios) */}
              {hasChanges && (
                <Button
                  size="small"
                  onClick={onRestore}
                  startIcon={<RestoreIcon />}
                >
                  Restaurar
                </Button>
              )}
    
              {/* Botón Guardar (alineado a la derecha) */}
              <Button
                sx={{ ml: 'auto' }} // Empuja el botón de guardar a la derecha
                variant="contained"
                onClick={onSave}
                disabled={isSaving || !hasChanges}
                startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              >
                {isSaving ? 'Guardando...' : 'Guardar Contexto'}
              </Button>
            </Box>
          </Paper>
        );
    
        export default ContextColumn;

        -------------------------------

        import React from 'react';
        import { Paper, Typography, TextField, Box, Button, CircularProgress } from '@mui/material';
        import SaveIcon from '@mui/icons-material/Save';
        import RestoreIcon from '@mui/icons-material/Restore'; // Añade este import
        
        const ContextColumn = ({ context, setContext, onSave, isSaving, hasChanges, onRestore }) => (
          <Paper
          sx={{
            p: 2,
            flexGrow: 1,
            borderRadius: 2,
            boxShadow: 3,
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #2196f3', // 👈 grosor + estilo + color
            overflow: 'hidden',
          }}
        >
            <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>
              Editor de Contexto
            </Typography>
        
            {/* Usamos un Box para controlar el crecimiento del TextField */}
            <Box sx={{flexGrow: 1, minHeight: 0, position: 'relative' }}>
              <TextField
                multiline
                fullWidth
                value={context || ''}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Pega tu contexto aquí..."
                sx={{
                  // Hacemos que el TextField ocupe el 100% del Box contenedor
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  // Y que su área de texto interna sea la que tenga el scroll
                  '& .MuiOutlinedInput-root': { height: '100%' },
                  '& .MuiInputBase-inputMultiline': { height: '100% !important', overflowY: 'auto !important' }
                }}
              />
            </Box>
        
           <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Botón Restaurar (solo aparece si hay cambios) */}
                  {hasChanges && (
                    <Button
                      size="small"
                      onClick={onRestore}
                      startIcon={<RestoreIcon />}
                    >
                      Restaurar
                    </Button>
                  )}
        
                  {/* Botón Guardar (alineado a la derecha) */}
                  <Button
                    sx={{ ml: 'auto' }} // Empuja el botón de guardar a la derecha
                    variant="contained"
                    onClick={onSave}
                    disabled={isSaving || !hasChanges}
                    startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  >
                    {isSaving ? 'Guardando...' : 'Guardar Contexto'}
                  </Button>
                </Box>
              </Paper>
            );
        
            export default ContextColumn;

            ----------------------------------


            // RUTA: src/components/analysis/EvaluateModel.jsx
            
            import React, { useState, useMemo } from 'react';
            import { supabase } from '../../supabaseClient';
            import { 
                Box, Typography, Button, CircularProgress, Alert, Paper, Stack, 
                Divider, Grid, Chip
            } from '@mui/material';
            import DatasetSelectorModal from './DatasetSelectorModal';
            import FindInPageIcon from '@mui/icons-material/FindInPage';
            import AnalyticsIcon from '@mui/icons-material/Analytics';
            import InfoIcon from '@mui/icons-material/Info';
            
            
            // ¡Importamos nuestros nuevos componentes!
            import ConfusionMatrix from './ConfusionMatrix';
            import ClassificationReportChart from './ClassificationReportChart';
            import RegressionScatterPlot from './RegressionScatterPlot'; 
            import ErrorHistogram from './charts/ErrorHistogram';
            import ErrorBoxPlot from './charts/boxplot';
            
            const MetricCard = ({ title, value, explanation }) => (
              <Grid item xs={12} sm={6} md={4}>
                <Paper
                  elevation={4} // sombra
                  sx={{
                    p: 3,
                    borderRadius: 3, // bordes redondeados
                    height: '100%',
                    boxShadow: 3, // sombra extra
                    transition: '0.3s',
                    '&:hover': {
                      boxShadow: 6, // sombra más intensa al pasar el mouse
                      transform: 'translateY(-2px)', // efecto sutil de levantamiento
                    },
                  }}
                >
                  <Typography color="text.secondary" gutterBottom>
                    {title}
                  </Typography>
                  <Typography
                    variant="h4"
                    component="div"
                    sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}
                  >
                    {value}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {explanation}
                  </Typography>
                </Paper>
              </Grid>
            );
            
            
            
            export default function EvaluateModel({ model, projectId }) {
                const [selectedDataset, setSelectedDataset] = useState(null);
                const [isModalOpen, setModalOpen] = useState(false);
                const [evaluationResult, setEvaluationResult] = useState(null);
                const [loading, setLoading] = useState(false);
                const [error, setError] = useState(null);
            
                const requiredFeatures = useMemo(() => model.features.map(f => f.name).join(', '), [model.features]);
            
                const handleEvaluate = async () => {
                    if (!selectedDataset) {
                        setError("Por favor, selecciona un dataset primero.");
                        return;
                    }
                    setLoading(true);
                    setError(null);
                    setEvaluationResult(null);
            
                    try {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) throw new Error("No estás autenticado.");
            
                        const payload = { dataset_id: selectedDataset.datasetId };
            
                        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${model.id}/evaluate`, {
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
            
                       
                        
                        setEvaluationResult(result.data);
            
                    } catch (err) {
                        setError(err.message);
                    } finally {
                        setLoading(false);
                    }
                };
            
                const handleDatasetSelected = (dataset) => {
                    setSelectedDataset(dataset);
                    setEvaluationResult(null);
                    setError(null);
                };
            
                const scatterData = evaluationResult?.metrics?.scatter_plot_data;
                const errorHistogramData = evaluationResult?.metrics?.error_histogram_data; 
            
                return (
                <>
                    {/* =================================================================== */}
                    {/* === ESTE ES EL ÚNICO CONTENEDOR PRINCIPAL === */}
                    {/* Le ponemos un gap: 2 para un espaciado agradable y consistente */}
                    {/* =================================================================== */}
                    <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2,  }}>
                        
                        {/* Título Principal (opcional, si lo quieres fuera, debe estar fuera del Paper también) */}
                        <Typography variant="h5" component="h6" fontWeight="bold">
                            Evaluación del dataset con el modelo entrenado
                        </Typography>
                        
                        {/* --- SECCIÓN DE GUÍA PARA EL USUARIO (AHORA DENTRO DEL PAPER PRINCIPAL) --- */}
                        {/* Usamos tu nuevo y mejorado diseño, pero quitamos el margen inferior (mb) */}
                        <Paper
                           elevation={2}
                           sx={{
                               p: 2, // Un poco más de padding interno
                               borderRadius: 2,
                               background: 'rgba(33, 150, 243, 0.08)', 
                               borderLeft: '4px solid #2196f3',
                           }}
                        >
                            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1, fontSize: '1.1rem' }}>
                               <InfoIcon sx={{ mr: 1.5, color: '#2196f3' }} />
                               ¿Cómo funciona esta herramienta?
                            </Typography>
                            <Typography variant="body2" component="div" sx={{ mb: 2, pl: '36px' }}>
                               Esta sección permite aplicar el modelo predictivo a un nuevo conjunto de datos. 
                               El modelo, previamente entrenado con información histórica, genera predicciones sobre este nuevo dataset.<br/>
                               Los indicadores que se presentan a continuación muestran de manera resumida la precisión y confiabilidad de las predicciones, facilitando la interpretación de los resultados sin necesidad de conocimientos técnicos avanzados.
                            </Typography>
                            <Divider sx={{ my: 1.5, mx: '36px' }} />
                            <Typography variant="caption" sx={{ display: 'block', pl: '36px' }}>
                                 <strong>Características requeridas:</strong> {requiredFeatures}.<br/>
                                 <strong>Columna objetivo requerida:</strong> {model.targetColumn}.
                            </Typography>
                        </Paper>
            
                            {/* --- SECCIÓN DE SELECCIÓN --- */}
                            <Paper variant="outlined" sx={{ p: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1}}>
                                <Typography sx={{ color: selectedDataset ? 'text.primary' : 'text.secondary' }}>
                                    {selectedDataset ? `Dataset de evaluación: ${selectedDataset.name}` : 'Ningún dataset seleccionado.'}
                                </Typography>
                                  <Button
                                   variant="contained"
                                     startIcon={<FindInPageIcon />}
                                     onClick={() => setModalOpen(true)}
                                     sx={{
                                     borderColor: '#1976d2',  // opcional: borde azul
                                    '&:hover': {
                                     backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                     borderColor: '#115293',
                                     },
                                       }}
                                    >
                                         Seleccionar Dataset
                                   </Button>
                            </Paper>
                            
                            {/* --- SECCIÓN DE EJECUCIÓN --- */}
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    onClick={handleEvaluate}
                                    disabled={!selectedDataset || loading}
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                                >
                                    {loading ? "Evaluando Modelo..." : "Evaluar Rendimiento"}
                                </Button>
                            </Box>
            
                            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                            
                             {/* ========================================================== */}
                            {/* === ¡NUEVA SECCIÓN DE RESULTADOS CON LÓGICA CONDICIONAL! === */}
                            {/* ========================================================== */}
                            {evaluationResult && (
                                <Box  sx={{ p: 0 }}>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Dashboard de Rendimiento del Modelo</Typography>
                                    
                                    {/* --- RENDERIZADO CONDICIONAL --- */}
                                    {evaluationResult.problem_type === 'clasificacion' ? (
                                        
                                        // =============================
                                        // === DASHBOARD CLASIFICACIÓN ===
                                        // =============================
                                        <>
                                           <Typography variant="h6" gutterBottom>Métricas Clave</Typography>
            <Grid container spacing={20} sx={{ mb: 4 }}>
              <MetricCard 
                title="Precisión General (Accuracy)"
                value={`${(evaluationResult.metrics.accuracy * 100).toFixed(1)}%`}
                explanation={
                  <>
                    De 100 casos del nuevo dataset, el<br />
                    modelo acertó en esta cantidad.
                  </>
                }
              />
            
              {evaluationResult.metrics.classification_report['macro avg']?.precision && (
                <MetricCard 
                  title="Confianza Promedio (Precision)"
                  value={`${(evaluationResult.metrics.classification_report['macro avg'].precision * 100).toFixed(1)}%`}
                  explanation={
                    <>
                      En promedio, cuando el modelo hace una predicción,<br />
                      este es su nivel de confianza de que sea correcta.
                    </>
                  }
                />
              )}
            
              {evaluationResult.metrics.classification_report['macro avg']?.recall && (
                <MetricCard 
                  title="Alcance Promedio (Recall)"
                  value={`${(evaluationResult.metrics.classification_report['macro avg'].recall * 100).toFixed(1)}%`}
                  explanation={
                    <>
                      De todos los resultados posibles,<br />
                      el modelo fue capaz de 'encontrar' este porcentaje.
                    </>
                  }
                />
              )}
            </Grid>
            
                                           <Grid container spacing={25} sx={{ mt: 8 }}>
              <Grid xs={12} lg={6}>
                <ConfusionMatrix 
                  data={evaluationResult.metrics.confusion_matrix} 
                  labels={evaluationResult.metrics.confusion_matrix_labels} 
                />
              </Grid>
              <Grid xs={12} lg={6}>
                <ClassificationReportChart 
                  report={evaluationResult.metrics.classification_report} 
                  labels={evaluationResult.metrics.confusion_matrix_labels} 
                />
              </Grid>
            </Grid>
            
                                        </>
            
                                    ) : (
                                        
                                        // =========================
                                        // === DASHBOARD REGRESIÓN ===
                                        // =========================
                                        <>
                                            <Typography variant="h6" gutterBottom>Métricas de Error</Typography>
                                            <Grid container spacing={8} sx={{ mb: 6 }}>
                    <Grid xs={12} sm={6} md={3}>
                        <MetricCard 
                            title="Coeficiente (R²)"
                            value={evaluationResult.metrics.r2_score?.toFixed(3)}
                             explanation={
                  <>
                    Un valor cercano a 1 significa que el  <br /> modelo ajusta correctamente a los datos.<br />
                    Valores más bajos sugieren <br /> menor capacidad explicativa
                  </>
                }
                        />
                    </Grid>
                    <Grid xs={12} sm={6} md={3}>
                        <MetricCard 
                            title="Error (RMSE)"
                            value={evaluationResult.metrics.rmse?.toFixed(3)}
                             explanation={
                  <>
                    Representa el error promedio <br /> Un valor más bajo indica mejor desempeño.<br />
                   
                  </>
                }              
                        />
                    </Grid>
                    <Grid xs={12} sm={6} md={3}>
                        <MetricCard 
                            title="Error Absoluto (MAE)"
                            value={evaluationResult.metrics.mae?.toFixed(3)}
                            explanation={
                  <>
                    Promedio de los errores absolutos<br />  entre predicciones y valores reales. <br /> 
                   
                  </>
                }            
                          
                        />
                    </Grid>
                    <Grid xs={12} sm={6} md={3}>
                        <MetricCard 
                            title="Error Porcentual (MAPE)"
                           value={
                           evaluationResult.metrics.mape !== null && evaluationResult.metrics.mape !== undefined 
                        ? `${evaluationResult.metrics.mape.toFixed(2)} %` 
                        : "N/A"
                    }
                      explanation={
                  <>
                   Mide el error promedio en porcentaje<br />  respecto a los valores reales<br /> Devuelve 'N/A' si no es posible calcularlo<br />  (por ejemplo, cuando todos los<br />  valores reales son cero)."<br /> 
                   
                  </>
                }         
                  
                        />
                    </Grid>
                </Grid>
            
                {/* --- CONTENEDOR ÚNICO PARA LOS GRÁFICOS --- */}
                
                 <Grid container spacing={20} sx={{ mt: 8 }}>
              <Grid xs={12} lg={6}>
                <Typography variant="h6" align="center" gutterBottom>
                  Predicciones vs. Reales
                </Typography>
                {scatterData ? (
                  <RegressionScatterPlot actual={scatterData.actual} predicted={scatterData.predicted} />
                ) : (
                  <Alert severity='warning'>Datos para el gráfico de dispersión no disponibles.</Alert>
                )}
              </Grid>
            
              <Grid xs={12} lg={6}>
                <Typography variant="h6" align="center" gutterBottom>
                  Distribución de Errores
                </Typography>
                {errorHistogramData ? (
                  <ErrorHistogram errors={errorHistogramData} />
                ) : (
                  <Alert severity='warning'>Datos para el histograma de errores no disponibles.</Alert>
                )}
              </Grid>
            
              <Grid xs={12} lg={6}>
                <Typography variant="h6" align="center" gutterBottom>
                  Box Plot de Errores
                </Typography>
                {errorHistogramData ? (
                  <ErrorBoxPlot errors={errorHistogramData} />
                ) : (
                  <Alert severity='warning'>Datos para el box plot no disponibles.</Alert>
                )}
              </Grid>
            </Grid>
            
                                        </>
                                    )}
                                </Box>
                            )}
                        </Paper>
            
                        <DatasetSelectorModal
                            open={isModalOpen}
                            onClose={() => setModalOpen(false)}
                            onDatasetSelect={handleDatasetSelected}
                        />
                    </>
                );
            }
            
-------------------------------------------------------------------

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Asegúrate que la ruta a tu cliente supabase es correcta

import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  Chip, CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Icono de "Analizar"
import FunctionsIcon from '@mui/icons-material/Functions';     // Para regresión
import CategoryIcon from '@mui/icons-material/Category';      // Para clasificación
// --- 1. Añade los imports necesarios ---
import DeleteIcon from '@mui/icons-material/Delete';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';

// Componente para manejar el estado de carga y error de forma limpia
const DataDisplayWrapper = ({ loading, error, children }) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  }
  return children;
};

export default function MyModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No estás autenticado.");

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudieron cargar los modelos.');
        }

        setModels(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const handleAnalyzeClick = (modelId) => {
    navigate(`/models/${modelId}/analyze`); // Navegamos a la página de análisis
  };

   const handleOpenDeleteDialog = (model) => {
        setModelToDelete(model);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setModelToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!modelToDelete) return;
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo eliminar el modelo.');
            }

            // Si se eliminó con éxito, actualizamos la lista de modelos en la UI
            setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
            alert(result.message);

        } catch (err) {
            alert(`Error: ${err.message}`);
            setError(err.message);
        } finally {
            handleCloseDeleteDialog();
        }
    };

  const getProblemTypeChip = (problemType) => {
    const isClassification = problemType === 'clasificacion';
    return (
      <Chip
        icon={isClassification ? <CategoryIcon /> : <FunctionsIcon />}
        label={isClassification ? 'Clasificación' : 'Regresión'}
        color={isClassification ? 'secondary' : 'primary'}
        size="small"
        variant="outlined"
      />
    );
  };
  
  return (
  <Box
  sx={{
    height: '100vh',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    pt: 'calc(72px + 1px)', 
    px: 3,
    pb: 3,
  }}
>
    {/* --- Sección del Encabezado de la Página --- */}
    <Box sx={{ flexShrink: 0, mb: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
        Mis Modelos Predictivos
      </Typography>
      <Typography sx={{ color: 'white' }}>
       Esta sección muestra todos los modelos guardados. Selecciona el botón ‘Analizar’ para examinar las predicciones generadas por cada modelo.
      </Typography>
    </Box>

    {/* --- Sección del Contenido Principal (la tabla) --- */}
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      <DataDisplayWrapper loading={loading} error={error}>
        {models.length > 0 ? (
          <Paper sx={{ boxShadow: 3, borderRadius: 2 }}>
            <TableContainer>
              {/* Tu tabla <Table>... </Table> va aquí, sin cambios */}
              <Table aria-label="tabla de modelos">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-head': { fontWeight: 'bold' } }}>
                    <TableCell>Nombre del Modelo</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo de Problema</TableCell>
                    <TableCell>Métrica Principal</TableCell>
                    <TableCell>Fecha de Creación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => (
                    <TableRow
                    key={model.id}
                    hover
                    sx={{
                   '& td, & th': { borderBottom: '2px solid rgba(224, 224, 224, 1)' }, 
                   '&:last-child td, &:last-child th': { border: 0 } // quita la última línea
                    }}
                    >
                      <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                        {model.modelName}
                      </TableCell>
                      <TableCell>{model.projectName}</TableCell>
                      <TableCell>{getProblemTypeChip(model.problemType)}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                        {model.mainMetric}
                      </TableCell>
                      <TableCell>{new Date(model.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell align="center">
                    <Tooltip title="Analizar Modelo">
                      <Button
                        variant="contained"
                        startIcon={<AssessmentIcon />}
                        onClick={() => handleAnalyzeClick(model.id)}
                        size="small"
                        sx={{ mr: 1 }} // Añade un margen a la derecha
                      >
                        Analizar
                      </Button>
                    </Tooltip>
                    {/* --- NUEVO BOTÓN DE ELIMINAR --- */}
                    <Tooltip title="Eliminar Modelo">
                        <IconButton 
                            color="error" 
                            onClick={() => handleOpenDeleteDialog(model)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                  </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Alert severity="info">
            No existe ningún modelo guardado
          </Alert>
        )}
      </DataDisplayWrapper>
       {/* --- NUEVO DIÁLOGO DE CONFIRMACIÓN (ponlo al final, antes del cierre de Box) --- */}
            <Dialog
                open={openDeleteDialog}
                onClose={handleCloseDeleteDialog}
            >
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que quieres eliminar el modelo 
                        <strong> "{modelToDelete?.modelName}"</strong>? 
                        Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
  </Box>
);
}

---------------------------------------------------

// En src/pages/VisionExplorerPage.jsx

import React, { useState, useEffect, useMemo} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

import { supabase } from '../supabaseClient'; 
import { useNotification } from '../context/NotificationContext';
import ConfusionMatrixChart from "../components/dashboard/ConfusionMatrixChart";
import ResultsModal from '../components/dashboard/ResultsModal'; 

function MetricDisplay({ title, value, subtitle }) {
  return (
    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', height: '100%' }}>
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
    const { showNotification } = useNotification();

    // --- Estados Corregidos y Unificados ---
    const [analysisData, setAnalysisData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Estado para la VISTA DE DETALLE (una sola imagen)
    const [selectedImage, setSelectedImage] = useState(null); 
    
    // Estado para la SELECCIÓN MÚLTIPLE
   const [selectedImageIds, setSelectedImageIds] = useState(new Set());
    
    // Estados para el etiquetado
    const [customTags, setCustomTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [bulkTag, setBulkTag] = useState("");
    const [viewMode, setViewMode] = useState('gallery');

    // Estados para el entrenamiento (sin cambios)
    const [isTrainingModalOpen, setTrainingModalOpen] = useState(false);
    const [trainingConfig, setTrainingConfig] = useState({ model_arch: 'resnet34', epochs: 5 });
    const [trainingState, setTrainingState] = useState({ step: 'config', results: null, error: null });
    const [modelDisplayName, setModelDisplayName] = useState('');
    const [isTaggingComplete, setTaggingComplete] = useState(false);

    
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
  
    const handleApplyBulkTag = async () => {
    const idsToTag = Array.from(selectedImageIds);
    if (!bulkTag.trim() || idsToTag.length === 0) return;
    const tagName = bulkTag.trim();

    // Añadimos un estado de carga para el botón
    setLoading(true); 

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const successfulIds = [];
        const failedIds = [];

        for (const imageId of idsToTag) {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/images/${imageId}/tags`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tagName })
                });

                if (response.ok) {
                    successfulIds.push(imageId);
                } else {
                    // Si falla, guardamos el ID para mantenerlo seleccionado
                    failedIds.push(imageId);
                }
            } catch (error) {
                console.error(`Error de red para la imagen ${imageId}:`, error);
                failedIds.push(imageId);
            }
        }

        // --- Lógica de Feedback ---
        if (successfulIds.length > 0) {
            showNotification(`Etiqueta "${tagName}" aplicada a ${successfulIds.length} imágenes.`, "success");
        }
        if (failedIds.length > 0) {
            showNotification(`${failedIds.length} etiquetas no se pudieron aplicar. Las imágenes fallidas permanecen seleccionadas.`, "error");
            // Actualizamos el estado para que solo las fallidas queden seleccionadas
            setSelectedImageIds(new Set(failedIds));
        } else {
            // Si todo fue un éxito, limpiamos la selección
            setSelectedImageIds(new Set());
        }

        setBulkTag("");

    } catch (error) {
        showNotification(error.message, "error");
    } finally {
        setLoading(false); // Quitamos el estado de carga
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

  useEffect(() => {
    let imageToLoad = null;

    // Si estamos en modo detalle, esa es la imagen que manda.
    if (viewMode === 'detail' && selectedImage) {
        imageToLoad = selectedImage;
    } 
    // Si estamos en modo galería Y SOLO hay una imagen seleccionada,
    // esa es la que mostramos en el panel de detalle.
    else if (viewMode === 'gallery' && selectedImageIds.size === 1) {
        const firstId = Array.from(selectedImageIds)[0];
        imageToLoad = analysisData.find(img => img.image_id === firstId);
    }

    // Actualizamos el estado de la imagen de detalle
    setSelectedImage(imageToLoad);

    // Si tenemos una imagen para cargar, pedimos sus etiquetas manuales.
    // Si no, fetchCustomTags se llamará con 'null' y el useEffect de etiquetas limpiará el estado.
    if (imageToLoad) {
        fetchCustomTags(imageToLoad.image_id);
    } else {
        setCustomTags([]); // Limpia explícitamente si no hay imagen
    }

}, [viewMode, selectedImageIds, analysisData]); // Depende de estos tres estados

  // --- Carga de datos principal ---
  useEffect(() => {
    const fetchAnalysisData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");
        
        const url = `${import.meta.env.VITE_API_URL}/api/vision-lab/dataset/${datasetId}`;
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);

        const analysisList = result.analysisData || [];
        const imageList = result.imageData || [];
        const imageMap = new Map();
        imageList.forEach(img => imageMap.set(img.id, img.signed_url));

        const combinedData = analysisList.map(item => ({
          ...item,
          signed_image_url: imageMap.get(item.image_id) || null
        }));

        setAnalysisData(combinedData);
        setSelectedImage(null);
        setViewMode('gallery');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) fetchAnalysisData();
  }, [datasetId]);

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


    const handleStartTraining = async () => {
        setTrainingState({ step: 'loading', results: null, error: null });
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/train`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(trainingConfig)
            });
            const result = await response.json();

            if (!response.ok || !result.success) throw new Error(result.error);

            // Guardamos el nombre por defecto para el modelo basado en las etiquetas
            const defaultModelName = `Clasificador de ${result.training_results.confusion_matrix_labels.join(', ')}`;
            setModelDisplayName(defaultModelName);
            setTrainingState({ step: 'results', results: result.training_results, error: null });

        } catch (err) {
            setTrainingState({ step: 'error', results: null, error: err.message });
        }
    };

   const handleSaveModel = async () => {
    if (!modelDisplayName.trim()) {
        showNotification("Por favor, dale un nombre a tu modelo.", "warning");
        return;
    }
    setTrainingState(prev => ({ ...prev, step: 'loading' }));

    try {
        const artifactsBytes = trainingState.results.artifacts_bytes;
        let artifacts_bytes_b64;

        // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
        // Comprobamos si los "bytes" ya son un string (probablemente Base64)
        if (typeof artifactsBytes === 'string') {
            // Si ya es un string, lo usamos directamente.
            artifacts_bytes_b64 = artifactsBytes;
        } else if (Array.isArray(artifactsBytes)) {
            // Si es un array (el comportamiento antiguo), hacemos la conversión.
            const binaryString = artifactsBytes.map(byte => String.fromCharCode(byte)).join('');
            artifacts_bytes_b64 = btoa(binaryString);
        } else {
            // Si no es ni un string ni un array, hay un problema con los datos.
            throw new Error("El formato de los artefactos del modelo no es válido.");
        }

        const payload = {
            model_display_name: modelDisplayName,
            artifacts_bytes_b64: artifacts_bytes_b64,
            training_results: { ...trainingState.results, artifacts_bytes: undefined },
            problem_type: 'vision_classification'
        };
        
        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/project/${projectId}/vision/save-model`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error);
        
        showNotification("¡Modelo guardado con éxito!", "success");
        setTrainingModalOpen(false);
        navigate('/my-models');

    } catch(err) {
        // Ahora el mensaje de error será más claro, como "El formato... no es válido"
        setTrainingState(prev => ({ ...prev, step: 'error', error: `Error al guardar: ${err.message}` }));
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

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ m: 4 }}>{error}</Alert>;
    if (analysisData.length === 0) return <Alert severity="info" sx={{ m: 4 }}>No hay datos de análisis en este dataset.</Alert>;

    const renderRightPanel = () => {
    // ---- CASO 1: NINGUNA IMAGEN SELECCIONADA (usa .size) ----
    if (viewMode === 'gallery' && selectedImageIds.size === 0) {
        return (
            <Paper sx={{ p: 2, /* ... */ }}>
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

    // ---- CASO 2: MÁS DE UNA IMAGEN SELECCIONADA (etiquetado masivo) ----
    if (viewMode === 'gallery' && selectedImageIds.size > 0) {
         // Si solo hay una seleccionada, la mostramos en el panel de etiquetado individual.
         // Así que este bloque solo se ejecuta para 2 o más.
        if (selectedImageIds.size > 1) {
            return (
                <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                        onKeyPress={(e) => e.key === 'Enter' && handleApplyBulkTag()}
                        fullWidth
                        size="small"
                    />
                    <Button variant="contained" color="primary" onClick={handleApplyBulkTag}>
                        Aplicar a {selectedImageIds.size} {/* <-- Usa .size */}
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
          <Box sx={{ p: 1, flexGrow: 1, pt: 'calc(72px + 1px)' }}>

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                p: 1,
                background: "linear-gradient(135deg, #26717a, #44a1a0)",
                borderRadius: 2,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                mb: 2, // Margen inferior para separar de las tarjetas
                color: '#ffffff'
              }}
            >
            <Box>
                <Typography variant="h5" fontWeight="bold">Laboratorio de Etiquetado</Typography>
                <Typography variant="body2" color="text.secondary">Dataset: {datasetId}</Typography>
            </Box>
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
      <Box sx={{ display: "flex", gap: 2, flexGrow: 1, overflow: "hidden", p: 2 }}> 

      {/* === PANEL IZQUIERDO: Galería o Visor de Detalle === */}
       <Paper sx={{ flex: 3, p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}> 
        {viewMode === 'gallery' && (
          <Grid container spacing={2}>
            <Grid  xs={12} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <Button size="small"   
                sx={{
              backgroundColor: "#44a1a0",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }} onClick={handleSelectAll}>Seleccionar Todo</Button>
              <Button size="small"  sx={{
              backgroundColor: "#44a1a0",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }}  onClick={handleDeselectAll}>Deseleccionar Todo</Button>
            </Grid>
            {analysisData.map(img => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={img.image_id}>
                <Paper
                  variant="outlined"
                  sx={{
                    border: selectedImageIds.has(img.image_id) ? '2px solid' : '1px solid',
                    borderColor: selectedImageIds.has(img.image_id) ? 'primary.main' : 'divider',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                  onClick={() => toggleSelection(img.image_id)}
                  onDoubleClick={() => handleEnterDetailView(img)}
                >
                  <Box
                    component="img"
                    src={img.signed_image_url}
                    alt={img.nombre_archivo}
                    sx={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
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
              </Grid>
            ))}
          </Grid>
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
      </Paper>

     {/* === PANEL DERECHO: Flujo por Pasos (CORREGIDO) === */}
<Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

    {/* --- PASO 1: ETIQUETADO --- */}
    {!isTaggingComplete ? (
        <>
            {/* Muestra el panel de acciones de etiquetado normal */}
            <Box>
                {renderRightPanel()}
            </Box>

            {/* Botón para pasar al siguiente paso */}
            <Paper sx={{ p: 2, mt: 'auto' }}> {/* 'mt: auto' empuja este botón hacia abajo */}
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={() => setTaggingComplete(true)}
                    
                >
                    Confirmar Etiquetas y Entrenar
                </Button>
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
                    <MenuItem value="resnet34">ResNet34 (Recomendado)</MenuItem>
                    <MenuItem value="mobilenet_v2">MobileNetV2 (Más Rápido)</MenuItem>
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
                  Entrenar y Revisar
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
      <Grid item xs={12} md={6}>
        <MetricDisplay 
          title="Precisión General (Accuracy)"
          value={`${(trainingState.results.metrics.accuracy * 100).toFixed(1)}%`}
          subtitle="Porcentaje de imágenes clasificadas correctamente en el set de prueba."
        />
      </Grid>
      <Grid item xs={12} md={6}>
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


------------------------------------------------




-----

// En src/pages/VisionLabHubPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; 
import { Box, Typography, Paper, Grid, Button, Icon, Skeleton } from '@mui/material';

// Importa los iconos que vamos a usar
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups'; // Icono para Clustering
import RuleIcon from '@mui/icons-material/Rule'; // Icono para Evaluación
import ScienceIcon from '@mui/icons-material/Science'; // Icono para Predicción

// --- Componente Reutilizable para las Tarjetas de Acción ---
const ActionCard = ({ icon, title, description, buttonText, onClick, disabled = false }) => (
      <Grid item xs={12} sm={6} md={4}> 
        <Paper 
            elevation={3}
            sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: 6
                }
            }}
        >
            <Box sx={{ flexGrow: 1, mb: 3 }}>
  <Typography 
    variant="body2" 
    color="text.secondary" 
    sx={{ whiteSpace: "pre-line" }}
  >
    {description}
  </Typography>
</Box>
            <Button 
                variant="contained" 
                onClick={onClick}
                disabled={disabled}
                sx={{ mt: 'auto' }} // Alinea el botón abajo
            >
                {buttonText}
            </Button>
        </Paper>
    </Grid>
);

// --- Componente Principal de la Página ---
export default function VisionLabHubPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const clusterResultId = searchParams.get('clusterResultId');
    // Este useEffect se encarga de cargar los detalles del dataset
    // para poder mostrar su nombre en la cabecera.
    useEffect(() => {
        const fetchDatasetDetails = async () => {
            setLoading(true);
            
            try {
               
                console.log(`Buscando detalles para el dataset: ${datasetId}`);
               
                await new Promise(resolve => setTimeout(resolve, 500)); 
                setDataset({ id: datasetId, name: `Análisis de Imágenes (${datasetId.substring(0, 8)}...)` });
             

            } catch (error) {
                console.error("Error al cargar los detalles del dataset:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDatasetDetails();
    }, [datasetId]);

    // --- Lógica de Navegación ---
    const handleNavigation = (path, isExternalModule = false) => {
    if (isExternalModule) {
        // Para el botón que necesita ir a un módulo diferente y pasar el ID como parámetro
        navigate(`${path}?datasetId=${datasetId}`);
    } else {
        // Para los botones de Etiquetado y Clustering que usan rutas completas
        navigate(path);
    }
};
    
    // --- Datos para nuestras tarjetas ---
    const actionCardsData = [

        {
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    title: "Descubrir Grupos (Clustering)",
    description: "Agrupar automáticamente imágenes similares...",
    buttonText: "Ejecutar Clustering",
    // 👇 --- ¡LA CORRECCIÓN ESTÁ AQUÍ! ---
    // Simplemente navega al siguiente paso, de forma relativa.
    onClick: () => navigate('clustering'), 
    disabled: false
},
    
    {
       icon: <ImageSearchIcon sx={{ fontSize: 40 }} />,
            title: "Etiquetado y Entrenamiento de Visión",
            description: "Etiqueta tus imágenes y utiliza esas etiquetas para entrenar...",
            buttonText: "Ejecutar Etiquetado y Entrenamiento",
            onClick: () => {
                // 👇 --- CAMBIO CLAVE ---
                // Construimos la ruta hacia el explorador.
                let explorerPath = 'explorer';
                // Si recibimos un ID de clustering, lo añadimos a la ruta.
                if (clusterResultId) {
                    explorerPath += `?clusterResultId=${clusterResultId}`;
                }
                navigate(explorerPath); // Navegamos a la ruta construida
            } 
        },
        {
        icon: <AutoAwesomeIcon sx={{ fontSize: 40 }} />,
        title: "Crear Modelo Predictivo",
        description: "Entrenar modelos de clasificación o regresión usando las \n características extraídas de las imágenes.",
        buttonText: "Ir a Entrenamiento",
        onClick: () => handleNavigation('/predictions/new-model', true) // <-- Necesita isExternalModule
    },
    
];

    return (
    // Contenedor principal de la página, ocupa todo el espacio
     <Box sx={{ p: 1, flexGrow: 1, mt: "72px" }}>
        
        {/* --- CABECERA (Inspirada en tu otro diseño) --- */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 2,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            borderRadius: 2,
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            mb: 4, // Margen inferior para separar de las tarjetas
            color: '#ffffff'
          }}
        >
          <Box>
              <Typography variant="h5" fontWeight="bold">
                Laboratorio de Visión
              </Typography>
              {loading ? (
                    <Skeleton width="250px" sx={{ bgcolor: 'grey.700' }} />
                ) : (
                    <Typography variant="body1">
                        Dataset: <strong>{dataset?.name || datasetId}</strong>
                    </Typography>
              )}
          </Box>
        </Box>

        {/* --- GRID DE TARJETAS (Ahora centrado y responsivo) --- */}
        <Grid container spacing={4} justifyContent="center">
            {actionCardsData.map((card, index) => (
                <ActionCard
                    key={index}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    buttonText={card.buttonText}
                    onClick={card.onClick}
                    disabled={card.disabled}
                />
            ))}
        </Grid>
    </Box>
);
}

---------------------------------------------------


// RUTA: src/components/analysis/DatasetSelectorModal.jsx (VERSIÓN CORREGIDA Y MEJORADA)

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Grid, Paper, Typography, CircularProgress, Alert, Box, IconButton
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function DatasetSelectorModal({ open, onClose, onDatasetSelect }) {
    const [view, setView] = useState('projects');
    const [projects, setProjects] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open) {
            const fetchProjects = async () => {
                setLoading(true);
                setError(null);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'No se pudieron cargar los proyectos.');
                    setProjects(result.data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchProjects();
        } else {
            setView('projects');
            setSelectedProject(null);
            setDatasets([]);
        }
    }, [open]);

    const handleProjectSelect = async (project) => {
        setSelectedProject(project);
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${project.id}/datasets`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'No se pudieron cargar los datasets.');
            
            // ================== ¡LA CORRECCIÓN MÁS IMPORTANTE ESTÁ AQUÍ! ==================
            const tabularDatasets = result.data.filter(d => d.datasetType === 'tabular');
       
            // ============================================================================
            
            setDatasets(tabularDatasets);
            setView('datasets');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDatasetSelect = (dataset) => {
        // Aprovechamos para normalizar el nombre de la propiedad 'name'
        // El resto del código espera 'name', pero tu API devuelve 'datasetName'
        const normalizedDataset = {
            ...dataset,
            name: dataset.datasetName
        };
        onDatasetSelect(normalizedDataset);
        onClose();
    };

    return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            {view === 'datasets' && (
                <IconButton onClick={() => setView('projects')} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
            )}
            {view === 'projects' ? 'Seleccionar un Proyecto' : `Datasets en: ${selectedProject?.projectName}`}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2, bgcolor: 'grey.50' }}>
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && view === 'projects' && (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
                    <Grid container spacing={2}>
                        {projects.length > 0 ? projects.map(project => (
                            <Grid  xs={12} sm={6} md={4} key={project.id}>
                                <Paper
                                    onClick={() => handleProjectSelect(project)}
                                    sx={{
                                        width: '100%',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }
                                    }}
                                    elevation={2}
                                >
                                    <FolderIcon sx={{ mr: 2, color: 'primary.main' }} />
                                    <Typography variant="body1" fontWeight="500">{project.projectName}</Typography>
                                </Paper>
                            </Grid>
                        )) : (
                            <Grid  xs={12}>
                                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    No se encontraron proyectos.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

            {!loading && !error && view === 'datasets' && (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
                    <Grid container spacing={2}>
                        {datasets.length > 0 ? datasets.map(dataset => (
                            <Grid xs={12} sm={6} md={4} key={dataset.datasetId}>
                                <Paper
                                    onClick={() => handleDatasetSelect(dataset)}
                                    sx={{
                                        width: '100%',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }
                                    }}
                                    elevation={2}
                                >
                                    <ArticleIcon sx={{ mr: 2, color: 'secondary.main' }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight="500">{dataset.datasetName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{dataset.datasetType}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        )) : (
                            <Grid  xs={12}>
                                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    Este proyecto no contiene datasets tabulares.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}
        </DialogContent>

        <DialogActions>
            <Button onClick={onClose}>Cancelar</Button>
        </DialogActions>
    </Dialog>
);
}

----------------------------------
version chat gpt
export default function InteractiveDocumentEditor({ datasetId }) {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Estados de documento ---
  const [elements, setElements] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // --- Estados de edición ---
  const [editingElement, setEditingElement] = useState(null);
  const [modalText, setModalText] = useState("");

  // --- Modal imágenes ---
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [targetImageId, setTargetImageId] = useState(null);

  // 📌 1. Cargar elementos del backend (con paginación si querés)
  useEffect(() => {
    const loadElements = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/documents/${datasetId}/elements?page=${currentPage}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        const data = await response.json();

        if (!data.success) throw new Error(data.error || "Error cargando elementos");

        setElements(data.elements);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadElements();
  }, [datasetId, currentPage]);

  // 📌 2. Abrir modal de edición
  const handleElementSelect = (element) => {
    setEditingElement(element);
    setModalText(element.content || "");
  };

  // 📌 3. Guardar cambio con PUT
  const handleSaveElementChange = async () => {
    if (!editingElement) return;

    await fetch(
      `${import.meta.env.VITE_API_URL}/api/documents/${datasetId}/element/${editingElement.element_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ content: modalText }),
      }
    );

    // Actualizar localmente
    setElements((prev) =>
      prev.map((el) =>
        el.element_id === editingElement.element_id ? { ...el, content: modalText } : el
      )
    );

    setEditingElement(null);
  };

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box>
      {/* Renderizar página */}
      <PageRenderer pageData={{ elements }} onElementSelect={handleElementSelect} />

      {/* Paginación */}
      <Box sx={{ mt: 1, display: "flex", justifyContent: "center" }}>
        <Button disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}>
          Anterior
        </Button>
        <Typography sx={{ mx: 2 }}>
          Página {currentPage} de {totalPages}
        </Typography>
        <Button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
          Siguiente
        </Button>
      </Box>

      {/* Modal de edición de texto */}
      <Modal open={!!editingElement} onClose={() => setEditingElement(null)}>
        <Box sx={modalStyle}>
          <Typography variant="h6">Editar Texto</Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            value={modalText}
            onChange={(e) => setModalText(e.target.value)}
            sx={{ mt: 2, mb: 2 }}
          />
          <Button variant="contained" onClick={handleSaveElementChange}>
            Guardar Cambio
          </Button>
        </Box>
      </Modal>

      {/* Modal galería */}
      <GalleryModal
        open={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onImageSelect={(newImageUrl) => {
          setElements((prev) =>
            prev.map((el) => (el.id === targetImageId ? { ...el, new_url: newImageUrl } : el))
          );
          setIsGalleryOpen(false);
        }}
      />
    </Box>
  );
}

version geminispro


return de analisis de sensibilidad
     
    // ===========================================================================
    // === SOLUCIÓN 2: CORRECCIÓN DEL LAYOUT DE LAS COLUMNAS                  ===
    // ===========================================================================
     return (
        <Grid container spacing={5}> {/* Reducimos un poco el espaciado */}
            
            {/* === COLUMNA IZQUIERDA: CONTROLES --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 33% en desktop (md=4) */}
               <Grid xs={12} md={5} sx={{ minWidth: 0 }}>
                <Stack spacing={2} sx={{ height: '100%' }}>
                    <Box  sx={{
                         p: 5,}}>
                        <Typography variant="h6" sx={{ fontSize: '1.1rem',  color:"white" }}>Simulador Interactivo</Typography>
                        <Typography variant="body1" sx={{ mb: 1, color: "white", mt:3 }}>
                        Selecciona una característica,
                        establece un escenario inicial<br />
                        y simula los resultados.
                         </Typography>
                    </Box>

                    <Paper
                        elevation={2}
                        sx={{
                         p: 2,
                         borderRadius: 3, 
                          border: '1px solid',
                          borderColor: 'primary.main',            // bordes redondeados
                         boxShadow: 3,                      // sombra inicial
                          transition: "0.3s",
                          backgroundColor: 'background.paper', // fondo
                            "&:hover": {
                          boxShadow: 6,                   // sombra más intensa al hover
                          transform: "translateY(-2px)"   // efecto leve de “flotante”
                           }
                         }}
                         >
                        <Typography
                          variant="subtitle1"
                          color="text.primary"   // 👈 se adapta al modo
                          sx={{ fontWeight: 'bold', mb: 1.5 }}
                          >
                          Paso 1: Selección de la característica a simular
                        </Typography>
                        <FormControl fullWidth size="small">
                            <InputLabel>Característica Numérica</InputLabel>
                            <Select value={featureToVary} label="Característica Numérica" onChange={handleFeatureToVaryChange}>
                                {numericFeatures.map(feature => (
                                    <MenuItem key={feature.name} value={feature.name}>{feature.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Paper>

                    {featureToVary && (
                        <>
                            <Paper
                                elevation={2}
                                sx={{
                                p: 2,
                                borderRadius: 3,                   // bordes redondeados
                                boxShadow: 3,                      // sombra inicial
                                transition: "0.3s",
                                 border: '1px solid',
                                borderColor: 'primary.main',
                                backgroundColor: 'background.paper', // fondo
                                "&:hover": {
                                boxShadow: 6,                   // sombra más intensa al hover
                                transform: "translateY(-2px)"   // efecto leve de “flotante”
                                 }
                                }}
                                 >
                                <Typography 
                                 variant="subtitle1"
                                 color="text.primary"   // 👈 se adapta al modo
                                 sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                    Paso 2: Escenario Base
                                </Typography>
                                <Box sx={{ maxHeight: 300, overflowY: "auto", pr: 1 }}>
                                    {otherFeatures.map(feature => (
                                        <Box key={feature.name} sx={{ mb: 2 }}>
                                            {feature.options ? (
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>{feature.name}</InputLabel>
                                                    <Select
                                                        label={feature.name}
                                                        value={baseDataPoint[feature.name] || ""}
                                                        onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                    >
                                                        {feature.options.map(option => (
                                                            <MenuItem key={option} value={option}>{option}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            ) : (
                                                <TextField
                                                    fullWidth type="number" label={feature.name} size="small"
                                                    value={baseDataPoint[feature.name] || ""}
                                                    onChange={(e) => handleBaseDataChange(feature.name, e.target.value)}
                                                />
                                            )}
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                            
                             <Card elevation={2} sx={{ border: '1px solid', borderColor: 'primary.main', borderRadius: 2, flexShrink: 0, p: 2 }}>
                                <CardContent>
                                    <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 'bold', mb: 2 }}>
                                        Paso 3: Definir el Rango de Simulación
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Introducir los valores mínimo y máximo para <strong>{featureToVary}</strong>:
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Valor Mínimo"
                                            size="small"
                                            value={simulationRange[0]}
                                            onChange={(e) => handleRangeChange('start', e.target.value)}
                                            error={!!rangeError}
                                            helperText={rangeError}
                                        />
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Valor Máximo"
                                            size="small"
                                            value={simulationRange[1]}
                                            onChange={(e) => handleRangeChange('end', e.target.value)}
                                            error={!!rangeError}
                                        />
                                    </Box>
                                </CardContent>
                                <Divider />
                                <CardActions sx={{ justifyContent: "center", p: 2 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ScienceIcon />}
                                        onClick={handleRunAnalysis}
                                        disabled={
                                            loading || 
                                            !featureToVary || 
                                            !!rangeError || 
                                            simulationRange.includes('')
                                        }
                                    >
                                        {loading ? "Analizando..." : "Ejecutar Simulación"}
                                    </Button>
                                </CardActions>
                            </Card>
                        </>
                    )}
                </Stack>
            </Grid>

            {/* === COLUMNA DERECHA: RESULTADOS --- CORREGIDO === */}
            {/* Le damos un tamaño explícito: 100% en móvil (xs=12) y 67% en desktop (md=8) */}
                 <Grid xs={12} md={7} sx={{ minWidth: 0 }}>
                   <Paper 
                    sx={{ 
                     p: 5, 
                     height: '100%', 
                     display: "flex", 
                     flexDirection: "column",
                     minWidth: 0,       // evita que fuerce más ancho
                     overflowX: 'auto',  // scroll si el gráfico se pasa
                     borderRadius:3
                    
                   }}
                 >
                    <Typography
                    variant="h6"
                      sx={{
                       fontSize: "1.1rem",
                       mb: 3,
                       mt: 2,
                       textAlign: "center", // 👈 centra el texto dentro de su contenedor
                        }}
                         >
                             Resultado de la Simulación
                    </Typography>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                    {loading ? (
                        <Box sx={{ flexGrow: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CircularProgress /><Typography sx={{ ml: 2 }}>Realizando simulación...</Typography>
                        </Box>
                    ) : chartData ? (
                        <Stack spacing={3}>
                           <Alert severity="info" icon={<ScienceIcon fontSize="inherit" />} sx={{ mb: 2, textAlign: "center" }}>
  <Typography variant="body2" component="span" sx={{ display: "block" }}>
    Este gráfico muestra cómo cambia la <strong>predicción</strong> al modificarse los valores
     de la columna  seleccionada:
  </Typography>
  <Typography variant="body2" component="span" sx={{ display: "block" }}>
     <strong>{chartData.feature_analyzed}</strong>.
  </Typography>
</Alert>

                            <Box sx={{ flexGrow: 1, minHeight: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData.sensitivity_results} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="feature_value" name={chartData.feature_analyzed} />
                                        <YAxis />
                                        <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(4) : value} />
                                        <Legend />
                                        <Line type="monotone" dataKey="prediction" name="Predicción" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>

                       <Box>
  <Typography variant="h6" sx={{ mb: 1.5, fontSize: '1rem' }}>Resumen</Typography>

  <Box
      sx={{
      display: "grid",
      gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, // 1 col en mobile, 2 cols en desktop
      gap: 2,
    }}
  >
    <SummaryCard
      title="Predicción Mínima"
      value={summaryStats.min}
      icon={<ArrowDownwardIcon />}
      color="error"
      explanation={
        <>

          Es el resultado más bajo  que  <br />
         se obtuvo al variar "{chartData.feature_analyzed}".
        </>
      }
    />
    <SummaryCard
      title="Predicción Máxima"
      value={summaryStats.max}
      icon={<ArrowUpwardIcon />}
      color="success"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Es el valor más alto que alcanzó <br />
          la predicción durante la simulación.
        </>
      }
    />

    <SummaryCard
      title="Predicción Promedio"
      value={summaryStats.avg}
      icon={<FunctionsIcon />}
      color="info"
      className="bg-white shadow-md hover:shadow-xl rounded-2xl p-4 transition-all duration-300"
      explanation={
        <>
          Representa el valor central o el más<br />
           probable de todos los resultados.
        </>
      }
    />

    <SummaryCard
      title="Impacto de la Variable"
      value={summaryStats.impact}
      icon={<CompareArrowsIcon />}
      color="warning"
      explanation={
        <>
          Muestra cuánto cambió la predicción. <br />
          Un valor alto significa que esta <br />
          variable es muy influyente.
        </>
      }
    />
  </Box>
</Box>

                        </Stack>
                    ) : (
                         <Box sx={{ 
                flexGrow: 1, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                textAlign: "center", 
                p: 3, 
                border: "2px dashed", 
                borderColor: "divider", 
                borderRadius: 2,
                backgroundColor: 'grey.50' // Un fondo muy sutil para diferenciarlo
            }}>
                <Typography color="body1">Una vez ejecutada la simulación, los resultados se presentaran  en este panel <br />  para
                ser analizados fácilmente.</Typography>
            </Box>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}

--------------------------------------------



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

import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import TextActionsCard from '../components/dashboard/TextActionsCard';
import AnalysisResultModal from '../components/AnalysisResultModal';
import CloseIcon from '@mui/icons-material/Close';
import ArticleIcon from '@mui/icons-material/Article'; // Para la vista simple
import ViewStreamIcon from '@mui/icons-material/ViewStream'; // Para la vista por secciones
import SectionsEditor from '../components/dashboard/SectionsEditor'; // <-- AÑADE ESTA LÍNEA
import TextModificationModal from '../components/dashboard/TextModificationModal.jsx';

export default function DocumentEditor() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const location = useLocation(); // <-- 1. Usamos el hook

    // --- ESTADOS ---
    const [loadState, setLoadState] = useState({ loading: true, error: null });
    const [datasetType, setDatasetType] = useState(location.state?.datasetType);
    
    const [textContent, setTextContent] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const hasChanges = textContent !== originalText;
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
            console.log("Recibido texto de una columna. Cargando en el editor...");
            
            setTextContent(incomingText);
            setOriginalText(incomingText); // Importante para la lógica de "hay cambios"
            setDatasetType(incomingType);
            setLoadState({ loading: false, error: null });

            // Limpiamos el estado de la navegación para que el texto no reaparezca
            // si el usuario actualiza la página o navega hacia atrás y adelante.
            window.history.replaceState({}, document.title);

        } else {
            // CASO 2: No recibimos texto.
            // Ejecutamos la lógica original de la página para cargar el documento completo.
            console.log("No se recibió texto. Cargando documento desde el backend.");
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

  const handleSave = async () => {
    setIsSaving(true);

    let contentToSave = textContent;
    if (viewMode === 'sections') {
        contentToSave = joinSectionsIntoText(documentSections);
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // --- INICIO DE LA LÓGICA INTELIGENTE (SIN TOCAR useEffect) ---
        
        // 1. JUSTO ANTES DE GUARDAR, PREGUNTAMOS EL TIPO A LA API
        console.log("Preguntando el tipo de dataset antes de guardar...");
        const detailsUrl = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/details`;
        const detailsResponse = await fetch(detailsUrl, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        const detailsResult = await detailsResponse.json();
        if (!detailsResult.success) throw new Error(detailsResult.error || "No se pudo obtener el tipo de dataset.");
        
        const datasetType = detailsResult.data.dataset_type;
        console.log(`El tipo de dataset es: ${datasetType}`);
        
        // 2. AHORA, LA MISMA LÓGICA DE DECISIÓN QUE YA TENÍAMOS
        let url;
        let method;
        let body;

        if (['docx', 'pdf', 'text', 'json'].includes(datasetType)) {
            url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/content`;
            method = 'PUT';
            body = JSON.stringify({ newContent: contentToSave });
        } else {
            url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/save-text-content`;
            method = 'POST';
            body = JSON.stringify({ textContent: contentToSave });
        }
        
        console.log(`Enviando a: ${method} ${url}`);
        // --- FIN DE LA LÓGICA INTELIGENTE ---

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: body
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || "Error desconocido al guardar.");
        }

        setTextContent(contentToSave); 
        setOriginalText(contentToSave);
        showNotification("¡Guardado con éxito!", "success");

    } catch (error) {
        console.error("Error al guardar:", error);
        showNotification(error.message, "error");
    } finally {
        setIsSaving(false);
    }
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
        console.log("Reemplazando el texto completo.");
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
       return text
    .split(/\n\n+/) // Divide por dos o más saltos de línea (párrafos)
    .filter(paragraph => paragraph.trim() !== '') // Elimina párrafos vacíos
    .map((paragraph, index) => ({
      id: `section-${Date.now()}-${index}`, // ID único para la key de React
      content: paragraph,
    }));
};

/**
 * Toma un array de objetos de sección y lo une en un solo string.
 */
  const joinSectionsIntoText = (sections) => {
     return sections.map(section => section.content).join('\n\n');
};

  const handleViewModeChange = (event, newMode) => {
  if (newMode === null) return; // Previene que se deseleccionen todos los botones

  // Si cambiamos a la vista por secciones...
  if (newMode === 'sections') {
    // ...convertimos el texto plano actual en secciones.
    const sections = splitTextIntoSections(textContent);
    setDocumentSections(sections);
  } 
  // Si volvemos a la vista simple...
  else if (newMode === 'simple') {
    // ...unimos las secciones (si es que hubo cambios) en un solo texto.
    const newText = joinSectionsIntoText(documentSections);
    setTextContent(newText);
  }

  setViewMode(newMode);
};

   // --- RENDERIZADO ---
    if (loadState.loading) return <CircularProgress />;
    if (loadState.error) return <Alert severity="error">{loadState.error}</Alert>;


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

      {/* Selector de modo de vista */}
      <ToggleButtonGroup
  value={viewMode}
  exclusive
  onChange={handleViewModeChange}
  aria-label="Modo de vista del editor"
>
  <ToggleButton value="simple" aria-label="vista simple" sx={{
    color: 'rgba(255, 255, 255, 0.7)', // Color del texto y el icono por defecto (blanco semitransparente)
    borderColor: 'rgba(255, 255, 255, 0.5)', // Color del borde
    '&.Mui-selected': {
      color: 'white', // Color del texto y el icono cuando está seleccionado
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // Fondo cuando está seleccionado
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)', // Fondo al pasar el cursor
    }
  }}>
    <ArticleIcon sx={{ mr: 1 }} />
    Simple
  </ToggleButton>
  <ToggleButton value="sections" aria-label="vista por secciones" sx={{
    color: 'rgba(255, 255, 255, 0.7)', // Mismos estilos para ambos botones
    borderColor: 'rgba(255, 255, 255, 0.5)',
    '&.Mui-selected': {
      color: 'white',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    }
  }}>
    <ViewStreamIcon sx={{ mr: 1 }} />
    Secciones
  </ToggleButton>
  </ToggleButtonGroup>

      {/* Botones de acción */}
     <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
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

        {/* Área de edición */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
          {viewMode === 'simple' ? (
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
            <SectionsEditor
              sections={documentSections}
              onSectionChange={handleSectionChange}
              onSectionDelete={handleSectionDelete}
              onSectionDuplicate={handleSectionDuplicate}
            />
          )}
        </Box>
      </Box>

      {/* Columna derecha */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          border: 1,
          borderColor: '#2196f3',
          borderStyle: 'solid',
          borderRadius: 2,
          bgcolor: 'background.paper',
          overflow: 'hidden',
        }}
      >
        <TextActionsCard
         selectedText={selectedText}
         onLegacyAnalysis={handleLegacyAnalysis} // <-- NUEVA
         onTranslate={handleTranslate}         // <-- NUEVA
         onAiRecipe={handleAiRecipe}           // <-- NUEVA
         fullTextContent={textContent}
        onNavigateWithSelection={handleNavigateToPromptLabWithSelection} 
/>
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

----------------------------------------------------------------


// src/components/dashboard/ProjectPropertiesPanel.jsx (VERSIÓN CORREGIDA Y UNIFICADA)

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box, Paper, Typography, Divider, Button, Stack,
    List, ListItem, ListItemIcon, ListItemText, // <-- AQUÍ NO ESTÁ ListItemButton
    CircularProgress, Alert,Menu, MenuItem,  ListItemButton, 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdsClickIcon from '@mui/icons-material/AdsClick'; // <-- Un icono más directo de "haz clic"



// Componente principal (con lógica de selección y navegación restaurada)
export default function ProjectPropertiesPanel({ project, onRename, onDelete }) {
  const navigate = useNavigate();

  // --- ESTADO ---
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [errorDatasets, setErrorDatasets] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);

  // --- HANDLERS ---
  const handleMenuOpen = (event, dataset) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDataset(null);
  };

   const handleNavigate = (datasetToNavigate) => {
  if (!datasetToNavigate) return;

  // --- SOLUCIÓN ---
  // 1. Define las listas de tipos de archivo que tu aplicación conoce.
  const tabularTypes = ['tabular', 'csv', 'xlsx', 'parquet'];
  const textTypes = ['text', 'pdf', 'docx', 'md', 'txt']; // <-- ¡Añade aquí todos los tipos de texto que uses!

  // 2. Normaliza el tipo del archivo actual a minúsculas.
  const currentType = datasetToNavigate.datasetType?.toLowerCase();

  // 3. Comprueba si el tipo actual está en alguna de las listas.
  if (tabularTypes.includes(currentType)) {
    navigate(`/project/${project.id}/predict/${datasetToNavigate.datasetId}`);
  } else if (textTypes.includes(currentType)) {
    navigate(`/project/${project.id}/dataset/${datasetToNavigate.datasetId}/promptlab`);
  } else {
    // Si llegamos aquí, es un tipo que no hemos definido en las listas.
    console.warn(`Tipo de dataset no reconocido: '${datasetToNavigate.datasetType}'`);
  }

  handleMenuClose();
};

  // --- FETCH DATASETS ---
  useEffect(() => {
    if (!project) {
      setDatasets([]);
      setLoadingDatasets(false);
      return;
    }

    const fetchDatasets = async () => {
      setLoadingDatasets(true);
      setErrorDatasets(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/projects/${project.id}/datasets`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "No se pudieron cargar los datasets.");
        }
        setDatasets(json.data || []);
      } catch (err) {
        setErrorDatasets(err.message);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchDatasets();
  }, [project]);

  // --- SIN PROYECTO ---
  if (!project) {
    return (
      <Paper
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          backgroundColor: "action.hover",
        }}
      >
        <AdsClickIcon sx={{ fontSize: "3rem", color: "#ffffff", mb: 2 }} />
        <Typography variant="h6" color="#ffffff" fontWeight="500">
          Panel de Detalles
        </Typography>
        <Typography
          sx={{
            color: "#ffffff",
            textAlign: "center",
            fontWeight: "medium",
          }}
        >
          Selecciona un proyecto de la lista para ver sus detalles y acciones.
        </Typography>
      </Paper>
    );
  }

  // --- LISTA DE DATASETS ---
  const renderDatasetList = () => {
          if (loadingDatasets) {
            return <CircularProgress size={20} />;
          }
          if (errorDatasets) {
            return (
              <Alert severity="warning" sx={{ fontSize: "0.8rem", p: 1 }}>
                {errorDatasets}
              </Alert>
            );
          }
          if (datasets.length === 0) {
            return <Typography color="#b8b4b4ff">Este proyecto no tiene archivos.</Typography>;
          }
      
  return (
  <List dense disablePadding sx={{ maxHeight: 150, overflowY: "auto" /* Cambiado a auto para que se vea el scroll */ }}>
    {datasets.map((ds) => (
      <ListItem
        key={ds.datasetId}
        disablePadding // Añade esto para que ListItemButton ocupe todo el espacio
      >
        <ListItemButton onClick={(event) => handleMenuOpen(event, ds)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FolderZipIcon fontSize="small" color="action" />
          </ListItemIcon>
          <ListItemText
            primary={ds.datasetName}
            primaryTypographyProps={{
              noWrap: true,
              title: ds.datasetName,
              variant: "body2",
            }}
          />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);
};

  // --- RETURN ---
  return (
    <Paper
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
        borderRadius: 1,
        
      
      }}
    >
      {/* Contenido principal */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
        <Box
          sx={{
            mb: 1,
            p: 2,
            borderRadius: 1.5,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            borderLeft: "3px solid #26717a",
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.95rem",
            }}
          >
            Archivos del Proyecto:
          </Typography>
        </Box>

       {/* La caja de la lista: AHORA CRECE Y TIENE EL SCROLL */}
  <Box
    sx={{
      borderRadius: 1,
      bgcolor: "rgba(0, 229, 255, 0.05)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      p: 1,
      mb: 2,
      display: "flex",
      flexDirection: "column",
      gap: 0.5,
      flexGrow: 1,        // <-- AÑADIDO: ¡La magia! Le decimos que crezca
      overflowY: 'auto'   // <-- AÑADIDO: ...y ponemos el scroll aquí.
    }}
  >
    {renderDatasetList()}
  </Box>

      </Box>

      {/* Acciones */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #26717a, #44a1a0)",
          flexShrink: 0,
          pt: 2,
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" color="primary">
          Acciones
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "#ffffff",
              },
            }}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            Importar y Procesar Archivos
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onRename}
            sx={{
              backgroundColor: " #005f73",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }}
          >
            Renombrar Proyecto
          </Button>
          <Button
  sx={{
    border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
    },
  }}
  variant="contained"
  startIcon={<DeleteIcon />}
  onClick={onDelete}
>
  Eliminar Proyectos
</Button>
        </Stack>
      </Box>

      {/* --- MENU PARA SELECCIONAR DATASET --- */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
       <MenuItem onClick={() => handleNavigate(selectedDataset)}>
  {selectedDataset?.datasetType === "tabular"
    ? "Ir a Predicciones"
    : "Ir a Prompt"}
     </MenuItem>
      </Menu>
    </Paper>
  );
}


// Los propTypes se quedan igual
ProjectPropertiesPanel.propTypes = {
    project: PropTypes.object,
    onRename: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};


--------------------------------------------------------

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
    console.log("Texto Original a reemplazar:", original);
    console.log("Tipo de 'original':", typeof original);
    console.log("Sugerencia para insertar:", sugerencia);
    console.log("Tipo de 'sugerencia':", typeof sugerencia);
    console.log("Estado de 'textContent' ANTES:", textContent.substring(0, 200)); // Muestra los primeros 200 caracteres
    // --- FIN DE DEPURACIÓN ---

    if (original) {
        // Lógica para reemplazar solo la selección
        const nuevoTexto = textContent.replace(original, sugerencia);
        
        // --- INICIO DE DEPURACIÓN ---
        console.log("Estado de 'textContent' DESPUÉS:", nuevoTexto.substring(0, 200));
        console.groupEnd();
        // --- FIN DE DEPURACIÓN ---

        setTextContent(nuevoTexto);
    } else {
        // Lógica si no había selección (reemplazar todo)
        // --- INICIO DE DEPURACIÓN ---
        console.log("Reemplazando el texto completo.");
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

   // --- RENDERIZADO ---
    if (loadState.loading) return <CircularProgress />;
    if (loadState.error) return <Alert severity="error">{loadState.error}</Alert>;


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

-----------------------------------------------------------------------

// src/pages/EstudioCreativoPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Slider, Select, MenuItem, InputLabel, FormControl, Tooltip , Box, Paper, Typography, TextField, Button, CircularProgress, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InputAdornment from "@mui/material/InputAdornment";
import { useNotification } from '../context/NotificationContext'; 
import { supabase } from '../supabaseClient'; // Asegúrate de tener esta importación
import SaveIcon from '@mui/icons-material/Save'; // Importa el icono de guardar



 const getMemeTextStyle = (fontFamily, fontColor, borderColor, fontSize) => ({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  textAlign: 'center',
  color: fontColor,
  fontWeight: 'bold',
  fontFamily: `${fontFamily}, sans-serif`,
  textTransform: 'uppercase',
  textShadow: `2px 2px 0 ${borderColor}, -2px -2px 0 ${borderColor}, 2px -2px 0 ${borderColor}, -2px 2px 0 ${borderColor}, 2px 0 0 ${borderColor}, -2px 0 0 ${borderColor}, 0 2px 0 ${borderColor}, 0 -2px 0 ${borderColor}`,
  letterSpacing: '1px',
  // Usamos el tamaño del estado y le añadimos 'px' para que sea una unidad CSS válida
  fontSize: `${fontSize}px`, 
  overflowWrap: 'break-word',
});


export default function EstudioCreativoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useNotification(); //`impact`)
  // Estado para la imagen con la que estamos trabajando
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fontColor, setFontColor] = useState('#FFFFFF'); // Blanco por defecto
  const [borderColor, setBorderColor] = useState('#000000'); // Negro por defecto
  const [fontName, setFontName] = useState('impact'); // Impact por defecto
  const [sourceImageUrl, setSourceImageUrl] = useState(null);
  const [fontSize, setFontSize] = useState(40);
  const [isEditingAdvanced, setIsEditingAdvanced] = useState(false); // Para mostrar un spinner en el botón
  const [backgroundPrompt, setBackgroundPrompt] = useState(''); // El prompt para el fondo de IA
  const [customBackgroundFile, setCustomBackgroundFile] = useState(null); // El archivo de fondo personalizado
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  

  // 2. Un estado para guardar la URL de la imagen que vamos a editar
  const [imagenParaEditar, setImagenParaEditar] = useState(null);



   useEffect(() => {
    if (location.state?.image) {
      const imageFromGallery = location.state.image;
      setActiveImage(imageFromGallery);
      
      // CLAVE: Guardamos la URL firmada (y válida por 1h) que nos dio el backend
      setSourceImageUrl(imageFromGallery.public_url); 
    }
    setLoading(false);
  }, [location.state]);

  if (loading) {
    return <Box /* ... Círculo de carga ... */ />;
  }

  const handleCreateMeme = async () => {
    // Usamos la URL firmada guardada. Si no existe, no hacemos nada.
    if (!sourceImageUrl) {
      showNotification("Error: No se encontró la URL de la imagen de origen.", "error");
      return;
    }

    setIsCreatingMeme(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");

      const formData = new FormData();
      
      // USAMOS LA URL FIRMADA QUE GUARDAMOS. Esta SÍ es accesible para el backend.
      formData.append('image_url', sourceImageUrl); 
      
      // ... resto del formData (topText, bottomText, colores, etc.)
      formData.append('topText', topText);
      formData.append('bottomText', bottomText);
      formData.append('fontColor', fontColor);
      formData.append('borderColor', borderColor);
      formData.append('fontName', fontName);
      formData.append('fontSize', fontSize);

      const url = `${import.meta.env.VITE_API_URL}/api/create-meme`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear el meme.");
      }
      
      const memeBlob = await response.blob();
      const memeUrl = URL.createObjectURL(memeBlob);
      
      // Actualizamos la imagen visible con la nueva URL local "blob"
      // PERO MANTENEMOS la `sourceImageUrl` intacta para futuras ediciones.
      setActiveImage(prev => ({ 
        ...prev,
        public_url: memeUrl, // URL para mostrar en el <img>
        blob: memeBlob,      // El nuevo archivo binario para guardar
        type: 'meme'
      }));

      showNotification("¡Meme creado! Ahora puedes guardarlo en tu galería.", "success");

    } catch (error) {
      console.error("Error creando el meme:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCreatingMeme(false);
    }
  };

  
    const handleSaveToGallery = async () => {
        if (!activeImage) {
            showNotification("No hay nada que guardar.", "warning");
            return;
        }

        // Si la imagen activa no tiene un 'blob', significa que es la original
        // y necesitamos obtenerlo primero. (Esto es para un caso avanzado, por ahora asumimos que el blob existe)
        if (!activeImage.blob) {
            showNotification("Por favor, aplica una transformación (como crear un meme) antes de guardar.", "info");
            // Opcional: podrías implementar una descarga del `public_url` para obtener el blob
            return; 
        }

        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const formData = new FormData();
            
            // Usamos el blob guardado en el estado 'activeImage'
            formData.append('image', activeImage.blob, `creative-studio-image.png`);
            formData.append('type', activeImage.type || 'editada'); // Usa el tipo actualizado o uno genérico
            
            // Si la imagen original tenía un prompt, lo mantenemos
            if (activeImage.prompt) {
                formData.append('prompt', activeImage.prompt);
            }
            if (activeImage.project_id) {
                 formData.append('project_id', activeImage.project_id);
            }


            const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "No se pudo guardar la imagen.");
            }

            showNotification("¡Guardado en tu galería con éxito!", "success");
            navigate('/galeria'); // Navegamos de vuelta a la galería

        } catch (error) {
            console.error("Error guardando en galería:", error);
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsSaving(false);
        }
    };
   
     const handleAdvancedEdit = async () => {
    if (!activeImage) {
      showNotification("No hay una imagen activa para editar.", "error");
      return;
    }

    // Validación: No permitir ambas opciones a la vez
    if (backgroundPrompt && customBackgroundFile) {
        showNotification("Usa un prompt o un fondo, pero no ambos.", "warning");
        return;
    }

    setIsEditingAdvanced(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // --- Obtener los bytes de la imagen principal ---
        // Esto es crucial. Descargamos la imagen desde la URL firmada.
        const response = await fetch(sourceImageUrl);
        if (!response.ok) throw new Error("No se pudo descargar la imagen original.");
        const imageBlob = await response.blob();

        // Creamos el FormData para enviar al backend
        const formData = new FormData();
        formData.append('imagen_principal', imageBlob, 'imagen_principal.png');

        // Adjuntamos el prompt o el fondo personalizado si existen
        if (backgroundPrompt) {
            formData.append('prompt_fondo', backgroundPrompt);
        }
        if (customBackgroundFile) {
            formData.append('fondo_personalizado', customBackgroundFile, customBackgroundFile.name);
        }

        const url = `${import.meta.env.VITE_API_URL}/api/advanced-edit`;
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(errorData.error || "No se pudo procesar la imagen.");
        }

        // La respuesta es el blob de la nueva imagen editada
        const resultBlob = await fetchResponse.blob();
        const resultUrl = URL.createObjectURL(resultBlob);

        // Actualizamos el lienzo con la nueva imagen
        setActiveImage(prev => ({ 
            ...prev,
            public_url: resultUrl, // La nueva imagen visible
            blob: resultBlob,      // El nuevo blob para poder guardarlo
            type: 'generada' 
        }));

        showNotification("¡Edición aplicada con éxito!", "success");

    } catch (error) {
        console.error("Error en la edición avanzada:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsEditingAdvanced(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!generationPrompt.trim()) {
      showNotification("Por favor, escribe un prompt para generar la imagen.", "warning");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");
      
      const url = `${import.meta.env.VITE_API_URL}/api/generate-image`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' // El backend espera JSON
        },
        body: JSON.stringify({ prompt: generationPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo generar la imagen.");
      }

      // La respuesta son los bytes de la imagen
      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      // --- ¡ESTE ES EL PASO CLAVE! ---
      // La imagen generada se convierte en la nueva imagen activa del estudio.
      setActiveImage({
        public_url: resultUrl,    // La URL visible en el lienzo
        blob: resultBlob,         // El blob para poder guardarla o editarla
        prompt: generationPrompt, // Guardamos el prompt que la creó
        type: 'generada'          // Actualizamos su tipo
      });
      
      // También reseteamos la 'sourceImageUrl' porque esta es una nueva imagen base
      setSourceImageUrl(resultUrl); 

      showNotification("¡Imagen generada con éxito!", "success");

    } catch (error) {
      console.error("Error generando la imagen:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

   const dynamicMemeTextStyle = getMemeTextStyle(fontName, fontColor, borderColor, fontSize);

  return (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      pt: `calc(72px + 1px)`,
      px: 2,
      pb: 1,
      gap: 2,
      background: '#e3f2fd',
    }}
  >
    
    {/* --- Columna Izquierda: Lienzo y Controles de Texto --- */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Cabecera (sin cambios) */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0, }}>
         <Typography variant="h5" fontWeight="bold">Estudio Creativo</Typography>
         <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/galeria')}>
          Volver a la Galería
        </Button>
         <Button 
            variant="contained" 
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveToGallery}
            disabled={isSaving || !activeImage?.blob}
        >
            Guardar en Galería
        </Button>
      </Paper>

      {/* Contenedor principal: Imagen a la izquierda y TextBoxes a la derecha */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 , maxHeight: '78vh',}}>
        
        {/* NUEVO: Contenedor para la imagen y la previsualización del texto */}
        <Paper sx={{ 
            flex: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 1, 
            overflow: 'hidden',
            position: 'relative' // ¡Importante para la previsualización!
        }}>
          {activeImage ? (
            <>
              <Box
                component="img"
                src={activeImage.public_url}
                alt="Imagen activa"
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              {/* Previsualización Texto Superior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, top: '5%' }}>
                {topText}
              </Typography>
              {/* Previsualización Texto Inferior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, bottom: '5%' }}>
                {bottomText}
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary">
              Selecciona una imagen de tu galería para empezar.
            </Typography>
          )}
        </Paper>

        {/* Textos para Meme y Botón de Aplicar */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2, background: '#fff', borderRadius: 1 }}>
            
            <Typography variant="h6" gutterBottom>Laboratorio de Memes</Typography>

            {/* Campo Texto Superior */}
            <TextField
                label="Texto Superior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignTopIcon />
                    </InputAdornment>
                    ),
                }}
            />

            {/* Campo Texto Inferior */}
            <TextField
                label="Texto Inferior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignBottomIcon />
                    </InputAdornment>
                    ),
                }}
            />
            
            {/* MOVIDO y MEJORADO: Botón para aplicar textos */}
            <Button
                variant="contained"
                fullWidth
                onClick={handleCreateMeme}
                disabled={!activeImage || isCreatingMeme}
                sx={{ mt: 2 }} // Margen superior para separarlo
            >
                {isCreatingMeme ? <CircularProgress size={24} /> : "Aplicar Textos a la Imagen"}
            </Button>
        </Box>
      </Box>
    </Box>

    {/* --- Columna Derecha: Caja de Herramientas --- */}
    <Paper sx={{ width: '350px', flexShrink: 0, p: 3, overflowY: 'auto', background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',gap:1}}>
      <Typography  sx={{ color: 'white' }} variant="h6" gutterBottom>Herramientas</Typography>

       <Accordion defaultExpanded  sx={{ mb: 1 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>Generador de Imágenes</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        <TextField
          label="Describe la imagen a generar..."
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={generationPrompt}
          onChange={(e) => setGenerationPrompt(e.target.value)}
          placeholder="Ej: Un astronauta montando a caballo en Marte, fotorrealista."
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerateImage}
          disabled={isGeneratingImage || !generationPrompt.trim()}
        >
          {isGeneratingImage ? <CircularProgress size={24} /> : "Generar Imagen"}
        </Button>

      </Box>
    </AccordionDetails>
  </Accordion>

      {/* MODIFICADO: Ahora este acordeón es para opciones y extras */}
      <Accordion  sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextFieldsIcon />
                <Typography>Opciones de Texto</Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}> {/* Aumentamos el gap */}
                
                {/* NUEVO: Selector de Fuente */}
                <FormControl fullWidth>
                  <InputLabel id="font-select-label">Fuente</InputLabel>
                  <Select
                    labelId="font-select-label"
                    value={fontName}
                    label="Fuente"
                    onChange={(e) => setFontName(e.target.value)}
                  >
                    <MenuItem value="impact">Impact</MenuItem>
                    <MenuItem value="arial">Arial</MenuItem>
                    <MenuItem value="comic_sans">Comic Sans</MenuItem>
                  </Select>
                </FormControl>

                 {/* NUEVO: Slider para el tamaño de la fuente */}
                <Box>
                  <Typography gutterBottom variant="body2">
                    Tamaño de Fuente: {fontSize}px
                  </Typography>
                  <Slider
                    value={fontSize}
                    onChange={(e, newValue) => setFontSize(newValue)}
                    aria-labelledby="font-size-slider"
                    valueLabelDisplay="auto"
                    step={2}
                    min={10}
                    max={120} // Puedes ajustar este rango
                  />
                </Box>

                {/* NUEVO: Selectores de Color */}
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Tooltip title="Color del Texto" >
                    <TextField
                      label="Texto"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                       sx={{
    "& .MuiOutlinedInput-root": {
      borderColor: fontColor,
      "&:hover fieldset": { borderColor: fontColor },
      "&.Mui-focused fieldset": { borderColor: fontColor },
    },
    width: 80, // opcional, para que no sea tan ancho
    padding: 0
  }}
                    />
                  </Tooltip>
                  <Tooltip title="Color del Borde">
                    <TextField
                      
                      label="Borde"
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                           "& .MuiOutlinedInput-root": {
                             borderColor: "secondary",
                             "&:hover fieldset": { borderColor: fontColor },
                             "&.Mui-focused fieldset": { borderColor: fontColor },
                               },
                              width: 80, // opcional, para que no sea tan ancho
    padding: 0
  }}
                    />
                  </Tooltip>
                </Box>
                
                {/* El botón de usar prompt se mantiene */}
                {activeImage?.prompt && (
                     <Button 
                         sx={{
                         border: "2px solid #ffffff",
                         color: "#ffffff",
                         backgroundColor: " #005f73",   // 👈 acá el color base
                         "& .MuiSvgIcon-root": { color: "#ffffff" },
                         "&:hover": {
                          backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                          borderColor: "#ffffff",
                          },
                        }}
                        variant="outlined" 
                        size="small" 
                        onClick={() => setBottomText(activeImage.prompt)}
                        startIcon={<AutoFixHighIcon />}
                    >
                        Usar prompt como texto inferior
                    </Button>
                )}

            </Box>
        </AccordionDetails>
    </Accordion>


     <Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AutoFixHighIcon />
        <Typography>Edición Avanzada de Fondo</Typography>
    </Box>
  </AccordionSummary>
  <AccordionDetails>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      <Typography variant="body2" color="text.secondary">
        Elimina el fondo y reemplázalo con una opción.
      </Typography>

      {/* Opción 1: Generar fondo con IA */}
      <TextField
        label="Generar fondo con IA (prompt)"
        variant="outlined"
        fullWidth
        value={backgroundPrompt}
        // --- ¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ ASÍ! ---
        onChange={(e) => setBackgroundPrompt(e.target.value)}
        disabled={!!customBackgroundFile}
      />

      <Typography align="center" variant="overline">O</Typography>
      
      {/* Opción 2: Subir fondo personalizado */}
      <Button
        variant="outlined"
        component="label"
        fullWidth
        disabled={!!backgroundPrompt}
      >
        {customBackgroundFile ? customBackgroundFile.name : "Subir Fondo Personalizado"}
        <input 
          type="file" 
          hidden
          onChange={(e) => setCustomBackgroundFile(e.target.files[0])}
          accept="image/*"
        />
      </Button>

      {/* Botón para aplicar la acción */}
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleAdvancedEdit}
        disabled={isEditingAdvanced || !activeImage}
      >
        {isEditingAdvanced ? <CircularProgress size={24} /> : "Aplicar Edición"}
      </Button>
      
    </Box>
  </AccordionDetails>
</Accordion>
    </Paper>
  </Box>
);
}

--------------------------------------------------------

// RUTA: src/pages/MyModelsPage.jsx (VERSIÓN CORREGIDA Y COMPLETA)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  Chip, CircularProgress, Alert, IconButton, Tooltip,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';
import CategoryIcon from '@mui/icons-material/Category';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import DeleteIcon from '@mui/icons-material/Delete';
import GrainIcon from '@mui/icons-material/Grain';


const DataDisplayWrapper = ({ loading, error, children }) => {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  return children;
};

// ========================================================================
// === ¡LA PRIMERA CORRECCIÓN ESTÁ AQUÍ! ===
// La función ahora recibe el objeto 'model' completo.
// ========================================================================
const getProblemTypeChip = (model) => {
    // Extraemos la propiedad que necesitamos del objeto.
    const problemType = model.problemType;

    // Ahora, si esta función necesitara 'projectId' o 'datasetId', 
    // podría acceder a ellos a través de `model.projectId`, etc., y no daría error.

    switch (problemType) {
        case 'clasificacion': return <Chip icon={<CategoryIcon />} label="Clasificación" color="secondary" size="small" variant="outlined" />;
        case 'regresion': return <Chip icon={<FunctionsIcon />} label="Regresión" color="primary" size="small" variant="outlined" />;
        case 'vision_classification': return <Chip icon={<CameraAltIcon />} label="Visión" color="success" size="small" variant="outlined" />;
        case 'clustering_tabular': // <<< NUESTRO NUEVO TIPO
            return <Chip icon={<GrainIcon />} label="Clustering (Tabular)" color="success" size="small" variant="outlined" />;
        case 'clustering': return <Chip icon={<GroupsIcon />} label="Clustering" color="info" size="small" variant="outlined" />;
        default: return <Chip label={problemType || 'Desconocido'} size="small" />;
    }
};

export default function MyModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  useEffect(() => {
    const fetchModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudieron cargar los modelos.');
            }
            const existingModels = result.data || [];

            // Lógica para el modelo fantasma (esta parte ya estaba bien)
            const phantomModelString = sessionStorage.getItem('phantomModel');
            let allModels = existingModels;
            if (phantomModelString) {
                const phantomModel = JSON.parse(phantomModelString);
                const isAlreadySaved = existingModels.some(m => m.id === phantomModel.id);
                if (!isAlreadySaved) {
                    allModels = [phantomModel, ...existingModels];
                } else {
                    sessionStorage.removeItem('phantomModel');
                }
            }
            setModels(allModels);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
    fetchModels();
  }, []); // El array de dependencias vacío está bien aquí

  const handleModelActionClick = (model) => {
    const { problemType, projectId, sourceDatasetId, id } = model;

    switch (problemType) {
        case 'vision_classification':
            if (projectId && sourceDatasetId) {
                // Navegamos al Hub pasándole el ID del modelo (sea real o fantasma)
                navigate(`/project/${projectId}/vision-lab/${sourceDatasetId}?modelId=${id}`);
            } else {
                alert("Error: Faltan datos (proyecto o dataset ID) para navegar.");
            }
            break;

        case 'clustering_tabular':
            // Navega a nuestra nueva página de predicción de segmentos
            navigate(`/models/clustering/${id}/predict`);
            break;
        
        case 'clustering':
            if (projectId && sourceDatasetId) {
                navigate(`/project/${projectId}/vision-lab/${sourceDatasetId}?clusterResultId=${id}`);
            } else {
                alert("Error: Faltan datos (proyecto o dataset ID) para navegar.");
            }
            break; 
            
        case 'clasificacion':
        case 'regresion':
            navigate(`/models/${id}/analyze`);
            break;
        
        default:
            alert(`Acción no disponible para el tipo de modelo: "${problemType}"`);
    }
};

  const handleOpenDeleteDialog = (model) => { setModelToDelete(model); setOpenDeleteDialog(true); };
  const handleCloseDeleteDialog = () => { setOpenDeleteDialog(false); setModelToDelete(null); };
  
  const handleConfirmDelete = async () => {
      if (!modelToDelete) return;
      
      // Si el modelo es fantasma, solo lo borramos del frontend
      if (modelToDelete.isPhantom) {
          sessionStorage.removeItem('phantomModel');
          setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
          handleCloseDeleteDialog();
          return;
      }

      // Si es un modelo real, llamamos a la API
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No estás autenticado.");
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo eliminar el modelo.');
          setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
      } catch (err) {
          setError(err.message);
      } finally {
          handleCloseDeleteDialog();
      }
  };
  

  return (
    <Box sx={{ p: 3, pt: 'calc(72px + 24px)' /* ... otros estilos */ }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Mis Modelos Predictivos
        </Typography>
        <Typography>
         Esta sección muestra todos los modelos guardados. Selecciona el botón ‘Analizar’ para examinar las predicciones generadas por cada modelo.
        </Typography>
      </Box>

      <DataDisplayWrapper loading={loading} error={error}>
        {models.length > 0 ? (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre del Modelo</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo de Problema</TableCell>
                    <TableCell>Métrica Principal</TableCell>
                    <TableCell>Fecha de Creación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {models.map((model) => {
                      const isVisionOrCluster = ['vision_classification', 'clustering'].includes(model.problemType);
                      const buttonText = isVisionOrCluster ? "VisionLab" : "Analizar";
                      const buttonIcon = isVisionOrCluster ? <CameraAltIcon /> : <AssessmentIcon />;
                      const buttonColor = isVisionOrCluster ? "success" : "primary";
                      const buttonTooltip = isVisionOrCluster ? "Abrir Laboratorio" : "Analizar Modelo";
                      const isTabularCluster = model.problemType === 'clustering_tabular';
                   
                      return (
                          <TableRow key={model.id} hover>
                              <TableCell>{model.modelName || 'N/A'}</TableCell>
                              <TableCell>{model.projectName || 'N/A'}</TableCell>
                              {/* ======================================================================== */}
                              {/* === ¡LA SEGUNDA CORRECCIÓN ESTÁ AQUÍ! === */}
                              {/* Le pasamos el objeto 'model' completo a la función. */}
                              {/* ======================================================================== */}
                              <TableCell>{getProblemTypeChip(model)}</TableCell>
                              <TableCell>{model.mainMetric || 'N/A'}</TableCell>
                              <TableCell>{model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'N/A'}</TableCell>
                              <TableCell align="center">
                                  <Tooltip title={buttonTooltip}>
                                      <Button
                                          variant="contained"
                                          startIcon={buttonIcon}
                                          color={buttonColor}
                                          onClick={() => handleModelActionClick(model)}
                                          size="small"
                                          sx={{ mr: 1 }}
                                      >
                                          {buttonText}
                                      </Button>
                                  </Tooltip>
                                  <Tooltip title="Eliminar Modelo">
                                      <IconButton
                                          color="error"
                                          onClick={() => handleOpenDeleteDialog(model)}
                                      >
                                          <DeleteIcon />
                                      </IconButton>
                                  </Tooltip>
                              </TableCell>
                          </TableRow>
                      );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Alert severity="info">No existe ningún modelo guardado</Alert>
        )}
      </DataDisplayWrapper>
      
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
            <DialogContentText>
                ¿Estás seguro de que quieres eliminar el modelo <strong>"{modelToDelete?.modelName}"</strong>? Esta acción no se puede deshacer.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// En src/pages/VisionLabHubPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'; 
import { Box, Typography, Paper, Grid, Button, Icon, Skeleton } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
// Importa los iconos que vamos a usar
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GroupsIcon from '@mui/icons-material/Groups'; // Icono para Clustering
import RuleIcon from '@mui/icons-material/Rule'; // Icono para Evaluación
import ScienceIcon from '@mui/icons-material/Science'; // Icono para Prueba
import { supabase } from '../supabaseClient';

import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import { IconButton } from '@mui/material';


const ActionCard = ({ icon, title, description, buttonText, onClick, disabled = false }) => (
  <Grid item xs={12} sm={6} md={4} sx={{ display: "flex" }}>
    <Paper 
      elevation={3}
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'space-between',
        flexGrow: 1,          // ocupa todo el alto del Grid
        height: "100%",       // asegura que todas igualen
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: 6
        }
      }}
    >
      <Box sx={{ flexGrow: 1, mb: 3 }}>
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ whiteSpace: "pre-line" }}
        >
          {description}
        </Typography>
      </Box>
      <Button 
        variant="contained" 
        onClick={onClick}
        disabled={disabled}
        sx={{ mt: 'auto' }}
      >
        {buttonText}
      </Button>
    </Paper>
  </Grid>
);

// --- Componente Principal de la Página ---
export default function VisionLabHubPage() {
    const { projectId, datasetId } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [dataset, setDataset] = useState(null);
    const [loading, setLoading] = useState(true);
    const clusterResultId = searchParams.get('clusterResultId');
    const [modelDetails, setModelDetails] = useState(null);
    const modelId = searchParams.get('modelId');
 
    useEffect(() => {
        const fetchPageData = async () => {
            setLoading(true);
            try {
                // --- 1. Cargar detalles del DATASET ---
                // Simulación, puedes reemplazarla por tu llamada real a la API
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/details`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });
                const result = await response.json();
                if (result.success) {
                    setDataset(result.data);
                } else {
                     throw new Error(result.error || "No se pudieron cargar los detalles del dataset.");
                }

                // --- 2. Cargar detalles del MODELO (si hay un modelId) ---
                if (modelId) {
                    if (modelId.startsWith("temp_")) {
                        const phantomString = sessionStorage.getItem("phantomModel");
                        if (phantomString) {
                            setModelDetails(JSON.parse(phantomString));
                        } else {
                            console.warn(`Modelo temporal ${modelId} no encontrado.`);
                            setModelDetails(null);
                        }
                    } else {
                        const modelResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelId}`, {
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                        });
                        const modelResult = await modelResponse.json();
                        if (modelResult.success) {
                            setModelDetails(modelResult.data);
                        } else {
                            throw new Error(modelResult.error || "No se pudieron cargar los detalles del modelo.");
                        }
                    }
                } else {
                    setModelDetails(null);
                }
            } catch (error) {
                console.error("Error al cargar datos para VisionLabHub:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPageData();
    }, [datasetId, modelId]);

    // ========================================================================
    // === ¡AQUÍ ESTÁ LA SOLUCIÓN! DEFINIMOS actionCardsData ===
    // ========================================================================
    const actionCardsData = React.useMemo(() => {
    const cards = [
        {
            icon: <ImageSearchIcon />,
            title: "Explorar y Etiquetar Dataset",
            description: "Visualiza todas las imágenes de tu dataset...",
            buttonText: "Ir al Explorador",
            // --- CORRECCIÓN 1 ---
            // Asumimos que esta acción debe llevar al 'VisionExplorerPage'
            onClick: () => navigate(`/project/${projectId}/vision-lab/${datasetId}/explorer`),
            disabled: loading,
        },
        {
            icon: <AutoAwesomeIcon />,
            title: "Entrenar Nuevo Modelo",
            description: "Usa este dataset etiquetado para entrenar un nuevo modelo...",
            buttonText: "Iniciar Entrenamiento",
            // --- CORRECCIÓN 2 ---
            // Esta ruta NO EXISTE. Hay que decidir a dónde debe ir.
            // Por ahora, la deshabilitamos para evitar errores. Si tienes la página,
            // crea la ruta en App.jsx y ponla aquí.
            onClick: () => console.log("Ruta para entrenamiento no definida"),
            disabled: true, // Deshabilitada hasta que la ruta exista
        },
        {
            icon: <GroupsIcon />,
            title: "Clustering de Imágenes",
            description: "Agrupa imágenes no etiquetadas...",
            buttonText: "Iniciar Clustering",
            // --- CORRECCIÓN 3 ---
            // Añadimos el '/vision-lab' que faltaba para que coincida con App.jsx
            onClick: () => navigate(`/project/${projectId}/vision-lab/${datasetId}/clustering`),
            disabled: loading,
        },
    ];

    if (modelDetails) {
        cards.push({
            icon: <ScienceIcon />,
            title: `Evaluar Modelo: "${modelDetails.modelName}"`,
            description: "Evalúa el rendimiento de tu modelo con métricas detalladas y visualizaciones.",
            buttonText: "Evaluar Modelo",
            // --- CORRECCIÓN 4 ---
            // Usamos la ruta existente '/models/vision/:modelId/evaluate'
            onClick: () => navigate(`/models/vision/${modelDetails.id}/evaluate`),
            disabled: loading,
        });
        cards.push({
            icon: <RuleIcon />,
            title: `Probar Modelo: "${modelDetails.modelName}"`,
            description: "Carga nuevas imágenes y obtén predicciones en tiempo real.",
            buttonText: "Probar con Imágenes (Batch)",
            // --- CORRECCIÓN 5 ---
            // Usamos la ruta existente '/models/vision/:modelId/predict'
            onClick: () => navigate(`/models/vision/${modelDetails.id}/predict`),
            disabled: loading,
        });
    }

    if (clusterResultId) {
        cards.push({
            icon: <RuleIcon />,
            title: "Ver Resultados de Clustering",
            description: `Examina los grupos generados por el análisis...`,
            buttonText: "Ver Segmentos",
            // --- CORRECCIÓN 6 ---
            // Esta ruta NO EXISTE. Hay que decidir a dónde debe ir.
            // Posiblemente debería ir a la misma página de clustering pero con el ID.
            onClick: () => navigate(`/project/${projectId}/vision-lab/${datasetId}/clustering?clusterResultId=${clusterResultId}`),
            disabled: loading,
        });
    }

    return cards;
}, [loading, projectId, datasetId, modelDetails, clusterResultId, navigate]);


    // Tu JSX se queda prácticamente igual, solo una pequeña corrección en la cabecera
    return (
        <Box sx={{ p: 1, flexGrow: 1, mt: "72px" }}>
            <Box sx={{ /* ...tus estilos de cabecera... */ }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">Laboratorio de Visión</Typography>
                    {loading ? (
                        <Skeleton width="250px" sx={{ bgcolor: 'grey.700' }} />
                    ) : (
                        // Corrección: Usa el nombre del dataset cargado
                        <Typography variant="body1">Dataset: <strong>{dataset?.datasetName || datasetId}</strong></Typography>
                    )}
                </Box>
                 <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/models')}>
                  Volver a Modelos
                 </Button>
            </Box>
     
            <Grid container spacing={4} justifyContent="center">
                {actionCardsData.map((card, index) => (
                    <ActionCard
                        key={index}
                        icon={card.icon}
                        title={card.title}
                        description={card.description}
                        buttonText={card.buttonText}
                        onClick={card.onClick}
                        disabled={card.disabled}
                    />
                ))}
            </Grid>
        </Box>
    );
}
------------------------------------

// RUTA: src/pages/EvaluateVisionModelPage.jsx

import React, { useState } from 'react';
import { useParams, Link as RouterLink, useNavigate , } from 'react-router-dom';
import { Box, Typography, Breadcrumbs, Link, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';



export default function EvaluateVisionModelPage() {
    const { modelId } = useParams();
    const navigate = useNavigate();

    

    return (
        <Box sx={{ p: 3, flexGrow: 1, mt: "72px" }}>
            <Box sx={{ mb: 3 }}>
                <Breadcrumbs aria-label="breadcrumb">
                    <Link component={RouterLink} underline="hover" color="inherit" to="/models">
                        Mis Modelos
                    </Link>
                    <Link component="button" underline="hover" color="inherit" onClick={() => navigate(-1)}>
                        Laboratorio de Visión
                    </Link>
                    <Typography color="text.primary">
                        Evaluación de Modelo
                    </Typography>
                </Breadcrumbs>
            </Box>

            {/* Le pasamos el modelId al componente hijo */}
            <EvaluateVisionModel modelId={modelId} />
        </Box>
    );
}


-------------------------------------------

// RUTA: src/components/analysis/EvaluateVisionModel.jsx

import React, { useState } from 'react';
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
import ClassificationHelpPopover from './components/analysis/ClassificationHelpPopover';

export default function EvaluateVisionModel({ modelId, projectId }) {
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
                            <Grid item xs={12} md={6}>
                                <ConfusionMatrix 
                                    data={evaluationResult.confusion_matrix} 
                                    labels={evaluationResult.confusion_matrix_labels} 
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
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


--------------------------------------------------------------------

// src/pages/EstudioCreativoPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Slider, Select, MenuItem, InputLabel, FormControl, Tooltip, Box, Paper, 
    Typography, TextField, Button, CircularProgress, Accordion, AccordionSummary, 
    AccordionDetails, Dialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import InputAdornment from "@mui/material/InputAdornment";
import { useNotification } from '../context/NotificationContext'; 
import { supabase } from '../supabaseClient'; // Asegúrate de tener esta importación
import SaveIcon from '@mui/icons-material/Save'; // Importa el icono de guardar



 const getMemeTextStyle = (fontFamily, fontColor, borderColor, fontSize) => ({
  position: 'absolute',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '90%',
  textAlign: 'center',
  color: fontColor,
  fontWeight: 'bold',
  fontFamily: `${fontFamily}, sans-serif`,
  textTransform: 'uppercase',
  textShadow: `2px 2px 0 ${borderColor}, -2px -2px 0 ${borderColor}, 2px -2px 0 ${borderColor}, -2px 2px 0 ${borderColor}, 2px 0 0 ${borderColor}, -2px 0 0 ${borderColor}, 0 2px 0 ${borderColor}, 0 -2px 0 ${borderColor}`,
  letterSpacing: '1px',
  // Usamos el tamaño del estado y le añadimos 'px' para que sea una unidad CSS válida
  fontSize: `${fontSize}px`, 
  overflowWrap: 'break-word',
});


export default function EstudioCreativoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useNotification(); //`impact`)
  // Estado para la imagen con la que estamos trabajando
  const [activeImage, setActiveImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [isCreatingMeme, setIsCreatingMeme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fontColor, setFontColor] = useState('#FFFFFF'); // Blanco por defecto
  const [borderColor, setBorderColor] = useState('#000000'); // Negro por defecto
  const [fontName, setFontName] = useState('impact'); // Impact por defecto
  const [sourceImageUrl, setSourceImageUrl] = useState(null);
  const [fontSize, setFontSize] = useState(40);
  const [isEditingAdvanced, setIsEditingAdvanced] = useState(false); // Para mostrar un spinner en el botón
  const [backgroundPrompt, setBackgroundPrompt] = useState(''); // El prompt para el fondo de IA
  const [customBackgroundFile, setCustomBackgroundFile] = useState(null); // El archivo de fondo personalizado
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [userImages, setUserImages] = useState([]); // <-- AÑADE ESTE ESTADO
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false); // <-- Y ESTE
  const [saveState, setSaveState] = useState('idle'); // 'idle', 'saving', 'saved'


  // 2. Un estado para guardar la URL de la imagen que vamos a editar
  const [imagenParaEditar, setImagenParaEditar] = useState(null);



  useEffect(() => {
    // 1. Buscamos si viene una imagen desde PromptLab. Tiene prioridad.
    const imageFromPromptLab = location.state?.imageFromPromptLab;

    // 2. Buscamos si viene una imagen desde la Galería.
    const imageFromGallery = location.state?.image;

    if (imageFromPromptLab) {
        // --- CASO A: Venimos de PromptLab ---
        console.log("Recibida imagen desde PromptLab:", imageFromPromptLab);
        
        // Creamos un objeto 'activeImage' simple, ya que no tenemos todos los metadatos.
        // La URL que recibimos es un 'blob:' que funciona directamente en el <img>.
        setActiveImage({
            public_url: imageFromPromptLab,
            blob: null, // No tenemos el blob directamente, pero la URL funciona para mostrar
            type: 'generada'
        });
        
        // Guardamos la URL para que las funciones de edición puedan usarla.
        setSourceImageUrl(imageFromPromptLab);

        // Limpiamos el estado para no recargarla si el usuario refresca.
        window.history.replaceState({}, document.title);

    } else if (imageFromGallery) {
        // --- CASO B: Venimos de la Galería (tu lógica original) ---
        console.log("Recibida imagen desde la Galería:", imageFromGallery);
        
        setActiveImage(imageFromGallery);
        setSourceImageUrl(imageFromGallery.public_url); 
    }

    setLoading(false);

}, [location.state]); // La dependencia se queda igual.

    useEffect(() => {
    const loadUserImages = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const url = `${import.meta.env.VITE_API_URL}/api/visuals?per_page=100`; 

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            const result = await response.json();

            if (result.success && Array.isArray(result.visuals)) {
                const formattedImages = result.visuals.map(visual => ({
                    id: visual.id,
                    url: visual.public_url 
                }));
                setUserImages(formattedImages); // <-- Guarda las imágenes en el nuevo estado
            } else {
                console.error("La respuesta de la API de galería no tiene el formato esperado.");
            }
        } catch (error) {
            console.error("Error al cargar la galería de imágenes:", error);
            showNotification("No se pudo cargar tu galería de imágenes.", "error");
        }
    };

    loadUserImages();
}, []); // El array vacío asegura que esto solo se ejecute una vez.


   const handleGalleryBackgroundSelect = async (imageUrl) => {
    // Cerramos el modal inmediatamente
    setIsGalleryModalOpen(false);

    if (!activeImage || !sourceImageUrl) {
      showNotification("Primero debe haber una imagen activa en el lienzo.", "error");
      return;
    }

    setIsEditingAdvanced(true); // Reutilizamos el estado de carga
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // 1. Descargamos la imagen principal del lienzo
        const mainImageResponse = await fetch(sourceImageUrl);
        if (!mainImageResponse.ok) throw new Error("No se pudo descargar la imagen original.");
        const mainImageBlob = await mainImageResponse.blob();

        // 2. Descargamos la imagen de fondo seleccionada de la galería
        const bgImageResponse = await fetch(imageUrl);
        if (!bgImageResponse.ok) throw new Error("No se pudo descargar la imagen de la galería.");
        const bgImageBlob = await bgImageResponse.blob();

        // 3. Creamos el FormData para enviar al backend
        const formData = new FormData();
        formData.append('imagen_principal', mainImageBlob, 'imagen_principal.png');
        formData.append('fondo_personalizado', bgImageBlob, 'fondo_galeria.png');

        // 4. Llamamos al MISMO endpoint que ya usas para la edición avanzada
        const url = `${import.meta.env.VITE_API_URL}/api/advanced-edit`;
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(errorData.error || "No se pudo procesar la imagen.");
        }

        const resultBlob = await fetchResponse.blob();
        const resultUrl = URL.createObjectURL(resultBlob);

        // 5. Actualizamos el lienzo con la nueva imagen
        setActiveImage(prev => ({ 
            ...prev,
            public_url: resultUrl,
            blob: resultBlob,
            type: 'editada' 
        }));

        showNotification("¡Fondo reemplazado con éxito!", "success");

    } catch (error) {
        console.error("Error al reemplazar el fondo desde la galería:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsEditingAdvanced(false);
    }
};

  const handleCreateMeme = async () => {
    // Usamos la URL firmada guardada. Si no existe, no hacemos nada.
    if (!sourceImageUrl) {
      showNotification("Error: No se encontró la URL de la imagen de origen.", "error");
      return;
    }

    setIsCreatingMeme(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");

      const formData = new FormData();
      
      // USAMOS LA URL FIRMADA QUE GUARDAMOS. Esta SÍ es accesible para el backend.
      formData.append('image_url', sourceImageUrl); 
      
      // ... resto del formData (topText, bottomText, colores, etc.)
      formData.append('topText', topText);
      formData.append('bottomText', bottomText);
      formData.append('fontColor', fontColor);
      formData.append('borderColor', borderColor);
      formData.append('fontName', fontName);
      formData.append('fontSize', fontSize);

      const url = `${import.meta.env.VITE_API_URL}/api/create-meme`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo crear el meme.");
      }
      
      const memeBlob = await response.blob();
      const memeUrl = URL.createObjectURL(memeBlob);
      
      // Actualizamos la imagen visible con la nueva URL local "blob"
      // PERO MANTENEMOS la `sourceImageUrl` intacta para futuras ediciones.
      setActiveImage(prev => ({ 
        ...prev,
        public_url: memeUrl, // URL para mostrar en el <img>
        blob: memeBlob,      // El nuevo archivo binario para guardar
        type: 'meme'
      }));

      showNotification("¡Meme creado! Ahora puedes guardarlo en tu galería.", "success");

    } catch (error) {
      console.error("Error creando el meme:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsCreatingMeme(false);
    }
  };

  
   const handleSaveToGallery = async () => {
    if (!activeImage?.blob) {
        showNotification("No hay una imagen modificada para guardar.", "warning");
        return;
    }

    setSaveState('saving');
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const formData = new FormData();
        
        const imageType = activeImage.type && typeof activeImage.type === 'string' 
            ? activeImage.type 
            : 'editada';

        // Adjuntamos todos los campos de texto primero
        formData.append('type', imageType); 
        
        if (activeImage.prompt) {
            formData.append('prompt', activeImage.prompt);
        }
        if (activeImage.project_id) {
             formData.append('project_id', activeImage.project_id);
        }

        // Adjuntamos el archivo (Blob) al final
        formData.append('image', activeImage.blob, `creative-studio-image.png`);
        
        const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.error || "No se pudo guardar la imagen.");
        }

        showNotification("¡Guardado en tu galería con éxito!", "success");
        setSaveState('saved');

        // Hacemos que el botón vuelva a la normalidad después de 2 segundos
        setTimeout(() => {
            setSaveState('idle');
        }, 2000);

    } catch (error) {
   
        showNotification(`Error: ${error.message}`, "error");
        setSaveState('idle'); // ¡ESTA LÍNEA ES CLAVE! Resetea el botón si hay un error.
    } 
};




     const handleAdvancedEdit = async () => {
    if (!activeImage) {
      showNotification("No hay una imagen activa para editar.", "error");
      return;
    }

    // Validación: No permitir ambas opciones a la vez
    if (backgroundPrompt && customBackgroundFile) {
        showNotification("Usa un prompt o un fondo, pero no ambos.", "warning");
        return;
    }

    setIsEditingAdvanced(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // --- Obtener los bytes de la imagen principal ---
        // Esto es crucial. Descargamos la imagen desde la URL firmada.
        const response = await fetch(sourceImageUrl);
        if (!response.ok) throw new Error("No se pudo descargar la imagen original.");
        const imageBlob = await response.blob();

        // Creamos el FormData para enviar al backend
        const formData = new FormData();
        formData.append('imagen_principal', imageBlob, 'imagen_principal.png');

        // Adjuntamos el prompt o el fondo personalizado si existen
        if (backgroundPrompt) {
            formData.append('prompt_fondo', backgroundPrompt);
        }
        if (customBackgroundFile) {
            formData.append('fondo_personalizado', customBackgroundFile, customBackgroundFile.name);
        }

        const url = `${import.meta.env.VITE_API_URL}/api/advanced-edit`;
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(errorData.error || "No se pudo procesar la imagen.");
        }

        // La respuesta es el blob de la nueva imagen editada
        const resultBlob = await fetchResponse.blob();
        const resultUrl = URL.createObjectURL(resultBlob);

        // Actualizamos el lienzo con la nueva imagen
        setActiveImage(prev => ({ 
            ...prev,
            public_url: resultUrl, // La nueva imagen visible
            blob: resultBlob,      // El nuevo blob para poder guardarlo
            type: 'generada' 
        }));

        showNotification("¡Edición aplicada con éxito!", "success");

    } catch (error) {
        console.error("Error en la edición avanzada:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsEditingAdvanced(false);
    }
  };

  const handleRemoveBackground = async () => {
    if (!activeImage || !sourceImageUrl) {
      showNotification("No hay una imagen activa para editar.", "error");
      return;
    }

    setIsEditingAdvanced(true); // Reutilizamos el mismo estado de carga
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // Obtenemos el blob de la imagen original
        const response = await fetch(sourceImageUrl);
        if (!response.ok) throw new Error("No se pudo descargar la imagen original.");
        const imageBlob = await response.blob();

        const formData = new FormData();
        // --- LA CLAVE ESTÁ AQUÍ ---
        // Solo añadimos la imagen principal. No añadimos ni 'prompt_fondo'
        // ni 'fondo_personalizado'.
        formData.append('imagen_principal', imageBlob, 'imagen_principal.png');
        
        // Llamamos al MISMO endpoint que ya tienes
        const url = `${import.meta.env.VITE_API_URL}/api/advanced-edit`;
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(errorData.error || "No se pudo eliminar el fondo.");
        }

        const resultBlob = await fetchResponse.blob();
        const resultUrl = URL.createObjectURL(resultBlob);

        setActiveImage(prev => ({ 
            ...prev,
            public_url: resultUrl,
            blob: resultBlob,
            type: 'editada' 
        }));

        showNotification("¡Fondo eliminado con éxito!", "success");

    } catch (error) {
        console.error("Error al eliminar el fondo:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsEditingAdvanced(false);
    }
};

  const handleGenerateImage = async () => {
    if (!generationPrompt.trim()) {
      showNotification("Por favor, escribe un prompt para generar la imagen.", "warning");
      return;
    }

    setIsGeneratingImage(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sesión no válida.");
      
      const url = `${import.meta.env.VITE_API_URL}/api/generate-image`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' // El backend espera JSON
        },
        body: JSON.stringify({ prompt: generationPrompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "No se pudo generar la imagen.");
      }

      // La respuesta son los bytes de la imagen
      const resultBlob = await response.blob();
      const resultUrl = URL.createObjectURL(resultBlob);

      // --- ¡ESTE ES EL PASO CLAVE! ---
      // La imagen generada se convierte en la nueva imagen activa del estudio.
      setActiveImage({
        public_url: resultUrl,    // La URL visible en el lienzo
        blob: resultBlob,         // El blob para poder guardarla o editarla
        prompt: generationPrompt, // Guardamos el prompt que la creó
        type: 'generada'          // Actualizamos su tipo
      });
      
      // También reseteamos la 'sourceImageUrl' porque esta es una nueva imagen base
      setSourceImageUrl(resultUrl); 

      showNotification("¡Imagen generada con éxito!", "success");

    } catch (error) {
      console.error("Error generando la imagen:", error);
      showNotification(`Error: ${error.message}`, "error");
    } finally {
      setIsGeneratingImage(false);
    }
  };

   const dynamicMemeTextStyle = getMemeTextStyle(fontName, fontColor, borderColor, fontSize);

  return (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'row',
      pt: `calc(72px + 1px)`,
      px: 2,
      pb: 1,
      gap: 2,
      background: '#e3f2fd',
    }}
  >
    
    {/* --- Columna Izquierda: Lienzo y Controles de Texto --- */}
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Cabecera (sin cambios) */}
      <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0, }}>
         <Typography variant="h5" fontWeight="bold">Estudio Creativo</Typography>
         <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/galeria')}>
          Volver a la Galería
        </Button>
         <Button 
            variant="contained" 
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveToGallery}
            disabled={isSaving || !activeImage?.blob}
        >
            Guardar en Galería
        </Button>
      </Paper>

      {/* Contenedor principal: Imagen a la izquierda y TextBoxes a la derecha */}
      <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 , maxHeight: '78vh',}}>
        
        {/* NUEVO: Contenedor para la imagen y la previsualización del texto */}
        <Paper sx={{ 
            flex: 2, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            p: 1, 
            overflow: 'hidden',
            position: 'relative' // ¡Importante para la previsualización!
        }}>
          {activeImage ? (
            <>
              <Box
                component="img"
                src={activeImage.public_url}
                alt="Imagen activa"
                sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
              {/* Previsualización Texto Superior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, top: '5%' }}>
                {topText}
              </Typography>
              {/* Previsualización Texto Inferior */}
                  <Typography sx={{ ...dynamicMemeTextStyle, bottom: '5%' }}>
                {bottomText}
              </Typography>
            </>
          ) : (
            <Typography color="text.secondary">
              Selecciona una imagen de tu galería para empezar.
            </Typography>
          )}
        </Paper>

        {/* Textos para Meme y Botón de Aplicar */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, p: 2, background: '#fff', borderRadius: 1 }}>
            
            <Typography variant="h6" gutterBottom>Laboratorio de Memes</Typography>

            {/* Campo Texto Superior */}
            <TextField
                label="Texto Superior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={topText}
                onChange={(e) => setTopText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignTopIcon />
                    </InputAdornment>
                    ),
                }}
            />

            {/* Campo Texto Inferior */}
            <TextField
                label="Texto Inferior"
                variant="outlined"
                fullWidth
                multiline
                rows={4}
                value={bottomText}
                onChange={(e) => setBottomText(e.target.value)}
                InputProps={{
                    startAdornment: (
                    <InputAdornment position="start">
                        <VerticalAlignBottomIcon />
                    </InputAdornment>
                    ),
                }}
            />
            
            {/* MOVIDO y MEJORADO: Botón para aplicar textos */}
            <Button
                variant="contained"
                fullWidth
                onClick={handleCreateMeme}
                disabled={!activeImage || isCreatingMeme}
                sx={{ mt: 2 }} // Margen superior para separarlo
            >
                {isCreatingMeme ? <CircularProgress size={24} /> : "Aplicar Textos a la Imagen"}
            </Button>
        </Box>
      </Box>
    </Box>

    {/* --- Columna Derecha: Caja de Herramientas --- */}
    <Paper sx={{ width: '350px', flexShrink: 0, p: 3, overflowY: 'auto', background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',gap:1}}>
      <Typography  sx={{ color: 'white' }} variant="h6" gutterBottom>Herramientas</Typography>

       <Accordion defaultExpanded  sx={{ mb: 1 }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography>Generador de Imágenes</Typography>
    </AccordionSummary>
    <AccordionDetails>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        
        <TextField
          label="Describe la imagen a generar..."
          variant="outlined"
          fullWidth
          multiline
          rows={4}
          value={generationPrompt}
          onChange={(e) => setGenerationPrompt(e.target.value)}
          placeholder="Ej: Un astronauta montando a caballo en Marte, fotorrealista."
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleGenerateImage}
          disabled={isGeneratingImage || !generationPrompt.trim()}
        >
          {isGeneratingImage ? <CircularProgress size={24} /> : "Generar Imagen"}
        </Button>

      </Box>
    </AccordionDetails>
  </Accordion>

      {/* MODIFICADO: Ahora este acordeón es para opciones y extras */}
      <Accordion  sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <TextFieldsIcon />
                <Typography>Opciones de Texto</Typography>
            </Box>
        </AccordionSummary>
        <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}> {/* Aumentamos el gap */}
                
                {/* NUEVO: Selector de Fuente */}
                <FormControl fullWidth>
                  <InputLabel id="font-select-label">Fuente</InputLabel>
                  <Select
                    labelId="font-select-label"
                    value={fontName}
                    label="Fuente"
                    onChange={(e) => setFontName(e.target.value)}
                  >
                    <MenuItem value="impact">Impact</MenuItem>
                    <MenuItem value="arial">Arial</MenuItem>
                    <MenuItem value="comic_sans">Comic Sans</MenuItem>
                  </Select>
                </FormControl>

                 {/* NUEVO: Slider para el tamaño de la fuente */}
                <Box>
                  <Typography gutterBottom variant="body2">
                    Tamaño de Fuente: {fontSize}px
                  </Typography>
                  <Slider
                    value={fontSize}
                    onChange={(e, newValue) => setFontSize(newValue)}
                    aria-labelledby="font-size-slider"
                    valueLabelDisplay="auto"
                    step={2}
                    min={10}
                    max={120} // Puedes ajustar este rango
                  />
                </Box>

                {/* NUEVO: Selectores de Color */}
                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Tooltip title="Color del Texto" >
                    <TextField
                      label="Texto"
                      type="color"
                      value={fontColor}
                      onChange={(e) => setFontColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                       sx={{
    "& .MuiOutlinedInput-root": {
      borderColor: fontColor,
      "&:hover fieldset": { borderColor: fontColor },
      "&.Mui-focused fieldset": { borderColor: fontColor },
    },
    width: 80, // opcional, para que no sea tan ancho
    padding: 0
  }}
                    />
                  </Tooltip>
                  <Tooltip title="Color del Borde">
                    <TextField
                      
                      label="Borde"
                      type="color"
                      value={borderColor}
                      onChange={(e) => setBorderColor(e.target.value)}
                      variant="outlined"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      sx={{
                           "& .MuiOutlinedInput-root": {
                             borderColor: "secondary",
                             "&:hover fieldset": { borderColor: fontColor },
                             "&.Mui-focused fieldset": { borderColor: fontColor },
                               },
                              width: 80, // opcional, para que no sea tan ancho
    padding: 0
  }}
                    />
                  </Tooltip>
                </Box>
                
                {/* El botón de usar prompt se mantiene */}
                {activeImage?.prompt && (
                     <Button 
                         sx={{
                         border: "2px solid #ffffff",
                         color: "#ffffff",
                         backgroundColor: " #005f73",   // 👈 acá el color base
                         "& .MuiSvgIcon-root": { color: "#ffffff" },
                         "&:hover": {
                          backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
                          borderColor: "#ffffff",
                          },
                        }}
                        variant="outlined" 
                        size="small" 
                        onClick={() => setBottomText(activeImage.prompt)}
                        startIcon={<AutoFixHighIcon />}
                    >
                        Usar prompt como texto inferior
                    </Button>
                )}

            </Box>
        </AccordionDetails>
    </Accordion>


     <Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <AutoFixHighIcon />
        <Typography>Edición de Fondo</Typography>
    </Box>
  </AccordionSummary>
  <AccordionDetails>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      
      <Typography variant="body2" color="text.secondary">
        Elimina el fondo y reemplázalo con una de estas opciónes.
      </Typography>
       <Button
            variant="outlined"
            fullWidth
            onClick={handleRemoveBackground} // Llama a la nueva función
            disabled={isEditingAdvanced || !activeImage}
        >
            {isEditingAdvanced ? <CircularProgress size={24} /> : "Eliminar Fondo (Transparente)"}
        </Button>

         <Button
        variant="outlined"
        component="label"
        fullWidth
        onClick={() => setIsGalleryModalOpen(true)} // <-- Abre el modal
        disabled={isEditingAdvanced}
      >
        Elegir de mi Galería
      </Button>

        {/* Opción 2: Subir fondo personalizado */}
      <Button
        variant="outlined"
        component="label"
        fullWidth
        disabled={!!backgroundPrompt}
      >
        {customBackgroundFile ? customBackgroundFile.name : "Subir Fondo Personalizado"}
        <input 
          type="file" 
          hidden
          onChange={(e) => setCustomBackgroundFile(e.target.files[0])}
          accept="image/*"
        />
      </Button>

      {/* Opción 1: Generar fondo con IA */}
      <TextField
        label="Generar fondo con IA (prompt)"
        variant="outlined"
        fullWidth
        value={backgroundPrompt}
        // --- ¡ASEGÚRATE DE QUE ESTA LÍNEA ESTÉ ASÍ! ---
        onChange={(e) => setBackgroundPrompt(e.target.value)}
        disabled={!!customBackgroundFile}
      />
      
      

      {/* Botón para aplicar la acción */}
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={handleAdvancedEdit}
        disabled={isEditingAdvanced || !activeImage}
      >
        {isEditingAdvanced ? <CircularProgress size={24} /> : "Aplicar Edición"}
      </Button>
      
    </Box>
  </AccordionDetails>
</Accordion>

{/* --- INICIO: MODAL DE LA GALERÍA --- */}
    <Dialog 
        open={isGalleryModalOpen} 
        onClose={() => setIsGalleryModalOpen(false)} 
        maxWidth="md" 
        fullWidth
    >
        <DialogTitle>Elige una imagen de tu galería</DialogTitle>
        <DialogContent>
            {userImages.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: 2,
                        mt: 2,
                    }}
                >
                    {userImages.map((image) => (
                        <Box
                            key={image.id}
                            component="img"
                            src={image.url}
                            alt="Imagen de la galería"
                            sx={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                    opacity: 0.8,
                                    boxShadow: '0 0 8px rgba(0,0,0,0.5)',
                                }
                            }}
                            onClick={() => handleGalleryBackgroundSelect(image.url)} // <-- ¡Llama a la función!
                        />
                    ))}
                </Box>
            ) : (
                <Typography sx={{ mt: 2 }}>
                    Tu galería está vacía o aún se está cargando...
                </Typography>
            )}
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setIsGalleryModalOpen(false)}>Cerrar</Button>
        </DialogActions>
    </Dialog>
    {/* --- FIN: MODAL DE LA GALERÍA --- */}
    </Paper>
  </Box>
);
}

----------------------------------------------------------

// src/pages/PredictClusterPage.jsx 
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress, Alert, Paper, Grid, Stack, Divider } from '@mui/material';
import Fade from '@mui/material/Fade';
import Grow from '@mui/material/Grow';

// --- NUESTROS COMPONENTES ---
import FileUploaderClustering from '../components/FileUploaderClustering'; 
import { TablePreview } from '../components/dashboard/DataPreviews'; // La tabla de resultados
import { supabase } from '../supabaseClient';
import { useNotification } from '../context/NotificationContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import DownloadIcon from '@mui/icons-material/Download';

export default function PredictClusterPage() {
    const { modelId } = useParams();
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // --- ESTADOS (muy similares a BatchPrediction) ---
    const [modelInfo, setModelInfo] = useState(null);
    const [fileToPredict, setFileToPredict] = useState(null);
    const [predictionResult, setPredictionResult] = useState(null);
    const [loading, setLoading] = useState(true); // Carga inicial
    const [isPredicting, setIsPredicting] = useState(false); // Carga de la predicción
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
        setPredictionResult(null);
        setError(null);
    };

    const handleRunSegmentation = async () => {
        if (!fileToPredict) { /* ... notificar ... */ return; }
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
            if (!response.ok || !result.success) throw new Error(result.error);
            
            setPredictionResult(result.data);
            showNotification("¡Segmentación completada!", "success");

        } catch (err) {
            setError(err.message);
        } finally {
            setIsPredicting(false);
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


    if (loading) return <CircularProgress />;
    if (error && !predictionResult) return <Alert severity="error">{error}</Alert>;

 return (
  <Box
    sx={{
      p: 3,
      pt: 'calc(72px + 24px)',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #e0f7fa, #e3f2fd)',
    }}
  >
    {/* Botón volver */}
    <Button
      startIcon={<ArrowBackIcon />}
      onClick={() => navigate('/models')}
      sx={{ mb: 3 }}
      variant="contained"
    >
      Volver a Mis Modelos
    </Button>

    {/* Título principal */}
    <Typography variant="h5" fontWeight="bold" gutterBottom>
      Segmentar Nuevos Datos
    </Typography>
    <Typography color="text.secondary" sx={{ mb: 4 }}>
      Usando el modelo: <strong>{modelInfo?.model_name || modelId}</strong>
    </Typography>

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
        <Box>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
            Paso 1: Sube el archivo con los datos a segmentar
          </Typography>
          <FileUploaderClustering onFileSelect={handleFileSelect} />
        </Box>

        {/* Botón ejecutar */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleRunSegmentation}
            disabled={!fileToPredict || isPredicting}
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
  </Box>
);
}


ussefect de promptlab


  useEffect(() => {
    // Definimos las funciones de carga de datos primero.
    const fetchModels = async () => {
        setIsModelsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");
            const accessToken = session.access_token;
            const url = `${import.meta.env.VITE_API_URL}/api/promptlab/available-models`;
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
            const url = `${import.meta.env.VITE_API_URL}/api/datasets/${datasetId}/get-document-text-content`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
            if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                setContext(result.textContent);
                setOriginalContext(result.textContent);
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