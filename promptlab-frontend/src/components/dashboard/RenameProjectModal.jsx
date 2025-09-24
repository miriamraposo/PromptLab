// src/components/dashboard/RenameProjectModal.jsx (VERSIÓN FINAL Y FUNCIONAL)

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    Button, Dialog, DialogActions, DialogContent, DialogTitle,
    TextField, Alert, CircularProgress
} from '@mui/material';
import { supabase } from '../../supabaseClient';
import { useTheme } from '@mui/material/styles';

export default function RenameProjectModal({ open, onClose, onProjectRenamed, project }) {
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const theme = useTheme();


    // Este useEffect es clave: pre-llena el campo con el nombre actual del proyecto
    useEffect(() => {
        if (project && open) {
            setNewName(project.projectName);
        }
    }, [project, open]);

    const handleRename = async () => {
        if (!newName.trim()) {
            setError("El nombre no puede estar vacío.");
            return;
        }
        setLoading(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            // ✅ LLAMADA A LA API PARA ACTUALIZAR (PUT)
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/projects/${project.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ project_name: newName.trim() }),
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo renombrar el proyecto.');
            }

            onProjectRenamed(); // Llama a fetchProjects para refrescar la lista
            onClose(); // Cierra el modal

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (loading) return;
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
      sx: {
        borderRadius: 3,
        boxShadow: 6,
        p: 2,
      },
    }}
  >
    <DialogTitle 
      sx={{ 
        fontWeight: 'bold', 
        color: 'text.primary' // se adapta a claro/oscuro
      }}
    >
      Renombrar Proyecto
    </DialogTitle>

    <DialogContent>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField
        autoFocus
        margin="dense"
        label="Nuevo Nombre del Proyecto"
        fullWidth
        variant="outlined"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        disabled={loading}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
          },
        }}
      />
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2, justifyContent: 'flex-end' }}>
      <Button
        onClick={handleClose}
        variant="outlined"
        size="medium"
        disabled={loading}
        sx={{
          mr: 2,
          borderColor: theme.palette.divider,      // dinámico
          color: theme.palette.text.primary,       // siempre visible
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            borderColor: theme.palette.text.secondary,
          },
        }}
      >
        Cancelar
      </Button>

      <Button
        onClick={handleRename}
        variant="contained"
        size="medium"
        disabled={loading}
        sx={{
          background: 'linear-gradient(90deg, #00e5ff, #00bcd4)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(90deg, #00bcd4, #0097a7)',
          },
        }}
      >
        {loading ? (
          <CircularProgress size={24} sx={{ color: '#fff' }} />
        ) : (
          'Guardar'
        )}
      </Button>
    </DialogActions>
  </Dialog>
);

}

RenameProjectModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onProjectRenamed: PropTypes.func.isRequired,
    project: PropTypes.object,
};