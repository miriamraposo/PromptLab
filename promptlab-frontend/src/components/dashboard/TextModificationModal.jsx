// src/components/dashboard/TextModificationModal.jsx

import React from 'react';
import PropTypes from 'prop-types';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    Typography, Box, Paper, Slide
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import CloseIcon from '@mui/icons-material/Close';

const Transition = React.forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function TextModificationModal({ open, onClose, title, data, onReplace }) {

    const renderContent = () => {
        if (!data) return null;

        const original = data.originalText;
        // La lógica para obtener el texto de la sugerencia es simple y directa
        const resultText = data.data?.ai_response || 'No se encontró una respuesta válida.';

        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                        Original:
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, maxHeight: 150, overflow: 'auto', backgroundColor: '#f4f6f8', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {original}
                        </Typography>
                    </Paper>
                </Box>
                <Box>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        Sugerencia:
                    </Typography>
                    <Paper elevation={0} sx={{ p: 2, maxHeight: 150, overflow: 'auto', backgroundColor: '#e8f4ff', borderRadius: 2, border: '1px solid #90caf9' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {resultText}
                        </Typography>
                    </Paper>
                </Box>
            </Box>
        );
    };

    const handleReplace = () => {
        const resultText = data.data?.ai_response;
        if (resultText && onReplace) {
            onReplace(data.originalText, resultText);
        }
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" TransitionComponent={Transition} sx={{ '& .MuiDialog-paper': { borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' } }}>
            <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {title || 'Sugerencia de Texto'}
            </DialogTitle>
            <DialogContent dividers>{renderContent()}</DialogContent>
            <DialogActions sx={{ justifyContent: 'space-between', p: 2 }}>
                <Button startIcon={<CloseIcon />} onClick={onClose} variant="outlined" color="secondary">
                    Cerrar
                </Button>
                {/* El botón de reemplazar se muestra siempre, sin condiciones */}
                <Button startIcon={<SwapHorizIcon />} onClick={handleReplace} variant="contained" color="primary">
                    Reemplazar Texto
                </Button>
            </DialogActions>
        </Dialog>
    );
}

TextModificationModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    data: PropTypes.object,
    onReplace: PropTypes.func
};