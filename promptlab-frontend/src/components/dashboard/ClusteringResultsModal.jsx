// src/components/dashboard/ClusteringResultsModal.jsx


import React, { useState, useEffect } from 'react';
import { Alert } from '@mui/material';

import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Tooltip,
  Chip, Accordion, AccordionSummary, AccordionDetails,
  IconButton, TextField,  CircularProgress 
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ClusterTabularesScatterPlot from '../analysis/charts/ClusterTabularesScatterPlot';
import { supabase } from '../../supabaseClient';


// <<< 1. Copiamos tu componente MetricDisplay aquí (o lo importamos si lo separaste)
function MetricDisplay({ title, value, subtitle, sx }) {
    return (
        <Paper 
            variant="outlined" 
            sx={{ p: 1.5, textAlign: 'center', height: '100%', ...sx }}
        >
            <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600 }}>{title}</Typography>
            <Typography variant="h5" component="p" fontWeight="bold" sx={{ my: 0.5 }}>{value ?? '—'}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        </Paper>
    );
}

function NumericSummaryTable({ data }) {
    // data aquí es el objeto `numeric_summary` de un clúster
    if (!data || Object.keys(data).length === 0) {
        return <Typography variant="caption">No hay datos numéricos en este grupo.</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Variable Numérica</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Media</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Desv. Estándar</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Mín.</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Máx.</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.entries(data).map(([colName, stats]) => (
                        <TableRow key={colName}>
                            <TableCell>{colName}</TableCell>
                            <TableCell align="right">{stats.mean?.toFixed(2) ?? 'N/A'}</TableCell>
                            <TableCell align="right">{stats.std?.toFixed(2) ?? 'N/A'}</TableCell>
                            <TableCell align="right">{stats.min?.toFixed(2) ?? 'N/A'}</TableCell>
                            <TableCell align="right">{stats.max?.toFixed(2) ?? 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// <<< 2. NUEVO SUB-COMPONENTE para el resumen categórico
function CategoricalSummaryTable({ data }) {
    // data aquí es el objeto `categorical_summary` de un clúster
    if (!data || Object.keys(data).length === 0) {
        return <Typography variant="caption">No hay datos categóricos en este grupo.</Typography>;
    }

    return (
        <TableContainer component={Paper} variant="outlined" sx={{ mt: 2 }}>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Variable Categórica</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Valor Más Común (Moda)</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {Object.entries(data).map(([colName, mostCommonValue]) => (
                        <TableRow key={colName}>
                            <TableCell>{colName}</TableCell>
                            <TableCell>{mostCommonValue ?? 'N/A'}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}


// <<< 2. El componente principal del Modal
export default function ClusteringResultsModal({ open, onClose, results, onSave, initialProjectName, initialModelName }) {
    const [projectName, setProjectName] = useState(initialProjectName || '');
    const [modelName, setModelName] = useState(initialModelName || '');
    const [isSaving, setIsSaving] = useState(false);
    const [suggestions, setSuggestions] = useState({});
     
    const [isSuggesting, setIsSuggesting] = useState(null); // Para el loader de la IA
    
    // Un objeto vacío
    const handleSuggestLabels = async (clusterName, clusterDetails) => {
        setIsSuggesting(clusterName);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida para sugerir etiquetas.");

            const url = `${import.meta.env.VITE_API_URL}/api/clustering/suggest-labels`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(clusterDetails) // Enviamos el summary del clúster
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.error || "La IA no pudo generar sugerencias.");

            setSuggestions(prev => ({
                ...prev,
                [clusterName]: result.data.suggested_labels
            }));

        } catch (error) {
            console.error("Error al sugerir etiquetas:", error);
            // Aquí podrías usar tu `showNotification` si lo pasas como prop
        } finally {
            setIsSuggesting(null);
        }
    };

    useEffect(() => {
        setProjectName(initialProjectName || '');
        setModelName(initialModelName || '');
    }, [initialProjectName, initialModelName, open]); // Se resetea cada vez que se abre

    const handleSaveClick = async () => {
        setIsSaving(true);
        // Llama a la función del padre pasándole los nombres
        const success = await onSave(projectName, modelName);
        if (success) {
            onClose(); // El padre le dice si debe cerrarse
        }
        setIsSaving(false);
    };

    if (!results) {
            return null;
        }

    const { metrics, n_clusters, summary, plot_coords, cluster_labels } = results;
    

   return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>
            <Typography variant="h6" component="div" fontWeight="bold">
                Métricas de Calidad Detalladas
            </Typography>
        </DialogTitle>

        <DialogContent dividers>
            {/* --- SECCIÓN 1: ALERTA INFORMATIVA (CORREGIDA) --- */}
            {/* Solo se muestra si hay una clave "Ruido" en el resumen (señal de DBSCAN) */}
            {summary && summary['Ruido'] && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>¡Análisis de Descubrimiento Completado!</strong><br />
                    Se encontraron <strong>{n_clusters} grupos principales</strong>. También se identificaron <strong>{summary['Ruido'].n_samples}</strong> datos "Ruido" (atípicos) que no encajan en ningún grupo. ¡Suelen ser los más interesantes para analizar!
                </Alert>
            )}
      
     <Box
  sx={{
    display: "flex",
    gap: 2,
    flexWrap: "wrap",
    justifyContent: "center",
    mb: 4,
  }}
>
  <MetricDisplay
    title="Grupos Encontrados"
    value={n_clusters}
    subtitle="Cantidad de segmentos generados."
    sx={{
      flex: 1,
      minWidth: 180,
      background: "linear-gradient(145deg, #f0f4f8, #d9e2ec)",
      borderRadius: 2,
      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
      p: 2,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
      },
    }}
  />
  <MetricDisplay
    title="Silhouette Score"
    value={metrics?.silhouette_score?.toFixed(3) ?? "N/A"}
    subtitle="Más alto es mejor (máx. 1)"
    sx={{
      flex: 1,
      minWidth: 180,
      background: "linear-gradient(145deg, #f0f4f8, #d9e2ec)",
      borderRadius: 2,
      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
      p: 2,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
      },
    }}
  />
  <MetricDisplay
    title="Índice Davies-Bouldin"
    value={metrics?.davies_bouldin_index?.toFixed(3) ?? "N/A"}
    subtitle="Más bajo es mejor (ideal 0)"
    sx={{
      flex: 1,
      minWidth: 180,
      background: "linear-gradient(145deg, #f0f4f8, #d9e2ec)",
      borderRadius: 2,
      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
      p: 2,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
      },
    }}
  />
  <MetricDisplay
    title="Índice Calinski-Harabasz"
    value={Math.round(metrics?.calinski_harabasz_index ?? 0).toLocaleString()}
    subtitle="Más alto es mejor"
    sx={{
      flex: 1,
      minWidth: 180,
      background: "linear-gradient(145deg, #f0f4f8, #d9e2ec)",
      borderRadius: 2,
      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
      p: 2,
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 6px 12px rgba(0,0,0,0.15)",
      },
    }}
  />
</Box>


      {/* --- SECCIÓN 2: VISUALIZACIÓN --- */}
      {plot_coords && cluster_labels && (
        <Accordion  >
          <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    sx={{
      bgcolor: 'transparent', // para que el gradiente funcione bien
      background: 'linear-gradient(145deg, #f0f4f8, #d9e2ec)', // mismo gradiente que MetricDisplay
      borderRadius: 2,
      '&.Mui-expanded': {
        background: 'linear-gradient(145deg, #e8edf2, #cdd7e0)', // tono ligeramente diferente al abrir
      },
      transition: 'background 0.3s',
      minHeight: 56,
      '& .MuiAccordionSummary-content': {
        margin: 0,
      },
    }}
  >
            <Typography variant="subtitle1" fontWeight={700}>
              Visualización de Grupos
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ height: 400, width: "100%" }}>
              <ClusterTabularesScatterPlot
                coords={plot_coords}
                labels={cluster_labels}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* --- SECCIÓN 3: ANÁLISIS DETALLADO (CORREGIDA) --- */}
 {summary && (
                    <Accordion sx={{ mt: 2 }}>
                        <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    sx={{
      bgcolor: 'transparent', // para que el gradiente funcione bien
      background: 'linear-gradient(145deg, #f0f4f8, #d9e2ec)', // mismo gradiente que MetricDisplay
      borderRadius: 2,
      '&.Mui-expanded': {
        background: 'linear-gradient(145deg, #e8edf2, #cdd7e0)', // tono ligeramente diferente al abrir
      },
      transition: 'background 0.3s',
      minHeight: 56,
      '& .MuiAccordionSummary-content': {
        margin: 0,
      },
    }}
  >
                            <Typography variant="subtitle1" fontWeight={700}>Análisis Detallado por Grupo</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            {Object.entries(summary).map(([clusterName, details]) => (
                                <Box key={clusterName} sx={{ mb: 4, '&:not(:last-child)': { borderBottom: 1, borderColor: 'divider', pb: 2 } }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                        <Typography variant="h6">{clusterName} ({details.n_samples} muestras)</Typography>
                                        <Tooltip title="Sugerir etiquetas con IA">
                                            <IconButton onClick={() => handleSuggestLabels(clusterName, details)} size="small" disabled={isSuggesting === clusterName}>
                                                {isSuggesting === clusterName 
                                                    ? <CircularProgress size={20} /> 
                                                    : <AutoAwesomeIcon color="primary" />
                                                }
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                        {suggestions[clusterName]?.map((suggestion, index) => (
                                            <Chip key={index} label={suggestion} color="primary" variant="outlined" />
                                        ))}
                                    </Box>
                                    <NumericSummaryTable data={details.numeric_summary} />
                                    <CategoricalSummaryTable data={details.categorical_summary} />
                                </Box> 
                            ))}
                        </AccordionDetails>
                    </Accordion>
                )}


      {/* --- SECCIÓN 4: GUARDAR MODELO --- */}
    
         <Accordion sx={{ mt: 2 }}>
                         <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    sx={{
      bgcolor: 'transparent', // para que el gradiente funcione bien
      background: 'linear-gradient(145deg, #f0f4f8, #d9e2ec)', // mismo gradiente que MetricDisplay
      borderRadius: 2,
      '&.Mui-expanded': {
        background: 'linear-gradient(145deg, #e8edf2, #cdd7e0)', // tono ligeramente diferente al abrir
      },
      transition: 'background 0.3s',
      minHeight: 56,
      '& .MuiAccordionSummary-content': {
        margin: 0,
      },
    }}
  >
          <Typography variant="subtitle1" fontWeight={700}>
            Guardar Modelo de Segmentación
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth
            label="Nombre Descriptivo del Modelo"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Nombre del Proyecto"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </AccordionDetails>
      </Accordion>
    </DialogContent>

    {/* --- ACCIONES DEL MODAL --- */}
    <DialogActions>
      <Button onClick={onClose}>Cerrar</Button>
      <Button
        onClick={handleSaveClick}
        variant="contained"
        disabled={isSaving}
      >
        {isSaving ? "Guardando..." : "Confirmar y Guardar Modelo"}
      </Button>
    </DialogActions>
  </Dialog>
);
}