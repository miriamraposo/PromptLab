import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  TextField,
  Box,
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';

const UniqueValuesModal = ({ open, onClose, columnName, uniqueValues = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredValues = useMemo(() => {
    if (!uniqueValues || !columnName) {
      return [];
    }

    if (!searchTerm) {
      return uniqueValues;
    }

    return uniqueValues.filter(item =>
      String(item.valor).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, uniqueValues, columnName]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle>
        Valores Únicos de:{' '}
        <Typography component="span" variant="h6" color="primary" sx={{ fontWeight: 'bold', ml: 1 }}>
          {columnName}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ my: 2 }}>
          <TextField
            fullWidth
            variant="outlined"
            size="small"
            placeholder={`Buscar en ${uniqueValues.length} valores...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </Box>

        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Valor</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  Conteo
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredValues.map((item, index) => (
                <TableRow key={index} hover>
                  <TableCell>{String(item.valor ?? '(Nulo)')}</TableCell>
                  <TableCell align="right">{item.conteo}</TableCell>
                </TableRow>
              ))}
              {filteredValues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} align="center" sx={{ fontStyle: 'italic' }}>
                    No se encontraron valores.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UniqueValuesModal;
