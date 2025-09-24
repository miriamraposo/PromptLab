// src/main.jsx (CORREGIDO)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { UserProvider } from './context/UserContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx'; // ✅ Bien: Importa TU ThemeProvider
import { CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import './App.css';


ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <UserProvider>
        <ThemeProvider>
          <SnackbarProvider maxSnack={3}> {/* Muestra hasta 3 notificaciones a la vez */}
            <CssBaseline />
            <App />
          </SnackbarProvider>
        </ThemeProvider>
      </UserProvider>
    </BrowserRouter>
  </React.StrictMode>
);