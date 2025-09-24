import React from 'react';
// ✅ LÍNEA CORREGIDA: Solo importamos lo que realmente usamos
import {
    Box, CircularProgress, Alert, Typography, Button
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useProjects } from '../hooks/useProjects';
import { Card, CardContent } from "@mui/material";


// Importa los componentes que ya teníamos
import ProjectListPanel from "../components/dashboard/ProjectListPanel";
import ProjectPropertiesPanel from '../components/dashboard/ProjectPropertiesPanel';
import CreateProjectModal from '../components/dashboard/CreateProjectModal';
import RenameProjectModal from '../components/dashboard/RenameProjectModal';
import ConfirmDeleteModal from '../components/dashboard/ConfirmDeleteModal';
import { useTheme } from '@mui/material/styles';


export default function DashboardPage() {
    const theme = useTheme()// Tu hook se mantiene igual, ya está perfecto
    const {
        loading,
        error,
        searchTerm,
        setSearchTerm,
        filteredProjects,
        modals,
        menu, // Aunque no usamos el menú visual, el hook lo sigue exponiendo, lo cual está bien
        actions,
        fetchProjects,
        setActiveProject,
    } = useProjects();

    const handleSelectProject = (project) => {
        setActiveProject(project);
    };

     if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
     if (error) return <Alert severity="error">{error}</Alert>;

        return (
        <Box sx={{
            height: '100vh',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            pt: `calc(60px + 1px)`,
            px: 1,
            pb: 0,
            backgroundColor: theme.palette.mode === 'dark' ? '#393b3dff' : 'primary',
        }}>
  <Box
    sx={{
    display: 'flex',
    justifyContent: 'space-between', // texto a la izquierda, botón a la derecha
    alignItems: 'center',           // 👈 centra verticalmente
    px: 10,                          // padding horizontal
    py: 1,                          // padding vertical (ajustable para hacerlo más compacto)
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    borderRadius: 2,                // bordes redondeados
    boxShadow: 1,   
       
  }}
>
  <Typography
    variant="h4"
    fontWeight="bold"
    color="white"
  >
    Mis Proyectos
  </Typography>

  <Button
    variant="contained"
    startIcon={<AddIcon />}
    size="medium"       // más compacto que large
    sx={{
        background: 'linear-gradient(180deg, #002f4b, #005f73)',
        borderColor: '#00e5ff',
        color: "#fff",
        '&:hover': {
          borderColor: '#00e5ff',
          backgroundColor: 'rgba(0,229,255,0.1)',
        },
      }}
  >
    Crear Nuevo Proyecto
  </Button>
</Box>


            {/* Contenedor de los paneles */}
            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden',p:2 }}>
                <Box sx={{ flex: '2 1 0', minWidth: 0, height: '100%',}}>
                    {/* ✅ VOLVEMOS A PASAR LAS PROPS NECESARIAS */}
                    <ProjectListPanel
                        projects={filteredProjects}
                        searchTerm={searchTerm}
                        onSearchChange={(e) => setSearchTerm(e.target.value)}
                        activeProject={menu.activeProject}
                        onSelectProject={handleSelectProject}
                    />
                </Box>
                <Box
                  sx={{
                 flex: 1,
                 minWidth: 0,
                 height: '100%',
                 background: 'linear-gradient(180deg, #002f4b 0%, #004d66 100%)',
                 
                 color: '#ffffff',           // texto blanco para contraste
                 p: 0.4,                       // padding interno
                 borderRadius: 2,   
                 border: '2px solid #ffffff',         // opcional, bordes suaves
                 overflowY: 'auto',          // scroll si hay mucho contenido
                 display: 'flex',          // 👈 importante
                 flexDirection: 'column', 
                 }}
                 >
                    {/* ✅ Y TAMBIÉN AQUÍ */}
                    <ProjectPropertiesPanel
                        project={menu.activeProject}
                        onRename={actions.handleRename}
                        onDelete={actions.handleDelete}
                         sx={{ flex: 1 }}
                    />
                </Box>
            </Box>

            {/* Modales, que no cambian */}
            <CreateProjectModal
                open={modals.create.open}
                onClose={() => modals.create.setOpen(false)}
                onProjectCreated={fetchProjects}
            />
            {menu.activeProject && (
                <RenameProjectModal
                    open={modals.rename.open}
                    onClose={() => modals.rename.setOpen(false)}
                    onProjectRenamed={fetchProjects}
                    project={menu.activeProject}
                />
            )}
            {menu.activeProject && (
                <ConfirmDeleteModal
                    open={modals.delete.open}
                    onClose={() => modals.delete.setOpen(false)}
                    onConfirm={actions.confirmDeleteAndNotify}
                    project={menu.activeProject}
                />
            )}
        </Box>
    );
}    