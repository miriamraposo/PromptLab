// RUTA: src/components/analysis/ClusteringHelpPopover.jsx

import React from 'react';
import { Popover, Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export default function ClusteringHelpPopover({ open, anchorEl, onClose }) {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
        >
            <Box sx={{ p: 3, maxWidth: 500 }}>
                <Typography variant="h6" gutterBottom>
                    ¿Por qué evaluar un modelo de Clustering?
                </Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                    El <strong>clustering</strong> es una técnica no supervisada que agrupa elementos según su similitud.
                    Pero no basta con formar grupos: necesitamos medir si esos grupos realmente tienen sentido y son útiles.
                    Evaluar un modelo de clustering  ayuda a saber si los clústeres son compactos, están bien separados
                    y si aportan valor a la toma de decisiones.
                </Typography>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Para qué  sirve?
                </Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                    Una buena evaluación  permite:
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Detectar si los clústeres tienen sentido real (clientes parecidos entre sí, productos similares, etc.)." />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Comparar distintos algoritmos y elegir el más adecuado para tus datos." />
                    </ListItem>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Evitar sobreajustes o segmentaciones artificiales que no aporten valor." />
                    </ListItem>
                </List>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    Métricas más utilizadas
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText 
                            primary="1. Silhouette Score"
                            secondary="Mide qué tan similares son los puntos dentro de un clúster en comparación con otros clústeres. Valores cercanos a 1 indican buena separación." 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="2. Davies-Bouldin Index"
                            secondary="Evalúa la compacidad y separación de los clústeres. Mientras más bajo, mejor es la calidad del clustering." 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="3. Calinski-Harabasz Index"
                            secondary="Mide la dispersión entre clústeres en relación con la dispersión dentro de cada uno. Valores altos indican clústeres bien definidos." 
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText 
                            primary="4. Inercia (SSE)"
                            secondary="Utilizada en K-Means: mide la suma de las distancias al centroide. Valores más bajos indican grupos más compactos." 
                        />
                    </ListItem>
                </List>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Cómo se interpreta?
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="1. Ejecuta el modelo de clustering." />
                    </ListItem>
                   <ListItem>
  <ListItemText primary="1. El sistema agrupa automáticamente los datos o imágenes en grupos similares." />
</ListItem>
<ListItem>
  <ListItemText primary="2. Evalúa qué tan bien se formaron estos grupos con métricas claras." />
</ListItem>
<ListItem>
  <ListItemText primary="3. Permite comparar distintas configuraciones o métodos para ver cuál funciona mejor." />
</ListItem>
<ListItem>
  <ListItemText primary="4. Ayuda a elegir la opción que logra un equilibrio entre simplicidad y precisión de los resultados." />
</ListItem>

                </List>
            </Box>
        </Popover>
    );
}
