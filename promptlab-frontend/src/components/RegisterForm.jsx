// src/components/RegisterForm.jsx

import React, { useState } from 'react';
import { TextField, Button, Checkbox, FormControlLabel, Link, Typography, Stack, InputAdornment, IconButton } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';


export default function RegisterForm({ onRegister, isSubmitting, error, onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [localError, setLocalError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleClickShowPassword = () => setShowPassword((show) => !show);
    const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);

    
const handleSubmit = (event) => {
    event.preventDefault(); // 👈 Esto previene la recarga de la página
    handleRegisterClick();  // Llama a la lógica que ya tienes
};

const handleRegisterClick = () => {
    // 1. Validaciones primero. Si alguna falla, nos detenemos.
    if (password !== confirmPassword) {
        setLocalError('Las contraseñas no coinciden');
        return; // Detiene la ejecución aquí
    }
    if (!agreedToTerms) {
        setLocalError('Debes aceptar los términos y condiciones.');
        return; // Detiene la ejecución aquí
    }
      
    // 2. Si todas las validaciones pasan, limpiamos el error local y llamamos a onRegister
    setLocalError('');
    onRegister(email, password); // ✅ Llamada única con todos los datos correctos
};

    const textFieldStyles = {
        variant: "filled",
        sx: {
            backgroundColor: 'white',
            borderRadius: '8px',
            '&:hover': { backgroundColor: '#f0f0f0' },
            '& .MuiFilledInput-root': {
                backgroundColor: 'transparent',
                borderRadius: '8px',
                '&.Mui-focused': {
                    backgroundColor: 'white',
                    boxShadow: '0 0 0 2px #2193b0'
                },
            },
            '& .MuiFilledInput-underline:before, & .MuiFilledInput-underline:after': {
                display: 'none',
            },
            input: { color: '#0B2447' },
        }
    };

    const inputLabelStyles = {
        sx: {
            color: '#555',
            textTransform: 'none',
        }
    };

    return (
        <Stack component="form" onSubmit={handleSubmit} noValidate spacing={2.5} sx={{ mt: 2 }}>           
            <TextField
                label="E-mail"
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                {...textFieldStyles}
                InputLabelProps={inputLabelStyles}
            />
            <TextField
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                {...textFieldStyles}
                InputLabelProps={inputLabelStyles}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton onClick={handleClickShowPassword} edge="end" sx={{ color: '#555' }}>
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <TextField
                label="Confirmar Contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                {...textFieldStyles}
                InputLabelProps={inputLabelStyles}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton onClick={handleClickShowConfirmPassword} edge="end" sx={{ color: '#555' }}>
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        size="small" // <-- La alternativa a transform: 'scale(0.8)'
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        sx={{ color: 'white', '&.Mui-checked': { color: 'white' } }}
                    />
                }
                label={
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.9rem' }}>
                        Estoy de acuerdo con los{' '}
                        <Link href="/terms" target="_blank" sx={{ color: 'white', fontWeight: 'bold' }}>
                            Términos & Condiciones
                        </Link>
                    </Typography>
                }
            />


            {(localError || error) && (
                <Typography color="error" variant="body2" sx={{ backgroundColor: '#ffdddd', color: '#d32f2f', p: 1.5, borderRadius: 1, textAlign: 'center' }}>
                    {localError || error}
                </Typography>
            )}

            <Button
                
                type="submit" // <-- ✅ importante para que se dispare al presionar Enter
                disabled={isSubmitting}
                variant="contained"
                size="large"
                endIcon={isSubmitting && <CircularProgress size={16} color="inherit" />}
                sx={{
                    py: 1.5,
                    fontWeight: 'bold',
                    backgroundColor: '#2193b0',
                    color: 'white',
                    borderRadius: '8px',
                    '&:hover': { backgroundColor: '#1c7a92' },
                    '&.Mui-disabled': {
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        color: 'rgba(255,255,255,0.3)'
                    }
                }}
            >
                Registrarse
            </Button>

            <Typography variant="body2" sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)', mt: 2 }}>
                ¿Ya tienes una cuenta?{' '}
                <Link component="button" onClick={onLogin} sx={{ color: 'white', fontWeight: 'bold', textDecoration: 'underline' }}>
                    Iniciar Sesión
                </Link>
            </Typography>
        </Stack>
    );
}
