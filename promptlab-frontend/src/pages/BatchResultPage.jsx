 import React from 'react';
    import { useLocation,  useParams, useNavigate } from 'react-router-dom';
    import {
      Box, Typography, Paper, Button, Accordion, AccordionSummary, AccordionDetails, Divider, Grid
    } from '@mui/material';
    import ArrowBackIcon from '@mui/icons-material/ArrowBack';
    import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
    import { useState, useCallback } from 'react'; 
    import SaveIcon from '@mui/icons-material/Save'; // <-- Icono para el botón
    import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'; 
    import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material'; // Para el diálogo de guardado
    import { supabase } from '../supabaseClient';


    export default function BatchResultPage() {
        const location = useLocation();
        const navigate = useNavigate();
        const { projectId, datasetId } = useParams();
    
        // Obtenemos los resultados que nos pasó la página anterior
        const batchResults = location.state?.batchResults;

        // --- ESTADOS PARA GUARDADO Y DONACIÓN ---
        const [isSaving, setIsSaving] = useState(false);
        const [isDonating, setIsDonating] = useState(false);
    
    // Estados para el diálogo de guardado
        const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
        const [saveTitle, setSaveTitle] = useState("");
        const [currentItemToSave, setCurrentItemToSave] = useState(null); // <-- Para saber qué item estamos guardando

    // --- ESTADOS PARA CADA ITEM (Guardado / Donado) ---
    // Usaremos un objeto para rastrear el estado de cada item por su índice
        const [savedItems, setSavedItems] = useState({}); // ej: { 0: 'hist_123', 2: 'hist_456' }
        const [donatedItems, setDonatedItems] = useState({}); // ej: { 0: true, 2: true }
    
        // Si por alguna razón llegamos aquí sin datos, mostramos un error
        if (!batchResults) {
            return (
                <Box sx={{ p: 3, pt: `calc(72px + 24px)` }}>
                    <Typography variant="h5" color="error">Error: No se encontraron resultados para mostrar.</Typography>
                    <Button sx={{ mt: 2 }} variant="outlined" onClick={() => navigate(-1)}>Volver</Button>
                </Box>
            );
        }
        
        const { resumen, resultados, common_data } = batchResults;
       

        const handleOpenSaveDialog = (item) => {
    setCurrentItemToSave(item); // Guardamos el item completo
    setSaveTitle(item.user_question.substring(0, 50)); // Título por defecto
    setIsSaveDialogOpen(true);
};

// --- FUNCIÓN QUE REALIZA EL GUARDADO (MODIFICADA) ---
  const handleConfirmSave = useCallback(async () => {
    // 1. Verificación de existencia de common_data
    if (!common_data) {
        console.error("ERROR: common_data es undefined al guardar.");
        setIsSaving(false);
        setIsSaveDialogOpen(false);
        return; // Detenemos la ejecución
    }

    if (!currentItemToSave || !saveTitle.trim()) return;

    setIsSaving(true);
    setIsSaveDialogOpen(false);

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/promptlab/save-history`;

        // --- CONSTRUCCIÓN DEL PAYLOAD (LA CLAVE ESTÁ AQUÍ) ---
          const payload = {
            model_name: common_data.model_name, // Ahora esto está más seguro
            system_prompt: common_data.system_prompt,
            context: common_data.context,
            
            // Datos específicos de este resultado
            user_prompt: currentItemToSave.user_question,
            ai_response: currentItemToSave.ai_response,
            
            // Metadatos
            titulo_personalizado: saveTitle,
            project_id: projectId, 
            dataset_id: common_data.dataset_id || datasetId 
        };
          
        const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        if (!response.ok) throw new Error(responseData.error || "Error al guardar.");

        
        
        // Actualizamos el estado para saber que este item se guardó y con qué ID
        setSavedItems(prev => ({
            ...prev,
            [currentItemToSave.index]: responseData.history_id 
        }));

    } catch (error) {
        console.error("Error al guardar el prompt:", error);
    } finally {
        setIsSaving(false);
        setSaveTitle("");
        setCurrentItemToSave(null);
    }
}, [currentItemToSave, saveTitle, common_data, projectId, datasetId]);


// --- FUNCIÓN DE DONACIÓN (MODIFICADA) ---
const handleDonate = async (itemIndex) => {
    const historyIdToDonate = savedItems[itemIndex];
    if (!historyIdToDonate) {
        alert("Debes guardar el prompt antes de poder donarlo.");
        return;
    }

    setIsDonating(true); // Puedes hacer esto más granular por item si quieres
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sesión no válida.");

        const url = `${import.meta.env.VITE_API_URL}/api/promptlab/donate`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ history_entry_id: historyIdToDonate })
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || "Error al donar.");

       
        // Actualizamos estado para saber que este item fue donado
        setDonatedItems(prev => ({ ...prev, [itemIndex]: true }));

    } catch (error) {
        console.error("Error en la donación:", error);
    } finally {
        setIsDonating(false);
    }
};

   return (
  <Box
    sx={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      p: 3,
      pt: `calc(72px + 24px)`,
      overflow: 'hidden',
      background: "linear-gradient(135deg, #26717a, #44a1a0)",
    }}
  >
    {/* --- Encabezado con Título y Botón de Volver (SIN CAMBIOS) --- */}
    <Box
      sx={{
        flexShrink: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
      }}
    >
      <Typography variant="h5" fontWeight="bold">
        Resultados de la Ejecución por Lote
      </Typography>
      <Button
        variant="outlined"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
      >
        Volver al Laboratorio
      </Button>
    </Box>

    {/* --- Resumen de Métricas Globales (SIN CAMBIOS) --- */}
    <Paper sx={{ flexShrink: 0, p: 2, mb: 3, boxShadow: 3 }}>
      {/* ... Tu Grid de resumen va aquí, está perfecto ... */}
      <Grid container spacing={2}>
       <Grid size={{ xs: 6,  md: 2 }}><Typography><strong>Prompts Totales:</strong> {resumen.total_prompts}</Typography></Grid>
        <Grid  size={{ xs: 6,  md: 2 }}><Typography color="success.main"><strong>Exitosos:</strong> {resumen.exitosos}</Typography></Grid>
        <Grid  size={{ xs: 6,  md: 2 }}><Typography color="error.main"><strong>Fallidos:</strong> {resumen.fallidos}</Typography></Grid>
        <Grid  size={{ xs: 6,  md: 2 }}><Typography><strong>Costo Total:</strong> ~${resumen.costo_total_estimado_usd?.toFixed(6) || '0.00'}</Typography></Grid>
        <Grid  size={{ xs: 6,  md: 2 }}><Typography><strong>Tokens Totales:</strong> {resumen.tokens_totales || 0}</Typography></Grid>
        <Grid  size={{ xs: 6,  md: 2 }}><Typography><strong>Latencia Promedio:</strong> {resumen.latencia_promedio_ms} ms</Typography></Grid>
      </Grid>
    </Paper>

    {/* --- Lista de Resultados Individuales (CON CAMBIOS) --- */}
    <Box sx={{ flex: 1, overflowY: 'auto' }}>
      {resultados.map((item) => {
        
        // ✅ PASO 1: LÓGICA AÑADIDA
        const isSaved = !!savedItems[item.index];
        const isDonated = !!donatedItems[item.index];

        return ( // <-- return explícito
          <Accordion
            key={item.index}
            defaultExpanded={!item.success}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              {/* Esto no cambia */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <Typography sx={{ flex: 1, fontWeight: item.success ? 500 : 'bold', color: item.success ? 'inherit' : 'error.main', mr: 2 }} noWrap title={item.user_question}>
                  {`#${item.index + 1}: ${item.user_question}`}
                </Typography>
                {item.success && item.meta && ( <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}> {item.meta.latency_ms}ms {item.meta.completion_tokens != null && ` | ${item.meta.completion_tokens} tokens`} </Typography>)}
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ borderTop: '1px solid #ddd' }}>
              {item.success ? (
                // ✅ PASO 2: BOTONES AÑADIDOS
                <>
                  <Typography sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', mb: 2 }}>
                    {item.ai_response}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" size="small" startIcon={<SaveIcon />} onClick={() => handleOpenSaveDialog(item)} disabled={isSaved}>
                      {isSaved ? 'Guardado' : 'Guardar'}
                    </Button>
                    <Button variant="outlined" size="small" color="secondary" startIcon={<VolunteerActivismIcon />} onClick={() => handleDonate(item.index)} disabled={!isSaved || isDonated}>
                      {isDonated ? 'Donado' : 'Donar'}
                    </Button>
                  </Box>
                </>
              ) : (
                <Typography color="error.main" sx={{ whiteSpace: 'pre-wrap' }}>
                  <strong>Error:</strong> {item.error}
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ); // <-- Cierre del return
      })} {/* <-- Cierre del map */}
    </Box>

    {/* --- ✅ PASO 3: DIÁLOGO AÑADIDO --- */}
    <Dialog open={isSaveDialogOpen} onClose={() => setIsSaveDialogOpen(false)}>
      <DialogTitle>Guardar Prompt en Historial</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Ingresa un título personalizado para esta entrada en tu historial.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          id="title"
          label="Título del Prompt"
          type="text"
          fullWidth
          variant="standard"
          value={saveTitle}
          onChange={(e) => setSaveTitle(e.target.value)}
          multiline
          minRows={2} 
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setIsSaveDialogOpen(false)}>Cancelar</Button>
        <Button onClick={handleConfirmSave} disabled={isSaving}>
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>

  </Box>
);
}