//src/components/analysis/ConfidenceHelpPopover.jsx` 


import React from 'react';
import { Popover, Box, Typography, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // Un icono más genérico
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';

export default function ConfidenceHelpPopover({ open, anchorEl, onClose }) {
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
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <HelpOutlineIcon sx={{ mr: 1, color: 'primary.main' }} />
                    ¿Qué significa la "Confianza"?
                </Typography>
                <Typography 
  variant="body2" 
  paragraph 
  color="text.secondary" 
  sx={{ whiteSpace: "pre-line" }}
>
  {`El puntaje de confianza no es "seguridad", sino un cálculo de probabilidad. 
Es la forma que tiene el modelo de decir: 
"Basado en los ejemplos con los que he aprendido, 
esta es la probabilidad de que mi respuesta sea la correcta".`}
</Typography>

                <Divider sx={{ my: 2 }} />

                <List dense>
                    <ListItem>
                        <ListItemIcon>
                       <ThumbUpOffAltIcon fontSize="small" color="success" />
                        </ListItemIcon>
                        <ListItemText
                         primary="¿Por qué acierta con CONFIANZA BAJA?"
                         secondary={`Suele pasar con imágenes ambiguas (ej: una camisa de verano con colores oscuros).
                         El modelo ve características de ambas categorías y duda.
                            ¡Estas son las imágenes perfectas para añadir más ejemplos al entrenamiento!`}
                            secondaryTypographyProps={{ sx: { whiteSpace: "pre-line" } }}
                           />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon><ThumbDownOffAltIcon fontSize="small" color="error" /></ListItemIcon>
                        <ListItemText 
  primary="¿Por qué se equivoca con CONFIANZA 'ALTA'?"
  secondary={`Ocurre cuando una característica (un color, un patrón) está muy asociada con la clase incorrecta en los datos de entrenamiento.
El modelo se 'fija' en ese detalle y toma la decisión equivocada.`}
  secondaryTypographyProps={{ sx: { whiteSpace: "pre-line" } }}
/>
                    </ListItem>
                </List>
                
                <Typography 
  variant="body2" 
  sx={{ mt: 2, mb: 2, fontWeight: 'bold', textAlign: 'center', color: 'text.primary' }}
>
  La Regla de Oro: Un modelo es tan bueno como los datos con los que aprende.
</Typography>
            </Box>
        </Popover>
    );
}