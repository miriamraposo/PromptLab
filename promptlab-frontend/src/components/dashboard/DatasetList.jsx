// src/components/dashboard/DatasetList.jsx (VERSIÓN AUTOSUFICIENTE)

// ✅ Añadimos los imports necesarios aquí mismo
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Box, Typography, List, ListItem, ListItemText, ListItemButton,
    TextField, InputAdornment, Paper // <-- Añadimos TextField y Paper
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search'; // <-- Añadimos el icono
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTheme } from '@mui/material/styles';
// ✅ El componente ya NO necesita recibir 'searchTerm' desde fuera
export default function DatasetList({ datasets, activeDataset, onSelectDataset }) {
    
    // ✅ PASO 1: El estado para la búsqueda vive DENTRO de este componente.
    const [searchTerm, setSearchTerm] = useState('');
    const theme = useTheme()
    // PASO 2: Filtramos la lista de datasets que recibimos por props,
    // usando nuestro estado local.
    const filteredDatasets = datasets.filter(dataset =>
        dataset.datasetName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // No hay datasets en el proyecto original
    if (!datasets || datasets.length === 0) {
        return (
            <Paper sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, border: 'none', boxShadow: 'none' }}>
                <Typography color="text.secondary">
                    Este proyecto aún no tiene archivos. 
                </Typography>
            </Paper>
        );
    }
    
    return (
        // Usamos un Paper para unificar el layout como en las otras páginas
        <Paper  sx={{ 
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
}}>
            {/* PASO 3: El TextField de búsqueda está aquí */}
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
  fullWidth
  variant="outlined"
  placeholder="Buscar dataset por nombre..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  InputProps={{
    startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>),
  }}
  sx={{
    '& .MuiOutlinedInput-root': {
      backgroundColor: '#97ebf5ff',
      color: '#000000',
      height: '36px', // altura compacta
      '& fieldset': { borderColor: '#00e5ff' },
      '&:hover fieldset': { borderColor: '#00bcd4' },
      '&.Mui-focused fieldset': { borderColor: '#00e5ff' },
    },
    '& input::placeholder': { color: 'rgba(0,0,0,0.6)', opacity: 1 },
    input: { padding: '8px 12px', color: '#000000' },
  }}
/>


           </Box>

            {/* El resto del componente ahora usa la lista filtrada */}
            <Box sx={{ flexGrow: 1, overflow: 'auto'
                
             }}>
                {filteredDatasets.length > 0 ? (
                    
                    <List disablePadding>
                       <ListItem
  sx={{
    px: 2,
    py: 1,
    position: 'sticky',
    top: 0,
    zIndex: 2,
    borderBottom: '1px solid rgba(0,229,255,0.5)',
    bgcolor: 'linear-gradient(90deg, rgba(44,113,122,0.8) 0%, rgba(72,165,176,0.8) 100%)', // degradado turquesa claro
    color: '#ffffff',
    backdropFilter: 'blur(4px)', // un toque moderno tipo vidrio
  }}
>
  <ListItemText
    primary="Nombre"
    sx={{ flex: '1 1 50%' }}
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
    sx={{ flex: '1 1 25%' }}
    primaryTypographyProps={{
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#ffffff',// 🎨 el color que quieras
  }}
  />
  <ListItemText
    primary="Creación"
    sx={{ flex: '1 1 25%', textAlign: 'left' }}
    primaryTypographyProps={{
    fontWeight: 'bold',
    fontSize: '0.9rem',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#ffffff', // 🎨 el color que quieras
  }}
  />
</ListItem>

                        
                        {filteredDatasets.map((dataset) => (
                            <ListItem key={dataset.datasetId} divider disablePadding>
                              <ListItemButton
                            selected={activeDataset?.datasetId === dataset.datasetId}
                             onClick={() => onSelectDataset(dataset)}
                            sx={{
                             px: 2,
                             py: 0.5,
                               minHeight: 40,
                             borderBottom: '1px solid #00e5ff', // línea turquesa
                              backgroundColor: activeDataset?.datasetId === dataset.datasetId ? 'transparent':'#26717b99',
                                     '&:hover': { backgroundColor: 'rgba(44, 158, 170, 0.2)' },
                                     }}
                              >

                                    <ListItemText
                                        primary={dataset.datasetName}
                                        sx={{ flex: '1 1 50%', pr: 2 }}
                                        primaryTypographyProps={{ noWrap: true, title: dataset.datasetName }}
                                    />
                                    <ListItemText
                                        secondary={dataset.datasetType || 'N/A'}
                                        sx={{ flex: '1 1 25%', pr: 2 }}
                                        secondaryTypographyProps={{
                                        sx: { color: 'rgba(255,255,255,0.85)' },
                                         }}
                                    />
                                    <ListItemText
                                        secondary={format(new Date(dataset.createdAt), "d MMM yyyy", { locale: es })}
                                        sx={{ flex: '1 1 25%' }}
                                        secondaryTypographyProps={{
                                        sx: { color: 'rgba(255,255,255,0.85)' },
                                        }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                ) : (
                    // Mensaje para cuando la búsqueda no encuentra nada
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                        <Typography color="text.secondary">
                            No se encontraron archivos con ese nombre.
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
}

// Los PropTypes no necesitan el searchTerm, ya que no viene de fuera
DatasetList.propTypes = {
    datasets: PropTypes.array,
    activeDataset: PropTypes.object,
    onSelectDataset: PropTypes.func.isRequired,
};