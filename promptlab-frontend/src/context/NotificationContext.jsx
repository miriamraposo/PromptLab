// src/context/NotificationContext.jsx

import React, { createContext, useState, useContext } from 'react';
import { Snackbar, Alert } from '@mui/material';

// 1. Creamos el Context
const NotificationContext = createContext();

// 2. Creamos el Provider (el componente que manejará la lógica)
export function NotificationProvider({ children }) {
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info', // puede ser 'success', 'error', 'warning', 'info'
    });

    const showNotification = (message, severity = 'info') => {
        setNotification({ open: true, message, severity });
    };

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setNotification({ ...notification, open: false });
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <Snackbar
                open={notification.open}
                autoHideDuration={4000} // Se cierra sola después de 4 segundos
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} // Posición
            >
                <Alert onClose={handleClose} severity={notification.severity} sx={{ width: '100%' }}>
                    {notification.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
}

// 3. Creamos un hook personalizado para usarlo fácilmente
export const useNotification = () => {
    return useContext(NotificationContext);
};