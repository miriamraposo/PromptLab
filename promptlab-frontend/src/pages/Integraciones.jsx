import React from "react";
import { Box, Typography, Button, Paper, Grid } from "@mui/material";
import { FcGoogle } from "react-icons/fc";
import { SiPowerbi, SiFacebook, SiInstagram, SiTiktok, SiLinkedin } from "react-icons/si";

export default function IntegrationsPage() { // Renombrado a un estándar de React
  const servicios = [
    {
      name: "Google Drive",
      description: "Sincroniza y exporta archivos directamente a tu Google Drive.",
      icon: <FcGoogle size={40} />,
      url: "http://localhost:5678/credentials",
    },
    {
      name: "Power BI",
      description: "Envía datasets directamente a tus dashboards de Power BI.",
      icon: <SiPowerbi size={40} color="#F2C811" />,
      url: "http://localhost:5678/credentials",
    },
    {
      name: "Facebook",
      description: "Publica imágenes o documentos en tu página de Facebook.",
      icon: <SiFacebook size={40} color="#1877F2" />,
      url: "http://localhost:5678/credentials",
    },
    {
      name: "Instagram",
      description: "Comparte imágenes o reels directamente en Instagram.",
      icon: <SiInstagram size={40} color="#E4405F" />,
      url: "http://localhost:5678/credentials",
    },
    {
      name: "TikTok",
      description: "Sube videos a TikTok desde tu aplicación.",
      icon: <SiTiktok size={40} color="#000000" />,
      url: "http://localhost:5678/credentials",
    },
    {
      name: "LinkedIn",
      description: "Comparte documentos y publicaciones en tu perfil de LinkedIn.",
      icon: <SiLinkedin size={40} color="#0A66C2" />,
      url: "http://localhost:5678/credentials",
    },
  ];

  // Este es el return correcto, usando Material-UI para ser consistente con tu app.
  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Integraciones / Cuentas Conectadas
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Conecta tus servicios externos para exportar y automatizar procesos. 
        Solo necesitas configurarlo una vez.
      </Typography>

      <Grid container spacing={2}>
        {servicios.map((service) => (
          <Grid item xs={12} md={6} key={service.name}>
            <Paper sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                {service.icon}
                <Box>
                  <Typography variant="h6">{service.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {service.description}
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                color="primary"
                href={service.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Conectar
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}