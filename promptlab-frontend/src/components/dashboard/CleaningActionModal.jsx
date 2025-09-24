// src/components/dashboard/CleaningActionModal.jsx
import React from 'react';
import { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogActions, 
    Button, 
    IconButton 
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// ¡Ya no necesitamos el objeto 'style'! El componente Dialog se encarga de todo.

export default function CleaningActionModal({ open, handleClose, title, children, onConfirm, confirmText = "Aplicar" }) {
  return (
    // 1. Reemplazamos <Modal> por <Dialog>
    //    'onClose' y 'open' funcionan exactamente igual.
    <Dialog 
      open={open} 
      onClose={handleClose} 
      aria-labelledby="cleaning-action-modal-title" // Sigue siendo buena práctica
      fullWidth  // Opcional: hace que el diálogo ocupe un ancho razonable
      maxWidth="sm" // Opcional: limita el ancho máximo
    >
      {/* 2. Usamos <DialogTitle> en lugar de <Typography> */}
      {/*    MUI lo conecta automáticamente para la accesibilidad. */}
      <DialogTitle id="cleaning-action-modal-title" sx={{ m: 0, p: 2 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      {/* 3. Envolvemos el contenido {children} en <DialogContent> */}
      {/*    La prop 'dividers' añade unas líneas de separación bonitas. */}
      <DialogContent dividers>
        {children}
      </DialogContent>
      
      {/* 4. Envolvemos los botones en <DialogActions> */}
      <DialogActions sx={{ p: '16px 24px' }}> {/* Padding para consistencia */}
          <Button onClick={handleClose}>Cancelar</Button>
          <Button onClick={onConfirm} variant="contained">{confirmText}</Button>
      </DialogActions>
    </Dialog>
  );
}