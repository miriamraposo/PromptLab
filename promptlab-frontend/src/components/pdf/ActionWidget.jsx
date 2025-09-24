import React, { useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import TableChartIcon from '@mui/icons-material/TableChart';

// Componente tonto para mostrar botones de acción.
export default function ActionWidget({ onExtractImages, onExportToCsv }) {
    // Estado LOCAL para manejar la carga de cada botón individualmente.
    const [isExtracting, setIsExtracting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleImageClick = async () => {
        setIsExtracting(true);
        // Llama a la función que le pasó el padre y espera a que termine.
        await onExtractImages();
        setIsExtracting(false);
    };
    
    const handleCsvClick = async () => {
        setIsExporting(true);
        // Llama a la función que le pasó el padre y espera a que termine.
        await onExportToCsv();
        setIsExporting(false);
    };

    return (
        <Paper elevation={3} sx={{ p: 2.5, mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                Otras Acciones
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                    variant="outlined"
                    startIcon={isExtracting ? <CircularProgress size={20} /> : <ImageIcon />}
                    onClick={handleImageClick}
                    disabled={isExtracting || isExporting}
                >
                    Extraer Imágenes a la Galería
                </Button>
                
                <Button
                    variant="outlined"
                    startIcon={isExporting ? <CircularProgress size={20} /> : <TableChartIcon />}
                    onClick={handleCsvClick}
                    disabled={isExtracting || isExporting}
                >
                    Exportar Datos a CSV
                </Button>
            </Box>
        </Paper>
    );
}