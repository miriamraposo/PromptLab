import React from 'react';
import { Box, Typography, Paper, TextField } from '@mui/material';

// Otro componente "tonto". Recibe los datos de UNA página y una función para avisar de cambios.
export default function DataEditorPanel({ pageData, onFieldChange }) {

    // Si la página no tiene datos extraídos, mostramos un mensaje.
    if (!pageData || !pageData.analysis.extracted_data || Object.keys(pageData.analysis.extracted_data).length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="text.secondary">No se extrajeron datos de esta página.</Typography>
            </Paper>
        );
    }
    
    // Obtenemos el objeto con los datos extraídos
    const extractedData = pageData.analysis.extracted_data;

    return (
        <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Datos Extraídos (Página {pageData.page_number})
            </Typography>
            <Box component="form" noValidate autoComplete="off">
                {/* 
                  Iteramos sobre el objeto de datos. Esto es flexible, 
                  no importa si los campos son "total", "fecha" o "cliente".
                */}
                {Object.entries(extractedData).map(([key, value]) => (
                    <TextField
                        key={key}
                        fullWidth
                        label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} // total_factura -> Total Factura
                        value={value || ''} // Controlamos que el valor no sea nulo
                        onChange={(e) => onFieldChange(key, e.target.value)}
                        variant="outlined"
                        sx={{ mb: 2.5 }}
                    />
                ))}
            </Box>
        </Paper>
    );
}