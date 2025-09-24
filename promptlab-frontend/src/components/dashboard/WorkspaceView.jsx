import React from 'react';
import {
  Box, Button, Divider, Paper, Typography, Menu, MenuItem, IconButton, Tooltip
} from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import AddIcon from '@mui/icons-material/Add';
import DatasetList from './DatasetList';
import UploadDatasetModal from './UploadDatasetModal';
import PropertiesPanel from './PropertiesPanel';

export default function WorkspaceView({
  project, projectId, datasets, onDataChange,
  isUploadModalOpen, setUploadModalOpen, menuAnchorEl,
  activeDataset, handleMenuClose, handleMenuOpen,
  handleRenameDataset, handleDeleteDataset, onSelectDataset, fetchData
}) {
  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 60px - 40px)', p: 1, }}>
      {/* Panel principal */}
      <Paper 
        elevation={3} 
        sx={{ 
          flex: '2 1 0', 
          display: 'flex', 
          flexDirection: 'column', 
          borderRadius: 2, 
     
          
        }}
      >
        {/* Encabezado del panel de datasets */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            p: 2, 
            bgcolor: 'background.default',
            borderBottom: 1,
            borderColor: 'divider'
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Datasets
          </Typography>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Subir nuevo dataset">
              <IconButton 
                color="primary" 
                onClick={() => setUploadModalOpen(true)}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Exportar proyecto">
              <IconButton color="secondary">
                <IosShareIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Lista de datasets */}
       
          <DatasetList 
            datasets={datasets}
            activeDataset={activeDataset}
            onSelectDataset={onSelectDataset}
            onOpenMenu={handleMenuOpen}
          />
        
      </Paper>

      {/* Panel de propiedades */}
      <Paper 
        elevation={3} 
        sx={{ 
          flex: '1 1 0', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Propiedades
        </Typography>
        <PropertiesPanel 
          project={project} 
          activeDataset={activeDataset}
          onDataChange={onDataChange}
        />
      </Paper>

      {/* Modal para subir dataset */}
      <UploadDatasetModal
        open={isUploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onDatasetUploaded={fetchData}
        projectId={projectId}
      />

      {/* Menú contextual */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleRenameDataset}>Renombrar</MenuItem>
        <MenuItem onClick={handleDeleteDataset} sx={{ color: 'error.main' }}>
          Eliminar
        </MenuItem>
      </Menu>
    </Box>
  );
}
