// src/pages/LaboratorioVisionPage.jsx

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
    Slider, Select, MenuItem, InputLabel, FormControl, Tooltip, Box, Paper, Chip,
    Typography, TextField, Button, CircularProgress, Accordion, AccordionSummary, 
    AccordionDetails, Dialog, DialogTitle, DialogContent, DialogActions , Alert,AlertTitle
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
import PaletteIcon from "@mui/icons-material/Palette";


export default function LaboratorioVisionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  // --- Estados Esenciales ---
  const [activeImage, setActiveImage] = useState(null);
  const [sourceImageUrl, setSourceImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Estados de ANÁLISIS ---
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  
  // <<< 1. AÑADIR LOS ESTADOS QUE FALTABAN PARA EL MODAL DE LA GALERÍA >>>
  const [userImages, setUserImages] = useState([]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);


  useEffect(() => {
    setLoading(true);
    const imageFromState = location.state?.imageFromPromptLab || location.state?.image;
    if (imageFromState) {
        const imageUrl = typeof imageFromState === 'string' ? imageFromState : imageFromState.public_url;
        setActiveImage({
            public_url: imageUrl,
            blob: null, 
            ... (typeof imageFromState === 'object' && imageFromState)
        });
        setSourceImageUrl(imageUrl);
        window.history.replaceState({}, document.title);
    }
    setLoading(false);
  }, [location.state]);

  // --- Lógica de Carga de Galería (eficiente) ---
  useEffect(() => {
    const loadUserImages = async () => {
        if (!isGalleryModalOpen) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const url = `${import.meta.env.VITE_API_URL}/api/visuals?per_page=100`; 
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` }});
            const result = await response.json();
            if (result.success && Array.isArray(result.visuals)) {
                setUserImages(result.visuals); // Guardamos los objetos completos
            } else { setUserImages([]); }
        } catch (error) { showNotification("No se pudo cargar tu galería.", "error"); }
    };
    loadUserImages();
  }, [isGalleryModalOpen]);

  // --- Manejadores de Eventos ---

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
        const localUrl = URL.createObjectURL(file);
        setActiveImage({ public_url: localUrl, blob: file, type: 'subida' });
        setSourceImageUrl(localUrl);
        setAnalysisResult(null);
        setAnalysisError(null);
        showNotification(`Archivo "${file.name}" cargado.`, "success");
    }
  };

  const handleSelectImageFromGallery = (image) => {
    setActiveImage(image);
    setSourceImageUrl(image.public_url);
    setAnalysisResult(null);
    setAnalysisError(null);
    setIsGalleryModalOpen(false);
    showNotification("Imagen cargada desde la galería.", "success");
  };
 
   const handleSaveToGallery = async () => {
    // Solo permitimos guardar si tenemos la imagen original
    if (!activeImage || !sourceImageUrl) {
        showNotification("No hay una imagen para guardar.", "error");
        return;
    }
    
    setIsSaving(true);
    try {
        // Obtenemos el blob de la imagen que está actualmente en el lienzo
        const response = await fetch(activeImage.public_url);
        if (!response.ok) throw new Error("No se pudo descargar la imagen para guardarla.");
        const imageBlob = await response.blob();

        const formData = new FormData();
        formData.append('type', activeImage.type || 'analizada');
        if (activeImage.prompt) formData.append('prompt', activeImage.prompt);
        // Podrías incluso guardar el resultado del análisis como metadatos
        // formData.append('metadata', JSON.stringify(analysisResult));
        formData.append('image', imageBlob, `vision-lab-image.png`);

        const { data: { session } } = await supabase.auth.getSession();
        const url = `${import.meta.env.VITE_API_URL}/api/visuals`;
        const uploadResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await uploadResponse.json();
        if (!uploadResponse.ok || !result.success) {
            throw new Error(result.error || "No se pudo guardar la imagen.");
        }
        
        showNotification("¡Guardado en tu galería con éxito!", "success");

    } catch (error) {
        console.error("Error al guardar en galería:", error);
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsSaving(false);
    }
  };


   const handleAnalyzeImage = async () => {
    if (!activeImage) { // Simplificamos la validación
      showNotification("No hay una imagen activa para analizar.", "error");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        // --- LÓGICA MEJORADA ---
        let imageBlob = activeImage.blob; // 1. Intentamos usar el blob que ya tenemos

        // 2. Si no tenemos el blob (ej. viene de la galería), lo descargamos.
        if (!imageBlob && activeImage.public_url) {
            const response = await fetch(activeImage.public_url);
            if (!response.ok) throw new Error("No se pudo descargar la imagen para el análisis.");
            imageBlob = await response.blob();
        }

        // 3. Si después de todo no tenemos un blob, es un error.
        if (!imageBlob) {
            throw new Error("No se encontraron los datos binarios de la imagen.");
        }

        // --- El resto de la función se queda igual ---
        const formData = new FormData();
        formData.append('image', imageBlob, 'image-to-analyze.png');

        // 3. Llamar al endpoint de análisis profundo
        const url = `${import.meta.env.VITE_API_URL}/api/analyze-image-deep`;
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: formData,
        });

        const result = await fetchResponse.json();
        if (!fetchResponse.ok || !result.success) {
            throw new Error(result.error || "El análisis falló en el servidor.");
        }
        
        // 4. Guardar los resultados y abrir el modal
        setAnalysisResult(result.analysis);
        setIsResultModalOpen(true);
        showNotification("¡Análisis completado!", "success");

    } catch (error) {
        console.error("Error en el análisis de imagen:", error);
        setAnalysisError(error.message); // Guardamos el error para mostrarlo en la UI
        showNotification(`Error: ${error.message}`, "error");
    } finally {
        setIsAnalyzing(false);
    }
  };
 

    return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'row', pt: `calc(72px + 8px)`, px: 2, pb: 2, gap: 2, background: '#e3f2fd' }}>
      
      {/* ======================================= */}
      {/* === Columna Izquierda: Lienzo === */}
      {/* ======================================= */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
          <Typography variant="h5" fontWeight="bold">Laboratorio de Visión</Typography>
          <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/galeria')}>
            Volver a Galería
          </Button>
           <Button 
      variant="outlined" 
      // Icono sugerido: PaletteIcon para "Creativo"
      startIcon={<PaletteIcon />} 
      onClick={() => navigate('/estudio-creativo', { state: { image: activeImage } })}
      disabled={!activeImage} // Deshabilitado si no hay imagen
    >
      Ir a Estudio Creativo
    </Button>
        </Paper>
        <Paper sx={{ flexGrow: 1, display: 'flex',  position: 'relative' , justifyContent: 'center', alignItems: 'center', p: 2, overflow: 'hidden' }}>
          {loading && <CircularProgress />}
            {!loading && activeImage && (
    <> {/* Usamos un Fragmento de React para agrupar la imagen y su posible superposición */}
      
      {/* LA IMAGEN PRINCIPAL */}
      <Box 
        component="img" 
        src={activeImage.public_url} 
        alt="Imagen a analizar" 
        sx={{ 
          maxWidth: '100%', 
          maxHeight: '100%', 
          objectFit: 'contain', 
          borderRadius: 2,
          // PASO 2: Aplicamos un efecto visual a la imagen misma cuando 'isAnalyzing' es true.
          // El desenfoque y la escala de grises la mandan a un segundo plano.
          filter: isAnalyzing ? 'blur(4px) grayscale(50%)' : 'none',
          transition: 'filter 0.3s ease-in-out', // Para que el efecto sea suave.
        }} 
      />

      {/* LA SUPERPOSICIÓN DE CARGA */}
      {/* PASO 3: Este bloque solo se renderiza si 'isAnalyzing' es true. */}
      {isAnalyzing && (
        <Box 
          sx={{
            // Se posiciona de forma absoluta RELATIVO a su padre (el <Paper>).
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            // Fondo negro semitransparente para oscurecer la imagen de debajo.
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            // Usamos flexbox para centrar perfectamente el contenido (spinner y texto).
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white', // El color del spinner y el texto será blanco.
            borderRadius: 2, // Para que coincida con las esquinas redondeadas de la imagen.
          }}
        >
          <CircularProgress color="inherit" />
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>Analizando imagen...</Typography>
        </Box>
      )}
    </>
  )}
</Paper>
      </Box>

      {/* ============================================= */}
      {/* === Columna Derecha: Panel de Herramientas === */}
      {/* ============================================= */}
      <Paper sx={{ width: '350px', flexShrink: 0, p: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>Panel de Control</Typography>
        
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="medium">Cargar Imagen</Typography></AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Button variant="outlined" component="label" fullWidth>
              Subir desde mi Equipo
              <input type="file" hidden accept="image/*" onChange={handleFileSelect} />
            </Button>
            <Button variant="outlined" fullWidth onClick={() => setIsGalleryModalOpen(true)}>
              Elegir de mi Galería
            </Button>
          </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="medium">Acciones</Typography></AccordionSummary>
          <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            

              <Button 
                    variant="contained" 
                    size="large" 
                    fullWidth 
                    onClick={() => handleAnalyzeImage('deep')} // Le pasaremos un tipo
                     disabled={!activeImage || isAnalyzing} // <-- Cuando esto es 'true', el botón se deshabilita
                    >
                   {isAnalyzing ? <CircularProgress size={24} color="inherit" /> : "Análisis Profundo"}
              </Button>
  
  {/* --- NUEVO BOTÓN PARA EXTRACCIÓN DE DATOS --- */}
 <Tooltip title="Ideal para facturas, catálogos o tablas.">
  <span>
    <Button
      variant="contained"
      color="secondary"
      fullWidth
      onClick={() => handleAnalyzeImage('structured')}
      disabled={!activeImage || isAnalyzing}
      // Opcional pero recomendado para que el span ocupe el ancho correcto
      style={{ display: 'block' }} 
    >
      {isAnalyzing ? <CircularProgress size={24} color="inherit" /> : "Extraer Datos de Documento"}
    </Button>
  </span>
</Tooltip>
            <Button variant="outlined" startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />} onClick={handleSaveToGallery} disabled={isSaving || !activeImage} fullWidth>
              {isSaving ? "Guardando..." : "Guardar en Galería"}
            </Button>
          </AccordionDetails>
        </Accordion>

        {analysisError && <Alert severity="error" sx={{ mt: 2 }}>{analysisError}</Alert>}
      </Paper>

    {/* --- Modal Resultados --- */}
    <Dialog
      open={isResultModalOpen}
      onClose={() => setIsResultModalOpen(false)}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>Resultados del Análisis</DialogTitle>
     <DialogContent dividers>
  {analysisResult ? (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      
      {/* SECCIÓN 1: Errores (si los hay) */}
      {/* Es importante mostrarlos primero para que el usuario sepa si falta algo. */}
      {analysisResult.errores && analysisResult.errores.length > 0 && (
        <Alert severity="warning">
          <AlertTitle>El análisis se completó con advertencias</AlertTitle>
          <ul>
            {analysisResult.errores.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* SECCIÓN 2: Etiquetas de la IA (BEIT) */}
      {/* Usamos Chips para una visualización moderna de las etiquetas. */}
      {analysisResult.tags_ia && analysisResult.tags_ia.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="medium">Análisis de Contenido</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {analysisResult.tags_ia.map((tag, index) => (
                 <Chip key={index} label={tag.descripcion} variant="outlined" color="primary" />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* SECCIÓN 3: Objetos Detectados (YOLO) */}
      {/* Una lista es ideal para presentar los objetos y su confianza. */}
      {analysisResult.objetos_detectados && analysisResult.objetos_detectados.length > 0 && (
        <Accordion>
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography fontWeight="medium">Objetos Detectados</Typography>
  </AccordionSummary>
  <AccordionDetails>
    {analysisResult.objetos_detectados.map((obj, index) => (
      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        {/* CAMBIO AQUÍ: Usamos la propiedad "nombre" que viene del backend */}
        <Typography>{obj.nombre}</Typography>

        {/* CAMBIO AQUÍ: Usamos la propiedad "score" y la multiplicamos por 100 */}
        <Chip label={`Confianza: ${(obj.score * 100).toFixed(0)}%`} size="small" />
      </Box>
    ))}
  </AccordionDetails>
</Accordion>
      )}

      {/* SECCIÓN 4: Texto Extraído (OCR) */}
      {/* Un bloque de código preformateado es perfecto para mostrar texto extraído. */}
      {analysisResult.texto_extraido && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight="medium">Texto Encontrado en la Imagen</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Paper variant="outlined" sx={{ p: 2, background: '#f5f5f5', maxHeight: '200px', overflowY: 'auto' }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {analysisResult.texto_extraido}
                </Typography>
            </Paper>
          </AccordionDetails>
        </Accordion>
      )}
      
      {/* SECCIÓN 5: Metadatos Técnicos */}
      {analysisResult.metadata && (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="medium">Detalles del Archivo</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography variant="body2"><strong>Archivo:</strong> {analysisResult.metadata.filename}</Typography>
                <Typography variant="body2"><strong>Dimensiones:</strong> {analysisResult.metadata.dimensions}</Typography>
                <Typography variant="body2"><strong>Tamaño:</strong> {analysisResult.metadata.size_kb} KB</Typography>
            </AccordionDetails>
        </Accordion>
      )}

    </Box>
  ) : (
    // Vista mientras carga el análisis
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 4, minHeight: '250px' }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Realizando análisis profundo...</Typography>
    </Box>
  )}
</DialogContent>
    <DialogActions><Button onClick={() => setIsResultModalOpen(false)}>Cerrar</Button></DialogActions>
     
    </Dialog>

    {/* --- Modal Galería --- */}
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 2,
              mt: 2,
            }}
          >
            {userImages.map((image) => (
              <Box
                key={image.id}
                component="img"
                src={image.public_url}
                alt="Imagen de la galería"
                sx={{
                  width: "100%",
                  height: "150px",
                  objectFit: "cover",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": {
                    opacity: 0.8,
                    boxShadow: "0 0 8px rgba(0,0,0,0.5)",
                  },
                }}
                  onClick={() => handleSelectImageFromGallery(image)}
              />
            ))}
          </Box>
        ) : (
          <Typography sx={{ mt: 2 }}>
            Tu galería está vacía o aún se está cargando...
          </Typography>
        )}
      </DialogContent>
        <DialogActions><Button onClick={() => setIsGalleryModalOpen(false)}>Cerrar</Button></DialogActions>
    </Dialog>
  </Box>
);
}