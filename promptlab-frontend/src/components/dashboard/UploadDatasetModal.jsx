
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { 
    Box, Button, Dialog, DialogActions, DialogContent, 
    DialogTitle, Typography, CircularProgress, Alert, TextField
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import GoogleIcon from '@mui/icons-material/Google'; // Lo mantenemos como un icono genérico de "nube"
import { supabase } from '../../supabaseClient';

export default function UploadDatasetModal({ open, onClose, onDatasetUploaded, projectId }) {
    // Estados para la subida local
    const [files, setFiles] = useState([]); 
    
    // Estados para la importación por URL
    const [fileUrl, setFileUrl] = useState('');

    // Estados compartidos
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
        const handleFileSelect = (e) => {
            setError('');
            const selectedFiles = e.target.files;
            if (!selectedFiles || selectedFiles.length === 0) {
                setFiles([]);
                return;
            }
            
            const validFiles = [];
            const TABULAR_LIMIT_MB = 5;
            const TEXT_LIMIT_MB = 20;
    
            for (const file of Array.from(selectedFiles)) {
                const fileName = file.name.toLowerCase();
                const isTabular = fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.parquet');
                const maxSizeMB = isTabular ? TABULAR_LIMIT_MB : TEXT_LIMIT_MB;
                
                if (file.size > maxSizeMB * 1024 * 1024) {
                    setError(`Error: El archivo "${file.name}" supera el límite de ${maxSizeMB}MB.`);
                    setFiles([]);
                    return;
                }
                validFiles.push(file);
            }
            setFiles(validFiles);
        };
    
         const handleUploadLocalFiles = async () => {
            if (files.length === 0) {
                setError('Por favor, selecciona al menos un archivo.');
                return;
            }
            setLoading(true);
            setError('');
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                
                const uploadPromises = files.map(file => {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    return fetch(`${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/upload`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                        body: formData,
                    }).then(response => {
                        if (!response.ok) throw new Error(`Error al subir ${file.name}`);
                        return response.json();
                    });
                });
    
                await Promise.all(uploadPromises);
                onDatasetUploaded(); 
                handleClose();
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        

        const handleImportFromUrl = async () => {
        if (!fileUrl) {
            setError('Por favor, pega un enlace público al archivo.');
            return;
        }

        setLoading(true);
        setError('');
        
        const importEndpoint = `${import.meta.env.VITE_API_URL}/api/projects/${projectId}/datasets/import-from-url`;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(importEndpoint, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    fileUrl: fileUrl // La URL que el usuario pegó
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Error al importar el archivo desde el enlace.");
            }

            onDatasetUploaded(); // Refresca la lista de datasets
            handleClose();      // Cierra el modal

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setFiles([]);
        setFileUrl('');
        setError('');
        onClose();
    };

        
        
        return (
    <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
            sx: {
                borderRadius: 3,
                boxShadow: 6,
                overflow: 'hidden',
            }
        }}
    >
        <DialogTitle sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 'bold' }}>
            Importar Nuevos Archivos
        </DialogTitle>

        <DialogContent sx={{ p: 4 }}>
            {/* Caja para subir archivos */}
            <Box
                sx={{
                    border: '2px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'action.hover',
                    },
                }}
                component="label"
            >
                <UploadFileIcon sx={{ fontSize: 50, color: 'text.secondary', mb: 1 }} />
                <Typography color="text.secondary">
                    {files.length > 0
                        ? `${files.length} archivo(s) seleccionado(s)`
                        : 'Arrastra y suelta archivos aquí o haz clic para seleccionar'}
                </Typography>
                <input
                    type="file"
                    hidden
                    onChange={handleFileSelect}
                    multiple
                    accept=".csv, .xlsx, .xls, .json, .parquet, .txt, .md, .pdf, .doc, .docx"
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}

            {/* Separador elegante */}
            <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
                <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
                <Typography sx={{ mx: 2, color: 'text.secondary', fontWeight: 'medium' }}>O</Typography>
                <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
            </Box>

            {/* Importar desde enlace */}
            <Typography color="text.secondary" sx={{ mb: 1, fontWeight: 500 }}>
                Importar desde enlace público (Google Drive, GitHub, etc.)
            </Typography>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="Pega aquí el enlace..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                sx={{ mb: 2 }}
            />

            {error && (
                <Alert severity="error" sx={{ mt: 1, borderRadius: 2 }}>
                    {error}
                </Alert>
            )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, justifyContent: 'space-between' }}>
            <Button onClick={handleClose} disabled={loading} variant="outlined">
                Cancelar
            </Button>

            {files.length > 0 ? (
                <Button
                    onClick={handleUploadLocalFiles}
                    variant="contained"
                    disabled={loading}
                    sx={{ minWidth: 180 }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : `Importar ${files.length} Archivo(s)`}
                </Button>
            ) : (
                <Button
                    onClick={handleImportFromUrl}
                    variant="contained"
                    disabled={!fileUrl || loading}
                    startIcon={<GoogleIcon />}
                    sx={{ minWidth: 180 }}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Importar desde Enlace'}
                </Button>
            )}
        </DialogActions>
    </Dialog>
);

}
    UploadDatasetModal.propTypes = {
        open: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        onDatasetUploaded: PropTypes.func.isRequired,
        projectId: PropTypes.string.isRequired,
    };
    