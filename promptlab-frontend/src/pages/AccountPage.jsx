import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
// Usaremos algunos componentes de Material-UI para que se vea mejor
import { TextField, Button, CircularProgress, Alert, Box, Typography, Paper, Stack, InputAdornment, IconButton } from '@mui/material';
import ApiKeysManager from '../components/ApiKeysManager'; 
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

function AccountPage() {
    const [loadState, setLoadState] = useState({ loading: true, error: null, data: null });
    
    // Nuevo estado para manejar los campos del formulario
    const [fullName, setFullName] = useState('');
    
    // Nuevo estado para el proceso de guardado
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });

    // --- ¡PASO 3: FUNCIONES PARA MANEJAR LOS CLICS EN EL OJO! ---
    const handleClickShowPassword = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleMouseDownPassword = (event) => {
        event.preventDefault(); // Evita que el input pierda el foco al hacer clic
    };

    // El useEffect para cargar los datos iniciales sigue siendo el mismo
    useEffect(() => {
        const fetchUserData = async () => {
            setLoadState({ loading: true, error: null, data: null });
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Sesión no válida.");
                
                const url = `${import.meta.env.VITE_API_URL}/api/user/me`;
                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
                
                if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
                
                const result = await response.json();
    
                if (result.success && result.data) {
                    setLoadState({ loading: false, error: null, data: result.data });
                    // Rellenamos el estado del formulario con los datos cargados
                    setFullName(result.data.full_name || '');
                } else {
                    throw new Error(result.error || "Respuesta no exitosa.");
                }
            } catch (err) {
                setLoadState({ loading: false, error: err.message, data: null });
            }
        };
        fetchUserData();
    }, []);

     const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPasswordData(prevState => ({ ...prevState, [name]: value }));
    };

    const handlePasswordSave = async (event) => {
        event.preventDefault();
        // Validación en el frontend primero
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError("La nueva contraseña y la confirmación no coinciden.");
            return;
        }
        
        setIsSavingPassword(true);
        setPasswordError(null);
        setPasswordSuccess(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/user/password`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || `Error del servidor (${response.status})`);
            }
            
            setPasswordSuccess(true);
            // Limpiamos los campos después del éxito
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setIsSavingPassword(false);
        }
    };

    // Nueva función para manejar el envío del formulario
    const handleSave = async (event) => {
        event.preventDefault(); // Evita que la página se recargue
        setIsSaving(true);
        setSaveError(null);
        setSaveSuccess(false);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/user/me`;
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ full_name: fullName }) // Enviamos el nuevo nombre
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || `Error del servidor (${response.status})`);
            }
            
            // Éxito. Actualizamos el estado de la página con los nuevos datos.
            setLoadState(prevState => ({ ...prevState, data: result.data }));
            setSaveSuccess(true);

        } catch (err) {
            setSaveError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadState.loading) {
        return <CircularProgress />;
    }

    if (loadState.error) {
        return <Alert severity="error">Error: {loadState.error}</Alert>;
    }

    return (
        <Box sx={{ p: 3, pt: 'calc(72px + 1px)' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Configuración de la Cuenta
            </Typography>

            <Box 
                sx={{ 
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, // 1 columna en móvil, 2 en pantallas medianas o más grandes
                    gap: 3, // Espacio entre las columnas
                    mt: 2
                }}
            >
                {/* --- COLUMNA IZQUIERDA --- */}
                <Stack spacing={3}>
                    {/* Formulario de Perfil */}
                    <Paper component="form" onSubmit={handleSave} noValidate sx={{ p: 3,border: '2px solid',
                            borderColor: 'primary.main', }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Información del Perfil</Typography>
                        <TextField margin="normal" fullWidth id="email" label="Dirección de Email" value={loadState.data.email} disabled variant="filled" />
                        <TextField margin="normal" required fullWidth id="fullName" label="Nombre Completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                        {saveSuccess && <Alert severity="success" sx={{ mt: 2 }}>¡Perfil guardado con éxito!</Alert>}
                        {saveError && <Alert severity="error" sx={{ mt: 2 }}>{saveError}</Alert>}
                        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isSaving}>
                            {isSaving ? <CircularProgress size={24} /> : 'Guardar Cambios'}
                        </Button>
                    </Paper>

                    {/* Formulario de Contraseña */}
                    <Paper component="form" onSubmit={handlePasswordSave} noValidate sx={{ p: 3, border: '2px solid', borderColor: 'primary.main' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Cambiar Contraseña</Typography>

            {/* --- ¡PASO 4: MODIFICAR CADA TEXTFIELD! --- */}

            <TextField
                margin="normal"
                required
                fullWidth
                name="currentPassword"
                label="Contraseña Actual"
                // El tipo cambia dinámicamente según el estado
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                // Aquí añadimos el icono
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle current password visibility"
                                onClick={() => handleClickShowPassword('current')}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                            >
                                {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            <TextField
                margin="normal"
                required
                fullWidth
                name="newPassword"
                label="Nueva Contraseña"
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle new password visibility"
                                onClick={() => handleClickShowPassword('new')}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                            >
                                {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirmar Nueva Contraseña"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                InputProps={{
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label="toggle confirm password visibility"
                                onClick={() => handleClickShowPassword('confirm')}
                                onMouseDown={handleMouseDownPassword}
                                edge="end"
                            >
                                {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                        </InputAdornment>
                    ),
                }}
            />

            {passwordSuccess && <Alert severity="success" sx={{ mt: 2 }}>¡Contraseña cambiada con éxito!</Alert>}
            {passwordError && <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert>}
            
            <Button type="submit" fullWidth variant="contained" color="secondary" sx={{ mt: 3, mb: 2 }} disabled={isSavingPassword}>
                {isSavingPassword ? <CircularProgress size={24} /> : 'Actualizar Contraseña'}
            </Button>
        </Paper>
                </Stack>

                {/* --- COLUMNA DERECHA --- */}
                <Box>
                    <ApiKeysManager />
                </Box>
            </Box>
        </Box>
    );
}

export default AccountPage;