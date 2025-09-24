// src/components/dashboard/ConfirmDeleteModal.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export default function ConfirmDeleteModal({ open, onClose, onConfirm, project }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
        <WarningAmberIcon color="warning" sx={{ mr: 1 }} />
        Eliminar Proyecto
    </DialogTitle>
    <DialogContent>
        <DialogContentText>
            ¿Confirmás que deseas eliminar el Proyecto:
            <strong> "{project?.projectName}"</strong>?
            <br /><br />
            Tendrás 5 segundos para deshacer esta acción.
        </DialogContentText>
    </DialogContent>
   <DialogActions sx={{ px: 3, pb: 2 }}>
     <Button
        onClick={onClose}
        variant="contained"
        color="primary"
        sx={{ mr: 26 }} // ⬅️ Ajustá el valor para más o menos espacio
    >
        Cancelar Eliminacion
    </Button>
    <Button onClick={onConfirm} variant="contained" color="error" >
        Eliminar el Archivo
    </Button>
</DialogActions>
</Dialog>

    );
}

ConfirmDeleteModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onConfirm: PropTypes.func.isRequired,
    project: PropTypes.object,
};