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
import ScienceIcon from '@mui/icons-material/Science';


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
    setSaveState('saving');
    try {
        const hasText = topText.trim() !== '' || bottomText.trim() !== '';
        let finalBlobToUpload = activeImage.blob;
        let finalType = activeImage.type || 'editada';

        // Si hay texto, el usuario quiere guardar un meme.
        // Llamamos al backend para que lo genere.
        if (hasText) {
            // Primero, nos aseguramos de tener el blob de la imagen base.
            if (!activeImage.blob) {
                const response = await fetch(activeImage.public_url);
                if (!response.ok) throw new Error("No se pudo obtener la imagen base.");
                activeImage.blob = await response.blob();
            }

            const formData = new FormData();
            // --- ¡CORRECCIÓN CLAVE! ---
            // Tu endpoint espera el archivo con el nombre 'image', no 'image_file'.
            formData.append("image", activeImage.blob, "base-image.png"); 
            
            // Adjuntamos el resto de la información del meme
            formData.append("topText", topText);
            formData.append("bottomText", bottomText);
            formData.append("fontSize", fontSize);
            formData.append("fontColor", fontColor);
            formData.append("borderColor", borderColor);
            formData.append("fontName", fontName); // Tu endpoint también acepta esto

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            // Llamamos a tu endpoint existente
            const memeResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/create-meme`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData
            });

            if (!memeResponse.ok) {
                const errorData = await memeResponse.json();
                throw new Error(errorData.error || "El servidor no pudo crear el meme.");
            }

            // El backend nos devuelve el meme finalizado como un blob
            finalBlobToUpload = await memeResponse.blob();
            finalType = 'meme';
        }

        // --- Lógica de subida final (esta parte es genérica y no cambia) ---
        if (!finalBlobToUpload) {
            throw new Error("No hay imagen para guardar.");
        }

        const uploadFormData = new FormData();
        uploadFormData.append('type', finalType);
        if (activeImage.prompt) uploadFormData.append('prompt', activeImage.prompt);
        if (activeImage.project_id) uploadFormData.append('project_id', activeImage.project_id);
        uploadFormData.append('image', finalBlobToUpload, `creative-studio-image.png`);

        const { data: { session } } = await supabase.auth.getSession();
        const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/visuals`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}` },
            body: uploadFormData,
        });

        const result = await uploadResponse.json();
        if (!uploadResponse.ok || !result.success) {
            throw new Error(result.error || "No se pudo guardar la imagen final.");
        }
        
        showNotification("¡Guardado en tu galería con éxito!", "success");
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 2000);

    } catch (error) {
        console.error("Error en handleSaveToGallery:", error);
        showNotification(`Error: ${error.message}`, "error");
        setSaveState('idle');
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
         <Button 
      variant="outlined" 
      // Icono sugerido: ScienceIcon o VisibilityIcon
      startIcon={<ScienceIcon />} 
      onClick={() => navigate('/laboratorio-vision', { state: { image: activeImage } })}
      disabled={!activeImage} // Deshabilitado si no hay imagen
    >
      Analizar Imagen
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
                {isCreatingMeme ? <CircularProgress size={24} /> : "Aplicar el Texto a la Imagen"}
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