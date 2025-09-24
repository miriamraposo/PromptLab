// RUTA: src/pages/MyModelsPage.jsx (VERSIÓN CORREGIDA Y COMPLETA)

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  Chip, CircularProgress, Alert, IconButton, Tooltip,Grid,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Tabs, Tab, TextField, InputAdornment 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search'; // Icono para el buscador
import AssessmentIcon from '@mui/icons-material/Assessment';
import FunctionsIcon from '@mui/icons-material/Functions';
import CategoryIcon from '@mui/icons-material/Category';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GroupsIcon from '@mui/icons-material/Groups';
import DeleteIcon from '@mui/icons-material/Delete';
import GrainIcon from '@mui/icons-material/Grain';
import HourglassTopIcon from '@mui/icons-material/HourglassTop'; 

const DataDisplayWrapper = ({ loading, error, children }) => {
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>;
  if (error) return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  return children;
};

// ========================================================================
// === ¡LA PRIMERA CORRECCIÓN ESTÁ AQUÍ! ===
// La función ahora recibe el objeto 'model' completo.
// ========================================================================
const getProblemTypeChip = (model) => {
    // Extraemos la propiedad que necesitamos del objeto.
    const problemType = model.problemType;

    // Ahora, si esta función necesitara 'projectId' o 'datasetId', 
    // podría acceder a ellos a través de `model.projectId`, etc., y no daría error.

    switch (problemType) {
        case 'clasificacion': return <Chip icon={<CategoryIcon />} label="Clasificación" color="secondary" size="small" variant="outlined" />;
        case 'regresion': return <Chip icon={<FunctionsIcon />} label="Regresión" color="primary" size="small" variant="outlined" />;
        case 'vision_classification': return <Chip icon={<CameraAltIcon />} label="Visión" color="success" size="small" variant="outlined" />;
        case 'clustering_tabular': // <<< NUESTRO NUEVO TIPO
            return <Chip icon={<GrainIcon />} label="Clustering (Tabular)" color="success" size="small" variant="outlined" />;
        case 'clustering': return <Chip icon={<GroupsIcon />} label="Clustering" color="info" size="small" variant="outlined" />;
        default: return <Chip label={problemType || 'Desconocido'} size="small" />;
    }
};

export default function MyModelsPage() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [modelToDelete, setModelToDelete] = useState(null);

  const [activeTab, setActiveTab] = useState(0); // 0 = Todos, 1 = Estándar, 2 = Clustering, 3 = Visión
  const [searchTerm, setSearchTerm] = useState('');


  useEffect(() => {
    const fetchModels = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error || 'No se pudieron cargar los modelos.');
            
            const existingModels = result.data || [];

            // Lógica para el modelo fantasma
            const phantomModelString = sessionStorage.getItem('phantomModel');
            let allModels = existingModels;
            if (phantomModelString) {
                const phantomModel = JSON.parse(phantomModelString);
                // Le añadimos la bandera 'isPhantom' para identificarlo en la UI
                phantomModel.isPhantom = true; 

                const isAlreadySaved = existingModels.some(m => m.id === phantomModel.id);
                if (!isAlreadySaved) {
                    // Ponemos el fantasma al principio
                    allModels = [phantomModel, ...existingModels];
                } else {
                    sessionStorage.removeItem('phantomModel');
                }
            }
            setModels(allModels);
        } catch (err) { setError(err.message); } 
        finally { setLoading(false); }
    };
    fetchModels();
  }, []);



  const filteredModels = useMemo(() => {
    const tabFilters = [
      () => true, // Tab 0: "Todos"
      (m) => ['clasificacion', 'regresion'].includes(m.problemType), // Tab 1: "Estándar"
      (m) => ['clustering_tabular'].includes(m.problemType), // Tab 2: "Clustering Tabular"
      (m) => ['vision_classification', 'clustering'].includes(m.problemType), // Tab 3: "Visión"
    ];

    return models
      .filter(tabFilters[activeTab])
      .filter(model => 
        model.modelName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.projectName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [models, activeTab, searchTerm]); // Se recalcula solo si estas dependencias cambian


  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };


  const handleModelActionClick = (model) => {
    const { problemType, projectId, sourceDatasetId, id } = model;

    switch (problemType) {
        case 'vision_classification':
            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN CLAVE! ---
            // En lugar de ir al HUB, vamos DIRECTO a la página de EVALUACIÓN.
            navigate(
                `/models/vision/${id}/evaluate`, 
                { 
                    // Y le pasamos los datos del modelo (real o fantasma) en el state
                    state: { modelData: model } 
                }
            );
            break;

        case 'clustering_tabular':
            // Navega a nuestra nueva página de predicción de segmentos
            navigate(`/models/clustering/${id}/predict`);
            break;
        
        case 'clustering':
            // --- ¡AQUÍ ESTÁ LA CORRECCIÓN! ---
            // Restauramos la lógica de navegación original que SÍ funciona.
            if (projectId && sourceDatasetId) {
                navigate(`/project/${projectId}/vision-lab/${sourceDatasetId}?clusterResultId=${id}`);
            } else {
                alert("Error: Faltan datos (proyecto o dataset ID) para navegar.");
            }
            break; 
            
        case 'clasificacion':
        case 'regresion':
            navigate(`/models/${id}/analyze`);
            break;
        
        default:
            alert(`Acción no disponible para el tipo de modelo: "${problemType}"`);
    }
};

  const handleOpenDeleteDialog = (model) => { setModelToDelete(model); setOpenDeleteDialog(true); };
  const handleCloseDeleteDialog = () => { setOpenDeleteDialog(false); setModelToDelete(null); };
  
  const handleConfirmDelete = async () => {
      if (!modelToDelete) return;
      
      // Si el modelo es fantasma, solo lo borramos del frontend
      if (modelToDelete.isPhantom) {
          sessionStorage.removeItem('phantomModel');
          setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
          handleCloseDeleteDialog();
          return;
      }

      // Si es un modelo real, llamamos a la API
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No estás autenticado.");
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/models/${modelToDelete.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } });
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error(result.error || 'No se pudo eliminar el modelo.');
          setModels(prevModels => prevModels.filter(m => m.id !== modelToDelete.id));
      } catch (err) {
          setError(err.message);
      } finally {
          handleCloseDeleteDialog();
      }
  };
  

   return (
    <Box sx={{ p: 3, pt: 'calc(72px + 24px)' }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom fontWeight="bold">
          Mis Modelos Predictivos
        </Typography>
        <Typography>
         Esta sección muestra todos los modelos guardados. Filtra por tipo o busca por nombre para encontrar lo que necesitas.
        </Typography>
      </Box>

      {/* ======================================================================== */}
      {/* === PASO 3: RENDERIZAR LA NUEVA UI DE FILTROS Y PESTAÑAS === */}
      {/* ======================================================================== */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 8 }}>
            <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary" textColor="primary">
              <Tab label={`Todos (${models.length})`} />
              <Tab label="Estándar" />
              <Tab label="Clustering Tabular" />
              <Tab label="Visión" />
            </Tabs>
          </Grid>
           <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Buscar Modelo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
        </Grid>
      </Paper>
       <DataDisplayWrapper loading={loading} error={error}>
        {filteredModels.length > 0 ? (
          <Paper>
            <TableContainer>
              <Table>
                {/* ======================================================================== */}
                {/* === CORRECCIÓN #1: TABLEHEAD LIMPIO Y CORRECTO === */}
                {/* ======================================================================== */}
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre del Modelo</TableCell>
                    <TableCell>Proyecto</TableCell>
                    <TableCell>Tipo de Problema</TableCell>
                    <TableCell>Métrica Principal</TableCell>
                    <TableCell>Fecha de Creación</TableCell>
                    <TableCell align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>

                {/* ======================================================================== */}
                {/* === CORRECCIÓN #2: MAPEANDO SOBRE 'filteredModels' === */}
                {/* ======================================================================== */}
                <TableBody>
                  {filteredModels.map((model) => { // <-- USANDO EL ARRAY CORRECTO
                      // Tu lógica para los botones está perfecta y se queda aquí
                      const isVisionOrCluster = ['vision_classification', 'clustering'].includes(model.problemType);
                      const buttonText = isVisionOrCluster ? "VisionLab" : "Analizar";
                      const buttonIcon = isVisionOrCluster ? <CameraAltIcon /> : <AssessmentIcon />;
                      const buttonColor = isVisionOrCluster ? "success" : "primary";
                      const buttonTooltip = isVisionOrCluster ? "Abrir Laboratorio" : "Analizar Modelo";
                   
                      return (
                          // ========================================================================
                          // === CORRECCIÓN #3: LÓGICA DEL FANTASMA MOVIDA AQUÍ ===
                          // ========================================================================
                          <TableRow 
                              key={model.id} 
                              hover
                              sx={{
                                // Si es fantasma, le damos un fondo y opacidad distintos
                                ...(model.isPhantom && { 
                                  bgcolor: 'action.hover',
                                  opacity: 0.85 
                                })
                              }}
                          >
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  {model.isPhantom && (
                                    <Tooltip title="Este modelo es temporal y se está guardando. Disponible por 30 mins.">
                                      <HourglassTopIcon fontSize="small" color="warning" sx={{ mr: 1 }} />
                                    </Tooltip>
                                  )}
                                  {model.modelName || 'N/A'}
                                </Box>
                              </TableCell>
                              <TableCell>{model.projectName || 'N/A'}</TableCell>
                              <TableCell>{getProblemTypeChip(model)}</TableCell>
                              <TableCell>{model.mainMetric || 'N/A'}</TableCell>
                              <TableCell>{model.createdAt ? new Date(model.createdAt).toLocaleDateString() : (model.isPhantom ? 'Procesando...' : 'N/A')}</TableCell>
                              <TableCell align="center">
                                  {/* Tu JSX para los botones de acción está perfecto */}
                                  <Tooltip title={buttonTooltip}>
                                      <Button
                                          variant="contained"
                                          startIcon={buttonIcon}
                                          color={buttonColor}
                                          onClick={() => handleModelActionClick(model)}
                                          size="small"
                                          sx={{ mr: 1 }}
                                      >
                                          {buttonText}
                                      </Button>
                                  </Tooltip>
                                  <Tooltip title="Eliminar Modelo">
                                      <IconButton
                                          color="error"
                                          onClick={() => handleOpenDeleteDialog(model)}
                                      >
                                          <DeleteIcon />
                                      </IconButton>
                                  </Tooltip>
                              </TableCell>
                          </TableRow>
                      );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          // --- MEJORA DE UX: Mensaje más inteligente ---
          <Alert severity="info">
            {models.length > 0 
              ? "No se encontraron modelos que coincidan con tus filtros." 
              : "No existe ningún modelo guardado."
            }
          </Alert>
        )}
      </DataDisplayWrapper>
      
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
            <DialogContentText>
                ¿Estás seguro de que quieres eliminar el modelo <strong>"{modelToDelete?.modelName}"</strong>? Esta acción no se puede deshacer.
            </DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
            <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}