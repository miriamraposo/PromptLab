// src/components/dashboard/ProjectPropertiesPanel.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Typography, Divider, Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProjectPropertiesPanel({ project, onRenameClick, onDeleteClick }) {
    if (!project) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                <Typography color="text.primary" textAlign="center">
                    Selecciona un proyecto de la lista para ver sus detalles y acciones.
                </Typography>
            </Paper>
        );
    }

    return (
        <Paper sx={{ height: '100%', p: 2 }}>
            <Typography variant="h6" fontWeight="bold">Propiedades del Proyecto</Typography>
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle2" color="text.secondary">Nombre:</Typography>
            <Typography gutterBottom>{project.projectName}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Tipo:</Typography>
            <Typography gutterBottom>{project.projectType || 'No especificado'}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>Creado el:</Typography>
            <Typography gutterBottom>
                {project.createdAt ? format(new Date(project.createdAt), "d 'de' MMMM, yyyy", { locale: es }) : 'N/A'}
            </Typography>

            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" fontWeight="bold">Acciones</Typography>
            <Stack spacing={1} sx={{ mt: 2 }}>
                <Button variant="outlined" startIcon={<EditIcon />} onClick={onRenameClick}>
                    Renombrar
                </Button>
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={onDeleteClick}>
                    Eliminar
                </Button>
            </Stack>
        </Paper>
    );
}

ProjectPropertiesPanel.propTypes = {
    project: PropTypes.object,
    onRenameClick: PropTypes.func.isRequired,
    onDeleteClick: PropTypes.func.isRequired,
};