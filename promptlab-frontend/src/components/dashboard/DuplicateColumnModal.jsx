import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Typography
} from '@mui/material';

export default function DuplicateColumnModal({ open, onClose, onSave, originalColumnName }) {
    const [newColumnName, setNewColumnName] = useState('');

    // Cuando se cierra, se limpia el estado
    const handleClose = () => {
        setNewColumnName('');
        onClose();
    };

    const handleSave = () => {
        if (!newColumnName.trim()) {
            alert("Por favor, introduce un nombre para la nueva columna.");
            return;
        }
        onSave(newColumnName.trim());
        handleClose();
    };

    return (
  <Dialog
    open={open}
    onClose={handleClose}
    fullWidth
    maxWidth="xs"
    PaperProps={{
      sx: {
        borderRadius: 3,
        background: 'linear-gradient(145deg, #26717a, #44a1a0)',
        color: '#fff',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
      },
    }}
  >
    <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center', color: '#fff' }}>
      Duplicar Columna
    </DialogTitle>

    <DialogContent dividers sx={{ bgcolor: 'rgba(255,255,255,0.05)' }}>
      <Typography gutterBottom sx={{ mb: 2 }}>
        Se creará una copia de la columna: <strong>{originalColumnName}</strong>
      </Typography>

      <TextField
        autoFocus
        margin="dense"
        label="Nombre para la nueva columna"
        type="text"
        fullWidth
        variant="outlined"
        value={newColumnName}
        onChange={(e) => setNewColumnName(e.target.value)}
        InputProps={{
          sx: {
            bgcolor: '#fff', // fondo semitransparente
            borderRadius: 1.5,
            color: '#fff',
            '& .MuiInputLabel-root': { color: '#ffffffaa' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff55' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffffaa' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00e5ff' },
            '& .MuiInputBase-input': { color: '#fff' },
          },
        }}
      />
    </DialogContent>

    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button
        onClick={handleClose}
        sx={{ color: '#fff', borderColor: '#ffffff55', '&:hover': { borderColor: '#fff' } }}
        variant="outlined"
      >
        Cancelar
      </Button>

      <Button
        onClick={handleSave}
        variant="contained"
        sx={{ backgroundColor: '#00e5ff', color: '#005f73', fontWeight: 'bold', '&:hover': { backgroundColor: '#00c5dd' } }}
      >
        Duplicar
      </Button>
    </DialogActions>
  </Dialog>
);

}