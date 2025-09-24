// src/components/AnalysisResultModal.jsx

// --- IMPORTS ---
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
  IconButton, Divider, Box, Paper, CircularProgress, LinearProgress, Stack,
  List, ListItem, ListItemIcon, ListItemText, Chip, Accordion, AccordionSummary,
  AccordionDetails
} from '@mui/material';

// --- ICONS ---
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
// Icons for Sentiment
import SentimentVerySatisfiedIcon from '@mui/icons-material/SentimentVerySatisfied';
import SentimentVeryDissatisfiedIcon from '@mui/icons-material/SentimentVeryDissatisfied';
import SentimentNeutralIcon from '@mui/icons-material/SentimentNeutral';
// Icons for Statistics
import TextFieldsIcon from '@mui/icons-material/TextFields';
import AbcIcon from '@mui/icons-material/Abc';
import ShortTextIcon from '@mui/icons-material/ShortText';


// ===================================================================
//  1. MINI-COMPONENTES PARA CADA TIPO DE ANÁLISIS
//     Esto hace el código principal increíblemente limpio.
// ===================================================================

const SummaryView = ({ result }) => (
    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
        {result?.summary || "No se pudo generar un resumen."}
    </Typography>
);

const SentimentView = ({ result }) => {
    const { interpretation, polarity, subjectivity } = result || {};

    // Mantenemos la configuración centralizada
    const sentimentConfig = {
        Positivo: { icon: <SentimentVerySatisfiedIcon fontSize="large" color="success" />, color: 'success.main', progressColor: 'success' },
        Negativo: { icon: <SentimentVeryDissatisfiedIcon fontSize="large" color="error" />, color: 'error.main', progressColor: 'error' },
        Neutral: { icon: <SentimentNeutralIcon fontSize="large" color="action" />, color: 'text.secondary', progressColor: 'primary' }
    };

    const finalInterpretation = interpretation || 'Neutral'; // Usamos Neutral como fallback en vez de Desconocido
    const config = sentimentConfig[finalInterpretation];
    
    // Si la interpretación no existe, mostramos "Desconocido" en el texto
    const displayText = interpretation || 'Desconocido';

    return (
        <Stack spacing={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center' }}>
                {config.icon}
                <Typography variant="h4" component="p" sx={{ color: config.color, fontWeight: 'bold' }}>
                    {displayText}
                </Typography>
            </Box>
            <Divider />
            <Box>
                <Typography gutterBottom>Polaridad: <strong>{polarity?.toFixed(3) ?? 'N/A'}</strong></Typography>
                {/* AHORA EL COLOR SE BASA EN LA CONFIGURACIÓN UNIFICADA */}
                <LinearProgress
                    variant="determinate"
                    value={(polarity + 1) * 50}
                    color={config.progressColor} // Usamos el color definido en el config
                />
                <Typography variant="caption" color="text.secondary">(Negativo: -1, Positivo: +1)</Typography>
            </Box>
            {/* ... */}
        </Stack>
    );
};

const EntitiesView = ({ result }) => {
    const entities = result || [];
    if (entities.length === 0) return <Typography>No se encontraron entidades nombradas.</Typography>;

    const grouped = entities.reduce((acc, ent) => {
        (acc[ent.label] = acc[ent.label] || []).push(ent.text);
        return acc;
    }, {});

    return (
        <Stack spacing={2}>
            {Object.entries(grouped).map(([label, texts]) => (
                <Box key={label}>
                    <Typography variant="overline" color="text.secondary">{label}</Typography>
                    <Divider />
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {texts.map((text, i) => <Chip key={`${text}-${i}`} label={text} />)}
                    </Box>
                </Box>
            ))}
        </Stack>
    );
};

const TopicsView = ({ result }) => {
    if (result?.info || result?.error) {
        return <Typography color="text.secondary">{result.info || result.error}</Typography>;
    }
    if (!result || Object.keys(result).length === 0) {
        return <Typography>No se pudieron determinar los tópicos.</Typography>;
    }
    return (
        <Stack spacing={2}>
            {Object.entries(result).map(([name, words]) => (
                <Paper key={name} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{name}</Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {words.map(word => <Chip key={word} label={word} size="small" />)}
                    </Box>
                </Paper>
            ))}
        </Stack>
    );
};

const StatisticsView = ({ result }) => (
    <List>
        <ListItem><ListItemIcon><TextFieldsIcon /></ListItemIcon><ListItemText primary="Caracteres" secondary={result?.char_count ?? 'N/A'} /></ListItem>
        <ListItem><ListItemIcon><AbcIcon /></ListItemIcon><ListItemText primary="Palabras (Tokens)" secondary={result?.token_count ?? 'N/A'} /></ListItem>
        <ListItem><ListItemIcon><ShortTextIcon /></ListItemIcon><ListItemText primary="Frases" secondary={result?.sentence_count ?? 'N/A'} /></ListItem>
    </List>
);

const ClausesView = ({ result }) => {
    const clauses = result || {};
    if (Object.keys(clauses).length === 0) {
        return <Typography>No se encontraron cláusulas contractuales.</Typography>;
    }
    return (
        <Box>
            {Object.entries(clauses).map(([name, text]) => (
                <Accordion key={name} TransitionProps={{ unmountOnExit: true }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography sx={{ textTransform: 'capitalize' }}>{name.replace(/_/g, ' ')}</Typography></AccordionSummary>
                    <AccordionDetails><Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{text}</Typography></AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
};

const DefaultView = ({ data }) => (
    <Paper component="pre" variant="outlined" sx={{ p: 2, bgcolor: 'action.hover', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {JSON.stringify(data, null, 2)}
    </Paper>
);


//  2. ¡NUEVO! MINI-COMPONENTES PARA PERFILES DE ANÁLISIS
// ===================================================================

const WritingStyleProfileView = ({ data }) => {
    const { statistics, summary } = data || {};
    return (
        <Stack spacing={2}>
            {statistics && ( <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Estadísticas</Typography></AccordionSummary><AccordionDetails><StatisticsView result={statistics} /></AccordionDetails></Accordion> )}
            {summary && ( <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Resumen</Typography></AccordionSummary><AccordionDetails><SummaryView result={{ summary: summary }} /></AccordionDetails></Accordion> )}
        </Stack>
    );
};

const MarketingProfileView = ({ data }) => {
    const { sentiment, entities, topics } = data || {};
    return (
        <Stack spacing={2}>
            {sentiment && ( <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Sentimiento</Typography></AccordionSummary><AccordionDetails><SentimentView result={sentiment} /></AccordionDetails></Accordion> )}
            {entities && ( <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Entidades</Typography></AccordionSummary><AccordionDetails><EntitiesView result={entities} /></AccordionDetails></Accordion> )}
            {topics && ( <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Tópicos</Typography></AccordionSummary><AccordionDetails><TopicsView result={topics} /></AccordionDetails></Accordion> )}
        </Stack>
    );
};

const LegalProfileView = ({ data }) => {
    const { clauses, entities, summary } = data || {};
    return (
        <Stack spacing={2}>
            {clauses && ( <Accordion defaultExpanded><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Cláusulas</Typography></AccordionSummary><AccordionDetails><ClausesView result={clauses} /></AccordionDetails></Accordion> )}
            {entities && ( <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Entidades</Typography></AccordionSummary><AccordionDetails><EntitiesView result={entities} /></AccordionDetails></Accordion> )}
            {summary && ( <Accordion><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography fontWeight="bold">Resumen</Typography></AccordionSummary><AccordionDetails><SummaryView result={{ summary: summary }} /></AccordionDetails></Accordion> )}
        </Stack>
    );
};


// ===================================================================
//  3. COMPONENTE VISUALIZADOR PRINCIPAL (EL "DESPACHADOR") - ACTUALIZADO
// ===================================================================

const AnalysisViewer = ({ data }) => {
    const content = useMemo(() => {
        if (!data?.analysis_type) {
            return <DefaultView data={data} />;
        }
        
        switch (data.analysis_type) {
            // Análisis Individuales: esperan 'data.result'
            case 'summary':    return <SummaryView result={data.result} />;
            case 'sentiment':  return <SentimentView result={data.result} />;
            case 'entities':   return <EntitiesView result={data.result} />;
            case 'topics':     return <TopicsView result={data.result} />;
            case 'statistics': return <StatisticsView result={data.result} />;
            case 'clauses':    return <ClausesView result={data.result} />;

            // Perfiles de Análisis: esperan 'data' completo
            case 'writing_style_analysis': return <WritingStyleProfileView data={data} />;
            case 'marketing_analysis':     return <MarketingProfileView data={data} />;
            case 'legal_analysis':         return <LegalProfileView data={data} />;

            default:           return <DefaultView data={data} />;
        }
    }, [data]);

    return content;
};


// ===================================================================
//  4. EL MODAL PRINCIPAL (SIN CAMBIOS)
// ===================================================================

export default function AnalysisResultModal({ open, onClose, title, data, isLoading }) {
    return (
        <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" scroll="paper">
            <DialogTitle sx={{ m: 0, p: 2 }}>
                {title || 'Resultado del Análisis'}
                <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: 'grey.500' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}><CircularProgress /></Box>
                ) : data ? (
                    <AnalysisViewer data={data} />
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}><Typography color="text.secondary">No hay datos para mostrar.</Typography></Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}

AnalysisResultModal.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    data: PropTypes.object,
    isLoading: PropTypes.bool,
};