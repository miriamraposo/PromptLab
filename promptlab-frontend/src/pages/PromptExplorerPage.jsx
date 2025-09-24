import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Box, Typography, Paper, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { esES } from '@mui/x-data-grid/locales';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Tooltip } from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material';

// Este es el componente que ya tenías, lo reutilizamos
const CustomNoRowsOverlay = ({ message }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
    <Typography color="text.secondary">{message}</Typography>
  </Box>
);

export default function PromptExplorerPage() {
    const navigate = useNavigate();
    const location = useLocation();

    // Lógica de estado y carga (la misma que tenías en ConfigColumn)
    const [prompts, setPrompts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);
    const [searchText, setSearchText] = useState(location.state?.searchText || ''); // Recibe el texto de búsqueda si se lo pasaron
    const [categories, setCategories] = useState([]);
    const [modelTypes, setModelTypes] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedModelType, setSelectedModelType] = useState('');
    const [language, setLanguage] = useState('es'); // 'es' por defecto


    useEffect(() => {
  const fetchFilterOptions = async () => {
    try {
      const { data: categoriesData, error: catError } = await supabase.from('prompts').select('category');
      if (catError) throw catError;

      const { data: modelTypesData, error: modelError } = await supabase.from('prompts').select('model_type');
      if (modelError) throw modelError;

      if (categoriesData) {
        const uniqueCategories = [...new Set(categoriesData.map(item => item.category).filter(Boolean))];
        setCategories(uniqueCategories);
      }
      if (modelTypesData) {
        const uniqueModelTypes = [...new Set(modelTypesData.map(item => item.model_type).filter(Boolean))];
        setModelTypes(uniqueModelTypes);
      }
    } catch (error) {
      console.error("Error al cargar las opciones de filtros:", error.message);
    }
  };
  fetchFilterOptions();
}, []);

// Fetch de prompts con manejo de errores
const fetchPrompts = useCallback(async () => {
 
  setLoading(true);
  try {
    const { page, pageSize } = paginationModel;
    // --- CAMBIO 1: Pide también la columna 'prompt_en' ---
    let query = supabase.from('prompts').select('id, prompt_es, prompt_en', { count: 'exact' });

    if (searchText) query = query.ilike('prompt_es', `%${searchText}%`);
    if (selectedCategory) query = query.eq('category', selectedCategory);
    if (selectedModelType) query = query.eq('model_type', selectedModelType);

     const { data, error, count } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) throw error;

    // --- CAMBIO 2: Formatea los datos con ambos idiomas ---
    // Usaremos nombres más específicos para evitar confusión
    const formattedData = data ? data.map(p => ({ 
      id: p.id, 
      text_es: p.prompt_es, 
      text_en: p.prompt_en 
    })) : [];

    setPrompts(formattedData);
    setRowCount(count || 0);
  } catch (error) {
    // ...
  } finally {
    setLoading(false);
  }
}, [paginationModel, searchText, selectedCategory, selectedModelType]);

// Debounce para búsqueda
   useEffect(() => {
   const handler = setTimeout(() => fetchPrompts(), 500);
   return () => clearTimeout(handler);
    }, [fetchPrompts]);


    // --- NUEVA FUNCIÓN ---
    const handleSelectPrompt = (promptText) => {
        // La URL a la que debemos volver nos la pasó la página anterior
        const returnToUrl = location.state?.returnTo || '/dashboard'; 
        navigate(returnToUrl, {
            state: {
                // Le pasamos el prompt seleccionado
                selectedPrompt: promptText
            }
        });
    };
    

    const columns = [
  { 
    field: 'text', 
    headerName: `Prompt (${language.toUpperCase()})`, // <-- El título cambia dinámicamente
    flex: 1, 
    sortable: false,
    renderCell: (params) => {
      // Leemos el texto correcto basándonos en el estado 'language'
      const textToShow = language === 'es' ? params.row.text_es : params.row.text_en;
      return (
        <Tooltip title={textToShow} placement="bottom-start">
          <Box sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
            {textToShow}
          </Box>
        </Tooltip>
      )
    }
  },
  {
    field: 'actions',
    headerName: 'Acciones',
    sortable: false,
    width: 150,
    renderCell: (params) => (
      <Button
        variant="contained"
        size="small"
        // --- CAMBIO CLAVE AQUÍ ---
        // Nos aseguramos de pasar el texto en el idioma correcto
        onClick={() => {
          const textToSelect = language === 'es' ? params.row.text_es : params.row.text_en;
          handleSelectPrompt(textToSelect);
        }}
      >
        Usar este Prompt
      </Button>
    ),
  },
];

  return (
  <Box sx={{ p: 3, height: '100vh', display: 'flex', flexDirection: 'column',
   pt: 'calc(72px + 1px)', background: "linear-gradient(135deg, #26717a, #44a1a0)",  }}>
      
    {/* --- ENCABEZADO DE LA PÁGINA --- */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexShrink: 0
      
     }}>
      <Typography variant="h5" fontWeight="bold" sx={{ color: 'white' }}>Explorador de Prompts</Typography>
      <Button variant="contained"  startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
        Volver PrompLab
      </Button>
    </Box>

    {/* --- PANEL DE FILTROS --- */}
    <Paper sx={{ p: 2, mb: 3, boxShadow: 3, flexShrink: 0, border: '2px solid #2196f3',
      borderColor: '#2196f3',
        background: ' #005f73',
        borderRadius: 2,
     }}>
      <Grid container spacing={5} alignItems="center">
       <Grid size={{ xs: 12, md: 3 }}>
          <FormControl fullWidth size="medium" 
  sx={{
    '& .MuiInputLabel-root': { color: 'white' }, // label
    '& .MuiOutlinedInput-root': {
      color: 'white', // texto seleccionado
      '& fieldset': { borderColor: 'white' }, // borde normal
      '&:hover fieldset': { borderColor: 'white' }, // borde hover
      '&.Mui-focused fieldset': { borderColor: 'white' } // borde focus
    }
  }}>
            <InputLabel>Categoría</InputLabel>
            <Select
              value={selectedCategory}
              label="Categoría"
              onChange={e => { setSelectedCategory(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
            >
              <MenuItem value=""><em>Todas</em></MenuItem>
              {categories.map(cat => (<MenuItem key={cat} value={cat}>{cat}</MenuItem>))}
            </Select>
          </FormControl>
        </Grid>
         <Grid size={{ xs: 12, md: 5 }}>
          <FormControl fullWidth size="medium" 
  sx={{
    '& .MuiInputLabel-root': { color: 'white' }, // label
    '& .MuiOutlinedInput-root': {
      color: 'white', // texto seleccionado
      '& fieldset': { borderColor: 'white' }, // borde normal
      '&:hover fieldset': { borderColor: 'white' }, // borde hover
      '&.Mui-focused fieldset': { borderColor: 'white' } // borde focus
    }
  }}>
            <InputLabel>Tipo de Modelo</InputLabel>
            <Select
              value={selectedModelType}
              label="Tipo de Modelo"
              onChange={e => { setSelectedModelType(e.target.value); setPaginationModel(prev => ({ ...prev, page: 0 })); }}
            >
              <MenuItem value=""><em>Todos</em></MenuItem>
              {modelTypes.map(type => (<MenuItem key={type} value={type}>{type}</MenuItem>))}
            </Select>
          </FormControl>
        </Grid>
        {/* --- NUEVO GRID PARA EL INTERRUPTOR DE IDIOMA --- */}
        
          <Grid size={{ xs: 12, md: 5 }}>
            {/* --- TAMBIÉN NECESITAMOS ESTILIZAR LOS TOGGLE BUTTONS --- */}
            <ToggleButtonGroup
                color="primary"
                value={language}
                exclusive
                onChange={(event, newLanguage) => {
                  if (newLanguage !== null) setLanguage(newLanguage);
                }}
                size="small"
                fullWidth
            >
                <ToggleButton value="es" sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    '&.Mui-selected': { 
                        color: 'white', 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                    } 
                }}>
                    Español (ES)
                </ToggleButton>
                <ToggleButton value="en" sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)', 
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                    '&.Mui-selected': { 
                        color: 'white', 
                        backgroundColor: 'rgba(255, 255, 255, 0.2)' 
                    } 
                }}>
                    Inglés (EN)
                </ToggleButton>
            </ToggleButtonGroup>
        </Grid>

       <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
             label="Buscar en prompts..."
             fullWidth
             size="small"
             value={searchText}
             onChange={e => {
                setSearchText(e.target.value);
                setPaginationModel(prev => ({ ...prev, page: 0 }));
              }}
              InputLabelProps={{
              sx: { color: 'white' } // color del label
              }}
              InputProps={{
               sx: { color: 'white' } // color del texto que se escribe
               }}
               sx={{
                 '& .MuiOutlinedInput-root': {
                 '& fieldset': { borderColor: 'white' }, // borde normal
                 '&:hover fieldset': { borderColor: 'white' }, // borde al pasar
                 '&.Mui-focused fieldset': { borderColor: 'white' } // borde enfocado
                 }
                 }}
                 />
        </Grid>
  
      </Grid>
    </Paper>

    {/* --- PANEL DE LA TABLA DE RESULTADOS --- */}
    <Paper sx={{ flexGrow: 1, boxShadow: 3, minHeight: 0, border: '2px solid #2196f3' }}>
      <DataGrid
        rows={prompts}
        columns={columns}
        loading={loading}
        paginationMode="server"
        rowCount={rowCount}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[5, 10, 20]}
         hideFooter={rowCount <= paginationModel.pageSize}
        localeText={esES.components.MuiDataGrid.defaultProps.localeText}
        slots={{
          noRowsOverlay: () => <CustomNoRowsOverlay message="No se encontraron prompts" />,
          loadingOverlay: () => (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <CircularProgress />
            </Box>
          ),
        }}
      />
    </Paper>
  </Box>
);
}