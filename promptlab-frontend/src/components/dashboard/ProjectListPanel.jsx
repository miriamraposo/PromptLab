import React from 'react';
import PropTypes from 'prop-types';
import {
    Box, Paper, Typography, TextField, InputAdornment,
    List, ListItem, ListItemButton, ListItemText // Todos los componentes necesarios
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ProjectListPanel({
    projects,
    searchTerm,
    onSearchChange,
    activeProject,
    onSelectProject
}) {
    return (
        <Paper 
    sx={{ 
        height: '100%', 
         width: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
         border: '1px solid #ffffff', borderRadius: 2, 
        borderWidth: 1, 
        borderStyle: 'solid',
        background: "linear-gradient(135deg, #26717a, #44a1a0)" , // degradado azul oscuro a azul medio
        color: '#ffffff' // texto blanco
    }}
>
            {/* Barra de búsqueda */}
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
  <TextField
    fullWidth
    variant="outlined"
    placeholder="Buscar por nombre..."
    value={searchTerm}
    onChange={onSearchChange}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ color: '#00e5ff' }} />
        </InputAdornment>
      ),
      sx: {
        height: '36px',              // altura total del input
        fontSize: '0.875rem',        // tamaño del texto
        '& .MuiOutlinedInput-notchedOutline': {
          borderColor: '#00e5ff',
        },
      },
    }}
    sx={{
      '& .MuiOutlinedInput-root': {
        backgroundColor: '#97ebf5ff',
        color: '#000000',
        height: '36px',              // fuerza la altura
        '& fieldset': {
          borderColor: '#00e5ff',
        },
        '&:hover fieldset': {
          borderColor: '#00bcd4',
        },
        '&.Mui-focused fieldset': {
          borderColor: '#00e5ff',
        },
      },
      '& input::placeholder': {
        color: 'rgba(0,0,0,0.6)',
        opacity: 1,
      },
      input: {
        padding: '8px 12px',         // control más fino del padding interno
        color: '#000000',
      },
    }}
  />
</Box>


            {/* Lista de proyectos */}
            <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <List disablePadding>
                    {/* Encabezado */}
                   <ListItem
  sx={{
    px: 2,
    py: 1,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    borderBottom: '1px solid rgba(0,229,255,0.5)',
    bgcolor: 'linear-gradient(90deg, rgba(44,113,122,0.8) 0%, rgba(72,165,176,0.8) 100%)', // degradado turquesa claro
    backdropFilter: 'blur(4px)', // un toque moderno tipo vidrio
  }}
>
  <ListItemText
    primary="Nombre"
    sx={{ flex: '1 1 50%', color: '#ffffff' }}
    primaryTypographyProps={{
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#ffffff', // 🎨 el color que quieras
  
    }}
  />
  <ListItemText
    primary="Tipo"
    sx={{ flex: '1 1 25%', color: '#ffffff' }}
    primaryTypographyProps={{
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#ffffff', // 🎨 el color que quieras
  
    }}
  />
  <ListItemText
    primary="Creación"
    sx={{ flex: '1 1 25%', color: '#ffffff', textAlign: 'left' }}
    primaryTypographyProps={{
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#ffffff', // 🎨 el color que quieras
  
    }}
  />
</ListItem>


                    {/* Filas */}
                    {projects.length > 0 ? (
                        projects.map((project) => (
                            <ListItem key={project.id} divider disablePadding >
                                <ListItemButton
                                    selected={activeProject?.id === project.id}
                                    
                                    onClick={() => onSelectProject(project)}
                                     sx={{
                                     px: 2,
                                     py: 0.5,
                                     borderBottom: '1px solid #00e5ff', // línea turquesa
                                     backgroundColor: activeProject?.id === project.id ?'transparent':'#26717b99',
                                     '&:hover': { backgroundColor: 'rgba(44, 158, 170, 0.2)' },
                                     }}
                                 >
                                    <ListItemText
                                        primary={project.projectName}
                                        sx={{ flex: '1 1 50%', pr: 2, color: '#ffffff' }}
                                        primaryTypographyProps={{ noWrap: true, title: project.projectName }}
                                    />
                                    <ListItemText
                                        secondary={project.projectType || 'N/A'}
                                        sx={{ flex: '1 1 25%', pr: 2, color: '#ffffff' }}
                                        secondaryTypographyProps={{
                                        sx: { color: 'rgba(255,255,255,0.85)' },
                                        }}
                                    />
                                    <ListItemText
                                        secondary={format(new Date(project.createdAt), "d MMM yyyy", { locale: es })}
                                        sx={{ flex: '1 1 25%', color: '#ffffff' }}
                                        secondaryTypographyProps={{
                                        sx: { color: 'rgba(255,255,255,0.85)' },
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))
                    ) : (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {searchTerm ? 'No se encontraron proyectos.' : 'Aún no tienes proyectos.'}
                            </Typography>
                        </Box>
                    )}
                </List>
            </Box>
        </Paper>
    );
}
    

// Props sin cambios
ProjectListPanel.propTypes = {
    projects: PropTypes.array.isRequired,
    searchTerm: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    activeProject: PropTypes.object,
    onSelectProject: PropTypes.func.isRequired,
};