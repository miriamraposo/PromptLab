// src/components/dashboard/ClusteringControlPanel.jsx


// <<< 1. Definimos el componente y los props que recibirá de la página padre
import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, Button, TextField,Slider, Grid,
    ToggleButton, ToggleButtonGroup, IconButton, Tooltip, Divider,
    CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Este componente hijo NO necesita MetricDisplay. Vive en el Modal.

const ClusteringControlPanel = ({ 
    isAnalyzing, 
    clusteringResults,
    onRunAnalysis,
    onRetry,
    onOpenResultsModal,
    onSaveAsDataset, // <<< PROP CORREGIDO
    onUpdateClusterNames
}) => {
   

    // --- ESTADOS Y HANDLERS (SIN CAMBIOS, ESTABAN PERFECTOS) ---
    const [analysisType, setAnalysisType] = useState('directed_segmentation');
    const [kmeansParams, setKmeansParams] = useState({ n_clusters: 5 });
    const [dbscanParams, setDbscanParams] = useState({ eps: 0.5, min_samples: 5 });
    const [customClusterNames, setCustomClusterNames] = useState({});

    useEffect(() => {
        if (clusteringResults?.summary) {
            const initialNames = Object.keys(clusteringResults.summary).reduce((acc, name) => {
                acc[name] = name; return acc;
            }, {});
            setCustomClusterNames(initialNames);
        }
    }, [clusteringResults]);


    const handleNameChange = (originalName, newName) => {
        setCustomClusterNames(prev => ({
            ...prev,
            [originalName]: newName
        }));
    };

    // Al salir de foco o presionar enter, informa al padre de los cambios
    const handleNameBlur = () => {
        onUpdateClusterNames(customClusterNames);
    };

     
    
    const handleParamChange = (paramName, value, algo) => {
        if (algo === 'kmeans') {
            // Aseguramos que n_clusters sea un número y al menos 2
            const numValue = Math.max(2, parseInt(value, 10) || 2);
            setKmeansParams(prev => ({ ...prev, [paramName]: numValue }));
        } else if (algo === 'dbscan') {
            // Para eps y min_samples, validamos que sean números positivos
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue > 0) {
                 setDbscanParams(prev => ({ ...prev, [paramName]: numValue }));
            }
        }
    };
    
     const handleRunClick = () => {
        // Traduce el tipo de análisis al nombre técnico del algoritmo
        const algorithm = analysisType === 'directed_segmentation' ? 'kmeans' : 'dbscan';
        const params = algorithm === 'kmeans' ? kmeansParams : dbscanParams;
        
        onRunAnalysis({ algorithm, parameters: params });
    };

    

   
    if (isAnalyzing) {
        return (
             <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography>Ejecutando análisis...</Typography>
            </Paper>
        );
    }

    if (clusteringResults) {
        // --- VISTA DE RESULTADOS (VERSIÓN LIMPIA Y FINAL) ---
        return (
            <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold">Resultados del Análisis</Typography>

                <Button variant="contained" color="info" onClick={onOpenResultsModal}>
                    Ver Métricas y Gráficos Detallados
                </Button>

                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                    Etiqueta tus Grupos
                </Typography>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                    {clusteringResults.summary && Object.keys(clusteringResults.summary).sort((a,b) => a.localeCompare(b, undefined, {numeric: true})).map((originalName) => (
                        <Accordion key={originalName} defaultExpanded sx={{ '&:before': { display: 'none' }, boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
                            <AccordionSummary>
                                <Typography fontWeight="500">
                                    {originalName} ({clusteringResults.summary[originalName].n_samples} muestras)
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails sx={{ pt: 0 }}>
                                <TextField
                                    label="Nombre personalizado"
                                    variant="outlined" size="small" fullWidth
                                    value={customClusterNames[originalName] || ''}
                                    onChange={(e) => handleNameChange(originalName, e.target.value)}
                                    onBlur={handleNameBlur}
                                />
                            </AccordionDetails>
                        </Accordion>
                    ))}
                </Box>
                
                {/* --- SECCIÓN DE ACCIONES (ÚNICA Y CORRECTA) --- */}
                <Box sx={{ display: 'flex', gap: 2, mt: 'auto', pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="outlined" fullWidth onClick={onRetry}>
                        Reconfigurar
                    </Button>
                    <Button variant="contained" fullWidth onClick={onSaveAsDataset}>
                        Guardar como Dataset
                    </Button>
                </Box>
            </Paper>
        );
    }
    
    return (
  <Paper
    sx={{
      p: 2,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      height: "100%",
    }}
  >
    <Typography variant="h6" component="h2" fontWeight="bold">
      Configuración del Análisis
    </Typography>

    {/* --- Selector de Objetivo --- */}
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Typography variant="subtitle1" fontWeight={500}>
        1. Elige tu objetivo
      </Typography>
      <ToggleButtonGroup
        color="primary"
        value={analysisType}
        exclusive
        onChange={(event, newType) => {
          if (newType !== null) {
            setAnalysisType(newType);
          }
        }}
        fullWidth
        orientation="vertical"
      >
        {/* Botón para K-Means */}
        <ToggleButton
          value="directed_segmentation"
          sx={{ textTransform: "none", alignItems: "flex-start", py: 1.5 }}
        >
          <Box textAlign="left">
            <Typography fontWeight="bold">Segmentación Dirigida</Typography>
            <Typography variant="caption" color="text.secondary">
              Quiero dividir mis datos en un número específico de grupos.
            </Typography>
          </Box>
        </ToggleButton>

        {/* Botón para DBSCAN */}
        <ToggleButton
          value="automatic_discovery"
          sx={{ textTransform: "none", alignItems: "flex-start", py: 1.5 }}
        >
          <Box textAlign="left">
            <Typography fontWeight="bold">Descubrimiento Automático</Typography>
            <Typography variant="caption" color="text.secondary">
              Quiero que la IA encuentre grupos y datos atípicos por sí misma.
            </Typography>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>

    <Divider />

    {/* --- Panel de Parámetros Dinámico --- */}
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>
      <Typography variant="subtitle1" fontWeight={500}>
        2. Ajusta los Parámetros
      </Typography>

      {/* Caso K-Means */}
      {analysisType === "directed_segmentation" && (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            Ideal cuando ya tienes una hipótesis de negocio (ej: 3 tipos de
            clientes).
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              label="¿En cuántos grupos?"
              type="number"
              value={kmeansParams.n_clusters}
              onChange={(e) =>
                handleParamChange("n_clusters", e.target.value, "kmeans")
              }
              fullWidth
              size="small"
            />
            <Tooltip title="Usa nuestro asistente para encontrar un número de grupos ideal para tus datos.">
              <IconButton color="primary">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* Caso DBSCAN */}
      {analysisType === "automatic_discovery" && (
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 1.5 }}
          >
            Ajusta la "sensibilidad" para encontrar grupos. Un valor más bajo es
            más estricto y crea grupos más pequeños y densos.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 1 }}>
            <Slider
              sx={{ flexGrow: 1 }}
              value={
                typeof dbscanParams.eps === "number" ? dbscanParams.eps : 0
              }
              onChange={(e, newValue) =>
                handleParamChange("eps", newValue, "dbscan")
              }
              aria-labelledby="input-slider"
              min={0.1}
              max={5.0}
              step={0.1}
            />

            <TextField
              label="eps"
              value={dbscanParams.eps}
              size="small"
              onChange={(e) =>
                handleParamChange("eps", e.target.value, "dbscan")
              }
              sx={{ width: "5em" }}
              inputProps={{
                step: 0.1,
                min: 0.1,
                max: 5.0,
                type: "number",
                "aria-labelledby": "input-slider",
              }}
            />

            <Tooltip title="Usa nuestro asistente para encontrar un valor de sensibilidad óptimo.">
              <IconButton color="primary">
                <HelpOutlineIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* CAMPO PARA MIN_SAMPLES (solo aquí, no duplicado) */}
          <TextField
            label="Tamaño Mínimo del Grupo"
            type="number"
            fullWidth
            size="small"
            value={dbscanParams.min_samples}
            onChange={(e) =>
              handleParamChange("min_samples", e.target.value, "dbscan")
            }
            helperText="¿Cuántos puntos como mínimo se necesitan para formar un grupo?"
            sx={{ mt: 3 }}
          />
        </Box>
      )}
    </Box>

    {/* Botón de Acción */}
    <Button
      variant="contained"
      color="primary"
      size="large"
      onClick={handleRunClick}
      disabled={isAnalyzing}
    >
      {isAnalyzing ? (
        <CircularProgress size={24} color="inherit" />
      ) : (
        "Ejecutar Análisis"
      )}
    </Button>
  </Paper>
);

}

export default ClusteringControlPanel;