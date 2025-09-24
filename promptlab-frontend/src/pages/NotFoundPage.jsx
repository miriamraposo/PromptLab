import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                background: 'linear-gradient(to right, #ff6e7f, #bfe9ff)',
                p: 4,
            }}
        >
            <Typography variant="h2" color="primary" fontWeight="bold">
                404
            </Typography>
            <Typography variant="h5" sx={{ mt: 2 }}>
                Página no encontrada
            </Typography>
            <Typography variant="body1" sx={{ mt: 1, mb: 3 }}>
                Lo sentimos, la página que buscas no existe o fue movida.
            </Typography>
            <Button variant="contained" onClick={() => navigate('/')}>
                Volver al inicio
            </Button>
        </Box>
    );
}
