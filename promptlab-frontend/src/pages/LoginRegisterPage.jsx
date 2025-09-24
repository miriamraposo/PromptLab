import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import LoginForm from '../components/LoginForm';
import RegisterForm from "../components/RegisterForm";
import { useLocation } from 'react-router-dom';
import promptLabLogo from '@/assets/promptLabLogos.png';


const ForgotPasswordForm = ({ onReset, message, isSubmitting, onBackToLogin }) => {
    const [email, setEmail] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onReset(email);
    };

    return (
        <Box
  component="form"
  onSubmit={(e) => {
    e.preventDefault();
    onReset(email);
  }}
>
  <Typography
    variant="h5"
    sx={{ color: 'white', fontWeight: 'bold', mb: 2 }}
  >
    Recuperar Contraseña
  </Typography>

  <Typography sx={{ color: 'white', mb: 2 }}>
    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
  </Typography>

  {/* Campo de email blanco */}
  <TextField
    label="Tu dirección de email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    fullWidth
    required
    variant="outlined"
    sx={{
      input: { color: 'black', backgroundColor: 'white' }, // texto negro sobre fondo blanco
      label: { color: 'black' },
      borderRadius: 2,
    }}
  />

  {/* Botón blanco */}
  <Button
    type="submit"
    variant="contained"
    sx={{
      mt: 2,
      width: '100%',
      backgroundColor: 'white',
      color: 'black',
      '&:hover': {
        backgroundColor: '#f0f0f0',
      },
    }}
    disabled={isSubmitting}
  >
    {isSubmitting ? 'Enviando...' : 'Enviar Enlace'}
  </Button>

  {message && <Typography sx={{ mt: 2, color: 'white' }}>{message}</Typography>}

  <Button
    onClick={onBackToLogin}
    sx={{ mt: 1, color: 'white', textTransform: 'none' }}
  >
    &larr; Volver a Iniciar Sesión
  </Button>
</Box>

    );
};


export default function LoginRegisterPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const queryParams = new URLSearchParams(location.search);
    
    const [view, setView] = useState(queryParams.get('view') || 'login');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setView(queryParams.get('view') || 'login');
    }, [location.search]);

    const changeView = (newView) => {
        setError(null);
        setMessage('');
        navigate(`/auth?view=${newView}`);
    };
  

  const handleLogin = async (email, password) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      navigate('/dashboard');
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setError('El correo o la contraseña son incorrectos.');
      } else {
        console.error("Error inesperado en handleLogin:", err);
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (email, password) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      const userId = data.user?.id;
      if (!userId) throw new Error('No se pudo obtener el ID del usuario.');

      // Aquí podrías agregar lógica adicional para crear perfil, etc.

      navigate('/elegir-plan');
    } catch (err) {
      console.error("Error DETALLADO durante el registro:", err);

      let friendlyMessage = 'No se pudo completar el registro.';
      const msg = err.message || err.error_description || '';

      if (msg.includes('User already registered')) {
        friendlyMessage = 'Este correo electrónico ya está en uso.';
      } else if (msg.includes('password should be at least 6 characters')) {
        friendlyMessage = 'La contraseña debe tener al menos 6 caracteres.';
      }

      setError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async (email) => {
        setIsSubmitting(true);
        setMessage('');
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'http://localhost:5173/update-password', 
        });
        if (error) { setError(error.message); } 
        else { setMessage('¡Revisa tu email para encontrar el enlace!'); }
        setIsSubmitting(false);
    };

    // --- FUNCIÓN PARA RENDERIZAR EL FORMULARIO CORRECTO ---
    const renderForm = () => {
        switch(view) {
            case 'register':
                return <RegisterForm 
                            onRegister={handleRegister} 
                            onLogin={() => changeView('login')} 
                            isSubmitting={isSubmitting} 
                            error={error} 
                        />;
            case 'forgotPassword':
                return <ForgotPasswordForm 
                            onReset={handlePasswordReset}
                            message={message || error} // Muestra mensaje de éxito o error
                            isSubmitting={isSubmitting}
                            onBackToLogin={() => changeView('login')}
                        />;
            case 'login':
            default:
                return <LoginForm 
                            onLogin={handleLogin} 
                            onRegisterLink={() => changeView('register')} 
                            onForgotPassword={() => changeView('forgotPassword')} // <-- Pasamos la función
                            isSubmitting={isSubmitting} 
                            error={error}
                        />;
        }
    };

    // ✅ ¡EL RETURN EMPIEZA AQUÍ Y ENVUELVE TODO!
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to right, #6dd5ed, #2193b0)',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    position: 'relative',
                    width: '1200px',
                    height: '600px',
                    backgroundColor: '#6dd5ed',
                    borderRadius: '20px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                }}
            >
                {/* === COLUMNA IZQUIERDA === */}
                <Box
                    sx={{
                        width: '50%',
                        backgroundColor: '#ffffff',
                        p: 5,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontStyle: 'italic',
                            fontSize: '2.0rem',
                            fontWeight: 'bold',
                            color: '#6dd5ed',
                            mb: 0,

                        }}
                    >
                        BIENVENIDO A
                    </Typography>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            textAlign: 'center', // <- centrado horizontal
                            gap: 2,
                            mb: 10,
                        }}
                    >
                        <Box
                            component="img"
                            src={promptLabLogo}
                            alt="PromptLab Logo"
                            sx={{
                                width: { xs: 70, md: 50 },
                                height: 'auto',
                                userSelect: 'none',
                                transform: 'skewX(-10deg)',
                            }}
                        />
                        <Typography
                            variant="h5"

                            sx={{
                                fontStyle: 'italic',
                                fontSize: '2.0rem',
                                fontWeight: 'bold',
                                color: '#6dd5ed',
                            }}
                        >
                            PROMPTLAB
                        </Typography>
                    </Box>

                    <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <Typography
                            variant="h6"
                            sx={{
                                mt: 1,
                                fontWeight: 'bold',
                                opacity: 0.9,
                                textAlign: 'center',
                                color: '#2193b0',
                                fontSize: '1.5rem',
                                maxWidth: '90%', // para que no se estire demasiado
                            }}
                        >
                            IA al alcance de todos
                        </Typography>
                    </Box>
                    <Typography
                        variant="h6"
                        sx={{
                            mt: 10,

                            opacity: 0.9,
                            textAlign: 'center',
                            color: 'grey.800',
                            fontSize: '1rem',
                        }}
                    >
                         Potencia el trabajo de especialistas y profesionales que lideran proyectos de datos, ayudando a transformar la información en decisiones efectivas
                    </Typography>
                </Box>

                {/* === COLUMNA DERECHA: Limpia y funcional === */}
            <Box
                sx={{
                    width: '50%',
                    backgroundColor: '#6dd5ed',
                    p: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                }}
            >
                {/* 
                  ¡Y ESO ES TODO!
                  La función renderForm() se encarga de mostrar el formulario correcto
                  (Login, Register o ForgotPassword) basado en el estado 'view'.
                */}
                {renderForm()}
            </Box>
        </Box>
    </Box>
);
}