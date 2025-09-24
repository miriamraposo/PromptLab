// RUTA NUEVA: src/pages/PredictVisionBatchPage.jsx
import React from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import PredictVisionBatch from '../components/analysis/PredictVisionBatch'; // El componente que crearemos a continuación

// Esta página es muy similar a EvaluateVisionModelPage, actúa como un contenedor
export default function PredictVisionBatchPage() {
    const { modelId } = useParams();
    const navigate = useNavigate();
    
    // Podrías cargar los detalles del modelo aquí si quieres mostrar su nombre,
    // pero para simplificar, vamos a pasar directamente al componente de lógica.

    return (
        <Box sx={{ p: 2,  flexGrow: 1, mt: "72px" }}>
            <Box sx={{ mb: 3,border: 1, p:3,         // esto define 1px sólido con color por defecto
    borderColor: 'primary.main', 
    borderRadius: 2,   }}>
                <Breadcrumbs aria-label="breadcrumb">
                    <Link component={RouterLink} underline="hover" color="inherit" to="/models">
                        Mis Modelos
                    </Link>
                    <Typography color="text.primary">
                        Predicción por Lote (Visión)
                    </Typography>
                </Breadcrumbs>
            </Box>

            <PredictVisionBatch modelId={modelId} />
        </Box>
    );
}


