
// src/components/dashboard/ProjectPropertiesPanel.jsx (VERSIÓN CORREGIDA Y UNIFICADA)

import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box, Paper, Typography, Divider, Button, Stack,
    List, ListItem, ListItemIcon, ListItemText, // <-- AQUÍ NO ESTÁ ListItemButton
    CircularProgress, Alert,Menu, MenuItem,  ListItemButton, 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import AdsClickIcon from '@mui/icons-material/AdsClick'; // <-- Un icono más directo de "haz clic"



// Componente principal (con lógica de selección y navegación restaurada)
export default function ProjectPropertiesPanel({ project, onRename, onDelete }) {
  const navigate = useNavigate();

  // --- ESTADO ---
  const [datasets, setDatasets] = useState([]);
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [errorDatasets, setErrorDatasets] = useState(null);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedDataset, setSelectedDataset] = useState(null);

  // --- HANDLERS ---
  const handleMenuOpen = (event, dataset) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedDataset(dataset);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDataset(null);
  };

  // NAVEGACIÓN: Ahora esta función recibe la RUTA a la que navegar.
   const handleNavigate = (path) => {
    if (!path) return;
    navigate(path);
    handleMenuClose();
  };
 
  

  // --- FETCH DATASETS ---
  useEffect(() => {
    if (!project) {
      setDatasets([]);
      setLoadingDatasets(false);
      return;
    }

    const fetchDatasets = async () => {
      setLoadingDatasets(true);
      setErrorDatasets(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/projects/${project.id}/datasets`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );

        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || "No se pudieron cargar los datasets.");
        }
        setDatasets(json.data || []);
      } catch (err) {
        setErrorDatasets(err.message);
      } finally {
        setLoadingDatasets(false);
      }
    };

    fetchDatasets();
  }, [project]);

  // --- SIN PROYECTO ---
  if (!project) {
    return (
      <Paper
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
          backgroundColor: "action.hover",
        }}
      >
        <AdsClickIcon sx={{ fontSize: "3rem", color: "#ffffff", mb: 2 }} />
        <Typography variant="h6" color="#ffffff" fontWeight="500">
          Panel de Detalles
        </Typography>
        <Typography
          sx={{
            color: "#ffffff",
            textAlign: "center",
            fontWeight: "medium",
          }}
        >
          Selecciona un proyecto de la lista para ver sus detalles y acciones.
        </Typography>
      </Paper>
    );
  }

  // --- LISTA DE DATASETS ---
  const renderDatasetList = () => {
          if (loadingDatasets) {
            return <CircularProgress size={20} />;
          }
          if (errorDatasets) {
            return (
              <Alert severity="warning" sx={{ fontSize: "0.8rem", p: 1 }}>
                {errorDatasets}
              </Alert>
            );
          }
          if (datasets.length === 0) {
            return <Typography color="#b8b4b4ff">Este proyecto no tiene archivos.</Typography>;
          }
      
  return (
  <List dense disablePadding sx={{ maxHeight: 150, overflowY: "auto" /* Cambiado a auto para que se vea el scroll */ }}>
    {datasets.map((ds) => (
      <ListItem
        key={ds.datasetId}
        disablePadding // Añade esto para que ListItemButton ocupe todo el espacio
      >
        <ListItemButton onClick={(event) => handleMenuOpen(event, ds)}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <FolderZipIcon fontSize="small" color="action" />
          </ListItemIcon>
          <ListItemText
            primary={ds.datasetName}
            primaryTypographyProps={{
              noWrap: true,
              title: ds.datasetName,
              variant: "body2",
            }}
          />
        </ListItemButton>
      </ListItem>
    ))}
  </List>
);
};

    const renderMenuItems = () => {
    if (!selectedDataset) return null;

    const { datasetType, datasetId } = selectedDataset;
    const projectId = project.id;
    const type = datasetType?.toLowerCase();

    // Listas de tipos para facilitar la lógica
    const tabularTypes = ['tabular', 'csv', 'xlsx', 'parquet'];
    // IMPORTANTE: Excluimos 'pdf' de aquí para manejarlo en su propio bloque.
    const textTypes = ['text', 'docx', 'md', 'txt']; 

    let menuOptions = [];

    // Opciones para archivos tabulares
    if (tabularTypes.includes(type)) {
      menuOptions.push({ label: "Ir a Predicciones", path: `/project/${projectId}/predict/${datasetId}` });
      menuOptions.push({ label: "Ir a Clustering", path: `/project/${projectId}/clustering-tabulares/${datasetId}` });
      menuOptions.push({ label: "Procesar y Editar", path: `/project/${projectId}/dataprep/${datasetId}` });
    }
    // Opciones para archivos de texto (que no son PDF)
    else if (textTypes.includes(type)) {
      menuOptions.push({ label: "Ir a PromptLab", path: `/project/${projectId}/dataset/${datasetId}/promptlab` });
      menuOptions.push({ label: "Visualizar Documento", path: `/project/${projectId}/document/${datasetId}` });
    }
    // Opciones específicas y exclusivas para PDF
    else if (type === 'pdf') {
      menuOptions.push({ label: "Ir a PromptLab", path: `/project/${projectId}/dataset/${datasetId}/promptlab` });
      menuOptions.push({ label: "Extraer Datos (PDF)", path: `/project/${projectId}/pdf-extractor/${datasetId}` });
      menuOptions.push({ label: "Visualizar Documento", path: `/project/${projectId}/document/${datasetId}` });
    }
    // Opciones para Vision Lab
    else if (type === 'vision_analysis') {
        menuOptions.push({ label: "Ir a VisionLab", path: `/project/${projectId}/vision-lab/${datasetId}?datasetType=${type}` });
    }

    // Si no se encontró ninguna opción (tipo de archivo no reconocido), puedes opcionalmente mostrar algo
    if (menuOptions.length === 0) {
        return <MenuItem disabled>No hay acciones disponibles</MenuItem>;
    }

    // Mapeamos el array de opciones a componentes MenuItem
    return menuOptions.map(option => (
      <MenuItem key={option.path} onClick={() => handleNavigate(option.path)}>
        {option.label}
      </MenuItem>
    ));
};

   // --- RETURN ---
  return (
    <Paper
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 1,
        borderRadius: 1,
        
      
      }}
    >
      {/* Contenido principal */}
      <Box sx={{ flexGrow: 1, overflowY: "auto", p: 0 }}>
        <Box
          sx={{
            mb: 1,
            p: 2,
            borderRadius: 1.5,
            background: "linear-gradient(135deg, #26717a, #44a1a0)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            borderLeft: "3px solid #26717a",
          }}
        >
          <Typography
            variant="subtitle1"
            fontWeight="bold"
            sx={{
              color: "#ffffff",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.95rem",
            }}
          >
            Archivos del Proyecto:
          </Typography>
        </Box>

       {/* La caja de la lista: AHORA CRECE Y TIENE EL SCROLL */}
  <Box
    sx={{
      borderRadius: 1,
      bgcolor: "rgba(0, 229, 255, 0.05)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      p: 1,
      mb: 2,
      display: "flex",
      flexDirection: "column",
      gap: 0.5,
      flexGrow: 1,        // <-- AÑADIDO: ¡La magia! Le decimos que crezca
      overflowY: 'auto'   // <-- AÑADIDO: ...y ponemos el scroll aquí.
    }}
  >
    {renderDatasetList()}
  </Box>

      </Box>

      {/* Acciones */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #26717a, #44a1a0)",
          flexShrink: 0,
          pt: 2,
          borderRadius: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" color="primary">
          Acciones
        </Typography>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            color="secondary"
            sx={{
              border: "2px solid #ffffff",
              color: "#ffffff",
              "& .MuiSvgIcon-root": { color: "#ffffff" },
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.1)",
                borderColor: "#ffffff",
              },
            }}
            onClick={() => navigate(`/project/${project.id}`)}
          >
            Importar y Procesar Archivos
          </Button>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={onRename}
            sx={{
              backgroundColor: " #005f73",
              border: "2px solid #ffffff",
              color: "#ffffff",
            }}
          >
            Renombrar Proyecto
          </Button>
          <Button
  sx={{
    border: "2px solid #ffffff",
    color: "#ffffff",
    backgroundColor: "#031a27ff",   // 👈 acá el color base
    "& .MuiSvgIcon-root": { color: "#ffffff" },
    "&:hover": {
      backgroundColor: "#052235",  // 👈 un tono distinto si querés diferenciar hover
      borderColor: "#ffffff",
    },
  }}
  variant="contained"
  startIcon={<DeleteIcon />}
  onClick={onDelete}
>
  Eliminar Proyectos
</Button>
        </Stack>
      </Box>

      {/* --- MENU DINÁMICO --- */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        {/* Aquí llamamos a la nueva función que renderiza los items */}
       {renderMenuItems()}
      </Menu>
    </Paper>
  );
}


// Los propTypes se quedan igual
ProjectPropertiesPanel.propTypes = {
    project: PropTypes.object,
    onRename: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
};