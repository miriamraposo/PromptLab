import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Alert, CircularProgress } from '@mui/material';
import { useTheme } from '@mui/material/styles';


export default function RenameDatasetModal({ open, onClose, dataset, onRenameConfirmed }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const theme = useTheme();


  useEffect(() => {
    if (dataset) setNewName(dataset.datasetName);
  }, [dataset]);

  const handleRename = async () => {
    if (!newName.trim()) {
      setError('El nombre no puede estar vacío.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      await onRenameConfirmed(newName.trim());
      onClose();
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado al renombrar.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError('');
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
        color: 'text.primary' // dinámico: claro u oscuro
      }}
    >
      Renombrar Archivo
    </DialogTitle>

    <DialogContent sx={{ pt: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TextField
        autoFocus
        margin="dense"
        label="Nuevo nombre"
        color="primary"
        fullWidth
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        disabled={loading}
        onKeyDown={e => { if (e.key === 'Enter') handleRename(); }}
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
        disabled={loading}
        sx={{
          mr: 2,
          borderColor: theme.palette.divider,      // dinámico según tema
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
        disabled={loading}
        sx={{
          background: 'linear-gradient(90deg, #00e5ff, #00bcd4)',
          color: '#fff',
          '&:hover': {
            background: 'linear-gradient(90deg, #00bcd4, #0097a7)',
          },
        }}
      >
        {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Aplicar cambios'}
      </Button>
    </DialogActions>
  </Dialog>
);

}

RenameDatasetModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  dataset: PropTypes.object,
  onRenameConfirmed: PropTypes.func.isRequired,
};
