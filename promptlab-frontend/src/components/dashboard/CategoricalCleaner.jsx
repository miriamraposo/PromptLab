// src/components/dashboard/CategoricalCleaner.jsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    Box, Button, TextField, FormControl, FormLabel, Paper, Alert, Stack, 
    Typography, RadioGroup, FormControlLabel, Radio, Grid, Divider,Slider,InputLabel, Select , MenuItem,List, ListItem 
} from '@mui/material';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import TuneIcon from '@mui/icons-material/Tune';
import CleaningActionModal from './CleaningActionModal';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';



const patternCleaningOptions = [
    { value: 'extraer_numeros', label: 'Extraer solo números' },
    { value: 'extraer_letras', label: 'Extraer solo texto' },
    { value: 'eliminar_puntuacion', label: 'Eliminar signos de puntuación' },
];


export default function CategoricalCleaner({ columnName, null_count, advanced_analysis, onApplyAction, statistics, unique_values }) {
    // --- ESTADO PARA CONTROLAR EL MODAL ---
    const [modalState, setModalState] = useState({ open: false, type: null });

    // --- ESTADOS PARA LOS VALORES DENTRO DEL MODAL ---
    const [imputeMethod, setImputeMethod] = useState('moda');
    const [constantValue, setConstantValue] = useState('');
    const [valorBuscado, setValorBuscado] = useState('');
    const [nuevoValor, setNuevoValor] = useState('');
    const [valorAEliminar, setValorAEliminar] = useState('');
    const imputeButtonRef = useRef(null);
    const standardizeButtonRef = useRef(null);
    const changeTypeButtonRef = useRef(null);
    const replaceValueButtonRef = useRef(null);
    const deleteRowsButtonRef = useRef(null);
    const modaValue = statistics?.top;
    const modaLabel = modaValue ? `Usar la Moda ('${modaValue}')` : 'Usar la Moda (valor más frecuente)';
    const [remapValues, setRemapValues] = useState({});
    const MAX_UNIQUE_VALUES_FOR_REMAP = 100;
    const [rareThreshold, setRareThreshold] = useState(1); 
    const groupRareButtonRef = useRef(null); // <-- CORRECCIÓN: `ref` añadida
    const [selectedPattern, setSelectedPattern] = useState(''); 
    const patternCleanButtonRef = useRef(null); // <-- 1. REF AÑADIDA


    // --- FUNCIONES PARA MANEJAR EL MODAL ---
    
     const handleOpenModal = (type) => {
        if (type === 'replace_value') {
            setRemapValues({});
        }
        setModalState({ open: true, type });
    };



    const handleCloseModal = () => {
        setModalState({ open: false, type: null });
        setImputeMethod('moda');
        setConstantValue('');
        setValorBuscado('');
        setNuevoValor('');
        setValorAEliminar('');
    };
-
    
    useEffect(() => {
        // Si el modal se acaba de cerrar...
         if (modalState.open === false) { 
            // ...devuelve el foco al botón que lo abrió.
            if (modalState.type === 'impute') imputeButtonRef.current?.focus();
            else if (modalState.type === 'standardize') standardizeButtonRef.current?.focus();
            else if (modalState.type === 'change_type') changeTypeButtonRef.current?.focus();
            else if (modalState.type === 'replace_value') replaceValueButtonRef.current?.focus();
            else if (modalState.type === 'delete_rows') deleteRowsButtonRef.current?.focus();
            else if (modalState.type === 'group_rare') groupRareButtonRef.current?.focus(); 
            else if (modalState.type === 'pattern_clean') patternCleanButtonRef.current?.focus();
        }
    }, [modalState]);
        
    const handleConfirmAction = () => {
  let payload;
  const { type } = modalState;

  if (type === 'impute') {
    if (imputeMethod === 'moda') {
      payload = {
        action: 'categorical_impute_with_mode',
        params: { columna: columnName }
      };
    } else if (imputeMethod === 'constante') {
      if (!constantValue.trim()) {
        alert('Por favor, introduce un valor constante.');
        return;
      }
      payload = {
        action: 'categorical_impute_with_constant',
        params: { columna: columnName, valor: constantValue }
      };
    }  

  } else if (type === 'standardize') {
    payload = {
      action: 'categorical_standardize_format',
      params: { columna: columnName }
    };

  } else if (type === 'group_rare') {
    payload = {
      action: 'categorical_group_rare',
      params: { columna: columnName, umbral: rareThreshold / 100 }
    };

   } else if (type === 'pattern_clean') {
    if (!selectedPattern) {
        alert("Por favor, selecciona una operación de limpieza.");
        return;
    }
    payload = {
        action: 'text_clean_by_pattern',
        params: {
            columna: columnName,
            patron: selectedPattern // Enviamos la clave del patrón seleccionado
        }
    };

  } else if (type === 'replace_value') {
    if (unique_values.length <= MAX_UNIQUE_VALUES_FOR_REMAP) {
      const nonEmptyRemaps = Object.fromEntries(
        Object.entries(remapValues).filter(([key, val]) => val.trim() !== '')
      );
      if (Object.keys(nonEmptyRemaps).length === 0) {
        alert('Por favor, ingresa al menos un nuevo valor para reemplazar.');
        return;
      }
      payload = {
        action: 'categorical_remap_values',
        params: { columna: columnName, mapeo: nonEmptyRemaps }
      };
    } else {
      if (!valorBuscado.trim()) {
        alert('Debes completar el valor a buscar.');
        return;
      }
      payload = {
        action: 'general_replace_value',
        params: {
          columna: columnName,
          valor_a_reemplazar: valorBuscado,
          nuevo_valor: nuevoValor
        }
      };
    }

    

  } else if (type === 'delete_rows') {
    if (!valorAEliminar.trim()) {
      alert('Debes ingresar el valor de las filas a eliminar.');
      return;
    }
    payload = {
      action: 'general_delete_rows_by_value',
      params: {
        columna: columnName,
        valor: valorAEliminar
      }
    };
  }

  if (payload) {
    onApplyAction(payload);
  }

  handleCloseModal();
};



     const handleRemapChange = (originalValue, newValue) => {
        setRemapValues(prev => ({
            ...prev,
            [originalValue]: newValue
        }));
    };
    

    const hasFormatIssues = advanced_analysis?.has_format_issues || false;
    const hasActions = null_count > 0 || hasFormatIssues;


    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {!hasActions && (
                <Alert severity="success">¡Excelente! No se detectaron problemas comunes en esta columna.</Alert>
            )}

           {/* === Corregir valores nulos === */}
<Accordion>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    sx={{
      backgroundColor: 'primary.main',
      color: 'primary.contrastText',
      borderRadius: 1,
      '& .MuiAccordionSummary-expandIconWrapper': {
        color: 'primary.contrastText',
      },
    }}
  >
    <Typography variant="body1" fontWeight="bold">
      Limpieza automatica de la Columna
    </Typography>
  </AccordionSummary>

  <AccordionDetails>
    {/* === Corregir valores nulos === */}
    {null_count > 0 && (
      <Paper variant="outlined" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="body1" fontWeight="medium">Valores Nulos</Typography>
          <Typography variant="body2" color="text.secondary">Hay {null_count} celdas vacías.</Typography>
        </Box>
        <Button
         sx={{
            mt: 1,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
            backgroundColor: '#e3f2fd',
            borderColor: '#1565c0',
            },
          }} 
          ref={imputeButtonRef} 
          variant="outlined" 
          startIcon={<TuneIcon />} 
          onClick={() => handleOpenModal('impute')}
        >
          Corregir
        </Button>
      </Paper>
    )}

    {/* === Agrupar categorías raras === */}
    {advanced_analysis.rare_categories?.length > 0 && (
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="body1" fontWeight="medium">Agrupar Categorías Raras</Typography>
          <Typography variant="body2" color="text.secondary">
            Agrupa valores poco frecuentes bajo la categoría "Otros".
          </Typography>
        </Box>
        <Button 
          ref={groupRareButtonRef} 
           sx={{
           mt: 1,
           borderColor: '#1976d2',
           color: '#1976d2',
          '&:hover': {
           backgroundColor: '#e3f2fd',
           borderColor: '#1565c0',
            },
          }}
          variant="outlined" 
          startIcon={<GroupWorkIcon />} 
          onClick={() => handleOpenModal('group_rare')}
        >
          Aplicar
        </Button>
      </Paper>
    )}

    <Paper variant="outlined" sx={{ p: 2 }}>
             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography fontWeight="medium">Limpieza Avanzada de Texto</Typography>
                    <Typography color="text.secondary" variant="body2">
                        Aplica patrones para extraer  <br />  eliminar partes del texto.
                    </Typography>
                </Box>
                <Button ref={patternCleanButtonRef} 
                 sx={{
                 mt: 1,
                 borderColor: '#1976d2',
                 color: '#1976d2',
                '&:hover': {
                 backgroundColor: '#e3f2fd',
                 borderColor: '#1565c0',
            },
          }}
                variant="outlined" startIcon={<TuneIcon />} onClick={() => handleOpenModal('pattern_clean')}>
                    Aplicar
                </Button>
            </Box>
        </Paper>
        

    {/* === Problemas de formato === */}
    {hasFormatIssues && (
      <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="body1" fontWeight="medium">Problemas de Formato</Typography>
          <Typography variant="body2" color="text.secondary">{advanced_analysis.format_issues_details}</Typography>
        </Box>
        <Button 
          ref={standardizeButtonRef} 
          startIcon={<CleaningServicesIcon />} 
          variant="contained" 
          onClick={() => handleOpenModal('standardize')}
           sx={{
            mt: 1,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': {
            backgroundColor: '#e3f2fd',
            borderColor: '#1565c0',
            },
          }}
        >
          Estandarizar
        </Button>
      </Paper>      
    )}

    
  </AccordionDetails>
</Accordion>

{/* === Acordeón para Transformaciones Adicionales (VERSIÓN COMPLETA Y FUNCIONAL) === */}
<Accordion elevation={0} variant="outlined" sx={{ mb: 2 }}>
  <AccordionSummary
    expandIcon={<ExpandMoreIcon />}
    sx={{
      backgroundColor: 'primary.main',
      color: 'primary.contrastText',
      '& .MuiAccordionSummary-expandIconWrapper': {
        color: 'primary.contrastText',
      },
      borderRadius: 1,
    }}
  >
    <Typography fontWeight="bold">Transformaciones Adicionales</Typography>
  </AccordionSummary>

  <AccordionDetails>
    {/* Ahora que Stack está importado, esto funcionará */}
    <Stack direction="row" spacing={1.5}>
      
      <Button
        fullWidth
        ref={changeTypeButtonRef}
        variant="outlined"
        color="secondary"
        onClick={() => handleOpenModal('change_type')}
      >
        Convertir Datos
      </Button>

      <Button
        fullWidth
        ref={replaceValueButtonRef}
        variant="outlined"
        color="secondary"
        onClick={() => handleOpenModal('replace_value')}
      >
        Reemplazar
      </Button>

      <Button
        fullWidth
        ref={deleteRowsButtonRef}
        variant="outlined"
        color="error"
        onClick={() => handleOpenModal('delete_rows')}
      >
        Eliminar
      </Button>

    </Stack>
  </AccordionDetails>
</Accordion>


            {/* --- EL MODAL ÚNICO QUE MANEJA TODO --- */}
            <CleaningActionModal
                open={modalState.open}
                handleClose={handleCloseModal}
                onConfirm={handleConfirmAction}
                title={
                    modalState.type === 'impute' ? `Corregir nulos en "${columnName}"`
                    : modalState.type === 'standardize' ? `Estandarizar formato de "${columnName}"`
                    : `Acción en "${columnName}"`
                }
            >
                {/* Contenido para Imputar Nulos */}
                {modalState.type === 'impute' && (
                    <FormControl component="fieldset" fullWidth>
                        <FormLabel component="legend">Método de imputación:</FormLabel>
                        <RadioGroup value={imputeMethod} onChange={(e) => setImputeMethod(e.target.value)}>
                            <FormControlLabel 
                                value="moda" 
                                control={<Radio />} 
                                // ¡USA LA NUEVA ETIQUETA AQUÍ!
                                label={modaLabel} 
                            />
                            
                            <FormControlLabel value="constante" control={<Radio />} label="Usar un valor constante" />
                        </RadioGroup>
                        {imputeMethod === 'constante' && (
                            <TextField autoFocus margin="dense" label="Valor constante" type="text" fullWidth variant="outlined" value={constantValue} onChange={(e) => setConstantValue(e.target.value)} sx={{ mt: 1 }} />
                        )}
                    </FormControl>
                )}

                {/* Contenido para Estandarizar */}
                {modalState.type === 'standardize' && (
                    <Typography>Esta acción corregirá espacios, mayúsculas/minúsculas y otros formatos. ¿Deseas continuar?</Typography>
                )}

                {/* Contenido para Cambiar Tipo */}
                {modalState.type === 'change_type' && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                        <Button variant="outlined" onClick={() => { onApplyAction({ action: 'type_convert_to_float', params: { columna: columnName } }); handleCloseModal(); }}>A Decimal (float)</Button>
                        <Button variant="outlined" onClick={() => { onApplyAction({ action: 'type_convert_to_integer', params: { columna: columnName } }); handleCloseModal(); }}>A Entero (integer)</Button>
                        <Button variant="outlined" onClick={() => { onApplyAction({ action: 'type_convert_to_date', params: { columna: columnName } }); handleCloseModal(); }}>A Fecha (date)</Button>
                    </Box>
                )}
                
{/* --- CONTENIDO DE REEMPLAZO (CORREGIDO) --- */}
{modalState.type === 'replace_value' && (
  <Box sx={{ maxHeight: '60vh', overflowY: 'auto', p: 1 }}>

    {/* CASO 1: Pocos valores únicos (< 100) → herramienta de mapeo */}
    {unique_values && unique_values.length <= MAX_UNIQUE_VALUES_FOR_REMAP && (
      <>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Escribe el nuevo valor al lado de cada categoría que quieras cambiar.
        </Typography>
        
        {unique_values.map(item => (
          <Box
            key={item.valor}
            sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}
          >
            <Typography sx={{ minWidth: '150px', fontWeight: 'bold' }}>
              {String(item.valor) || '(Nulo)'}{' '}
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
              >
                ({item.conteo})
              </Typography>
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="Nuevo valor..."
              value={remapValues[item.valor] || ''}
              onChange={(e) => handleRemapChange(item.valor, e.target.value)}
            />
          </Box>
        ))}
      </>
    )}

    {/* CASO 2: Demasiados valores únicos (> 100) → herramienta simple */}
    {unique_values && unique_values.length > MAX_UNIQUE_VALUES_FOR_REMAP && (
      <>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta columna tiene demasiados valores únicos para mostrarlos todos.
          Usa el reemplazo manual para valores específicos.
        </Alert>
        <TextField
          fullWidth
          margin="dense"
          label="Valor a buscar..."
          value={valorBuscado}
          onChange={e => setValorBuscado(e.target.value)}
        />
        <TextField
          fullWidth
          margin="dense"
          label="Nuevo valor..."
          value={nuevoValor}
          onChange={e => setNuevoValor(e.target.value)}
        />
      </>
    )}
  </Box>
)}
{/* --- CONTENIDO PARA ELIMINAR FILAS POR VALOR --- */}
{modalState.type === 'delete_rows' && (
  <Box>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
      Introduce los valores a eliminar, separados por comas.
    </Typography>
     <Alert severity="warning" sx={{ mb: 2 }}>
    ⚠️Esta acción impactará en toda la tabla, no solo en esta columna.
   </Alert>
    <TextField
      fullWidth
      margin="dense"
      label="Valores a eliminar (ej: Lapiz, NaN, N/A, 123)"
      value={valorAEliminar}
      onChange={e => setValorAEliminar(e.target.value)}
    />
  </Box>
)}

{modalState.type === 'pattern_clean' && (
    
    // --- INICIO DE LA CORRECCIÓN ---
    // 1. Usamos un <Box> como contenedor padre para todos los elementos.
    <Box>
        
        {/* 2. Tu texto explicativo (perfecto como está) */}
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Usa estas herramientas para "rescatar" datos de texto desordenado:
        </Typography>

        {/* Usamos 'dense' para que la lista ocupe menos espacio */}
        <List dense sx={{ pl: 2, mb: 2, '& .MuiListItem-root': { display: 'list-item', py: 0.2 } }}>
          <ListItem>
            <b>Extraer solo números:</b> <i>Precio: $19.99 USD → 19.99</i>
          </ListItem>
          <ListItem>
            <b>Extraer solo texto:</b> <i>ID-123: Producto A → Producto A</i>
          </ListItem>
          <ListItem>
            <b>Eliminar signos de puntuación:</b> <i>Melon, Pera → Melon Pera</i>
          </ListItem>
        </List>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Selecciona una operación para aplicar a todas las celdas de esta columna.
        </Typography>

        {/* 3. El FormControl con el Select que ya tenías */}
        <FormControl fullWidth>
            <InputLabel id="pattern-select-label">Operación de Limpieza</InputLabel>
            <Select
                labelId="pattern-select-label"
                value={selectedPattern}
                label="Operación de Limpieza"
                onChange={(e) => setSelectedPattern(e.target.value)}
            >
                {patternCleaningOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
            </Select>
        </FormControl>

    </Box>
)}

{modalState.type === 'group_rare' && (
    <Box>
        <Typography gutterBottom>
            Agrupar categorías que aparecen menos del: <strong>{rareThreshold}%</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta acción es útil para simplificar columnas con muchos valores únicos.
        </Typography>
        {/* Slider es un import de @mui/material */}
        <Slider
            value={rareThreshold}
            onChange={(e, newValue) => setRareThreshold(newValue)}
            aria-labelledby="rare-threshold-slider"
            valueLabelDisplay="auto"
            step={1}
            marks
            min={1}
            max={20} // Un máximo de 20% es razonable
        />
    </Box>
)}

</CleaningActionModal>
</Box>
);
} 