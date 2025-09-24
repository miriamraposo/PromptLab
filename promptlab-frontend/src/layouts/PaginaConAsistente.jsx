// src/layouts/PaginaConAsistente.jsx
import React, { useState } from 'react';
import { Fab, Box } from '@mui/material';
import { HelpOutline as HelpIcon } from '@mui/icons-material';
import { FAQChatModal } from '../components/FAQChatModal'; // Asegúrate de que la ruta sea correcta

/**
 * Este componente envuelve el contenido de una página y le añade
 * un botón flotante (FAB) para abrir el chat de ayuda.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - El contenido principal de la página.
 * @param {string} props.nombreModulo - El nombre del módulo actual para pasarlo al chat.
 */
export const PaginaConAsistente = ({ children, nombreModulo }) => {
  // 1. Estado para controlar la visibilidad del modal
  const [isChatOpen, setIsChatOpen] = useState(false);

  // 2. Funciones para abrir y cerrar el modal
  const handleOpenChat = () => {
    setIsChatOpen(true);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    // Usamos un Box como contenedor principal para posicionar el FAB
    <Box sx={{ position: 'relative', minHeight: '100vh' }}>
      {/* Renderizamos el contenido principal de la página */}
      {children}

      {/* 3. El Botón Flotante (FAB) */}
      <Fab
        color="secondary"
        aria-label="ayuda"
        onClick={handleOpenChat}
        sx={{
          position: 'fixed', // Posición fija en la pantalla
          bottom: 24,        // 24px desde abajo
          right: 24,         // 24px desde la derecha
          zIndex: 1000       // Asegura que esté por encima de otros elementos
        }}
      >
        <HelpIcon />
      </Fab>

      {/* 4. El Modal del Chat */}
      {/* Se renderiza aquí pero solo es visible cuando `isChatOpen` es true */}
      <FAQChatModal
        open={isChatOpen}
        onClose={handleCloseChat}
        currentModule={nombreModulo}
      />
    </Box>
  );
};