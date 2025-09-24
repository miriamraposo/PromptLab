import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, CircularProgress } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';


export default function ConfirmDeleteDatasetModal({ open, onClose, dataset, onDeleteConfirmed }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDeleteConfirmed();
      onClose();
    } catch (err) {
      alert(err.message || 'Error al eliminar.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    onClose();
  };


return (
  <Dialog 
    open={open} 
    onClose={handleClose} 
    fullWidth 
    maxWidth="sm"
    PaperProps={{
      sx: { borderRadius: 3, p: 1.5 } // bordes suaves + padding interno
    }}
  >
    <DialogTitle 
      sx={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 1.5, 
        fontWeight: "bold" 
      }}
    >
      <WarningAmberIcon color="error" />
      Confirmar Eliminación
    </DialogTitle>

    <DialogContent dividers>
      <Typography>
        ¿Estás seguro de que deseas eliminar el archivo:&nbsp; 
        <b>{dataset?.datasetName}</b>?
      </Typography>
      <Typography 
        color="error" 
        sx={{ mt: 2, fontWeight: "bold" }}
      >
        ⚠️ Esta acción no se puede deshacer.
      </Typography>
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
      <Button 
        onClick={handleClose} 
        variant="outlined" 
        color="inherit" 
        disabled={loading}
      >
        Cancelar
      </Button>
      
      <Button
        onClick={handleDelete}
        variant="contained"
        color="error"
        disabled={loading}
        sx={{ minWidth: 180 }}
      >
        {loading ? <CircularProgress size={22} color="inherit" /> : 'Eliminar Archivo'}
      </Button>
    </DialogActions>
  </Dialog>
);

}

ConfirmDeleteDatasetModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  dataset: PropTypes.object,
  onDeleteConfirmed: PropTypes.func.isRequired,
};
