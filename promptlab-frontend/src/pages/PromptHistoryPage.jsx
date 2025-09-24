import React, { useState, useEffect, useCallback } from 'react'; // <-- CAMBIO: Añadimos useCallback
import { supabase } from '../supabaseClient'; 
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button,
  CircularProgress, Alert, IconButton, Tooltip, TextField // <-- CAMBIO: Añadimos TextField para renombrar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // <-- CAMBIO: Icono para renombrar
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';


// El componente DataDisplayWrapper no cambia, lo mantenemos igual.
const DataDisplayWrapper = ({ loading, error, children }) => {
  // ... (código sin cambios)
};

// --- CAMBIO: Renombramos el componente ---
export default function PromptHistoryPage() {
  const [historyItems, setHistoryItems] = useState([]); // <-- CAMBIO: Renombramos el estado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Estados para el diálogo de eliminación ---
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // --- CAMBIO: Nuevos estados para el diálogo de renombrar ---
  const [openRenameDialog, setOpenRenameDialog] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate(); 


  const handleLoadInLab = (item) => {
    
  
    navigate(
        `/project/${item.project_id || 'null'}/dataset/${item.dataset_id || 'null'}/promptlab`,
        {
            state: { // <-- Pasamos los datos directamente aquí
                systemPrompt: item.indicador_del_sistema,
                selectedPrompt: item.pregunta_de_usuario, // <-- Renombrado para coincidir
                context: item.contexto_de_datos,
                modelName: item.nombre_del_modelo // <-- Renombrado para coincidir
            }
        }
    );
};


  useEffect(() => {
    // --- CAMBIO: Lógica para cargar el historial ---
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("No estás autenticado.");

        // Usamos el endpoint del historial
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/promptlab/history`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudo cargar el historial.');
        }
        
        setHistoryItems(result.data); // Guardamos los datos del historial
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);


  // --- Lógica para el diálogo de eliminación (adaptada) ---
  const handleOpenDeleteDialog = (item) => {
    setItemToDelete(item);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
    setItemToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No estás autenticado.");
      
      // Usamos el endpoint de eliminación del historial
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/promptlab/history/${itemToDelete.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
          throw new Error(result.error || 'No se pudo eliminar la entrada.');
      }
      
      // Actualizamos la UI
      setHistoryItems(prevItems => prevItems.filter(item => item.id !== itemToDelete.id));
      
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      handleCloseDeleteDialog();
    }
  };


  // --- CAMBIO: Nueva lógica para el diálogo de renombrar ---
  const handleOpenRenameDialog = (item) => {
    setItemToRename(item);
    setNewTitle(item.titulo_personalizado || ""); // Usamos el título existente o una cadena vacía
    setOpenRenameDialog(true);
  };

  const handleCloseRenameDialog = () => {
    setOpenRenameDialog(false);
    setItemToRename(null);
    setNewTitle("");
  };

  const handleConfirmRename = async () => {
    if (!itemToRename || !newTitle.trim()) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No estás autenticado.");

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/promptlab/history/${itemToRename.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ titulo_personalizado: newTitle })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'No se pudo renombrar la entrada.');
      }

      // Actualizamos la UI con los datos que nos devuelve el backend
      setHistoryItems(prevItems => prevItems.map(item => 
        item.id === itemToRename.id ? result.data : item
      ));

    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      handleCloseRenameDialog();
    }
  };

  
  return (
  <Box
    sx={{
      height: '100vh',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      px: 3, 
      pb: 3,
      pt: 'calc(72px + 1px)', 
      background: "linear-gradient(135deg, #26717a, #44a1a0)",  
    }}
  >
    {/* --- Sección del Encabezado (sin cambios) --- */}
    <Box sx={{ flexShrink: 0, mb: 2 }}>
      <Typography variant="h5" component="h1" gutterBottom fontWeight="bold" sx={{ color: 'white' }}>
        Mi Historial de Prompts
      </Typography>
      <Typography sx={{ color: 'white' }}>
       Gestión de las ejecuciones de prompts registradas.
      </Typography>
    </Box>

    {/* ================================================================ */}
    {/* --- SECCIÓN DE CONTENIDO CON LÓGICA DE RENDERIZADO DIRECTA --- */}
    {/* ================================================================ */}
    <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
      
      {/* --- Caso 1: Cargando --- */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
          <CircularProgress />
        </Box>
      )}

      {/* --- Caso 2: Error --- */}
      {error && (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      )}

      {/* --- Caso 3: Carga finalizada y sin errores --- */}
      {!loading && !error && (
        <>
          {/* Sub-caso 3.1: Hay datos, mostramos la tabla */}
          {historyItems.length > 0 ? (
            <Paper sx={{ boxShadow: 3, borderRadius: 2 }}>
              <TableContainer>
                 <Table sx={{ minWidth: 650 }} aria-label="tabla de historial de prompts">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
    Título / Prompt
  </TableCell>
  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
    Modelo Utilizado
  </TableCell>
  <TableCell sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
    Fecha de Creación
  </TableCell>
  <TableCell align="center" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
    Acciones
  </TableCell>
</TableRow>

                  </TableHead>
                  <TableBody>
                    {historyItems.map((item) => (
                       <TableRow  sx={{ 
                       cursor: 'pointer',
                       '& td': { borderBottom: 'secondary' } // línea divisoria
                         }}
                        key={item.id}
                       hover
    
                        onClick={() => navigate(`/historial-prompts/${item.id}`)}
                    >
                    <TableCell component="th" scope="row">
                          <Typography sx={{ fontWeight: 500 }}>
                            {item.titulo_personalizado || "Sin Título"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: '400px' }} noWrap title={item.pregunta_de_usuario}>
                            {item.pregunta_de_usuario}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.nombre_del_modelo}</TableCell>
                        <TableCell>{new Date(item.created_at || item.creado_en).toLocaleString()}</TableCell>
                         <TableCell align="center" onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Abrir en Laboratorio">
            <IconButton color="default" onClick={() => handleLoadInLab(item)}>
              <LaunchIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Renombrar">
            <IconButton color="primary" onClick={() => handleOpenRenameDialog(item)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton color="error" onClick={() => handleOpenDeleteDialog(item)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          ) : (
            /* Sub-caso 3.2: No hay datos, mostramos la alerta */
            <Alert severity="info">
              No tienes ninguna entrada en tu historial. 
            </Alert>
          )}
        </>
      )}

    </Box>

    {/* --- Diálogos (fuera de la lógica condicional, siempre presentes en el DOM) --- */}
    <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
      <DialogTitle>Confirmar Eliminación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          ¿Estás seguro de que quieres eliminar esta entrada? Esta acción es irreversible.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
        <Button onClick={handleConfirmDelete} color="error" autoFocus>Eliminar</Button>
      </DialogActions>
    </Dialog>

    {/* --- Diálogo para Renombrar --- */}
    <Dialog open={openRenameDialog} onClose={handleCloseRenameDialog}>
      <DialogTitle>Renombrar Entrada del Historial</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          Ingresa un título personalizado a esta entrada para identificarla fácilmente.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Nuevo Título"
          type="text"
          fullWidth
          variant="standard"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseRenameDialog}>Cancelar</Button>
        <Button onClick={handleConfirmRename}>Guardar</Button>
      </DialogActions>
    </Dialog>

  </Box>
);
}