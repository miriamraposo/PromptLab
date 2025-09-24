// src/components/dashboard/UploadImagesModal.jsx (VERSIÓN MEJORADA)

import React, { useState, useEffect, useCallback } from 'react';
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

export default function UploadImagesModal({ open, onClose, projectId, onUploadComplete, initialFiles = [] }) {
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

  useEffect(() => {
    // Si el modal se está abriendo Y hemos recibido archivos iniciales...
    if (open && initialFiles && initialFiles.length > 0) {
        
        // --- LA LÍNEA CLAVE ---
        // Comparamos los IDs para ver si los archivos ya han sido cargados.
        // Esto previene que se vuelvan a cargar en cada render.
        const loadedFileNames = selectedFiles.map(f => f.name).join(',');
        const initialFileNames = initialFiles.map(f => `${f.id}.${f.extension}`).join(',');

        if (loadedFileNames !== initialFileNames) {
            const filesFromPdf = initialFiles.map(imgData => {
                // ... tu lógica de conversión de base64 a File (sin cambios) ...
                const byteString = atob(imgData.image_base64);
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: `image/${imgData.extension}` });
                return new File([blob], `${imgData.id}.${imgData.extension}`, { type: `image/${imgData.extension}` });
            });
            setSelectedFiles(filesFromPdf);
        }

    } else if (open && selectedFiles.length > 0) {
        // Si el modal se abre SIN archivos iniciales, pero tenía archivos
        // seleccionados de antes, lo limpiamos.
        setSelectedFiles([]);
    }
}, [open, initialFiles, selectedFiles]);

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
   
      {/* --- TÍTULO (CORREGIDO) --- */}
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
      {/* La lógica condicional está DENTRO del componente, como debe ser */}
      {initialFiles.length > 0 ? 'Guardar Imágenes Extraídas' : 'Crear Dataset desde Imágenes'}
      <IconButton onClick={onClose} sx={{ color: "inherit" }}>
        <CloseIcon />
      </IconButton>
    </DialogTitle>
    

    {/* --- CONTENIDO --- */}
    <DialogContent sx={{ p: 4 }}>
       
       {initialFiles.length === 0 && (
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
        )}

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