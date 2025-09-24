// RUTA: src/components/analysis/ConfusionMatrix.jsx

import React from 'react';
import {
    Box, Paper, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

// Mapeo de colores para la matriz
const cellStyles = {
    truePositive: { bgcolor: 'success.light', color: 'success.dark' },
    trueNegative: { bgcolor: 'success.light', color: 'success.dark' },
    falsePositive: { bgcolor: 'error.light', color: 'error.dark' },
    falseNegative: { bgcolor: 'error.light', color: 'error.dark' },
};

export default function ConfusionMatrix({ data, labels }) {
    if (!data || data.length !== 2 || !labels || labels.length !== 2) {
        return <Typography>Datos de matriz de confusión no válidos.</Typography>;
    }

    const [ [TN, FP], [FN, TP] ] = data;
    const [ labelNegative, labelPositive ] = labels;

    return (
    <Paper
      elevation={4} // sombra
      sx={{
        p: 2,
        borderRadius: 3,
        boxShadow: 3,
        transition: '0.3s',
        '&:hover': {
          boxShadow: 6,
          transform: 'translateY(-2px)',
        },
        height: '100%',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
         Grafico de la  Matriz de Confusión
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Detalle de los aciertos y errores del modelo.
        </Typography>
      </Box>
      <TableContainer>
        <Table sx={{ minWidth: 300 }} aria-label="confusion matrix">
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Predijo "{labelNegative}"</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Predijo "{labelPositive}"</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Era "{labelNegative}"</TableCell>
              <TableCell align="center" sx={cellStyles.trueNegative}>
                <Typography variant="h5">{TN}</Typography>
                <Chip icon={<CheckCircleIcon />} label="Acierto" size="small" color="success" variant="outlined" />
              </TableCell>
              <TableCell align="center" sx={cellStyles.falsePositive}>
                <Typography variant="h5">{FP}</Typography>
                <Chip icon={<CancelIcon />} label="Error (Falso Positivo)" size="small" color="error" variant="outlined" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>Era "{labelPositive}"</TableCell>
              <TableCell align="center" sx={cellStyles.falseNegative}>
                <Typography variant="h5">{FN}</Typography>
                <Chip icon={<CancelIcon />} label="Error (Falso Negativo)" size="small" color="error" variant="outlined" />
              </TableCell>
              <TableCell align="center" sx={cellStyles.truePositive}>
                <Typography variant="h5">{TP}</Typography>
                <Chip icon={<CheckCircleIcon />} label="Acierto" size="small" color="success" variant="outlined" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}