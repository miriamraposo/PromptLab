// src/components/pdf/GalleryModal.jsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Typography,
  CircularProgress,
  Grid,
  Paper,
  IconButton,
  Fade,
} from "@mui/material";
import { useParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import CloseIcon from "@mui/icons-material/Close";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "85%",
  maxHeight: "80vh",
  bgcolor: "background.paper",
  borderRadius: 4,
  boxShadow: 24,
  p: 3,
  display: "flex",
  flexDirection: "column",
};

export default function GalleryModal({ open, onClose, onImageSelect }) {
  const { projectId } = useParams();
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch de imágenes cuando el modal abre
  useEffect(() => {
    if (open) {
      const fetchImages = async () => {
        setLoading(true);
        const { data, error } = await supabase.storage
          .from("datasets")
          .list(`${projectId}/images`, { limit: 100 });

        if (error) {
          console.error("Error fetching images:", error);
        } else {
          const imageUrls = data.map((file) => {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("datasets")
              .getPublicUrl(`${projectId}/images/${file.name}`);
            return { name: file.name, url: publicUrl };
          });
          setImages(imageUrls);
        }
        setLoading(false);
      };
      fetchImages();
    }
  }, [open, projectId]);

  const handleImageClick = (imageUrl) => {
    onImageSelect(imageUrl);
  };

  return (
    <Modal open={open} onClose={onClose} closeAfterTransition>
      <Fade in={open}>
        <Box sx={style}>
          {/* --- Cabecera con título y botón de cerrar --- */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Selecciona una Imagen de la Galería
            </Typography>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* --- Contenido --- */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid
              container
              spacing={2}
              sx={{ overflowY: "auto", flexGrow: 1 }}
            >
              {images.length > 0 ? (
                images.map((image) => (
                  <Grid  size={{ xs: 6, sm: 4, md: 3 }} key={image.name}>
                   
                    <Paper
                      onClick={() => handleImageClick(image.url)}
                      sx={{
                        cursor: "pointer",
                        borderRadius: 2,
                        overflow: "hidden",
                        boxShadow: 3,
                        transition: "transform 0.2s, box-shadow 0.2s",
                        "&:hover": {
                          transform: "scale(1.05)",
                          boxShadow: 6,
                        },
                      }}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        style={{ width: "100%", display: "block" }}
                      />
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mx: "auto", mt: 4 }}
                >
                  No hay imágenes en la galería de este proyecto.
                </Typography>
              )}
            </Grid>
          )}
        </Box>
      </Fade>
    </Modal>
  );
}
