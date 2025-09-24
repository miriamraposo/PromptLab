// src/components/ApiKeyInput.jsx

import React, { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Alert, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function ApiKeyInput({ provider, displayName, savedKey, onSave, onDelete }) {
    const [apiKey, setApiKey] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [showKey, setShowKey] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            await onSave(provider, apiKey);
            // El mensaje de éxito ahora lo maneja el componente padre (Snackbar)
            setApiKey(''); // Limpiamos el campo
        } catch (err) {
            setError(err.message || 'Error desconocido al guardar.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar la clave para ${displayName}?`)) {
            await onDelete(provider);
        }
    };

    return (
        <Box sx={{ mb: 4, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2,}}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">{displayName}</Typography>
                {savedKey && (
                    <IconButton onClick={handleDelete} color="error" size="small">
                        <DeleteIcon />
                    </IconButton>
                )}
            </Box>
            
            {savedKey ? (
                <Alert severity="success" sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                    Clave configurada: {showKey ? savedKey.display_key.replace("****", "sk-...") : savedKey.display_key}
                    <IconButton onClick={() => setShowKey(!showKey)} size="small" sx={{ ml: 'auto' }}>
                        {showKey ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                </Alert>
            ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                    No has configurado una clave. Se usará la del sistema.
                </Alert>
            )}

            <TextField
                fullWidth
                type="password"
                label={`Ingresa o actualiza tu clave de API`}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                margin="normal"
                size="small"
                placeholder="sk-..."
            />
            <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaving || !apiKey.trim()}
            >
                {isSaving ? <CircularProgress size={24} /> : 'Guardar / Actualizar Clave'}
            </Button>
            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
        </Box>
    );
}