// src/components/SideMenu.jsx

import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
    Box, List, ListItem, ListItemButton, 
    ListItemIcon, ListItemText 
} from '@mui/material';
import { useNavigate } from 'react-router-dom';


// Importamos los íconos
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';

// Lista de los ítems del menú
const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Configuración', icon: <SettingsIcon />, path: '/settings' },
];

export default function SideMenu() {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    navigate(path); // Siempre navega, aunque ya esté en esa ruta
  };

  return (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton onClick={() => handleNavigation(item.path)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
