// src/theme/theme.js

import { createTheme } from '@mui/material/styles';

const lightPalette = {
  primary: { main: '#6dd5ed' },
  secondary: { main: '#2193b0' },
  background: { default: '#f5f5f7', paper: '#ffffff' },
  text: { primary: '#212121', secondary: '#757575' },
  divider: 'rgba(0, 0, 0, 0.08)',
};

const darkPalette = {
  primary: { main: '#6dd5ed' },
  secondary: { main: '#2193b0' },
  background: { default: '#121212', paper: '#1e1e1e' },
  text: { primary: '#ffffff', secondary: '#bbbbbb' },
  divider: 'rgba(255, 255, 255, 0.12)',
};

const getTheme = (mode) => createTheme({
  palette: {
    mode,
    ...(mode === 'light' ? lightPalette : darkPalette),
  },
  typography: {
    fontFamily: ['Inter', 'sans-serif'].join(','),
    h4: { fontWeight: 700, fontSize: '1.75rem' },
    h5: { fontWeight: 600, fontSize: '1.5rem' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.palette.mode === 'light' 
            ? 'rgba(255, 255, 255, 0.8)'
            : 'rgba(30, 30, 30, 0.8)',
          backdropFilter: 'blur(8px)',
        }),
      }
    },
    
    // --- AÑADE ESTE BLOQUE COMPLETO AQUÍ ---
    MuiTooltip: {
      styleOverrides: {
        // Estilos para el cuadro del tooltip
        tooltip: ({ theme }) => ({
          fontSize: '0.875rem',         // Letra un poco más grande
          padding: '8px 12px',         // Más espaciado interno
          borderRadius: theme.shape.borderRadius, // Usa el mismo radio de borde que el resto de tu app
          // Cambiamos el color de fondo dependiendo del modo
          backgroundColor: theme.palette.mode === 'light' 
            ? 'rgba(60, 60, 60, 0.95)'  // Un gris oscuro en modo claro
            : 'rgba(50, 50, 50, 0.95)',  // Un gris un poco más claro en modo oscuro para que resalte
        }),
        // Estilos para la flecha
        arrow: ({ theme }) => ({
          color: theme.palette.mode === 'light'
            ? 'rgba(60, 60, 60, 0.95)'
            : 'rgba(50, 50, 50, 0.95)',
        }),
      }
    },
    // ... aquí irían otros overrides que tengas o quieras añadir
  },
});

export default getTheme;