// src/components/dashboard/DataToolbar.jsx (VERSIÓN FINAL COMPLETA)

import React from 'react';
import PropTypes from 'prop-types'; // Buena práctica para definir las props
import {
    Box,
    TextField,
    Button,
    IconButton,
    InputAdornment,
    Paper,
    Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

export default function DataToolbar({ searchTerm, onSearchChange, onApplySearch, onClearSearch }) {
    
    // Función para manejar la búsqueda cuando el usuario presiona "Enter" en el teclado
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            onApplySearch(); // Llama a la misma función que el botón "Buscar"
        }
    };

    return (
        <Paper
            // Usamos Paper como contenedor principal para un mejor estilo
            elevation={0} // Sin sombra
            sx={{
                p: 0.5, // Padding de 1 unidad
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                borderBottom: 1, // Una línea sutil para separarlo de la tabla
                borderColor: 'divider',
                flexShrink: 0, // Evita que la barra se encoja si el espacio es reducido
            }}
        >
            <TextField
                fullWidth // Ocupa todo el ancho disponible
                variant="outlined"
                size="small" // Un tamaño más compacto
                placeholder="Buscar en el dataset..."
                value={searchTerm}
                onChange={onSearchChange}
                onKeyPress={handleKeyPress} // Añadimos el manejador de "Enter"
                InputProps={{
                    // "Adornos" que van dentro del campo de texto
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                    endAdornment: (
                        <InputAdornment position="end">
                            {/* Mostramos el botón de limpiar solo si hay texto en la búsqueda */}
                            {searchTerm && (
                                <Tooltip title="Limpiar búsqueda">
                                    <IconButton onClick={onClearSearch} size="small">
                                        <ClearIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                        </InputAdornment>
                    ),
                }}
            />
            <Button variant="contained" onClick={onApplySearch}>
                Buscar
            </Button>
        </Paper>
    );
}


DataToolbar.propTypes = {
    searchTerm: PropTypes.string.isRequired,
    onSearchChange: PropTypes.func.isRequired,
    onApplySearch: PropTypes.func.isRequired,
    onClearSearch: PropTypes.func.isRequired,
};
