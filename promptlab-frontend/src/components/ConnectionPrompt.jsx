import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';

// Este componente es un "llamado a la acción" genérico
export default function ConnectionPrompt({ serviceName, connectionUrl }) {
  return (
    <Box 
      sx={{ 
        textAlign: 'center', 
        p: 3, 
        border: '1px dashed', 
        borderColor: 'divider', 
        borderRadius: 1, 
        mt: 2 
      }}
    >
      <Typography variant="h6" gutterBottom>
        Conecta tu cuenta de {serviceName}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Para poder exportar a {serviceName}, primero necesitas autorizar la conexión de forma segura.
      </Typography>
      <Button
        variant="contained"
        startIcon={<LinkIcon />}
        href={connectionUrl} // <-- La URL de n8n que ya tienes
        target="_blank"     // <-- Abre en una nueva pestaña
        rel="noopener noreferrer"
      >
        Conectar ahora
      </Button>
    </Box>
  );
}