
  // En FixedValueInput.jsx
  import React from "react";
  import { TextField } from "@mui/material";

  export default function FixedValueInput({ value, onChange }) {
    
    const handleChange = (evento) => {
      const texto = evento.target.value; // 1. Extraemos el texto

      // ... tu lógica de regex (que está perfecta) ...
      const regex = /^-?\d*[.,]?\d*$/;
      if (texto === "" || regex.test(texto)) {
        onChange(texto); // 2. Llamamos a la función del padre (setFixedValue) con SOLO EL TEXTO
      }
    };

    return (
      <TextField
        label="Valor Fijo"
        type="text"
        value={value} // Muestra el valor del padre
        onChange={handleChange} // Llama a nuestra función inteligente
        inputProps={{ inputMode: "decimal" }}
      />
    );
  }
