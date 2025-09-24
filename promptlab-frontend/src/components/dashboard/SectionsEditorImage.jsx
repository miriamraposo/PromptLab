// src/components/dashboard/SectionsEditorImage.jsx

import React from 'react';
import PropTypes from 'prop-types';
import { Box, Card, IconButton,Input, TextField,Button, Typography, Stack, Slider, ToggleButtonGroup, ToggleButton } from '@mui/material'; // <-- Añade Slider y ToggleButtons
import { 
    Delete, 
    ContentCopy, 
    AddCircleOutline, 
    FormatAlignCenter, 
    FormatAlignLeft, 
    FormatAlignRight,
    ArrowUpward,      // <-- AÑADE ESTA LÍNEA
    ArrowDownward  
    
} from '@mui/icons-material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// ================================================================
// --- 1. NUEVO COMPONENTE: El Panel de Controles ---
// ================================================================


function ImageControls({ section, onStyleChange }) {

  // --- ¡SOLUCIÓN! ---
  // Definimos 'marks' AQUÍ, en el nivel superior del componente.
  // Ahora es visible para todo lo que está dentro de ImageControls.
  const marks = [
    {
      value: 30,
      label: 'Pequeño',
    },
    {
      value: 60,
      label: 'Mediano',
    },
    {
      value: 100,
      label: 'Ancho Completo',
    },
  ];


  const handleSizeChange = (newValue) => {
    // Asegurarnos de que el valor está dentro de los límites
    const value = Math.max(5, Math.min(100, Number(newValue)));
    onStyleChange(section.id, 'size', value);
  };



  const handleAlignChange = (event, newAlignment) => {
    if (newAlignment !== null) { // Previene deseleccionar todo
      onStyleChange(section.id, 'align', newAlignment);
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="caption" display="block" gutterBottom>Tamaño de la Imagen</Typography>
      {/* --- SOLUCIÓN 2: Slider combinado con Input numérico --- */}
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
  <Slider
    value={typeof section.content.size === 'number' ? section.content.size : 100}
    onChange={(event, newValue) => handleSizeChange(newValue)}
    aria-labelledby="image-size-slider"
    step={5}
    min={5}
    max={100}
    sx={{ width: 700 }} 
    marks={marks}
  />

  <Input
    value={section.content.size || 100}
    size="small"
    onChange={(event) =>
      handleSizeChange(
        event.target.value === '' ? '' : Number(event.target.value)
      )
    }
    onFocus={(event) => event.stopPropagation()}
    onKeyDown={(event) => event.stopPropagation()}
    sx={{ width: "5em" }}
    inputProps={{
      step: 5,
      min: 5,
      max: 100,
      type: "number",
      'aria-labelledby': "image-size-slider",
    }}
  />
</Box>


      <Typography variant="caption" display="block" gutterBottom sx={{ mt: 1 }}>Alineación</Typography>
      <ToggleButtonGroup
        value={section.content.align || 'center'}
        exclusive
        onChange={handleAlignChange}
        aria-label="image alignment"
        fullWidth
      >
        <ToggleButton value="left" aria-label="left aligned"><FormatAlignLeft /></ToggleButton>
        <ToggleButton value="center" aria-label="centered"><FormatAlignCenter /></ToggleButton>
        <ToggleButton value="right" aria-label="right aligned"><FormatAlignRight /></ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
}



// --- Componente Helper para renderizar la imagen ---
function ImageSection({ section, onSectionChange }) {
  const handleAltChange = (e) => {
    onSectionChange(section.id, { 
      ...section.content, 
      alt: e.target.value 
    });
    
  };
    const alignmentMap = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: alignmentMap[section.content.align] || 'center' }}>
        <img 
          src={section.content.src} 
          alt={section.content.alt} 
          style={{ 
            width: `${section.content.size || 100}%`, // Aplicamos el tamaño
            height: 'auto',
            borderRadius: '8px'
          }} 
        />
      </Box>
      <Box>
      <TextField
        fullWidth
        variant="standard"
        placeholder="Añade una descripción (alt text)"
        value={section.content.alt || ''}
        onChange={handleAltChange}
        sx={{ mt: 1 }}
        InputProps={{ disableUnderline: true }}
      />
      </Box>
    </Box>
  );
}

ImageSection.propTypes = {
    section: PropTypes.object.isRequired,
    onSectionChange: PropTypes.func.isRequired,
};

// --- Componente Principal ---
export default function SectionsEditorImage({
  sections,
  onSectionChange,
  onSectionDelete,
  onSectionDuplicate,
  onSectionAdd,
  onSectionAddAtStart,
  activeSectionId,
  onSectionMove,
  onSectionFocus,
}) {
  
  if (!sections || sections.length === 0) {
    return (
      <Card sx={{ p: 4, textAlign: 'center', height: '100%', borderRadius: 3 }}>
        <Typography color="text.secondary" variant="body1">
          Añade contenido usando el panel de la derecha.
        </Typography>
      </Card>
    );
  }
   const handleStyleChange = (sectionId, styleKey, newValue) => {
    const updatedSections = sections.map(sec => {
      if (sec.id === sectionId) {
        return {
          ...sec,
          content: {
            ...sec.content,
            [styleKey]: newValue
          }
        };
      }
      return sec;
    });
    onSectionChange(updatedSections); // Reutilizamos la función de cambio principal
  };
  
  const handleSectionContentChange = (id, newContent) => {
    const updatedSections = sections.map(section =>
      section.id === id ? { ...section, content: newContent } : section
    );
    onSectionChange(updatedSections);
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AddCircleOutline />}
          onClick={onSectionAddAtStart}
        >
          Añadir Sección al Principio
        </Button>
      </Box>
      {sections.map((section, index) => (
        
        <Card
        
          key={section.id}
          onClick={() => onSectionFocus(section.id)}
          sx={{
            mb: 3, p: 2.5, borderRadius: 3, cursor: 'pointer', transition: 'all 0.2s ease-in-out',
            border: '2px solid',
            borderColor: section.id === activeSectionId ? 'primary.main' : 'transparent',
            boxShadow: section.id === activeSectionId ? '0 4px 12px rgba(33, 150, 243, 0.5)' : '0 2px 8px rgba(0,0,0,0.08)',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)', borderColor: section.id === activeSectionId ? 'primary.dark' : 'grey.300' }
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle2" color="text.secondary">Sección {index + 1}</Typography>
            <Box>  
                 {/* --- INICIO DE LOS CAMBIOS --- */}
      <IconButton 
        size="small" 
        onClick={(e) => { e.stopPropagation(); onSectionMove(section.id, 'up'); }}
        disabled={index === 0} // Deshabilita el botón si es el primer elemento
      >
        <ArrowUpward fontSize="small" />
      </IconButton>

      <IconButton 
        size="small" 
        onClick={(e) => { e.stopPropagation(); onSectionMove(section.id, 'down'); }}
        disabled={index === sections.length - 1} // Deshabilita si es el último
      >
        <ArrowDownward fontSize="small" />
      </IconButton>
      {/* --- FIN DE LOS CAMBIOS --- */}
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSectionAdd(section.id); }}>
                <AddCircleOutline fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSectionDuplicate(section.id); }}><ContentCopy fontSize="small" /></IconButton>
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onSectionDelete(section.id); }}><Delete fontSize="small" /></IconButton>
            </Box>
          </Stack>
          
          {/* ================================================================ */}
          {/* --- LA LÓGICA CLAVE CORREGIDA --- */}
          {/* ================================================================ */}

          {/* --- PASO 1: Muestra el contenido principal (imagen o texto) --- */}
          {section.type === 'image' ? (
            <ImageSection section={section} onSectionChange={handleSectionContentChange} />
          ) : (
             <TextField
                fullWidth
                multiline
                variant="standard"
                value={section.content}
                onChange={(e) => handleSectionContentChange(section.id, e.target.value)}
                InputProps={{ disableUnderline: true }}
                sx={{ '& .MuiInputBase-input': { fontSize: '1rem', fontFamily: 'monospace', lineHeight: 1.6 } }}
              />
          )}

          {/* --- PASO 2: Muestra los controles ADICIONALMENTE si se cumple la condición --- */}
          {section.type === 'image' && section.id === activeSectionId && (
            // --- SOLUCIÓN 1: Detenemos la propagación del clic aquí ---
           <Box 
  onClick={(e) => {
    console.log("Click event stopped on controls panel");
    e.stopPropagation();
  }} 
  onMouseDown={(e) => {
    console.log("Mouse Down event stopped on controls panel");
    e.stopPropagation();
  }}
>
  <ImageControls section={section} onStyleChange={handleStyleChange} />
</Box>
          )}
          
        </Card>
      ))}
    </Box>
  );
}

// --- CORRECCIÓN 4: PropTypes actualizados para el componente principal ---
SectionsEditorImage.propTypes = {
  sections: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    content: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.shape({
            src: PropTypes.string.isRequired,
            alt: PropTypes.string,
        })
    ]).isRequired,
  })).isRequired,
  onSectionChange: PropTypes.func.isRequired,
  onSectionDelete: PropTypes.func,
  onSectionDuplicate: PropTypes.func,
  activeSectionId: PropTypes.string, // Prop para saber qué sección está activa
  onSectionFocus: PropTypes.func,     // Prop para la función que se llama al hacer clic
};