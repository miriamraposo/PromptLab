// src/components/dashboard/SectionsEditor.jsx
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Card, IconButton, TextField, Typography, Stack } from '@mui/material';
import { Delete, ContentCopy } from '@mui/icons-material';

export default function SectionsEditor({ sections, onSectionChange, onSectionDelete, onSectionDuplicate }) {
  if (!sections || sections.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <Typography color="text.secondary" variant="body1">
          No hay contenido para mostrar en modo de secciones.
          <br />
          Intenta escribir algo en el modo simple primero.
        </Typography>
      </Card>
    );
  }

  const handleContentChange = (id, newContent) => {
    const updatedSections = sections.map(section =>
      section.id === id ? { ...section, content: newContent } : section
    );
    onSectionChange(updatedSections);
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
      {sections.map((section, index) => (
        <Card
          key={section.id}
          sx={{
            mb: 3,
            p: 2.5,
            borderRadius: 3,
            transition: 'all 0.2s ease-in-out',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Sección {index + 1}
            </Typography>
            <Box>
              {onSectionDuplicate && (
                <IconButton size="small" onClick={() => onSectionDuplicate(section.id)}>
                  <ContentCopy fontSize="small" />
                </IconButton>
              )}
              {onSectionDelete && (
                <IconButton size="small" onClick={() => onSectionDelete(section.id)}>
                  <Delete fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Stack>

          <TextField
            fullWidth
            multiline
            placeholder="Escribe aquí el contenido de la sección..."
            variant="standard"
            value={section.content}
            onChange={(e) => handleContentChange(section.id, e.target.value)}
            InputProps={{
              disableUnderline: true,
            }}
            sx={{
              '& .MuiInputBase-input': {
                fontSize: '1rem',
                fontFamily: 'monospace',
                lineHeight: 1.6,
              },
            }}
          />
        </Card>
      ))}
    </Box>
  );
}

SectionsEditor.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
  })).isRequired,
  onSectionChange: PropTypes.func.isRequired,
  onSectionDelete: PropTypes.func,
  onSectionDuplicate: PropTypes.func,
};
