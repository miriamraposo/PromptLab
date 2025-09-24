import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// Importa los componentes que crearemos a continuación
import ModelSummary from '../components/analysis/ModelSummary';
import InteractiveTools from '../components/analysis/InteractiveTools';
import { PaginaConAsistente } from '../layouts/PaginaConAsistente';
import { Box, Typography, Grid, CircularProgress, Alert, Button, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function ModelAnalysisPage() {
  const { modelId } = useParams(); // Obtiene el ID del modelo desde la URL
  const [modelDetails, setModelDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Si no hay modelId, no hacemos nada.
    if (!modelId) {
        setLoading(false);
        setError("No se ha especificado un ID de modelo.");
        return;
    }
      
    const fetchModelDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No estás autenticado.");

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelId}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudo cargar la información del modelo.');
        }
        
        // 1. Limpiamos los nombres de las características
        const cleanedFeatures = result.data.features.map(feature => ({
        ...feature,
        name: feature.name.trim() // trim() elimina espacios al inicio y al final
}));

// 2. Creamos una nueva versión de los datos con las características limpias
       const cleanedModelData = { ...result.data, features: cleanedFeatures };

       
        setModelDetails(cleanedModelData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchModelDetails();
  }, [modelId]); // Se ejecuta cada vez que el modelId de la URL cambia

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
    return (
     <PaginaConAsistente nombreModulo="sensibilidad">
    <Box
      sx={(theme) => ({
    pt: 3,
    px: 3,
    pb: 3,
    mt: '50px',
    backgroundColor: theme.palette.mode === 'dark' ? '#424242' : '#e0e0e0', // gris medio en oscuro
  })}

    >
      {/* La cabecera con Breadcrumbs no necesita cambios */}
      <Box sx={{ mb: 2, p:1 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
                component={RouterLink}
                underline="hover"
                to="/models"
                 sx={(theme) => ({
                 color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.primary,
  })}
                >
                 Mis Modelos
                </Link>

                 <Typography   sx={(theme) => ({
                 color: theme.palette.mode === 'dark' ? theme.palette.text.primary : theme.palette.text.primary,
  })}>
                  Análisis de: <strong>{modelDetails ? modelDetails.modelName : 'Cargando...'}</strong>
                 </Typography>
        </Breadcrumbs>
      </Box>

      {/* CAMBIO: Este Box ya no necesita flexGrow ni overflow. Solo es un contenedor. */}
      <Box sx={{ border: '1px solid', borderColor: 'primary.main' }}>
        {error ? (
          <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
        ) : modelDetails ? (
            // InteractiveTools ahora determinará la altura.
            <InteractiveTools model={modelDetails} projectId={modelDetails.project_id} />
        ) : (
          <Typography>No se encontraron detalles del modelo.</Typography>
        )}
      </Box>
    </Box>
    </PaginaConAsistente>
  );
}