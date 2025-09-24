// RUTA: src/components/analysis/HelpPopover.jsx

import React from 'react';
import { Popover, Box, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

// Este componente recibe el estado del Popover desde su padre
export default function HelpPopover({ open, anchorEl, onClose }) {
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
                    ¿Qué es la "Predicción por Lotes"?
                </Typography>
                 <Typography variant="body2" paragraph color="text.secondary">
  Es como proporcionarle a tu modelo una lista de 1.000 clientes y pedirle que indique, para cada uno, si considera que realizará una compra.<br />
  El modelo analiza la lista completa y devuelve un informe con la respuesta para cada cliente en un solo paso.<br />
  <strong>Importante:</strong> el modelo solo puede predecir con precisión sobre datos que sigan el mismo formato y características con los que fue entrenado.
</Typography>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Para qué me sirve?
                </Typography>
                <Typography variant="body2" paragraph color="text.secondary">
                    Esta herramienta te ahorra horas de trabajo y te permite tomar decisiones a gran escala. Por ejemplo:
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Ventas y Marketing: Descubre qué clientes tienen más probabilidad de comprar." />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Operaciones: Estima la demanda de tus productos para la próxima semana." />
                    </ListItem>
                     <ListItem>
                        <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="primary" /></ListItemIcon>
                        <ListItemText primary="Salud: Identifica pacientes con mayor riesgo de una determinada condición." />
                    </ListItem>
                </List>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    ¿Cómo se usa?
                </Typography>
                 <List dense>
                    <ListItem>
                        <ListItemText primary="1. Selecciona el Dataset: Haz clic en 'Seleccionar Dataset' y elige el archivo de tu workspace." />
                    </ListItem>
                     <ListItem>
                        <ListItemText primary="2. Genera las Predicciones: Pulsa el botón para que el sistema analice cada fila." />
                    </ListItem>
                     <ListItem>
                        <ListItemText primary="3. Revisa y Descarga: Los resultados aparecerán en la tabla ¡Ya puedes descargarlos!" />
                    </ListItem>
                </List>
            </Box>
        </Popover>
    );
}