import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, CircularProgress, Alert, Button, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function PromptDetailPage() {
    const { promptId } = useParams(); // Obtiene el ID del prompt desde la URL
    const navigate = useNavigate();
    const [promptData, setPromptData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPromptDetail = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("No estás autenticado.");

                // Usaremos un nuevo endpoint para obtener un solo item
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/promptlab/history/${promptId}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` },
                });

                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.error || 'No se pudo cargar el detalle del prompt.');
                }
                setPromptData(result.data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (promptId) {
            fetchPromptDetail();
        }
    }, [promptId]);

    return (
        <Box sx={{ p: 3, pt: `calc(72px + 0px)` }}>
            {/* --- Encabezado con Título y Botón de Volver --- */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">Detalle del Prompt</Typography>
                    <Typography variant="body1" color="text.secondary">
                        {promptData?.titulo_personalizado || "Sin Título"}
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
                    Volver al Historial
                </Button>
            </Box>

            {/* --- Contenido --- */}
            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}
            
            {promptData && (
                <Paper sx={{ p: 3 ,border: '1px solid',                // ancho 1px + estilo sólido
    borderColor: 'primary.main', }}>
                    <Box sx={{ display: 'flex', gap: 4 ,}}>
                        {/* Columna Izquierda: Prompt y Sistema */}
                        <Box sx={{ flex: 1 ,}}>
                            <Typography variant="h6" gutterBottom>Prompt del Usuario</Typography>
                            <Typography sx={{ whiteSpace: 'pre-wrap', mb: 4, fontFamily: 'monospace' }}>
                                {promptData.pregunta_de_usuario}
                            </Typography>
                            
                            <Divider sx={{ my: 2 }} />

                            <Typography variant="h6" gutterBottom>Instrucciones al Modelo</Typography>
                            <Typography sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                                {promptData.indicador_del_sistema}
                            </Typography>
                        </Box>

                        {/* Columna Derecha: Respuesta de la IA */}
                        <Box sx={{ flex: 1.5, borderLeft: '1px solid #ddd', pl: 4 }}>
                            <Typography variant="h6" gutterBottom>Respuesta de la IA</Typography>
                            <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                {promptData.respuesta_ai}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}