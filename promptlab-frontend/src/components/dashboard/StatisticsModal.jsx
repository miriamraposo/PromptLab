// src/components/dashboard/StatisticsModal.jsx

import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography
} from '@mui/material';

const StatisticsModal = ({ open, onClose, columnName, statistics = {} }) => {
  // Convertimos el objeto de estadísticas en un array para poder mapearlo
  const statsArray = Object.entries(statistics);

  return (
  <Dialog 
    open={open} 
    onClose={onClose} 
    fullWidth 
    maxWidth="xs" 
    scroll="paper"
    PaperProps={{
      sx: {
        borderRadius: 3,
        overflow: 'hidden',
      }
    }}
  >
    <DialogTitle sx={{ backgroundColor: 'primary.light', color: 'primary.contrastText', fontWeight: 'bold' }}>
      Estadísticas de: 
      <Typography component="span" variant="h6" sx={{ fontWeight: 'bold', ml: 1 }}>
        {columnName}
      </Typography>
    </DialogTitle>
    
    <DialogContent dividers sx={{ backgroundColor: 'background.default', p: 2 }}>
      <TableContainer 
        component={Paper} 
        variant="outlined" 
        sx={{ boxShadow: 1, borderRadius: 2 }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.100' }}>
              <TableCell sx={{ fontWeight: 'bold', color: 'text.primary' }}>Métrica</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', color: 'text.primary' }}>Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {statsArray.map(([key, value]) => (
              <TableRow key={key} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{key}</TableCell>
                <TableCell align="right" sx={{ color: 'text.secondary' }}>
                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </DialogContent>

    <DialogActions sx={{ p: 2, backgroundColor: 'grey.50' }}>
      <Button 
        onClick={onClose} 
        variant="contained" 
        color="primary"
        sx={{
          fontWeight: 'bold',
          textTransform: 'none',
          ':hover': { backgroundColor: 'primary.dark' }
        }}
      >
        Cerrar
      </Button>
    </DialogActions>
  </Dialog>
);

};

export default StatisticsModal;