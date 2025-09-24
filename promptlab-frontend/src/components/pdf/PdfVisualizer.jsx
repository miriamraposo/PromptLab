import React from 'react';
import { Box, Typography, Paper, Button, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// Este es un componente "tonto". Recibe todo lo que necesita como props.
export default function PdfVisualizer({ pages, selectedPageIndex, onPageChange }) {
    
    // Si no hay páginas, no mostramos nada.
    if (!pages || pages.length === 0) {
        return <Typography>No hay páginas para mostrar.</Typography>;
    }

    const currentPage = pages[selectedPageIndex];
    const totalPages = pages.length;
    
    const handlePrevious = () => {
        // Le avisa al padre que queremos ir a la página anterior.
        onPageChange(selectedPageIndex - 1);
    };

    const handleNext = () => {
        // Le avisa al padre que queremos ir a la página siguiente.
        onPageChange(selectedPageIndex + 1);
    };

    return (
        <Paper elevation={3} sx={{ p: 2, position: 'sticky', top: '20px' }}>
            {/* --- Controles de Paginación --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={handlePrevious} disabled={selectedPageIndex === 0}>
                    <ArrowBackIosNewIcon />
                </IconButton>
                <Typography variant="h6" component="div">
                    Página <strong>{selectedPageIndex + 1}</strong> de {totalPages}
                </Typography>
                <IconButton onClick={handleNext} disabled={selectedPageIndex >= totalPages - 1}>
                    <ArrowForwardIosIcon />
                </IconButton>
            </Box>

            {/* --- Visor de Imagen --- */}
            <Box sx={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
                 <img 
                    src={`data:image/png;base64,${currentPage.analysis.image_base64}`} 
                    alt={`Página ${currentPage.page_number}`}
                    style={{ width: '100%', display: 'block' }}
                />
            </Box>
        </Paper>
    );
}