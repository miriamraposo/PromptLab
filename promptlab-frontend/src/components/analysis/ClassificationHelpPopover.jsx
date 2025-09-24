// RUTA: src/components/analysis/ClassificationHelpPopover.jsx

import React from 'react';
import { Popover, Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function ClassificationHelpPopover({ open, anchorEl, onClose }) {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
            <Box sx={{ p: 3, maxWidth: 500 }}>
                <Typography variant="h6" gutterBottom>
                    ¿Por qué evaluar un modelo de Clasificación?
                </Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                    Una vez que un modelo ha sido entrenado, necesitamos saber qué tan bien funciona con datos que nunca ha visto. La evaluación mide el <strong>rendimiento</strong> del modelo, nos dice qué tan confiables son sus predicciones y nos ayuda a entender sus fortalezas y debilidades.
                </Typography>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Para qué sirve?
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Generar confianza en las predicciones del modelo antes de usarlo." />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Identificar en qué categorías específicas el modelo es bueno y en cuáles falla." />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Comparar diferentes modelos para elegir el de mejor rendimiento." />
                    </ListItem>
                </List>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Métricas Clave de Clasificación
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText 
                            primary="1. Accuracy (Precisión General)"
                            secondary="El porcentaje total de predicciones correctas. Es la métrica más simple: ¿cuántas veces acertó de cada 100?" 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="2. Precision (Precisión por Clase)"
                            secondary="De todas las veces que el modelo predijo una clase (ej. 'verano'), ¿qué porcentaje era correcto? Es útil para minimizar falsos positivos." 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="3. Recall (Sensibilidad)"
                            secondary="De todas las imágenes que realmente eran de una clase (ej. 'verano'), ¿qué porcentaje encontró el modelo? Es crucial para minimizar falsos negativos." 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="4. F1-Score"
                            secondary="Una media armónica entre Precision y Recall. Ofrece una sola métrica balanceada por clase, muy útil si el número de imágenes por clase es desigual." 
                        />
                    </ListItem>
                     <ListItem>
                        <ListItemText 
                            primary="5. Matriz de Confusión"
                            secondary="Una tabla visual que muestra exactamente qué tipo de errores está cometiendo el modelo (ej. cuántas veces confundió 'invierno' con 'verano')." 
                        />
                    </ListItem>
                </List>

                 <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Cómo se interpreta?
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="1. Observa el Accuracy general para tener una idea global del rendimiento." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="2. Analiza la Precision y Recall por cada clase para encontrar las categorías problemáticas." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="3. Usa la Matriz de Confusión para entender los errores específicos entre clases." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="4. Decide si el rendimiento del modelo es suficiente para tu caso de uso." />
                    </ListItem>
                </List>
            </Box>
        </Popover>
    );
}