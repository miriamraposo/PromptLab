
// src/components/dashboard/DateTimeCleaner.jsx

import React, { useState } from 'react';
import { Box, Button, Paper, Alert, Typography } from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import CleaningActionModal from './CleaningActionModal'; // ¡No olvides la importación!

export default function DateTimeCleaner({ columnName, onApplyAction, detectedType }) {
    // --- ESTADO PARA CONTROLAR EL MODAL ---
    // Aquí es más simple, solo necesitamos saber si está abierto o cerrado.
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- FUNCIONES PARA MANEJAR EL MODAL ---
    const handleOpenModal = () => setIsModalOpen(true);
    const handleCloseModal = () => setIsModalOpen(false);

    const handleConfirmAction = () => {
        const payload = {
            action: 'datetime_convert_to_date',
            params: { columna: columnName }
        };
        onApplyAction(payload);
        handleCloseModal(); // Cierra el modal después de confirmar
    };

    // Para evitar mostrar la opción si el backend ya detectó que es una fecha.
    // Pasamos `detectedType` como prop desde el componente padre.
    const needsConversion = !detectedType?.startsWith('datetime');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Alert severity="info">
                Herramientas para columnas que contienen fechas o podrían serlo.
            </Alert>
            
            {!needsConversion && (
                <Alert severity="success">
                    ¡Perfecto! Esta columna ya está reconocida como un formato de fecha.
                </Alert>
            )}

            {/* --- Tarjeta para Convertir a Fecha (Solo se muestra si es necesario) --- */}
            {needsConversion && (
                <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <EventIcon color="primary" />
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="body1" fontWeight="medium">Convertir a Formato de Fecha</Typography>
                            <Typography variant="caption" color="text.secondary">
                                Transforma textos (ej: '2023-01-15') a un tipo de dato de fecha.
                            </Typography>
                        </Box>
                    </Box>
                    <Button variant="contained" onClick={handleOpenModal}>Convertir</Button>
                </Paper>
            )}

            {/* --- EL MODAL DE CONFIRMACIÓN --- */}
            <CleaningActionModal
                open={isModalOpen}
                handleClose={handleCloseModal}
                onConfirm={handleConfirmAction}
                title={`Convertir "${columnName}" a Fecha`}
                confirmText="Sí, convertir"
            >
                {/* El contenido (children) es solo texto de confirmación */}
                <Typography variant="body1">
                    Se intentará convertir todos los valores de esta columna a un formato de fecha estándar.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Las filas que no se puedan transformar correctamente podrían convertirse en valores nulos. ¿Estás seguro?
                </Typography>
            </CleaningActionModal>
        </Box>
    );
}