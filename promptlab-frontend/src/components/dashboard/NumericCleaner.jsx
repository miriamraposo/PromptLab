import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Button, Radio, RadioGroup, FormControlLabel, FormControl, 
  FormLabel, TextField, Paper, Alert, Typography, Divider,Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import CleaningActionModal from './CleaningActionModal';
import TuneIcon from '@mui/icons-material/Tune';
import SyncAltIcon from '@mui/icons-material/SyncAlt';
import FindReplaceIcon from '@mui/icons-material/FindReplace';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import Grid from '@mui/material/Grid';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const imputeMethods = [
    { value: 'media', label: 'Media' },
    { value: 'mediana', label: 'Mediana' },
    { value: 'moda', label: 'Moda' },
];

// --- Y ESTA LISTA COMPLETA PARA OUTLIERS ---

const outlierTreatmentMethods = [
  { 
    value: 'capping', 
    label: 'Ajustar a límites (Capping)' 
  },
  { 
    value: 'media', 
    label: 'Reemplazar por la Media (sin outliers)' 
  },
  { 
    value: 'mediana', 
    label: 'Reemplazar por la Mediana (sin outliers)' 
  },
  { 
    value: 'moda', 
    label: 'Reemplazar por la Moda (sin outliers)' 
  },
  { 
    value: 'manual', 
    label: 'Reemplazar por un valor manual' 
  },
  { 
    value: 'eliminar', 
    label: 'Eliminar filas con outliers' 
  }
];

    
const NumericCleaner = ({
  null_count,
  outliers_count,
  columnName,
  onApplyAction,
}) => {
     // --- USA ESTOS ESTADOS CON VALORES POR DEFECTO ---
   const [modalState, setModalState] = useState({ open: false, type: null });
    const [imputeMethod, setImputeMethod] = useState('media');
    const [manualImputeValue, setManualImputeValue] = useState('');
    const [outlierMethod, setOutlierMethod] = useState('capping');
    const [manualOutlierValue, setManualOutlierValue] = useState('');
    const [valorBuscado, setValorBuscado] = useState('');
    const [nuevoValor, setNuevoValor] = useState('');
    const [valorAEliminar, setValorAEliminar] = useState('');
    const hasActions = null_count > 0 || outliers_count > 0;
    // Refs para el foco
    const imputeButtonRef = useRef(null);
    const outlierButtonRef = useRef(null);
    const changeTypeButtonRef = useRef(null);
    const replaceValueButtonRef = useRef(null);
    const deleteRowsButtonRef = useRef(null);

    // --- Estados para el NUEVO modal de Rango ---
    const [rangeModalOpen, setRangeModalOpen] = useState(false);
    const [minValue, setMinValue] = useState('');
    const [maxValue, setMaxValue] = useState('');
    const [rangeMode, setRangeMode] = useState('filter');

    useEffect(() => {
        // Si el modal se acaba de cerrar...
        if (modalState.open === false) { 
            // ...devuelve el foco al botón que lo abrió.
            if (modalState.type === 'impute') imputeButtonRef.current?.focus();
            else if (modalState.type === 'outlier') outlierButtonRef.current?.focus();
            else if (modalState.type === 'change_type') changeTypeButtonRef.current?.focus();
            else if (modalState.type === 'replace_value') replaceValueButtonRef.current?.focus();
            else if (modalState.type === 'delete_rows') deleteRowsButtonRef.current?.focus();
        }
    }, [modalState]);

  const handleOpenModal = (type) => {
    setModalState({ open: true, type });
  };

  const handleCloseModal = () => {
    setModalState({ open: false, type: null });
    setImputeMethod('');
    setManualImputeValue('');
    setOutlierMethod('');
    setManualOutlierValue('');
    setValorBuscado('');
    setNuevoValor('');
    setValorAEliminar('');
  };

  const handleConfirmAction = () => {
    let payload = null;
    const { type } = modalState;

    // Helper para validar número
    const validarNumero = (valor, mensajeError) => {
        const num = parseFloat(valor);
        if (isNaN(num)) {
            alert(mensajeError);
            return null;
        }
        return num;
    };

    switch (type) {
        case 'impute':
            if (imputeMethod === 'cero') {
                payload = {
                    action: 'numeric_impute_with_value',
                    params: { columna: columnName, valor: 0 }
                };
            } else if (imputeMethod === 'manual') {
                const numericValue = validarNumero(
                    manualImputeValue,
                    "Por favor, introduce un valor numérico válido."
                );
                if (numericValue === null) return;
                payload = {
                    action: 'numeric_impute_with_value',
                    params: { columna: columnName, valor: numericValue }
                };
            } else {
                payload = {
                    action: 'numeric_impute_by_method',
                    params: { columna: columnName, metodo: imputeMethod }
                };
            }
            break;

        case 'outlier':
            const paramsOutlier = { columna: columnName, metodo: outlierMethod };
            if (outlierMethod === 'manual') {
                const numericValue = validarNumero(
                    manualOutlierValue,
                    "Introduce un valor numérico para los outliers."
                );
                if (numericValue === null) return;
                paramsOutlier.valor = numericValue;
            }
            payload = {
                action: 'numeric_replace_outliers',
                params: paramsOutlier
            };
            break;

        case 'replace_value':
            const valoresOriginales = valorBuscado.split(',').map(v => v.trim());
            const valoresNuevos = nuevoValor.split(',').map(v => v.trim());

            if (valoresOriginales.length !== valoresNuevos.length) {
                alert("Las listas de valores a buscar y nuevos valores deben tener la misma cantidad de elementos.");
                return;
            }
            payload = {
                action: 'numeric_remap_values',
                params: {
                    columna: columnName,
                    valores_originales: valoresOriginales,
                    valores_nuevos: valoresNuevos
                }
            };
            break;

        case 'delete_rows':
            if (!valorAEliminar) {
                alert("Por favor, introduce un valor a eliminar.");
                return;
            }
            payload = {
                action: 'general_delete_rows_by_value',
                params: {
                    columna: columnName,
                    valor: valorAEliminar
                }
            };
            break;

        case 'change_type':
            return; // Este caso se maneja en otro modal

        default:
            console.warn(`Tipo de acción desconocido: ${type}`);
            return;
    }

    // Ejecuta la acción si hay payload válido
    if (payload) {
        onApplyAction(payload);
    }

    handleCloseModal();
};
    

    const handleValidateRange = () => {
        if (!minValue || !maxValue) {
            alert('Por favor, define un valor mínimo y máximo.');
            return;
        }

        onApplyAction({
            action: 'numeric_validate_range',
            params: {
                columna: columnName,
                min_val: minValue,
                max_val: maxValue,
                mode: rangeMode
            }
        });

        setRangeModalOpen(false);
    };



    // --- RENDERIZADO DEL COMPONENTE ---
   return (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {/* ✅ Mensaje si no hay nada que limpiar */}
    {!hasActions && (
      <Alert severity="success">
        No se detectaron valores nulos ni outliers. 
      </Alert>
    )}

   <Accordion elevation={0} variant="contained" sx={{ mb: 0 }}>
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
    <Typography variant="subtitle1" fontWeight="medium">
      Limpieza automática de la columna
    </Typography>
  </AccordionSummary>

  <AccordionDetails sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    
    {/* ✅ Tarjeta para corregir nulos */}
    {null_count > 0 && (
      <Paper variant="contained" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body1" fontWeight="medium">Valores Nulos</Typography>
          <Typography variant="body2" color="text.secondary">Hay {null_count} celdas vacías.</Typography>
        </Box>
        <Button 
          ref={imputeButtonRef} 
          variant="contained" 
          startIcon={<TuneIcon />} 
          onClick={() => handleOpenModal('impute')}
        >
          Corregir
        </Button>
      </Paper>
    )}

    {/* ✅ Tarjeta para outliers */}
    {outliers_count > 0 && (
      <Paper variant="contained" sx={{ p: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body1" fontWeight="medium">Outliers Detectados</Typography>
          <Typography variant="body2" color="text.secondary">
            {outliers_count} valores atípicos.
          </Typography>
        </Box>
        <Button 
          ref={outlierButtonRef} 
          variant="contained" 
          color="error" 
          startIcon={<TuneIcon />} 
          onClick={() => handleOpenModal('outlier')}
        >
          Corregir
        </Button>
      </Paper>
    )}

  </AccordionDetails>
</Accordion>

       {/* --- SEGUNDO ACORDEÓN (SOLUCIÓN CON STACK) --- */}
<Accordion elevation={0} variant="contained" sx={{ mb: 1 }}>
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
        <Typography variant="subtitle1" fontWeight="medium">
            Transformaciones adicionales
        </Typography>
    </AccordionSummary>
    <AccordionDetails>
        {/* REEMPLAZAMOS Grid y Paper con Stack para una distribución vertical limpia */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}> {/* Un contenedor con gap */}

            <Button 
                fullWidth // <-- Hace que ocupe todo el ancho
                ref={changeTypeButtonRef}  
                variant="contained" 
                color="secondary" 
                onClick={() => handleOpenModal('change_type')}
            >
                Convertir tipo de dato
            </Button>

            {/* Usamos un Box con flex para poner dos botones juntos */}
            <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button 
                    fullWidth 
                    ref={replaceValueButtonRef} 
                    variant="contained" 
                    color="secondary" 
                    onClick={() => handleOpenModal('replace_value')}
                >
                    Reemplazar Valor
                </Button>
                <Button 
                    fullWidth 
                    ref={deleteRowsButtonRef}  
                    variant="contained" 
                    color="error" 
                    onClick={() => handleOpenModal('delete_rows')}
                >
                    Descartar Filas
                </Button>
            </Box>

            <Button 
                fullWidth 
                variant="contained" 
                color="secondary"
                onClick={() => setRangeModalOpen(true)}
            >
                Validar Rango Numérico
            </Button>
            
        </Box>
    </AccordionDetails>
</Accordion>

        {/* --- CORRECCIÓN #2: Eliminamos el acordeón de validación duplicado --- */}

    {/* ✅ Modal (fuera de todo, al final del return) */}
    <CleaningActionModal
      open={modalState.open}
      handleClose={handleCloseModal}
      onConfirm={handleConfirmAction}
      title={
        modalState.type === 'impute'
          ? `Corregir ${null_count} nulos en "${columnName}"`
          : modalState.type === 'outlier'
            ? `Tratar ${outliers_count} outliers en "${columnName}"`
            : `Acción en "${columnName}"`
      }
    >
      {/* Contenidos dinámicos dentro del modal */}
      {modalState.type === 'impute' && (
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">Seleccionar un método de imputación:</FormLabel>
          <RadioGroup value={imputeMethod} onChange={(e) => setImputeMethod(e.target.value)}>
            {imputeMethods.map(opt => (
              <FormControlLabel key={opt.value} value={opt.value} control={<Radio />} label={opt.label} />
            ))}
            <FormControlLabel value="manual" control={<Radio />} label="Usar valor manual" />
            <FormControlLabel value="cero" control={<Radio />} label="Rellenar con Cero (0)" />
          </RadioGroup>
          {imputeMethod === 'manual' && (
            <TextField
              autoFocus
              margin="dense"
              label="Valor numérico"
              type="number"
              fullWidth
              variant="contaided"
              value={manualImputeValue}
              onChange={(e) => setManualImputeValue(e.target.value)}
              sx={{ mt: 1 }}
            />
          )}
        </FormControl>
      )}

    {/* Contenido para Tratar Outliers (VERSIÓN CORREGIDA) */}
      {/* Contenido para Tratar Outliers (¡AQUÍ ESTÁ EL CAMBIO!) */}
                {modalState.type === 'outlier' && (
                    <FormControl component="fieldset" fullWidth>
                        <FormLabel>Seleccionar un método para tratar los outliers:</FormLabel>
                        <RadioGroup value={outlierMethod} onChange={(e) => setOutlierMethod(e.target.value)}>
                            {/* ASEGÚRATE DE QUE MAPEA SOBRE LA LISTA CORRECTA Y COMPLETA */}
                            {outlierTreatmentMethods.map(opt => (
                                <FormControlLabel 
                                    key={opt.value} 
                                    value={opt.value} 
                                    control={<Radio />} 
                                    label={opt.label} 
                                />
                            ))}
                        </RadioGroup>
                        {outlierMethod === 'manual' && (
    <TextField
        autoFocus
        margin="dense"
        label="Valor de reemplazo"
        type="number" // El tipo 'number' ayuda, pero el valor sigue siendo string
        fullWidth
        variant="contaided"
        
        // --- ¡ESTAS DOS LÍNEAS SON CRUCIALES! ---
        value={manualOutlierValue} 
        onChange={(e) => setManualOutlierValue(e.target.value)}

        sx={{ mt: 1 }}
    />
)}
      </FormControl>
)}

      

      {modalState.type === 'change_type' && (
        <FormControl component="fieldset" fullWidth>
          <FormLabel>Elige el nuevo tipo de dato:</FormLabel>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
            <Button variant="contaided" onClick={() => { onApplyAction({ action: 'type_convert_to_integer', params: { columna: columnName } }); handleCloseModal(); }}>A Entero</Button>
            <Button variant="contaided" onClick={() => { onApplyAction({ action: 'type_convert_to_date', params: { columna: columnName } }); handleCloseModal(); }}>A Fecha</Button>
            <Button
        fullWidth
        size="small"
        variant="contained"
        onClick={() => onApplyAction({
          action: 'type_convert_to_float',
          params: { columna: columnName }
        })}
      >
        A Decimal
      </Button>
       <Button 
          variant="contained" 
          color="secondary"
          onClick={() => { 
              onApplyAction({ 
                  action: 'type_convert_to_categorical', // <--- El nombre de la acción
                    params: { columnas: [columnName] } // Plural y como una lista/array
              });
                 handleCloseModal();
          }}
      >
          A Categórico / Texto (para IDs, Años, etc.)
      </Button>
					</Box>
        </FormControl>
      )}

      {modalState.type === 'replace_value' && (
    <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Introduce los valores separados por comas. Debe haber la misma cantidad en ambos campos.
        </Typography>
        <TextField 
            fullWidth 
            margin="dense" 
            label="Valores a buscar (ej: 45, 50, 55)" 
            value={valorBuscado} 
            onChange={e => setValorBuscado(e.target.value)} 
        />
        <TextField 
            fullWidth 
            margin="dense" 
            label="Nuevos valores (ej: 1, 2, 3)" 
            value={nuevoValor} 
            onChange={e => setNuevoValor(e.target.value)} 
        />
        </Box>
      )}

     {modalState.type === 'validate_range' && (
       <Typography>
             Se tratarán todos los valores fuera del rango [{minValue} - {maxValue}] 
             usando el método seleccionado. ¿Estás seguro?
       </Typography>
      )}

        {/* Contenido para Eliminar Filas por Valor */}    
                       {modalState.type === 'delete_rows' && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Introducir los valores a eliminar, separados por comas.
              </Typography>
               <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Introduce los valores a eliminar, separados por comas.
                  </Typography>
                   <Alert severity="warning" sx={{ mb: 2 }}>
                  ⚠️ Esta acción impactará en toda la tabla, no solo en esta columna.
                 </Alert>
                     <TextField 
                       fullWidth 
                       margin="dense" 
                       // ¡Cambiamos la etiqueta para que sea más clara!
                       label="Valores a eliminar (ej: 3245, 123)" 
                       value={valorAEliminar} 
                       onChange={e => setValorAEliminar(e.target.value)} 
              />
             

              
          </Box>
      )}
    </CleaningActionModal>
    <Dialog open={rangeModalOpen} onClose={() => setRangeModalOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Validar Rango Numérico para "{columnName}"</DialogTitle>
            <DialogContent dividers>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Define un rango válido. Los valores fuera de este rango serán tratados según el método que elijas.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField autoFocus label="Valor Mínimo" type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} fullWidth />
                    <TextField label="Valor Máximo" type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} fullWidth />
                </Box>
                <FormControl component="fieldset">
                    <FormLabel component="legend">Método de Tratamiento</FormLabel>
                    <RadioGroup row value={rangeMode} onChange={(e) => setRangeMode(e.target.value)}>
                        <FormControlLabel value="filter" control={<Radio />} label="Eliminar Filas" />
                        <FormControlLabel value="replace" control={<Radio />} label="Reemplazar por Nulo" />
                    </RadioGroup>
                </FormControl>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setRangeModalOpen(false)}>Cancelar</Button>
                <Button onClick={handleValidateRange} variant="contained">
                    Aplicar Validación
                </Button>
            </DialogActions>
        </Dialog>
  </Box>
);
};
export default NumericCleaner;



