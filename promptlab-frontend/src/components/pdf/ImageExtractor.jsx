// En src/components/pdf/ImageExtractor.jsx

import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Button, CircularProgress, Alert } from '@mui/material';
import { supabase } from '../../supabaseClient'; // Ajusta la ruta si es necesario
import UploadImagesModal from '../dashboard/UploadImagesModal';

export default function ImageExtractor({ projectId, datasetId }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [extractedImages, setExtractedImages] = useState([]);
    
    // Estados para el modal
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    useEffect(() => {
        const extractImagesFromPdf = async () => {
            setLoading(true);
            setError(null);
            try {
                // --- AQUÍ VA LA LÓGICA QUE YA CONOCES ---
                // 1. Obtener el token de Supabase.
                // 2. Descargar el PDF desde '/api/datasets/.../download'.
                // 3. Enviar el PDF con FormData a '/api/pdf/extract-images'.
                // 4. Guardar el resultado (result.images) en el estado 'setExtractedImages'.
                
                // Por ahora, simulamos el resultado para construir la UI:
                // const result = { images: [...] }; // Simulación
                // setExtractedImages(result.images);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        extractImagesFromPdf();
    }, [datasetId]);

    const handleSaveToGallery = () => {
        // Simplemente abre el modal. El modal ya sabe qué hacer
        // porque le pasaremos las imágenes en la prop 'initialFiles'.
        setIsUploadModalOpen(true);
    };

    const handleUploadComplete = () => {
        // Lógica para después de que el modal termina
        
    };

    if (loading) return <CircularProgress />;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Paper sx={{ p: 2, mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">
                    {extractedImages.length} Imágenes Encontradas
                </Typography>
                <Button 
                    variant="contained" 
                    onClick={handleSaveToGallery}
                    disabled={extractedImages.length === 0}
                >
                    Guardar en Galería
                </Button>
            </Paper>

            <Grid container spacing={2}>
                {extractedImages.map((img) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={img.id}>
                        <Paper elevation={3} sx={{ overflow: 'hidden' }}>
                            <img 
                                src={`data:image/${img.extension};base64,${img.image_base64}`} 
                                alt={`Imagen de la página ${img.page_number}`}
                                style={{ width: '100%', height: 'auto', display: 'block' }}
                            />
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            <UploadImagesModal
                open={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                projectId={projectId}
                onUploadComplete={handleUploadComplete}
                initialFiles={extractedImages}
            />
        </Box>
    );
}