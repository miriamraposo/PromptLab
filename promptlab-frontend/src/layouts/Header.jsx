// src/layouts/Header.jsx
import React, { useState } from 'react';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { Link, useNavigate } from 'react-router-dom';
import { useSelection } from '../context/SelectionContext';
import ExportModal from '../components/ExportModal';
import { useThemeContext } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import { supabase } from '../supabaseClient';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Button,
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

export default function Header() {
  const { profile } = useUser();
  const { mode, toggleTheme } = useThemeContext();
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleAccountClick = () => {
    navigate('/cuenta');
    handleMenuClose();
  };

  const { selection } = useSelection();
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const isExportDisabled = !selection.selectedDatasetId;

  const handleOpenExportModal = () => {
    if (!isExportDisabled) {
      setIsExportModalOpen(true);
    }
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #002f4b, #005f73)',
          color: 'white',
          borderBottom: '2px solid #00e5ff',
        }}
        elevation={0}
      >
        <Toolbar sx={{ minHeight: '50px !important', height: '50px', px: 2 }}>
          {/* 🔹 Espaciador para empujar a la derecha */}
          <Box sx={{ flexGrow: 1 }} />

          {/* --- Botón Exportar --- */}
          <Button
            variant="contained"
            color="secondary"
            disabled={isExportDisabled}
            onClick={handleOpenExportModal}
            startIcon={<FileDownloadIcon />}
            sx={{
              color: 'white',
              height: '34px',
              mr: 1,
              '&.Mui-disabled': {
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            Exportar
          </Button>

          {/* 🔹 Link a Integraciones */}
          <Button
            component={Link}
            to="/integraciones"
            sx={{
              color: 'white',
              textTransform: 'none',
              mr: 1,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            Integraciones
          </Button>

          {/* --- Botón de modo oscuro --- */}
          <IconButton
            sx={{
              ml: 1,
              color: 'white',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
            onClick={toggleTheme}
          >
            {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
          </IconButton>

          {/* --- Avatar y menú --- */}
          <IconButton
            onClick={handleMenuOpen}
            sx={{
              p: 0,
              ml: 1.5,
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
            }}
          >
            <Avatar
              sx={{
                bgcolor: '#00e5ff',
                color: '#002f4b',
                width: 34,
                height: 34,
                fontWeight: 'bold',
              }}
            >
              {profile?.full_name
                ? profile.full_name.charAt(0).toUpperCase()
                : '?'}
            </Avatar>
          </IconButton>

          <Menu anchorEl={anchorEl} open={isMenuOpen} onClose={handleMenuClose}>
            <MenuItem disabled>Hola, {profile?.full_name || 'Usuario'}</MenuItem>
            <Divider />
            <MenuItem onClick={handleAccountClick}>Mi Cuenta</MenuItem>
            <MenuItem onClick={handleLogout}>Cerrar Sesión</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {isExportModalOpen && (
        <ExportModal onClose={() => setIsExportModalOpen(false)} />
      )}
    </>
  );
}
