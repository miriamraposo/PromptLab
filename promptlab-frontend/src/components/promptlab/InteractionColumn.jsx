
// components/promptlab/InteractionColumn.jsx

import React, { useState } from 'react';
import {
  Box, Paper, Typography, TextField, Button, CircularProgress,
  IconButton, Tooltip, Divider, FormControlLabel, Switch, Grid
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import ReactMarkdown from 'react-markdown';
import SaveIcon from '@mui/icons-material/Save';
import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageIcon from '@mui/icons-material/Image'; // <-- ¡CORRECCIÓN 1: Importación correcta del icono!

const InteractionColumn = ({
  userPrompt,
  setUserPrompt,
  handleExecutePrompt,
  isLoading,
  result,
  onDonate,
  isDonating,
  onSave,
  isSaving,
  isBatchMode,
  setIsBatchMode,
  handleGenerateImage,
  isGeneratingImage
}) => {

const [isCopied, setIsCopied] = useState(false);
const handleCopy = () => {
if (result?.ai_response) {
navigator.clipboard.writeText(result.ai_response);
setIsCopied(true);
setTimeout(() => setIsCopied(false), 2000);
}
};

  return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1}}>
    {/* --- PANEL DE ENTRADA --- */}
  <Paper 
      sx={{ 
        minWidth: 400, 
        p: 2, 
        borderRadius: 2, 
        boxShadow: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        border: '2px solid #2196f3', // 👈 grosor + estilo + color
        flexGrow: 1,      // 1. Le dice al Paper que CREZCA
        overflow: 'hidden' // 2. Evita que el Paper tenga su propio scroll
      }}
    >
       <Typography variant="h6" sx={{ flexShrink: 0 }}> {/* flexShrink es buena práctica para títulos */}
       Explora prompts con IA
      </Typography>
      {/* Switch para cambiar entre modo simple y batch */}
      <FormControlLabel
        control={
          <Switch
            checked={isBatchMode}
            onChange={(e) => setIsBatchMode(e.target.checked)}
          />
        }
        label="Modo Lote (un prompt por línea)"
        sx={{ alignSelf: 'flex-start', flexShrink: 0 }} // También para el Switch
      
      />

      <TextField
           multiline
           // rows={isBatchMode ? 15 : 5}    // <--- Línea eliminada
            maxRows={isBatchMode ? 15 : 10}
             // Para que empiece con un tamaño inicial, ahora usamos minRows
            minRows={isBatchMode ? 15 : 5}   // <--- Añadimos esta línea
            fullWidth
            value={userPrompt || ""}
             sx={{ flexGrow: 1, minHeight: 0 }}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder={
            isBatchMode
            ? "Cada línea es un prompt separado:\n¿Cuál es la capital de Francia?\nResume el siguiente texto...\nTraduce 'hola' al inglés..."
            : "Escribe tu prompt aquí..."
        }
      />
       {/* ========================================================== */}
      {/* --- CORRECCIÓN 1 y 2: LÓGICA DE BOTONES AGRUPADOS --- */}
      {/* ========================================================== */}
      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
        {/* Botón Principal (Texto o Lote) */}
        <Button
          variant="contained"
          size="large"
          onClick={handleExecutePrompt}
          // Lógica 'disabled' corregida para ambas cargas
          disabled={isLoading || isGeneratingImage} 
          sx={{ flex: 1 }} // Ocupa el espacio principal
        >
          {isLoading
            ? <CircularProgress size={24} color="inherit" />
            : (isBatchMode ? "Ejecutar Lote" : "Ejecutar Texto")}
        </Button>

        {/* Botón de Generar Imagen, condicional al modo simple */}
        {!isBatchMode && (
          <Button
            variant="outlined"
            size="large"
            onClick={handleGenerateImage}
            disabled={isLoading || isGeneratingImage}
            startIcon={isGeneratingImage ? <CircularProgress size={20} /> : <ImageIcon />}
          >
            Generar Imagen
          </Button>
        )}
      </Box>
    </Paper>

    {/* --- PANEL DE SALIDA (SOLO MODO SIMPLE) --- */}
    {!isBatchMode && (
      <Paper sx={{ p: 2,  border: '2px solid #2196f3',  flexGrow: 1, borderRadius: 2, boxShadow: 3, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        
        {/* 1. CABECERA */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" ,border:'primary'}}>
          <Typography variant="h6">Resultado</Typography>
          {result?.success && result.ai_response && (
            <Tooltip title="Copiar Resultado">
              <IconButton onClick={() => navigator.clipboard.writeText(result.ai_response)} size="small">
                <ContentCopyIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Divider sx={{ my: 1 }} />

        {/* 2. CONTENIDO PRINCIPAL */}
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
              <CircularProgress />
            </Box>
          )}

          {result?.success && result.ai_response && (
            <ReactMarkdown components={{ p: ({ children }) => <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{children}</Typography> }}>
              {result.ai_response}
            </ReactMarkdown>
          )}

          {result && !result.success && (
            <Typography color="error" sx={{ whiteSpace: 'pre-wrap' }}>Error: {result.error}</Typography>
          )}

          {!isLoading && !result && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
              El resultado de tu prompt aparecerá aquí.
            </Typography>
          )}
        </Box>

        {/* 3. MÉTRICAS Y FOOTER */}
        {result?.success && result.ai_response && (
          <>
            {/* 3.A. Accordion de métricas */}
            <Accordion
              sx={{
              mt: 2,
              boxShadow: 'none',
             '&:before': { display: 'none' },
              backgroundColor: 'primary', // celeste claro
              }}
              >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Métricas</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                {result.meta ? (
                  <Grid container spacing={1}>
                     <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Modelo:</strong></Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" fontFamily="monospace">{result.meta.model_id}</Typography></Grid>
                    {/* Aquí podés agregar más filas para latencia, tokens, costo, etc. */}
                  </Grid>
                ) : (
                  <Grid container spacing={1}>
                    <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Modelo:</strong></Typography></Grid>
                    <Grid size={{ xs: 6 }}><Typography variant="body2" fontFamily="monospace">{result.model_used}</Typography></Grid>
                    <Grid size={{ xs: 12 }}><Typography variant="caption" color="text.secondary">Métricas detalladas no disponibles.</Typography></Grid>
                  </Grid>
                )}
              </AccordionDetails>
            </Accordion>

            {/* 3.B. Footer simplificado con botones */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #ddd' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
                  onClick={onSave}
                  disabled={isSaving || Boolean(result.history_id)}
                >
                  {result.history_id ? "Guardado" : "Guardar"}
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={isDonating ? <CircularProgress size={16} /> : <VolunteerActivismIcon />}
                  onClick={() => onDonate(result.history_id)}
                  disabled={isDonating || Boolean(result?.donated) || !result.history_id}
                >
                  {result.donated ? "¡Gracias!" : "Donar Prompt"}
                </Button>
              </Box>
            </Box>
          </>
        )}
      </Paper>
    )}
  </Box>
);

};

export default InteractionColumn;


