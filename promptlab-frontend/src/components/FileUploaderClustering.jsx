import React from 'react';

import { useDropzone } from "react-dropzone";
import { Box, Typography, Paper, Chip, Alert, Button } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useState, useCallback } from 'react'; // <-- Importa useState y useCallback

export default function FileUploaderClustering({ onFileSelect }) { 
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');

    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        setError('');
        setSelectedFile(null); // Limpia selección previa
        onFileSelect(null); // Notifica al padre que no hay archivo

        if (rejectedFiles.length > 0) {
            setError(`Error: El archivo no es un tipo válido (CSV, XLSX).`);
            return;
        }

        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            
            const maxSizeMB = 5;
            if (file.size > maxSizeMB * 1024 * 1024) {
                setError(`Error: El archivo supera el límite de ${maxSizeMB}MB.`);
                return;
            }
            
            setSelectedFile(file); // Guarda el archivo en el estado
            onFileSelect(file); // Notifica al padre
        }
    }, [onFileSelect]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        multiple: false
    });

    const handleManualSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Reutilizamos la misma lógica de onDrop
            onDrop([file], []);
        }
    };

    const handleClearFile = (e) => {
        e.stopPropagation();
        setSelectedFile(null);
        onFileSelect(null);
    };

    return (
        <Box>
            <Paper
                {...getRootProps()}
                variant="outlined"
                sx={{
                    p: 3, textAlign: 'center', cursor: 'pointer', borderStyle: 'dashed',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    bgcolor: isDragActive ? 'action.hover' : 'transparent',
                    minHeight: 150, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center'
                }}
            >
                <input {...getInputProps()} style={{ display: 'none' }} />
                <UploadFileIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                
                {!selectedFile ? (
                    <Typography color="text.secondary">
                        {isDragActive 
                            ? 'Suelta el archivo aquí...' 
                            : 'Arrastra y suelta un archivo o haz clic para seleccionar'
                        }
                    </Typography>
                ) : (
                    <Chip label={selectedFile.name} onDelete={handleClearFile} color="primary" />
                )}
            </Paper>

            {/* Este botón manual es un fallback y una mejor práctica de accesibilidad */}
            <Button component="label" fullWidth sx={{ mt: 1 }}>
                Seleccionar Archivo Manualmente
                <input type="file" hidden onChange={handleManualSelect} accept=".csv,.xlsx" />
            </Button>
            
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Box>
    );
}