// src/components/dashboard/TextActionsCard.jsx

// --- IMPORTS ---
// 1. Importaciones de React: ¡Añadimos useState y useRef!
import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

// 2. Importaciones de Material-UI
import { 
    Box, Typography, Paper, Stack, Button,
    ButtonGroup, Menu, MenuItem, Tooltip, CircularProgress,
    Accordion, AccordionSummary, AccordionDetails, Grid, Alert, IconButton, AlertTitle , Divider 
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TuneIcon from '@mui/icons-material/Tune'; 
// 3. Importaciones de Iconos (limpiamos los duplicados)
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TitleIcon from '@mui/icons-material/Title'; 
import EditNoteIcon from '@mui/icons-material/EditNote';
import ScienceIcon from '@mui/icons-material/Science'; 
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CreateIcon from '@mui/icons-material/Create';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import GavelIcon from '@mui/icons-material/Gavel';
import InsightsIcon from '@mui/icons-material/Insights';
import StyleIcon from '@mui/icons-material/Style';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import SummarizeIcon from '@mui/icons-material/Summarize';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import HubIcon from '@mui/icons-material/Hub';
import QueryStatsIcon from '@mui/icons-material/QueryStats';


// Puedes crear una nueva lista para las acciones que modifican el texto.
const selectionActions = [
    // La acción de "Traducir" la movemos aquí para unificar
    { 
        label: 'Traducir a Inglés', 
        action: 'translate', 
        direction: 'es-en', // <-- Añadimos la dirección aquí también
        icon: <TranslateIcon />,
        description: 'Traduce el texto seleccionado a inglés.' 
    },

    { 
        label: 'Simplificar Lenguaje', 
        action: 'simplify', 
        icon: <LightbulbIcon />,
        description: 'Reescribe el texto seleccionado para que sea más fácil de entender.'
    },
    { 
        label: 'Corregir Gramática', 
        action: 'correct_grammar',
        icon: <AutoFixHighIcon />,
        description: 'Corrige errores de ortografía y gramática en la selección.'
    },
    // --- NUEVAS ACCIONES AQUÍ ---
    {
        label: 'Extraer Palabras Clave',
        action: 'extract_keywords', // El 'recipe' que el backend reconocerá
        icon: <VpnKeyIcon />,
        description: 'Identifica y lista las palabras o frases más importantes del texto.'
    },
    {
        label: 'Generar Título',
        action: 'generate_title', // El 'recipe' que el backend reconocerá
        icon: <TitleIcon />,
        description: 'Sugiere un título conciso y relevante para el texto seleccionado.'
    },
];

// --- DEFINICIÓN DE PERFILES (Fuera del componente, como lo hiciste, ¡perfecto!) ---
const analysisProfiles = [
    { label: 'Análisis Legal', endpoint: '/api/analysis/profile/legal', icon: <GavelIcon />, description: "Extrae cláusulas, entidades y genera un resumen." },
    { label: 'Análisis de Opinión', endpoint: '/api/analysis/profile/marketing', icon: <InsightsIcon />, description: "Detecta sentimiento, palabras clave y tópicos." },
    { label: 'Análisis de Estilo', endpoint: '/api/analysis/profile/writing', icon: <StyleIcon />, description: "Calcula estadísticas y genera un resumen." }
];

// En TextActionsCard.jsx, al principio, junto a `analysisProfiles`

const individualAnalyses = [
    { label: 'Sentimiento', action: 'sentiment', icon: <SentimentSatisfiedAltIcon sx={{ fontSize: 32 }} />, description: "Detecta la polaridad del texto." },
    { label: 'Resumen', action: 'summary', icon: <SummarizeIcon sx={{ fontSize: 32 }} />, description: "Crea un resumen conciso." },
    { label: 'Entidades', action: 'entities', icon: <VpnKeyIcon sx={{ fontSize: 32 }} />, description: "Extrae nombres, lugares, etc." },
    { label: 'Tópicos', action: 'topics', icon: <HubIcon sx={{ fontSize: 32 }} />, description: "Descubre los temas principales." },
    { label: 'Estadísticas', action: 'statistics', icon: <QueryStatsIcon sx={{ fontSize: 32 }} />, description: "Calcula métricas del texto." },
    { label: 'Cláusulas', action: 'clauses', icon: <GavelIcon sx={{ fontSize: 32 }} />, description: "Analiza cláusulas (legal)." },
];

const toneOptions = [
    { label: 'Formal', value: 'formal', description: 'Reescribe el texto en un tono profesional y respetuoso.' },
    { label: 'Amigable', value: 'informal', description: 'Adapta el texto a un tono más cercano y casual.' },
    { label: 'Persuasivo', value: 'persuasive', description: 'Modifica el texto para ser más convincente.' },
    { label: 'Emocional', value: 'emocional', description: 'Apela a los sentimientos del lector.' }, // <-- AÑADIDO
    { label: 'Neutral', value: 'neutral', description: 'Elimina opiniones y emociones del texto.' } // <-- AÑADIDO
    // La opción "Conciso" se ha eliminado porque no existe en el backend.
];

// --- COMPONENTE PRINCIPAL ---
export default function TextActionsCard({ selectedText, fullTextContent, onLegacyAnalysis, onTranslate, onAiRecipe, onNavigateWithSelection  }) {
    // --- ESTADO DEL COMPONENTE ---
    const textToAnalyze = selectedText || fullTextContent;
    const isAnalysisDisabled = !textToAnalyze || textToAnalyze.trim().length === 0;
    const isSelectionActionsDisabled = !selectedText || selectedText.trim().length === 0;

    // Estado para el SplitButton de perfiles
    const [open, setOpen] = useState(false);
    const anchorRef = useRef(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoadingProfile, setIsLoadingProfile] = useState(false);

    const toneAnchorRef = useRef(null);
    const [isToneMenuOpen, setIsToneMenuOpen] = useState(false);
    const [selectedToneIndex, setSelectedToneIndex] = useState(0);

    const [loadingAction, setLoadingAction] = useState(null);

    // --- MANEJADORES DE EVENTOS ---
    const handleCopy = () => {
        if (isSelectionActionsDisabled) return;
        navigator.clipboard.writeText(selectedText);
    };

    const handleMenuItemClick = (event, index) => {
        setSelectedIndex(index);
        setOpen(false);
    };

    const handleClose = (event) => {
    // Si el clic fue dentro del botón que abre el menú, no hacemos nada,
    // porque handleToggle ya se encargará.
    if (anchorRef.current && anchorRef.current.contains(event.target)) {
        return;
    }
    setOpen(false); // Cierra el menú
};

    const handleToggle = () => setOpen((prevOpen) => !prevOpen);

    const handleProfileAnalysis = async () => {
    if (isAnalysisDisabled || isLoadingProfile) return;
    setIsLoadingProfile(true);
    const selectedProfile = analysisProfiles[selectedIndex];
    
    // --- EL CAMBIO CLAVE ESTÁ AQUÍ ---
    await onLegacyAnalysis(
    selectedProfile.endpoint, 
    textToAnalyze, 
    { profileLabel: selectedProfile.label }
);
    
    setIsLoadingProfile(false);
};

    const aiRecipeActions = ['simplify', 'correct_grammar', 'extract_keywords', 'generate_title'];

    return (
               <Paper variant="outlined" sx={{background: ' #005f73', height: '100%', display: 'flex', flexDirection: 'column' }}>
      
              {/* --- REEMPLAZA TU CABECERA ACTUAL POR ESTA --- */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="h6" component="h2" fontWeight="bold"  sx={{ color: 'white' }}>
                          Acciones de Texto
                      </Typography>
                      
                      {/* --- EL TOOLTIP ELEGANTE --- */}+
                      <Tooltip
                          arrow // Le da una pequeña flecha que lo hace más moderno
                          placement="top-end" // Lo posiciona arriba y a la derecha del icono
                          title={
                              <React.Fragment>
                                  <Typography color="inherit" sx={{ fontWeight: 'bold' }}>
                                      {selectedText ? "Modo Selección" : "Modo Documento"}
                                  </Typography>
                                  <Typography variant="caption" component="div" sx={{ mt: 0.5 }}>
                                      {selectedText 
                                          ? "Las acciones se aplicarán solo al texto resaltado." 
                                          : "Selecciona un fragmento para aplicar acciones específicas. De lo contrario, se analizará todo el documento."
                                          
                                      }
                                  </Typography>
                              </React.Fragment>
                          }
                          componentsProps={{
              tooltip: {
                  sx: {
                      // Para usar colores del tema, accedemos al objeto 'theme'
                      backgroundColor: (theme) => theme.palette.primary.main, // CORRECTO
                      color: 'white', // Puedes usar 'white' directamente
                      fontSize: '0.875rem',
                      padding: '8px 12px',
                      borderRadius: '8px',
                  },
              },
              arrow: {
                  sx: {
                      // El color de la flecha debe coincidir
                      color: (theme) => theme.palette.primary.main, // CORRECTO
                                              },
                                              },
                                              }}
                                              >
                          {/* El IconButton hace que el icono sea clickable y tenga feedback visual */}
                          <IconButton size="small" sx={{ p: 0.5 }}>
                              <InfoOutlinedIcon 
                                  fontSize="small" 
                                  color={selectedText ? "primary" : "action"} 
                              />
                          </IconButton>
                      </Tooltip>
                  </Box>
      
                  <Typography variant="body2" sx={{ color: 'white' }} mt={0.5}>
                      Acceso a herramientas para analizar y extraer información.
                  </Typography>
              </Box>
      
              {/* --- EL CONTENIDO PRINCIPAL --- */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1, }}>
                      {/* SECCIÓN 1: PERFILES */}
                         <Accordion
                            defaultExpanded
                            sx={{
                            mb: 0.5,
                            mt: 0,
                            backgroundColor: (theme) => theme.palette.primary.light, // cerrado
                            '&.Mui-expanded': {
                              backgroundColor: '#ffffff', bgcolor: (theme) => theme.palette.mode === "dark" ? "background.paper" : "background.default",
                            color: (theme) => theme.palette.text.primary,
                                },
                            borderRadius: 1,
                            boxShadow: 'none',
                            border: '1px solid #ddd',
                                }}
                            >
                          <AccordionSummary
                               expandIcon={<ExpandMoreIcon />}
                               sx={{
                               // Reduce la altura mínima del contenedor
                              minHeight: '10px', 
                  
                              // Controla el margen entre el contenido y el ícono
                              '& .MuiAccordionSummary-content': { 
                               margin: '12px 0' // Reduce el margen vertical (por defecto es 12px)
                               },
      
                                  // Opcional: hacer el ícono un poco más pequeño
                              '& .MuiSvgIcon-root': {
                                fontSize: '1rem',
      
                                
                              }
                             }}
                          >
                            <Typography fontWeight="medium">Perfil de Analisis</Typography>
                        </AccordionSummary >
                          <AccordionDetails>
                              <ButtonGroup variant="contained" ref={anchorRef} fullWidth>
                                  <Tooltip title={analysisProfiles[selectedIndex].description}
                                  componentsProps={{
                                                   tooltip: {
                                                   sx: {
                                                   backgroundColor: (theme) => theme.palette.primary.main,
                                                   color: 'white',
                                                   fontSize: '0.875rem',
                                                    padding: '7px 10px',
                                                    borderRadius: '8px',
                                                    },
                                                    },
                                                     arrow: {
                                                      sx: {
                                                     color: (theme) => theme.palette.primary.main,
                                                   },
                                                   },
                                                    }}>
                                         <span> 
                  <Button
                      
                      onClick={handleProfileAnalysis}
                      disabled={isAnalysisDisabled || isLoadingProfile}
                      startIcon={isLoadingProfile ? <CircularProgress size={20} /> : analysisProfiles[selectedIndex].icon}
                      // Añadimos esto para que el cursor se vea correcto
                      style={{ pointerEvents: (isAnalysisDisabled || isLoadingProfile) ? 'none' : 'auto' }}
                  >
                      {analysisProfiles[selectedIndex].label}
                  </Button>
              </span>
                                  </Tooltip>
                                  <Button size="small" onClick={handleToggle} disabled={isAnalysisDisabled || isLoadingProfile}>
                                      <ArrowDropDownIcon />
                                  </Button>
                              </ButtonGroup>
                              <Menu open={open} anchorEl={anchorRef.current} onClose={handleClose}>
                                  {analysisProfiles.map((option, index) => (
                                      <MenuItem key={option.label} selected={index === selectedIndex} onClick={(e) => handleMenuItemClick(e, index)}>
                                          {option.icon} <span style={{ marginLeft: 8 }}>{option.label}</span>
                                      </MenuItem>
                                  ))}
                              </Menu>
                          </AccordionDetails>
                      </Accordion>
      
                     {/* SECCIÓN 2: ANÁLISIS INDIVIDUALES (VERSIÓN MEJORADA CON GRID) */}
                        <Accordion
                           sx={{
                           mb: 0.5,
                           backgroundColor: (theme) => theme.palette.primary.light, // cerrado
                          '&.Mui-expanded': {
                           backgroundColor: '#ffffff', bgcolor: (theme) =>
                           theme.palette.mode === "dark" ? "background.paper" : "background.default",
                           color: (theme) => theme.palette.text.primary,
                           },
                            borderRadius: 1,
                            boxShadow: 'none',
                            border: '1px solid #ddd',
                            }}
                             >
                         <AccordionSummary expandIcon={<ExpandMoreIcon />}
                           >
                          <Typography fontWeight="medium">Análisis Individuales</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box
                                sx={{
                                  display: 'flex',    // Activa Flexbox
                                  flexWrap: 'wrap',   // Permite que los elementos pasen a la siguiente línea
                                  gap: 1.5,
                         
                                }}
                                >
                            {individualAnalyses.map((analysis) => (
                          // Cada "tarjeta" de acción
                      <Box
                          key={analysis.action}
                          sx={{ //
                              // Calculamos el ancho para tener 3 por fila (menos el gap)
                              // En pantallas pequeñas, pasará a 2 por fila
                              flexBasis: { xs: 'calc(50% - 8px)', sm: 'calc(33.33% - 11px)' },
                              flexGrow: 1, 
                          }}
                      >
                          <Tooltip title={analysis.description} placement="top"
                                                        componentsProps={{
                                      tooltip: {
                                      sx: {
                                      
                                      backgroundColor: (theme) => theme.palette.primary.main,
                                     color: 'white',
                                      fontSize: '0.875rem',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      },
                                      },
                                      arrow: {
                                      sx: {
                                          color: (theme) => theme.palette.primary.main,
                                       },
                                       },
                                       }}>
                              {/* El truco del <span> para el tooltip sigue siendo necesario */}
                              <span>
                                  <Button
                                      variant="outlined"
                                      fullWidth
                                      disabled={isAnalysisDisabled}
                                      onClick={() => onLegacyAnalysis(analysis.action, textToAnalyze)} 
                                      sx={{
                                          height: '100px',
                                          p: 1, // Añadimos un poco de padding interno
                                          
                                          textTransform: 'none',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 0.5,
                                          pointerEvents: isAnalysisDisabled ? 'none' : 'auto',
                                          '&:hover': {
                                              borderColor: 'primary.main',
                                              backgroundColor: 'action.hover'
                                          }
                                      }}
                                  >
                                      {analysis.icon}
                                      <Typography variant="caption" fontWeight="medium" textAlign="center">
                                          {analysis.label}
                                      </Typography>
                                  </Button>
                              </span>
                          </Tooltip>
                      </Box>
                  ))}
              </Box>
          </AccordionDetails>
      </Accordion>
                      <Accordion
        sx={{
          backgroundColor: (theme) => theme.palette.primary.light, // cerrado
          '&.Mui-expanded': {
            backgroundColor: '#ffffff', bgcolor: (theme) =>
      theme.palette.mode === "dark" ? "background.paper" : "background.default",
    color: (theme) => theme.palette.text.primary,
          },
          borderRadius: 1,
          boxShadow: 'none',
          border: '1px solid #ddd',
        }}
      >
  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
    <Typography fontWeight="medium" color="text.primary">
      Acciones sobre Selección
    </Typography>
  </AccordionSummary>
          <AccordionDetails>
              <Stack spacing={1.5}>
      
                  <Box> {/* Lo envolvemos en un Box para que el Tooltip se alinee bien */}
                  <ButtonGroup variant="contained" ref={toneAnchorRef} fullWidth disabled={isSelectionActionsDisabled || !!loadingAction}>
                                      <Tooltip title={toneOptions[selectedToneIndex].description} placement="top" arrow>
                                          <span>
                                             <Button
                                                    startIcon={loadingAction === 'change_tone' ? <CircularProgress size={20} color="inherit" /> : <TuneIcon />}
                                                    disabled={isSelectionActionsDisabled || !!loadingAction}
                                                    onClick={async () => {
                                                    const selectedTone = toneOptions[selectedToneIndex];
                                                    setLoadingAction('change_tone'); 
              
                                                     // Inicia el estado de carga
                                                     setLoadingAction('change_tone'); 
              
                                                    // Llama a la función principal y espera a que termine
                                                    await onAiRecipe('change_tone', selectedText, { tone: selectedTone.value }); 
          
                                                      setLoadingAction(null); 
                                                      }}
                                                      
                                                      >
                                                      {loadingAction === 'change_tone'
                                                       ? "Procesando..."
                                                       : `Cambiar Tono: ${toneOptions[selectedToneIndex].label}`
                                                      }
                                              </Button>
                                          </span>
                                      </Tooltip>
                                      <Button size="small" onClick={() => setIsToneMenuOpen(true)} disabled={isSelectionActionsDisabled || !!loadingAction}>
                                          <ArrowDropDownIcon />
                                      </Button>
                                    </ButtonGroup>
                  <Menu
                      open={isToneMenuOpen}
                      anchorEl={toneAnchorRef.current}
                      onClose={() => setIsToneMenuOpen(false)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                  >
                      {toneOptions.map((option, index) => (
                          <MenuItem
                              key={option.value}
                              selected={index === selectedToneIndex}
                              onClick={() => {
                                  setSelectedToneIndex(index);
                                  setIsToneMenuOpen(false);
                              }}
                          >
                              {option.label}
                          </MenuItem>
                      ))}
                  </Menu>
              </Box>
                  
                  {/* --- 👇 AÑADIMOS LAS NUEVAS ACCIONES AQUÍ 👇 --- */}
                  {selectionActions.map((action) => (
      
                      
                      <Tooltip key={action.action} title={action.description} placement="right" arrow>
                          {/* El <span> es necesario para que el Tooltip funcione en botones deshabilitados */}
                          <span>
                             <Button
                                              variant="outlined"
                                              startIcon={loadingAction === action.action ? <CircularProgress size={20} /> : action.icon}
                                              disabled={isSelectionActionsDisabled || !!loadingAction} // Se deshabilita si CUALQUIER acción está cargando
                                              onClick={async () => {
                                                  setLoadingAction(action.action);
                                                  if (action.action === 'translate') {
                                                      await onTranslate(selectedText);
                                                  } else if (aiRecipeActions.includes(action.action)) {
                                                      await onAiRecipe(action.action, selectedText);
                                                  }
                                                  setLoadingAction(null);
                                              }}
                                              fullWidth
                                              sx={{ pointerEvents: (isSelectionActionsDisabled || !!loadingAction) ? 'none' : 'auto' }}
                                          >
                                              {loadingAction === action.action ? "Procesando..." : action.label}
                                          </Button>
                          </span>
                      </Tooltip>
                  ))}
                  {/* -------------------------------------------------- */}
                  
                  <Divider sx={{ pt: 1 }} />
                  
              
                  <Button sx={{ml: 1,}}
                      variant="contained"
                      startIcon={<ScienceIcon />}
                      disabled={isSelectionActionsDisabled}
                      onClick={() => onNavigateWithSelection(selectedText)}
                  >
                      PromptLab con Selección
                  </Button>
                  
      
                  <Button
                      variant="outlined"
                      startIcon={<ContentCopyIcon />}
                      disabled={!selectedText}
                      onClick={handleCopy}
                  >
                      Copiar Selección
                  </Button>
              </Stack>
          </AccordionDetails>
      </Accordion>
                  </Box>
              </Paper>
          );
      }
      
      TextActionsCard.propTypes = {
          selectedText: PropTypes.string,
          fullTextContent: PropTypes.string.isRequired,
          onLegacyAnalysis: PropTypes.func.isRequired, // <-- AÑADIDO
          onTranslate: PropTypes.func.isRequired,      // <-- AÑADIDO
          onAiRecipe: PropTypes.func.isRequired, 
          onNavigateWithSelection: PropTypes.func.isRequired,      // <-- AÑADIDO
          onAction: PropTypes.func, // onAction ahora es opcional
          
      };