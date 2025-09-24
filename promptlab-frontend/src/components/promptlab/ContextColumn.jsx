import React from 'react';
import { Paper, Typography, TextField, Box, Button, CircularProgress } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore'; // Añade este import

const ContextColumn = ({ context, setContext, onSave, isSaving, hasChanges, onRestore }) => (
  <Paper
  sx={{
    p: 2,
    flexGrow: 1,
    borderRadius: 2,
    boxShadow: 3,
    display: 'flex',
    flexDirection: 'column',
    border: '2px solid #2196f3', // 👈 grosor + estilo + color
    overflow: 'hidden',
  }}
>
    <Typography variant="h6" sx={{ mb: 1, flexShrink: 0 }}>
      Editor de Contexto
    </Typography>

    {/* Usamos un Box para controlar el crecimiento del TextField */}
    <Box sx={{flexGrow: 1, minHeight: 0, position: 'relative' }}>
      <TextField
        multiline
        fullWidth
        value={context || ''}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Pega tu contexto aquí..."
        sx={{
          // Hacemos que el TextField ocupe el 100% del Box contenedor
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          // Y que su área de texto interna sea la que tenga el scroll
          '& .MuiOutlinedInput-root': { height: '100%' },
          '& .MuiInputBase-inputMultiline': { height: '100% !important', overflowY: 'auto !important' }
        }}
      />
    </Box>

   <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {/* Botón Restaurar (solo aparece si hay cambios) */}
          {hasChanges && (
            <Button
              size="small"
              onClick={onRestore}
              startIcon={<RestoreIcon />}
            >
              Restaurar
            </Button>
          )}

          {/* Botón Guardar (alineado a la derecha) */}
          <Button
            sx={{ ml: 'auto' }} // Empuja el botón de guardar a la derecha
            variant="contained"
            onClick={onSave}
            disabled={isSaving || !hasChanges}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSaving ? 'Guardando...' : 'Guardar Contexto'}
          </Button>
        </Box>
      </Paper>
    );

    export default ContextColumn;