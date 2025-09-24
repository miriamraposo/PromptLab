// RUTA: src/pages/EvaluateVisionModelPage.jsx

import React, { useState } from 'react'; // <-- AÑADIMOS useState
import { useParams, Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
// --- CORRECCIÓN 1: AÑADIMOS Paper, Tabs, Tab a la lista de imports ---
import { Box, Typography, Breadcrumbs, Link, Tabs, Tab, Paper } from '@mui/material';
import EvaluateVisionModel from '../components/analysis/EvaluateVisionModel';
import PredictVisionBatch from '../components/analysis/PredictVisionBatch';



// Un pequeño componente auxiliar para el contenido de las pestañas
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function EvaluateVisionModelPage() {
    const { modelId } = useParams();
    const navigate = useNavigate();
    const location = useLocation(); // <-- Usa el hook
    // --- CORRECCIÓN 2: AÑADIMOS EL ESTADO Y LA FUNCIÓN PARA LAS PESTAÑAS ---
    const [activeTab, setActiveTab] = useState(0);
    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const modelDataFromState = location.state?.modelData;

    

   return (
        <Box sx={{ p: 3, flexGrow: 1, mt: "72px" }}>
            <Box sx={{ mb: 3 }}>
                {/* Tus Breadcrumbs están bien, pero los actualizamos un poco */}
                <Breadcrumbs aria-label="breadcrumb">
                    <Link component={RouterLink} underline="hover" color="inherit" to="/models">
                        Mis Modelos
                    </Link>
                    <Typography color="text.primary">
                        Dashboard del Modelo de Visión
                    </Typography>
                </Breadcrumbs>
                 {/* Mostramos el nombre del modelo aquí arriba para dar contexto */}
                 <Typography variant="h5" fontWeight="bold" sx={{ mt: 2 }}>
                    Modelo: {modelDataFromState?.modelName || `ID: ...${modelId.slice(-6)}`}
                </Typography>
            </Box>

             {/* --- ESTRUCTURA DE PESTAÑAS (Ahora funcionará) --- */}
            <Paper>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {/* CORRECCIÓN 3: 'Tab' también debe ser importado (ya lo hicimos arriba) */}
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="dashboard del modelo">
                        <Tab label="Evaluar Rendimiento" />
                        <Tab label="Predecir con Nuevo Dataset" />
                    </Tabs>
                </Box>
                
                {/* El resto de tu JSX está perfecto */}
                <TabPanel value={activeTab} index={0}>
                    <EvaluateVisionModel 
                        modelId={modelId} 
                        initialModelData={modelDataFromState} 
                    />
                </TabPanel>
                <TabPanel value={activeTab} index={1}>
                    <PredictVisionBatch 
                        modelId={modelId} 
                    />
                </TabPanel>
            </Paper>
        </Box>
    );
}
