// src/components/dashboard/DocumentControlPanel.jsx
// --- VERSIÓN COMPLETA Y VERIFICADA ---

import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useDropzone } from 'react-dropzone';
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Image as ImageIcon, ExpandMore, CloudUpload, Collections, ContentPaste } from '@mui/icons-material';
import { useNotification } from '../../context/NotificationContext';

// Función de redimensionamiento
const resizeImage = (fileOrBlob, maxWidth = 800) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(fileOrBlob);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        if (img.width <= maxWidth) return resolve(img.src);
        const scaleFactor = maxWidth / img.width;
        const canvas = document.createElement('canvas');
        canvas.width = maxWidth;
        canvas.height = img.height * scaleFactor;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Componente helper para las pestañas (CRÍTICO QUE ESTÉ AQUÍ)
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: { xs: 1, sm: 2 } }}>{children}</Box>}
    </div>
  );
}

const DocumentControlPanel = (props) => {
  const {
    models, selectedModel, setSelectedModel,
    userPrompt, setUserPrompt, handleGenerateImage, isLoading,
    userImages, onImageSelect,
  } = props;

  const { showNotification } = useNotification();
  const [tabValue, setTabValue] = useState(0);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    try {
      const resizedDataUrl = await resizeImage(file);
      onImageSelect(resizedDataUrl);
    } catch (error) {
      console.error("Error al redimensionar imagen:", error);
      showNotification("No se pudo procesar la imagen.", "error");
    }
  }, [onImageSelect, showNotification]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] } });

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const resizedDataUrl = await resizeImage(blob);
          onImageSelect(resizedDataUrl);
          return;
        }
      }
      showNotification("No se encontró una imagen en el portapapeles.", "info");
    } catch (err) {
      console.error("Error al leer portapapeles:", err);
      showNotification("No se pudo acceder al portapapeles.", "error");
    }
  }, [onImageSelect, showNotification]);

  return (
    <Paper sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 2, borderRadius: 3, overflowY: 'auto' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
        <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)} variant="fullWidth">
          <Tab label="Gestionar Imágenes" />
          <Tab label="Generar con IA" />
        </Tabs>
      </Box>

      {/* --- PESTAÑA 0: GESTOR DE IMÁGENES --- */}
      <TabPanel value={tabValue} index={0}>
        <Accordion defaultExpanded>
        <Accordion>
  <AccordionSummary
    expandIcon={<ExpandMore />}
    sx={{
      backgroundColor: '#cce7ff', // celeste suave
      '&.Mui-expanded': {
        backgroundColor: 'transparent', // opcional: cambia cuando está abierto
        borderRadius:2,
      },
    }}
  >
    <CloudUpload sx={{ mr: 1 }} />
    <Typography>Subir desde equipo</Typography>
  </AccordionSummary >
  <AccordionDetails>
    {/* contenido */}
  </AccordionDetails >
</Accordion>
          <AccordionDetails>
            <Box {...getRootProps()} sx={{ p: 3, border: '2px dashed grey', borderRadius: 2, textAlign: 'center', cursor: 'pointer' }}><input {...getInputProps()} /><Typography>Arrastra una imagen o haz clic aquí.</Typography></Box>
          </AccordionDetails>
        </Accordion>
        <Accordion>
        <AccordionSummary
  expandIcon={<ExpandMore />}
  sx={{
    backgroundColor: '#cce7ff', // celeste suave cuando está cerrado
    '&.Mui-expanded': {
      backgroundColor: 'transparent', // cuando se abre
      borderRadius: 2,
    },
  }}
>
  <Collections sx={{ mr: 1 }} />  {/* icono solo con margen */}
  <Typography>Mi Galería</Typography>
</AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 1, maxHeight: '250px', overflowY: 'auto' }}>
              {userImages && userImages.length > 0 ? userImages.map(img => (<Box key={img.id} component="img" src={img.url} alt="Galería" onClick={() => onImageSelect(img.url)} sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1, cursor: 'pointer', '&:hover': { opacity: 0.8 } }} />)) : <Typography variant="body2" color="text.secondary">No tienes imágenes guardadas.</Typography>}
            </Box>
          </AccordionDetails>
        </Accordion>
        <Accordion>
          <AccordionSummary
  expandIcon={<ExpandMore />}
  sx={{
    backgroundColor: '#cce7ff', // celeste suave cuando está cerrado
    '&.Mui-expanded': {
      backgroundColor: 'transparent', // cuando se abre
      borderRadius: 2, // opcional
    },
  }}
>
  <ContentPaste sx={{ mr: 1 }} /> {/* icono con margen */}
  <Typography>Pegar desde Portapapeles</Typography>
</AccordionSummary>
          <AccordionDetails>
            <Button fullWidth variant="contained" onClick={handlePasteFromClipboard}>Pegar imagen</Button>
          </AccordionDetails>
        </Accordion>
      </TabPanel>

      {/* --- PESTAÑA 1: GENERAR CON IA --- */}
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth><InputLabel>Modelo de IA</InputLabel><Select value={selectedModel || ''} label="Modelo de IA" onChange={e => setSelectedModel(e.target.value)} disabled={isLoading || models.length === 0}>{models?.map(model => <MenuItem key={model.id} value={model.id}>{model.name}</MenuItem>)}</Select></FormControl>
          <TextField label="Describe la imagen que quieres crear" multiline rows={8} value={userPrompt || ""} onChange={(e) => setUserPrompt(e.target.value)} placeholder="Ej: Un zorro rojo con un sombrero de copa, estilo pintura al óleo..." disabled={isLoading} />
          <Button variant="contained" onClick={handleGenerateImage} disabled={isLoading} sx={{ flex: 1 }} startIcon={isLoading ? <CircularProgress size={20}/> : <ImageIcon />}>{isLoading ? "Generando..." : "Generar Imagen"}</Button>
        </Box>
      </TabPanel>
    </Paper>
  );
};

// --- MEJORA: PropTypes completos para robustez ---
DocumentControlPanel.propTypes = {
  models: PropTypes.array,
  selectedModel: PropTypes.string,
  setSelectedModel: PropTypes.func,
  userPrompt: PropTypes.string,
  setUserPrompt: PropTypes.func,
  handleGenerateImage: PropTypes.func,
  isLoading: PropTypes.bool,
  userImages: PropTypes.array.isRequired,
  onImageSelect: PropTypes.func.isRequired,
};

export default DocumentControlPanel;