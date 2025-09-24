import React from 'react';
import { Box, Typography, Paper, TextField } from '@mui/material';



export default function CatalogItemEditor({ items, onFieldChange }) {
  if (!items || items.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
        <Typography color="text.secondary">No se encontraron productos en esta página.</Typography>
      </Paper>
    );
  }

  const customLabels = {
  sku: 'Código de Producto',
  // Puedes añadir otros que veas comúnmente, si quieres:
  // 'desc': 'Descripción', 
  // 'precio': 'Precio',
};


  return (
    <Box>
      {items.map((item, index) => (
        <Paper key={item.item_id || index} elevation={2} sx={{ p: 2.5, mb: 3 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Producto #{index + 1}
          </Typography>
          
          {Object.entries(item)
            .filter(([key]) => key !== 'item_id')
            .map(([key, value]) => (
              <TextField
                key={key}
                fullWidth
                 label={customLabels[key.toLowerCase()] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value || ''}
                onChange={(e) => {
                  
                  onFieldChange(item.item_id || index, key, e.target.value);
                }}
                variant="outlined"
                multiline={key === 'descripcion'}
                rows={key === 'descripcion' ? 3 : 1}
                sx={{ mb: 2 }}
              />
            ))}
        </Paper>
      ))}
    </Box>
  );
  }