import React from 'react';
import {
    Box, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, useTheme,
    Tooltip, alpha 
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

export const TextPreview = ({ data }) => {
    const previewKey = Object.keys(data)[0] || 'text';
    const previewText = data[previewKey];

    return (
        <Box
            component="pre"
            sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                margin: 0,
            }}
        >
            {previewText}
        </Box>
    );
};

export const TablePreview = ({ data, problematicColumns, selectedColumn, onColumnSelect }) => {
    const theme = useTheme();

    if (!Array.isArray(data) || data.length === 0) {
        return <Typography sx={{ p: 2 }}>No hay datos para mostrar.</Typography>;
    }

    const problematicColumnSet = new Set(
        (problematicColumns || []).map(p => p.columna?.toLowerCase())
    );
    
    const headers = Object.keys(data[0]);

    // ✅ REQUISITO 1: FUNCIONALIDAD DE URLs PARA EL ENRIQUECEDOR
    // Esta función se mantiene intacta. Detecta las URLs de imágenes correctamente.
    const isImageUrl = (url) => {
        if (typeof url !== 'string') return false;
        return url.startsWith('http') && /\.(jpg|jpeg|png|gif)$/i.test(url);
    };

    return (
        <TableContainer component={Paper} elevation={0} sx={{ height: '100%' }}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        {headers.map((colName) => {
                            const isProblematic = problematicColumnSet.has(colName.toLowerCase());
                            const isSelected = colName === selectedColumn;

                            return (
                                // ✅ REQUISITO 4: ENCABEZADO MEJORADO Y RESALTADO DE SELECCIÓN
                                <TableCell
                                    key={colName}
                                    onClick={() => onColumnSelect(colName)}
                                    align="center"
                                    sx={{
                                        cursor: 'pointer',
                                        fontWeight: 'bold',
                                        // La lógica de 3 niveles asegura que la selección tiene prioridad
                                        backgroundColor: isSelected
                                            ? theme.palette.primary.light 
                                            : isProblematic
                                                ? (theme.palette.mode === 'dark' ? 'rgba(255, 235, 59, 0.08)' : '#FFFDE7') // <-- El amarillo suave
                                                : theme.palette.background.default,
                                        borderBottom: isSelected 
                                            ? `2px solid ${theme.palette.primary.main}`
                                            : `1px solid ${theme.palette.divider}`,
                                        color: isSelected ? theme.palette.primary.contrastText : 'inherit',
                                        '&:hover': {
                                            backgroundColor: theme.palette.action.hover,
                                        },
                                    }}
                                >
                                    <Tooltip title={isProblematic ? "Esta columna presenta problemas" : `Columna: ${colName}`}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center',  flexDirection: 'column', gap: 0.5 }}>
                                            {/* ✅ REQUISITO 3: SÍMBOLO WARNING EN MODO CLARO Y OSCURO */}
                                            {isProblematic && (
                                                <WarningAmberIcon
                                                    fontSize="small"
                                                   sx={{ 
                                                        // <-- CORRECCIÓN #1: Usar un color con contraste para el ícono
                                                        color: isSelected ? theme.palette.primary.contrastText : theme.palette.warning.main
                                                    }}
                                                />
                                            )}
                                           <Typography component="span" sx={{ color: isProblematic ? theme.palette.warning.main : 'inherit' }}>
                                            {colName}
                                           </Typography>
                                        </Box>
                                    </Tooltip>
                                </TableCell>
                            );
                        })}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={index} hover>
                            {headers.map((header) => {
                                const cellData = row[header];
                                const cellText = String(cellData ?? '');

                                return (
                                    <TableCell
                                        key={`${index}-${header}`}
                                        sx={{
                                            whiteSpace: 'nowrap',
                                            // ✅ REQUISITO 2: PINTAR CELDAS PROBLEMÁTICAS DE AMARILLO
                                            // Esta lógica se mantiene para el cuerpo de la tabla.
                                            backgroundColor: problematicColumnSet.has(header.toLowerCase())
                                                 ? (theme.palette.mode === 'dark' ? 'rgba(255, 235, 59, 0.25)' : '#faf3abff') // <-- El amarillo suave
                                                : theme.palette.background.default,
                                        }}
                                    >
                                        {/* La función isImageUrl se usa aquí para renderizar la imagen, por lo que la funcionalidad del enriquecedor no se ve afectada. */}
                                        {isImageUrl(cellData) ? (
                                            <Box sx={{ display: 'flex', alignItems: 'center', height: '50px' }}>
                                                <img
                                                    src={cellData}
                                                    alt={`Fila ${index}`}
                                                    style={{ maxHeight: '100%', maxWidth: '150px', height: 'auto', objectFit: 'contain' }}
                                                />
                                            </Box>
                                        ) : (
                                            <Tooltip title={cellText} placement="top-start">
                                                <span>{cellText}</span>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
};