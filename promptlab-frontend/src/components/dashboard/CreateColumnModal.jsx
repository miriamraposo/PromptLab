// archivo: src/components/dashboard/CreateColumnModal.jsx


import React, { useState, useMemo } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Alert,
    TextField, FormControl, InputLabel, Select, MenuItem, Box, Typography
} from '@mui/material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material'; 
// En CreateColumnModal.jsx
import FixedValueInput from './FixedValueInput'; // Ajusta la ruta si es necesario

const operations = [
    { value: 'multiplicar', label: '*' },
    { value: 'sumar', label: '+' },
    { value: 'restar', label: '-' },
    { value: 'dividir', label: '/' },
];

export default function CreateColumnModal({ open, onClose, numericColumns, onSave }) {
    
    // Estados para los 4 inputs del modal
    const [newColumnName, setNewColumnName] = useState('');
    const [columnA, setColumnA] = useState('');
    const [columnB, setColumnB] = useState('');
    const [operation, setOperation] = useState('multiplicar');
    const [mode, setMode] = useState('calculated'); 
    const [baseColumn, setBaseColumn] = useState('');
    const [fixedValue, setFixedValue] = useState('');

    const handleModeChange = (event, newMode) => {
        if (newMode !== null) { // Para evitar que se deseleccione todo
            setMode(newMode);
        }
    };

    // 1. Creamos UNA función para cerrar y resetear.
    const handleCloseAndReset = () => {
        setNewColumnName('');
        setColumnA('');
        setColumnB('');
        setOperation('multiplicar');
        setMode('calculated');
        setBaseColumn('');
        setFixedValue('');
        onClose()
    };

   const handleSave = () => {
        let payload;

        if (mode === 'calculated') {
            if (!newColumnName || !columnA || !columnB || !operation) {
                alert("Por favor, completa todos los campos.");
                return;
            }
            payload = {
                action: 'general_create_calculated_column',
                params: {
                    nuevo_nombre: newColumnName,
                    columna_a: columnA,
                    columna_b: columnB,
                    operacion: operation
                }
            };
        } else { // mode === 'by_value'
            if (!newColumnName || !baseColumn || !fixedValue || !operation) {
                alert("Por favor, completa todos los campos.");
                return;
            }
            // La asignación se hace directamente, sin las llaves extra
            payload = {
                action: 'general_create_column_by_value',
                params: {
                    nuevo_nombre: newColumnName,
                    columna_base: baseColumn,
                    valor: fixedValue.replace(',', '.'), 
                    operacion: operation
                }
            };
        }
    
        onSave(payload); 
    };

  return (
  <Dialog open={open} onClose={handleCloseAndReset} fullWidth maxWidth="sm">
    <DialogTitle>Crear Nueva Columna</DialogTitle>

    <DialogContent dividers>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Crea una nueva columna basada en una operación matemática entre dos columnas numéricas existentes o con un valor fijo.
      </Typography>
       <Alert   severity="warning" sx={{ mb: 2 }}>
           Se recomienda verificar que el archivo este procesado y no contenga duplicados,datos faltantes o erróneos antes de continuar.
                  
      </Alert>

      {/* Nombre nueva columna */}
      <TextField
        fullWidth
        label="Nombre de la nueva columna"
        value={newColumnName}
        onChange={(e) => setNewColumnName(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Selector de modo */}
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton value="calculated">Entre 2 Columnas</ToggleButton>
        <ToggleButton value="by_value">Con un Valor Fijo</ToggleButton>
      </ToggleButtonGroup>

      {/* Contenido según modo */}
      {mode === 'calculated' ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Columna A */}
          <FormControl fullWidth>
            <InputLabel>Columna A</InputLabel>
            <Select value={columnA} onChange={(e) => setColumnA(e.target.value)}>
              {numericColumns.map(col => (
                <MenuItem key={col.name} value={col.name}>
                  {col.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Operación */}
          <FormControl sx={{ minWidth: 80 }}>
            <InputLabel>Op.</InputLabel>
            <Select value={operation} onChange={(e) => setOperation(e.target.value)}>
              {operations.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Columna B */}
          <FormControl fullWidth>
            <InputLabel>Columna B</InputLabel>
            <Select value={columnB} onChange={(e) => setColumnB(e.target.value)}>
              {numericColumns.map(col => (
                <MenuItem key={col.name} value={col.name}>
                  {col.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Columna Base */}
          <FormControl fullWidth>
            <InputLabel>Columna Base</InputLabel>
            <Select value={baseColumn} onChange={(e) => setBaseColumn(e.target.value)}>
              {numericColumns.map(col => (
                <MenuItem key={col.name} value={col.name}>
                  {col.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Operación */}
          <FormControl sx={{ minWidth: 80 }}>
            <InputLabel>Op.</InputLabel>
            <Select value={operation} onChange={(e) => setOperation(e.target.value)}>
              {operations.map(op => (
                <MenuItem key={op.value} value={op.value}>
                  {op.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Valor fijo */}
          <TextField
            label="Valor Fijo"
  type="text"
  value={fixedValue}
  onChange={(evento) => setFixedValue(evento.target.value)} 
   
          />
        </Box>
      )}
    </DialogContent>

    <DialogActions>
      <Button onClick={handleCloseAndReset}>Cancelar</Button>
      <Button onClick={handleSave} variant="contained">
        Crear Columna
      </Button>
    </DialogActions>
  </Dialog>
);
  }
