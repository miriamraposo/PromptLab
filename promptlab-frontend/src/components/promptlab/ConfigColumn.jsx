import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button // <-- Añade Button al import
} from '@mui/material';

// --- AHORA RECIBE MENOS PROPS ---
const ConfigColumn = ({ models, selectedModel, setSelectedModel, systemPrompt, setSystemPrompt }) => {
  
  // Hooks para la navegación
  const navigate = useNavigate();
  const location = useLocation();

  // --- ÚNICO ESTADO NUEVO: para el campo de búsqueda ---
  const [searchText, setSearchText] = useState('');

  // --- FUNCIÓN PARA NAVEGAR AL EXPLORADOR ---
  const handleOpenExplorer = () => {
    navigate('/explorador-prompts', {
      state: {
        // Le decimos a la página del explorador a dónde debe volver
        returnTo: location.pathname, 
        // Le pasamos el texto que el usuario ya haya escrito
        searchText: searchText 
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 2 }}>
        
        {/* --- PANEL DE CONFIGURACIÓN DE IA (sin cambios) --- */}
        <Paper sx={{border: '2px solid #2196f3', p: 1, borderRadius: 2, boxShadow: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Configuración de la IA</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
  <InputLabel id="model-select-label">Modelo de IA</InputLabel>
  <Select
    labelId="model-select-label"
    value={selectedModel || ''}
    label="Modelo de IA"
    onChange={e => setSelectedModel(e.target.value)}
    disabled={!models || models.length === 0}
  >
    {models && models.map(model => (
      <MenuItem key={model.id} value={model.id}>
        {model.name} {/* <-- solo la etiqueta visible */}
      </MenuItem>
    ))}
  </Select>
</FormControl>
            <TextField
                label="Instrucciones al Modelo (System Prompt)"
                multiline
                rows={4}
                value={systemPrompt || ''}
                onChange={e => setSystemPrompt(e.target.value)}
                fullWidth
                helperText="Define el rol y comportamiento de la IA."
            />
        </Paper>

        {/* --- PANEL DE INSPIRACIÓN DE PROMPTS (SIMPLIFICADO) --- */}
        <Paper sx={{ border: '2px solid #2196f3', p: 2, borderRadius: 2, boxShadow: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Inspiración de Prompts</Typography>
            <TextField 
              label="Buscar inspiración..." 
              fullWidth 
              sx={{ mb: 2 }} 
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              // Permite que el usuario presione Enter para buscar
              onKeyPress={(e) => { if (e.key === 'Enter') handleOpenExplorer(); }}
            />
            <Button variant="contained" onClick={handleOpenExplorer}>
              Abrir Explorador de Prompts
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 'auto', pt: 2 }}>
               Explora una amplia variedad de prompts con opciones de filtrado.
            </Typography>
        </Paper>
    </Box>
  );
};

export default ConfigColumn;


