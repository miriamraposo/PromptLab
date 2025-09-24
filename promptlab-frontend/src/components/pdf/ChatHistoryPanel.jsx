// En /components/pdf/ChatHistoryPanel.jsx

import React from 'react';
import { Box, Paper, Typography, CircularProgress, Divider } from '@mui/material';
import ReactMarkdown from 'react-markdown'; // Reutilizamos tu markdown

// Recibirá un array de mensajes y el estado de carga
const ChatHistoryPanel = ({ messages, isLoading }) => {
  return (
    <Paper sx={{ p: 1, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', border: '2px solid #2196f3' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Conversación</Typography>
      <Divider sx={{ mb: 2 }}/>
      
      {/* Aquí es donde se renderizará la lista de mensajes */}
      <Box sx={{ flexGrow: 1 }}>
        {messages.length === 0 && !isLoading && (
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
            Los resultados de tu interacción con el documento aparecerán aquí.
          </Typography>
        )}

        {messages.map((msg, index) => (
          <Box key={index} sx={{ mb: 2, textAlign: msg.sender === 'user' ? 'right' : 'left' }}>
           <Paper 
               elevation={1} 
               sx={{ 
                p: 1, 
                display: 'inline-block', 
                maxWidth: '90%',
                overflowWrap: 'break-word',
                 backgroundColor: msg.sender === 'user' ? 'primary.light' : 'grey.200',
                fontSize: '0.85rem' // 👈 cambia el tamaño del texto acá
                }}
                >
              <ReactMarkdown>{msg.text}</ReactMarkdown>
              {/* Si el mensaje es una imagen, la mostramos */}
              {msg.type === 'image' && <img src={msg.url} alt="generada" style={{ maxWidth: '100%' }} />}
            </Paper>
          </Box>
        ))}
        
        {isLoading && <CircularProgress sx={{ display: 'block', mx: 'auto' }} />}
      </Box>
    </Paper>
  );
};

export default ChatHistoryPanel;