import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Box,
  Drawer,
  CssBaseline,
  Toolbar,
  List,
  Divider,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import Header from './Header';
import logo from '../assets/promptLabLogos.png';

// --- Iconos ---
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import HistoryIcon from '@mui/icons-material/History';
import ImageIcon from '@mui/icons-material/Image';

const drawerWidth = 210;
const customAppBarHeight = '55px';

export default function Layout() {
  const menuItems = [
    { text: 'Mis Proyectos', icon: <FolderCopyIcon />, path: '/dashboard' },
    { text: 'Mis Modelos', icon: <ModelTrainingIcon />, path: '/models' },
    { text: 'Mis Prompts', icon: <HistoryIcon />, path: '/historial-prompts' },
    { text: 'Mis Imagenes', icon: <ImageIcon />, path: '/galeria' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header />

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 'none',
            background: 'linear-gradient(180deg, #002f4b, #005f73)', // 🎨 degradado pro
            color: 'white',
          },
        }}
      >
        <Toolbar sx={{ minHeight: customAppBarHeight }} />

        {/* Logo y nombre */}
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Box
            component="img"
            src={logo}
            alt="PromptLab Logo"
           sx={{ height: 32, mr: 1.5,transform: 'skewX(-10deg)' }}
          />
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{ fontStyle: 'italic', color: '#00e5ff' }}
          >
            PromptLab
          </Typography>
        </Box>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.2)' }} />

           {/* Menú principal */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          <List sx={{ p: 1 }}>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={NavLink}
                  to={item.path}
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#00e5ff33' : 'transparent',
                    borderLeft: isActive ? '4px solid #00e5ff' : '4px solid transparent',
                  })}
                  sx={{
                    borderRadius: 1,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: '#00e5ff22',
                    },
                  }}
                >
                  {/* --- ¡AHORA ESTÁ LIMPIO Y CORRECTO! --- */}
                  {/* El .map() se encarga de poner el icono y el texto correctos para CADA item */}
                  <ListItemIcon sx={{ color: 'white' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Contenido principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${drawerWidth}px)`,
          backgroundColor: '#f9f9f9',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
