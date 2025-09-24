// src/components/LoginForm.jsx

import React, { useState } from 'react';
import { TextField, Button, Link, Typography, Stack, InputAdornment, IconButton,Box } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';

export default function LoginForm({ onLogin, isSubmitting, error, onRegisterLink, onForgotPassword }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault(); // evita recargar página
    onLogin(email, password);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

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
    <Stack
      component="form"
      noValidate
      spacing={2.5}
      sx={{ mt: 2 }}
      onSubmit={handleSubmit}
    >
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

      {error && (
        <Typography
          color="error"
          variant="body2"
          sx={{ backgroundColor: '#ffdddd', color: '#d32f2f', p: 1.5, borderRadius: 1, textAlign: 'center' }}
        >
          {error}
        </Typography>
      )}

      <Button
        type="submit"
        disabled={isSubmitting}
        variant="contained"
        endIcon={isSubmitting && <CircularProgress size={16} color="inherit" />}
        size="large"
        sx={{
          py: 1.5,
          fontWeight: 'bold',
          borderRadius: '8px',
          backgroundColor: '#2193b0',
          color: 'white',
          '&:hover': { backgroundColor: '#1c7a92' },
          '&.Mui-disabled': {
            backgroundColor: 'rgba(0,0,0,0.1)',
            color: 'rgba(255,255,255,0.3)'
          }
        }}
      >
        Iniciar Sesión
      </Button>

      <Typography component="div" variant="body2" sx={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.9)', mt: 2 }}>
      <Box
    sx={{
        display: 'flex', // Activa Flexbox
        justifyContent: 'space-between', // Misma lógica que en Stack
        alignItems: 'center',
        mt: 2,
    }}
>
   {/* Elemento de la Izquierda */}
  <Box>
    ¿No tienes cuenta?{' '}
    <Link
      component="button"
      type="button"
      onClick={onRegisterLink}
      sx={{ color: 'white', fontWeight: 'bold', textDecoration: 'underline' }}
    >
      Regístrate
    </Link>
  </Box>

     {/* Elemento de la Derecha */}
  <Link
    component="button"
    type="button"
    onClick={onForgotPassword}
    sx={{ color: 'white', fontWeight: 'bold', textDecoration: 'underline' }}
  >
    Olvidé mi contraseña
  </Link>
</Box>
      </Typography>
    </Stack>
  );
}
