// src/components/FAQChatModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  CircularProgress, Box, Typography, Paper
} from '@mui/material';
import { Send as SendIcon, SmartToy as SmartToyIcon } from '@mui/icons-material';
import { supabase } from '../supabaseClient'; 

export const FAQChatModal = ({ open, onClose, currentModule }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Mensaje de bienvenida al abrir el modal
  useEffect(() => {
  if (open && messages.length === 0) {
    setMessages([
      {
        sender: 'bot',
        text: `¡Hola! Soy tu asistente.\nEstás en el módulo de '${currentModule}'.\n¿En qué puedo ayudarte?`,
        source: 'system'
      }
    ]);
  }
}, [open, messages, currentModule]);

  // Scroll automático al último mensaje
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      
       // 1. Obtener la sesión actual de Supabase
       const { data: { session }, error: sessionError } = await supabase.auth.getSession();

       if (sessionError || !session) {
         // Si no hay sesión, no podemos continuar.
         throw new Error('Usuario no autenticado. Por favor, inicie sesión.');
       }
       const accessToken = session.access_token;

       // 2. Añadir el encabezado 'Authorization' a la petición
       const response = await fetch(`${import.meta.env.VITE_API_URL}/api/faq`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${accessToken}` // <-- LA LÍNEA CLAVE
         },
         body: JSON.stringify({ pregunta: inputValue, modulo: currentModule })
       });

      const data = await response.json();

      if (response.ok && data.success) { // Es buena práctica revisar también response.ok
        const botMessage = {
          sender: 'bot',
          text: data.data.respuesta, // OJO: Parece que tu backend devuelve la data anidada en un campo 'data'
          source: data.data.fuente,
          interpreted: data.data.pregunta_interpretada
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        const errorMsg = data.error || `Error del servidor: ${response.status}`;
        const errorMessage = { sender: 'bot', text: `Error: ${errorMsg}`, source: 'error' };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      // Ahora el error de "Usuario no autenticado" también será capturado aquí
      const errorMessage = { sender: 'bot', text: err.message || 'Error de conexión.', source: 'error' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
};

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Asistente de Ayuda</DialogTitle>
      <DialogContent dividers sx={{ height: '60vh', backgroundColor: '#f5f5f5' }}>
        <Box display="flex" flexDirection="column" gap={2}>
          {messages.map((msg, index) => (
            <Box key={index} alignSelf={msg.sender === 'user' ? 'flex-end' : 'flex-start'}>
              <Paper 
                elevation={1}
                sx={{
                  padding: '10px 15px',
                  borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                  backgroundColor: msg.sender === 'user' ? 'primary.main' : 'white',
                  color: msg.sender === 'user' ? 'white' : 'black',
                  maxWidth: '400px',
                }}
              >
                {msg.source === 'ia_generativa' && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <SmartToyIcon fontSize="small" sx={{ color: '#FFC107' }} />

                    <Typography variant="caption">Respuesta generada por IA</Typography>
                  </Box>
                )}
                <Typography variant="body1">{msg.text}</Typography>
              </Paper>
            </Box>
          ))}
          <div ref={chatEndRef} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ padding: '16px 24px' }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Escribe tu duda aquí..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <IconButton color="primary" onClick={handleSend} disabled={isLoading}>
          {isLoading ? <CircularProgress size={24} /> : <SendIcon />}
        </IconButton>
      </DialogActions>
    </Dialog>
  );
};
