// RUTA: src/components/analysis/ModelSummary.js

import React from 'react';
import { Paper, Typography, Box, List, ListItem, ListItemText, Divider, Chip } from '@mui/material';
import FunctionsIcon from '@mui/icons-material/Functions';
import CategoryIcon from '@mui/icons-material/Category';

// Este componente auxiliar está corregido para evitar errores de HTML
const InfoItem = ({ label, value, children }) => (
  <>
    <ListItem disablePadding>
      <ListItemText
        primary={label}
        secondary={children || <Typography component="span" variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>{value}</Typography>}
        sx={{ my: 0.5 }}
        secondaryTypographyProps={{ component: 'div' }} 
      />
    </ListItem>
    <Divider component="li" />
  </>
);

export default function ModelSummary({ model }) {
    // Agregamos una guarda de seguridad extra robusta
    if (!model) {
        return <Paper sx={{p: 2, height: '100%'}}><Typography>Cargando detalles del modelo...</Typography></Paper>;
    }

    // --- USANDO LOS NOMBRES DE PROPIEDADES CORRECTOS ---
    const mainMetric = model.problemType === 'clasificacion'
        ? { label: "Precisión General", value: `${(model.evaluationResults?.accuracy * 100 || 0).toFixed(1)}%` }
        : { label: "Calidad del Modelo (R²)", value: (model.evaluationResults?.r2_score || 0).toFixed(3) };

    const problemTypeChip = (
        <Chip
          icon={model.problemType === 'clasificacion' ? <CategoryIcon /> : <FunctionsIcon />}
          label={model.problemType === 'clasificacion' ? 'Clasificación' : 'Regresión'}
          color={model.problemType === 'clasificacion' ? 'secondary' : 'primary'}
          size="small"
        />
    );

    return (
        <Paper 
            sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',// MUY IMPORTANTE
                background: "linear-gradient(135deg, #26717a, #44a1a0)",
            }}
        >
            {/* Título Fijo */}
            <Box sx={{ p: 2.5, pb: 2, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6">Resumen del Modelo</Typography>
            </Box>

            {/* Contenido con SCROLL GARANTIZADO */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2.5, pt: 1 }}>
                <List dense>
                    {/* --- USANDO LOS NOMBRES DE PROPIEDADES CORRECTOS --- */}
                    <InfoItem label="Nombre" value={model.modelName} />
                    <InfoItem label="Proyecto" value={model.projectName} />
                    <InfoItem label="Fecha de Creación" value={new Date(model.createdAt).toLocaleString()} />
                    <Divider component="li" sx={{ my: 1, borderColor: 'transparent' }} />
                    <InfoItem label="Tipo de Problema">{problemTypeChip}</InfoItem>
                    <InfoItem label="Variable Objetivo" value={model.targetColumn} />
                    <InfoItem label={mainMetric.label} value={mainMetric.value} />
                    <Divider component="li" sx={{ my: 1, borderColor: 'transparent' }} />
                    <InfoItem label="Nº de Características Usadas" value={model.features?.length || 0} />
                </List>
            </Box>
        </Paper>
    );
}