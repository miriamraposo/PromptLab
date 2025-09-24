// src/pages/GaleriaPage.jsx

import React, { useState, useEffect} from 'react';

import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Chip, Pagination , DialogContentText,ToggleButton, 
  ToggleButtonGroup
} from '@mui/material';
import IconButton from "@mui/material/IconButton";
import { TextField, InputAdornment } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import Tooltip from "@mui/material/Tooltip";
import PaletteIcon from '@mui/icons-material/Palette'; // Icono para el Estudio Creativo
import DeleteIcon from '@mui/icons-material/Delete'; // Importa el icono
import { useNotification } from '../context/NotificationContext'; 
import { Divider } from "@mui/material";
import CircleIcon from '@mui/icons-material/Circle'; // Para el iconito central
import ScienceIcon from '@mui/icons-material/Science';

// Un componente para la tarjeta de cada imagen
const VisualCard = ({ visual, onClick }) => (
  <Grid
  key={visual.id}
  xs={12}
  sm={6}
  md={4}
  lg={3}
>
    <Paper 
      onClick={onClick}
      elevation={3}
      sx={{ 
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 2,
        '&:hover .overlay': { opacity: 1 },
        '&:hover img': { transform: 'scale(1.05)' }
      }}
    >
      <Box
        component="img"
        src={visual.public_url}
        alt={visual.prompt || 'Imagen generada'}
        sx={{
          width: '100%',
          height: '250px',
          objectFit: 'cover',
          display: 'block',
          transition: 'transform 0.3s ease-in-out',
          backgroundColor: '#f0f0f0'
        }}
      />
      {/* Overlay que aparece al hacer hover */}
      <Box 
        className="overlay"
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          p: 1.5,
          background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
          color: 'white',
          opacity: 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      >
        <Typography variant="body2" noWrap fontWeight="bold">
          {visual.prompt || `Tipo: ${visual.type}`}
        </Typography>
      </Box>
    </Paper>
  </Grid>
);



export default function GaleriaPage() {
  const [visuals, setVisuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVisual, setSelectedVisual] = useState(null);
  const navigate = useNavigate();

  // --- NUEVOS ESTADOS PARA LA PAGINACIÓN ---
  const [colorFilter, setColorFilter] = useState('');
  const [filterType, setFilterType] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 12; // Muestra 12 imágenes por página
  const { showNotification } = useNotification();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [debouncedColorFilter, setDebouncedColorFilter] = useState(colorFilter);

    const handleOpenConfirmDialog = () => {
        setConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
    };

    const handleConfirmDelete = async () => {
        if (!selectedVisual) return;
        setIsDeleting(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Sesión no válida.");

            const url = `${import.meta.env.VITE_API_URL}/api/visuals/${selectedVisual.id}`;
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.error);

            // Actualiza la UI al instante, sin recargar la página
            setVisuals(prevVisuals => prevVisuals.filter(v => v.id !== selectedVisual.id));
            showNotification("Imagen eliminada con éxito", "success");

        } catch (error) {
            showNotification(`Error: ${error.message}`, "error");
        } finally {
            setIsDeleting(false);
            handleCloseConfirmDialog();
            handleCloseDetail(); // Cierra también el diálogo de detalles
        }
    };

    const handleFilterChange = (event, newFilter) => {
        // El ToggleButtonGroup puede devolver null si se deselecciona todo.
        // Con esta línea nos aseguramos de que siempre haya un valor.
        if (newFilter !== null) {
            setFilterType(newFilter);
            setPage(1); // Reinicia a la página 1 al cambiar el filtro
        }
    };


    useEffect(() => {
        const timerId = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
            setPage(1);
        }, 500);

        return () => {
            clearTimeout(timerId);
        };
    }, [searchTerm]);

    
  // NUEVO: useEffect para el debounce del filtro de color
  useEffect(() => {
    const timerId = setTimeout(() => {
        setDebouncedColorFilter(colorFilter);
        setPage(1); // Reinicia la página al filtrar por color
    }, 500);
    return () => clearTimeout(timerId);
  }, [colorFilter]);
    
  // AHORA MODIFICAMOS EL useEffect PRINCIPAL
  useEffect(() => {
    const fetchVisuals = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("No estás autenticado.");
            
            const params = new URLSearchParams({
                page: page,
                per_page: itemsPerPage,
            });
            
            if (debouncedSearchTerm) params.append('q', debouncedSearchTerm);
            if (filterType && filterType !== 'todos') params.append('type', filterType);
            
            // AÑADIDO: Incluimos el filtro de color en la llamada a la API
            if (debouncedColorFilter) params.append('color', debouncedColorFilter);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/visuals?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            // ... (el resto de la función es perfecta y no cambia) ...
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'No se pudo cargar la galería.');
            }
            setVisuals(result.visuals);
            setTotalPages(Math.ceil(result.total_count / itemsPerPage));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    fetchVisuals();
  // AÑADIDO: Nueva dependencia para que se recargue al cambiar el filtro de color
  }, [page, debouncedSearchTerm, filterType, debouncedColorFilter]); 

  
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleOpenDetail = (visual) => {
    setSelectedVisual(visual);
  };

  const handleCloseDetail = () => {
    setSelectedVisual(null);
  };
  
  const handleGoToStudio = () => {
     
      if (!selectedVisual) return;
      navigate('/estudio-creativo', { state: { image: selectedVisual } });
  }



  return (
  <>
    <Box sx={{ display: "flex", height: "100vh",   pt: 'calc(72px + 1px)', background:'#eaeff1'  }}>


    {/* ========================================================= */}
{/* --- Columna Izquierda: Panel de Control (Filtros) --- */}
{/* ========================================================= */}

 <Paper
  elevation={4}
  sx={{
    width: "280px",
    p: 4,
    m: 2,
    flexShrink: 0,
    borderRadius: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxHeight: 'calc(100vh - 64px)',
    overflowY: 'auto',
    order: 2,
    background: "linear-gradient(135deg, #26717a, #44a1a0)",
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
    borderLeft: '3px solid #26717a',
    color: '#ffffff', // texto blanco fijo
  }}
>
  <Typography variant="h6" gutterBottom fontWeight="bold">
    Filtros
  </Typography>

  {/* --- Filtro 1: Búsqueda por Texto --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    BUSCAR EN PROMPTS
  </Typography>
  <TextField
    fullWidth
    label="Buscar ..."
    variant="outlined"
    size="small"
    value={searchTerm}
    onChange={(e) => setSearchTerm(e.target.value)}
    InputProps={{
      startAdornment: (
        <InputAdornment position="start">
          <SearchIcon sx={{ color: '#ffffff' }} />
        </InputAdornment>
      ),
    }}
    sx={{
      mb: 2,
      '& .MuiOutlinedInput-root': { borderRadius: 2, color: '#ffffff' },
      '& .MuiInputLabel-root': { color: '#ffffff' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
    }}
  />

  {/* --- Divider con degradado y icono central --- */}
  <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
    <CircleIcon sx={{ mx: 1, fontSize: 10, color: '#ffffff' }} />
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
  </Box>

  {/* --- Filtro 2: Tipo de Imagen --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    TIPO DE IMAGEN
  </Typography>
  <ToggleButtonGroup
    color="primary"
    value={filterType}
    exclusive
    onChange={handleFilterChange}
    fullWidth
    size="small"
    sx={{
      mb: 2,
      '& .MuiToggleButton-root': {
        borderRadius: 2,
        textTransform: 'none',
        color: '#ffffff', // texto blanco
        borderColor: 'rgba(255,255,255,0.5)',
      },
      '& .Mui-selected': { backgroundColor: 'rgba(255,255,255,0.2)' },
    }}
  >
    <ToggleButton value="todos">Todos</ToggleButton>
    <ToggleButton value="generada">Generadas</ToggleButton>
    <ToggleButton value="meme">Memes</ToggleButton>
  </ToggleButtonGroup>

  {/* --- Divider con degradado y icono central --- */}
  <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
    <CircleIcon sx={{ mx: 1, fontSize: 10, color: '#ffffff' }} />
    <Divider sx={{ flexGrow: 1, borderColor: 'rgba(255,255,255,0.5)' }} />
  </Box>

  {/* --- Filtro 3: Color Dominante --- */}
  <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 500 }}>
    COLOR DOMINANTE
  </Typography>
  <TextField
    fullWidth
    label="Filtrar por color (HEX)"
    variant="outlined"
    size="small"
    value={colorFilter}
    onChange={(e) => setColorFilter(e.target.value)}
    placeholder="#26717a"
    sx={{
      '& .MuiOutlinedInput-root': { borderRadius: 2, color: '#ffffff' },
      '& .MuiInputLabel-root': { color: '#ffffff' },
      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#ffffff' },
    }}
  />
</Paper>

      {/* Columna Derecha: Galería */}
      <Box
        sx={{
          order: 1,
          flexGrow: 1,
          p: 2,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          fontWeight="bold"
          sx={{ mb: 2, color:'black' }}
        >
          Mi Galería
        </Typography>

        {/* Caja de contenido que crece */}
        <Box sx={{ flexGrow: 1 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && (
            <Grid container spacing={2}>
              {visuals.length > 0 ? (
                visuals.map((visual) => (
                  <Grid key={visual.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                    <VisualCard
                      visual={visual}
                      onClick={() => handleOpenDetail(visual)}
                    />
                  </Grid>
                ))
              ) : (
                <Grid size={{ xs: 12 }}>
                  <Alert severity="info">
                      {debouncedSearchTerm 
                        ? `No se encontraron resultados para "${debouncedSearchTerm}".`
                        : "Tu galería está vacía. ¡Empieza a crear imágenes!"
                      }
                      </Alert>
                </Grid>
              )}
            </Grid>
          )}
        </Box>

        {/* Paginación */}
        {!loading && totalPages > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              py: 2,
              mt: "auto",
            }}
          >
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
              variant="outlined"
              shape="rounded"
            />
          </Box>
        )}
      </Box>

      {/* Modal de Vista Rápida */}
      <Dialog
        open={Boolean(selectedVisual)}
        onClose={handleCloseDetail}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
          },
        }}
      >
        {selectedVisual && (
          <>
            <DialogTitle sx={{ fontWeight: "bold" }}>
              Detalles de la Creación
            </DialogTitle>
            <DialogContent
              dividers
              sx={{
                display: "flex",
                flexDirection: "row",
                gap: 3,
                bgcolor: "background.default",
              }}
            >
              {/* Imagen Preview */}
              <Box
                component="img"
                src={selectedVisual.public_url}
                alt="Vista previa"
                sx={{
                  maxWidth: "50%",
                  borderRadius: 2,
                  boxShadow: 2,
                  objectFit: "contain",
                }}
              />

              {/* Info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  ID: {selectedVisual.id}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Creado el:{" "}
                  {new Date(selectedVisual.created_at).toLocaleString()}
                </Typography>
              </Box>
            </DialogContent>

            <DialogActions
            
              sx={{
                justifyContent: "space-between",
                p: 2,
              }}
            >
              {/* Botón de Eliminar a la izquierda */}
              <Tooltip title="Eliminar Imagen">
                <IconButton
                  onClick={handleOpenConfirmDialog}
                  color="error"
                  size="large"
                >
                  <DeleteIcon />
                </IconButton>
              </Tooltip>

              {/* Acciones a la derecha */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button onClick={handleCloseDetail} sx={{ mr: 1 }}>
                  Cerrar
                </Button>
                <Button
                  variant="contained"
                  startIcon={<PaletteIcon />}
                  onClick={handleGoToStudio}
                >
                  Editar en Estudio Creativo
                </Button>
                
                 <Button
                   variant="outlined" // Usamos "outlined" para que no compita visualmente con el principal
                   startIcon={<ScienceIcon />}
                   onClick={() => {
                 // Navegamos a la nueva ruta y pasamos la imagen seleccionada
                   navigate('/laboratorio-vision', { state: { image: selectedVisual } });
                   handleCloseDetail(); // Cerramos el modal
                   }}
                   >
                     Analizar en Laboratorio
                  </Button>

              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>

    {/* Modal de Confirmación */}
    <Dialog
      open={isConfirmDialogOpen}
      onClose={handleCloseConfirmDialog}
      PaperProps={{
        sx: { borderRadius: 3, p: 1 },
      }}
    >
      <DialogTitle>Confirmar Eliminación</DialogTitle>
      <DialogContent>
        <DialogContentText>
          ¿Confirma que desea eliminar esta imagen?<br />
         Esta acción no se puede deshacer.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseConfirmDialog}>Cancelar</Button>
        <Button
          onClick={handleConfirmDelete}
          color="error"
          variant="contained"
          disabled={isDeleting}
        >
          {isDeleting ? <CircularProgress size={24} /> : "Eliminar"}
        </Button>
      </DialogActions>
    </Dialog>
  </>
);
}