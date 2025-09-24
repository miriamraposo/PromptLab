import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { TextField, Button, Typography, Paper, Box } from '@mui/material';

function UpdatePasswordPage() {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);
    const navigate = useNavigate();

    // Este useEffect es la clave. Se suscribe a los cambios de autenticación.
    useEffect(() => {
        // Cuando el usuario llega desde el enlace del email, Supabase detecta el token en la URL
        // y emite un evento 'PASSWORD_RECOVERY'.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                
                // El usuario ya está "autenticado" temporalmente para poder cambiar su contraseña.
                // No necesitamos hacer nada más aquí, solo mostrar el formulario.
            }
        });

        // Limpiamos la suscripción cuando el componente se desmonta
        return () => subscription.unsubscribe();
    }, []);

    const handleUpdatePassword = async (event) => {
        event.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Las contraseñas no coinciden.");
            return;
        }

        setIsUpdating(true);
        setError('');
        setMessage('');

        // Usamos la función updateUser para establecer la nueva contraseña.
        // Como el usuario llegó desde el enlace, Supabase ya sabe quién es.
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            setError(`Error al actualizar la contraseña: ${error.message}`);
        } else {
            setMessage("¡Contraseña actualizada con éxito! Serás redirigido a la página de inicio de sesión.");
            // Redirigimos al usuario después de un breve momento
            setTimeout(() => {
                navigate('/auth?view=login');
            }, 3000);
        }
        setIsUpdating(false);
    };

    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <Paper component="form" onSubmit={handleUpdatePassword} sx={{ p: 4, maxWidth: 400 }}>
                <Typography variant="h5" gutterBottom>Establecer Nueva Contraseña</Typography>
                <TextField 
                    label="Nueva Contraseña" 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    fullWidth required margin="normal"
                />
                <TextField 
                    label="Confirmar Nueva Contraseña" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    fullWidth required margin="normal"
                />
                <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={isUpdating}>
                    {isUpdating ? 'Actualizando...' : 'Actualizar Contraseña'}
                </Button>
                {message && <Typography color="success.main" sx={{ mt: 2 }}>{message}</Typography>}
                {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
            </Paper>
        </Box>
    );
}

export default UpdatePasswordPage;