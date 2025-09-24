// RUTA: src/components/analysis/DatasetSelectorModal.jsx (VERSIÓN CORREGIDA Y MEJORADA)

import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Grid, Paper, Typography, CircularProgress, Alert, Box, IconButton
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function DatasetSelectorModal({ open, onClose, onDatasetSelect, datasetCategory = 'tabular' }) {
    const [view, setView] = useState('projects');
    const [projects, setProjects] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

            

    useEffect(() => {
        if (open) {
            const fetchProjects = async () => {
                setLoading(true);
                setError(null);
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                        headers: { 'Authorization': `Bearer ${session.access_token}` },
                    });
                    const result = await response.json();
                    if (!result.success) throw new Error(result.error || 'No se pudieron cargar los proyectos.');
                    setProjects(result.data);
                } catch (err) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            };
            fetchProjects();
        } else {
            setView('projects');
            setSelectedProject(null);
            setDatasets([]);
        }
    }, [open]);

    const handleProjectSelect = async (project) => {
        setSelectedProject(project);
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${project.id}/datasets`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'No se pudieron cargar los datasets.');
            
            // ================== ¡LA CORRECCIÓN MÁS IMPORTANTE ESTÁ AQUÍ! ==================
            const filteredDatasets = result.data.filter(d => {
                const type = d.datasetType?.toLowerCase();

                if (datasetCategory === 'tabular') {
                    return ['tabular', 'csv', 'xlsx', 'parquet'].includes(type);
                }
                
                 if (datasetCategory === 'vision') {
                    return ['vision_analysis'].includes(type);
    
                }

                if (datasetCategory === 'text') {
                    return ['text', 'md', 'pdf', 'docx'].includes(type);
                }

                // Si se pasa una categoría no reconocida, no se muestra nada por seguridad.
                return false;
            });
       
            // ============================================================================
            
              setDatasets(filteredDatasets);
            setView('datasets');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    const handleDatasetSelect = (dataset) => {
        // Aprovechamos para normalizar el nombre de la propiedad 'name'
        // El resto del código espera 'name', pero tu API devuelve 'datasetName'
        const normalizedDataset = {
            ...dataset,
            name: dataset.datasetName
        };
        onDatasetSelect(normalizedDataset);
        onClose();
    };

    return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            {view === 'datasets' && (
                <IconButton onClick={() => setView('projects')} sx={{ mr: 1 }}>
                    <ArrowBackIcon />
                </IconButton>
            )}
            {view === 'projects' ? 'Seleccionar un Proyecto' : `Datasets en: ${selectedProject?.projectName}`}
        </DialogTitle>

        <DialogContent dividers sx={{ p: 2, bgcolor: 'grey.50' }}>
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && view === 'projects' && (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
                    <Grid container spacing={2}>
                        {projects.length > 0 ? projects.map(project => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }}key={project.id}>
                                <Paper
                                    onClick={() => handleProjectSelect(project)}
                                    sx={{
                                        width: '100%',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }
                                    }}
                                    elevation={2}
                                >
                                    <FolderIcon sx={{ mr: 2, color: 'primary.main' }} />
                                    <Typography variant="body1" fontWeight="500">{project.projectName}</Typography>
                                </Paper>
                            </Grid>
                        )) : (
                            <Grid size={{ xs: 12}}>
                                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    No se encontraron proyectos.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}

            {!loading && !error && view === 'datasets' && (
                <Box sx={{ maxHeight: 400, overflowY: 'auto', p: 1 }}>
                    <Grid container spacing={2}>
                        {datasets.length > 0 ? datasets.map(dataset => (
                            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={dataset.datasetId}>
                                <Paper
                                    onClick={() => handleDatasetSelect(dataset)}
                                    sx={{
                                        width: '100%',
                                        p: 2,
                                        display: 'flex',
                                        alignItems: 'center',
                                        cursor: 'pointer',
                                        transition: '0.3s',
                                        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' }
                                    }}
                                    elevation={2}
                                >
                                    <ArticleIcon sx={{ mr: 2, color: 'secondary.main' }} />
                                    <Box>
                                        <Typography variant="body2" fontWeight="500">{dataset.datasetName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{dataset.datasetType}</Typography>
                                    </Box>
                                </Paper>
                            </Grid>
                        )) : (
                           <Grid size={{ xs: 12 }}>
                                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    Este proyecto no contiene datasets tabulares.
                                </Typography>
                            </Grid>
                        )}
                    </Grid>
                </Box>
            )}
        </DialogContent>

        <DialogActions>
            <Button onClick={onClose}>Cancelar</Button>
        </DialogActions>
    </Dialog>
);
}