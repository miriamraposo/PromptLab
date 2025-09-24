// src/components/InitialReport.tsx
import React from 'react';
import { Box, Typography, Button, Paper, List, ListItem, ListItemIcon, ListItemText, Divider, Alert } from '@mui/material';
import { CheckCircleOutline, ErrorOutline, DeleteForever, AutoFixHigh } from '@mui/icons-material';
import { PreliminaryAnalysis, deleteColumns } from '../api/projectApi'; // Importamos la acción

interface InitialReportProps {
    analysis: PreliminaryAnalysis;
    projectId: string;
    onStartCleaning: (projectId: string) => void;
}

function InitialReport({ analysis, projectId, onStartCleaning }: InitialReportProps) {

    const handleDeleteDuplicates = async () => {
        // Aquí llamarías a la acción de borrar duplicados.
        // Como ejemplo, vamos a llamar a la acción de borrar columnas que creamos.
        try {
            // Esta es la llamada real a la API que definimos
            const response = await deleteColumns(projectId, ["columna_inutil_1", "columna_inutil_2"]);
            if (response.success) {
                alert(`¡Acción completada! ${response.message}`);
                // Aquí deberías recargar el análisis del proyecto o navegar a otro estado
            } else {
                alert(`Error: ${response.message}`);
            }
        } catch (err: any) {
            alert(`Error de red: ${err.message}`);
        }
    };


    const { duplicates_summary, nulls_summary } = analysis;

    return (
        <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
            <Typography variant="h5" component="h2" gutterBottom>
                ✅ Archivo Cargado (ID: {projectId})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
                <ListItem>
                    <ListItemIcon>
                        {duplicates_summary.count > 0 ? <ErrorOutline color="warning" /> : <CheckCircleOutline color="success" />}
                    </ListItemIcon>
                    <ListItemText
                        primary="Filas Duplicadas"
                        secondary={`${duplicates_summary.count} (${duplicates_summary.percentage}%)`}
                    />
                </ListItem>
                <ListItem>
                    <ListItemIcon>
                        {nulls_summary.total_count > 0 ? <ErrorOutline color="warning" /> : <CheckCircleOutline color="success" />}
                    </ListItemIcon>
                    <ListItemText
                        primary="Celdas con Valores Nulos"
                        secondary={`${nulls_summary.total_count} (${nulls_summary.total_percentage.toFixed(2)}%)`}
                    />
                </ListItem>
            </List>

            {duplicates_summary.count > 0 &&
                <Alert severity="warning" sx={{ my: 2 }}>
                    Se encontraron duplicados. Se recomienda eliminarlos antes de continuar.
                </Alert>
            }

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                    variant="contained"
                    color="secondary"
                    startIcon={<DeleteForever />}
                    onClick={handleDeleteDuplicates} // <- ¡ACCIÓN CONECTADA!
                >
                    Eliminar Duplicados (Ejemplo)
                </Button>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AutoFixHigh />}
                    onClick={() => onStartCleaning(projectId)}
                >
                    Iniciar Asistente de Limpieza
                </Button>
            </Box>
        </Paper>
    );
}

export default InitialReport;