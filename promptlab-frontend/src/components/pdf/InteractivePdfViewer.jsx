// Crea un nuevo archivo: /components/pdf/InteractivePdfViewer.jsx

import React from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

// Ahora recibe la página completa, no solo el array de páginas
function InteractivePdfViewer({ currentPage, totalPages, onPageChange, selectedPageIndex }) {
    
    if (!currentPage) {
        return <Typography>Cargando página...</Typography>;
    }

    const handlePrevious = () => onPageChange(selectedPageIndex - 1);
    const handleNext = () => onPageChange(selectedPageIndex + 1);

    // Extraemos los datos que necesitamos de la página actual
    const { image_base64, width: pageWidth, height: pageHeight } = currentPage.analysis;
    const textBlocks = currentPage.analysis.blocks || []; // Los bloques de texto con sus coordenadas

    return (
        <Paper elevation={3} sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column', border: '2px solid #2196f3' }}>
            {/* --- Controles de Paginación (sin cambios) --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexShrink: 0 }}>
                <IconButton onClick={handlePrevious} disabled={selectedPageIndex === 0}>
                    <ArrowBackIosNewIcon />
                </IconButton>
                <Typography variant="h6">
                    Página <strong>{selectedPageIndex + 1}</strong> de {totalPages}
                </Typography>
                <IconButton onClick={handleNext} disabled={selectedPageIndex >= totalPages - 1}>
                    <ArrowForwardIosIcon />
                </IconButton>
            </Box>

            {/* --- Visor Interactivo --- */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', textAlign: 'center' }}>
              {/* 
                Este contenedor es la clave. Su posición relativa nos permite
                posicionar las capas de texto de forma absoluta dentro de él.
              */}
              <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  
                  {/* 1. La imagen del PDF, como fondo. No es interactiva. */}
                  <img 
                      src={`data:image/png;base64,${image_base64}`} 
                      alt={`Página ${currentPage.page_number}`}
                      style={{ width: '100%', userSelect: 'none' }} // userSelect:none evita que se pueda arrastrar la imagen
                  />

                  {/* 2. La capa de texto invisible y seleccionable */}
                  {textBlocks.map((block, index) => {
                      // El bbox viene como [x0, y0, x1, y1] en píxeles.
                      // Lo convertimos a porcentajes para que sea responsivo.
                      const style = {
                          position: 'absolute',
                          left: `${(block.bbox[0] / pageWidth) * 100}%`,
                          top: `${(block.bbox[1] / pageHeight) * 100}%`,
                          width: `${((block.bbox[2] - block.bbox[0]) / pageWidth) * 100}%`,
                          height: `${((block.bbox[3] - block.bbox[1]) / pageHeight) * 100}%`,
                          // Hacemos que el texto sea seleccionable pero no visible
                          color: 'transparent',
                          userSelect: 'text', // ¡La propiedad mágica!
                      };

                      return (
                          <div key={index} style={style}>
                              {block.lines.map(line => line.text).join(' ')}
                          </div>
                      );
                  })}
              </Box>
            </Box>
        </Paper>
    );
}
export default React.memo(InteractivePdfViewer);