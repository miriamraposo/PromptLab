// src/components/dashboard/CreateProjectModal.jsx (VERSIÓN FINAL CON AUTOCOMPLETE)

import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, 
    CircularProgress, Alert, Autocomplete // ✅ Importamos Autocomplete
} from '@mui/material';
import { supabase } from '../../supabaseClient';

// Estas son solo SUGERENCIAS para el Autocomplete
const projectTypeSuggestions = [
    "Procesamiento de Datos",
    "Convertir imagenes a texto",
    "Modelo Predictivo",
    "Generar Prompts",
];

export default function CreateProjectModal({ open, onClose, onProjectCreated }) {
    const [projectName, setProjectName] = useState('');
    const [projectType, setProjectType] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleCreate = async () => {
        if (!projectName.trim() || !projectType.trim()) {
            setError('El nombre y el tipo de proyecto son obligatorios.');
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    project_name: projectName.trim(),
                    project_type: projectType.trim() 
                }),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo crear el proyecto.');
            }

            onProjectCreated();
            handleClose();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
        setProjectName('');
        setProjectType('');
        setError(null);
        onClose();
    };

   return (
  <Dialog 
    open={open} 
    onClose={handleClose} 
    fullWidth 
    maxWidth="sm"
    PaperProps={{
      sx: { borderRadius: 3, p: 1.5 }
    }}
  >
    <DialogTitle 
      sx={{ 
        fontWeight: 'bold',
        fontSize: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}
    >
      🚀 Crear Nuevo Proyecto
    </DialogTitle>

    <DialogContent dividers sx={{ pt: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        autoFocus
        margin="dense"
        label="Nombre del Proyecto"
        placeholder="Ej: Análisis de Ventas 2024"
        fullWidth
        variant="outlined"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        disabled={loading}
        autoComplete="off"
        sx={{ mb: 2 }}
      />

      <Autocomplete
        freeSolo
        options={projectTypeSuggestions}
        value={projectType}
        onInputChange={(event, newValue) => setProjectType(newValue || '')}
        disabled={loading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Tipo de Proyecto"
            placeholder="Ej: Reporte, Dashboard..."
            margin="dense"
            variant="outlined"
          />
        )}
      />
    </DialogContent>

    <DialogActions sx={{ px: 3, py: 2 }}>
      <Button 
        onClick={handleClose} 
        disabled={loading}
        variant="outlined"
        sx={{ borderRadius: 2 }}
      >
        Cancelar
      </Button>
      <Button 
        onClick={handleCreate} 
        variant="contained" 
        disabled={loading}
        sx={{ borderRadius: 2 }}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : 'Crear'}
      </Button>
    </DialogActions>
  </Dialog>
);
}

CreateProjectModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onProjectCreated: PropTypes.func.isRequired,
};