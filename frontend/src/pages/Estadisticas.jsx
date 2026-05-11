import React from 'react';

/**
 * COMPONENTE DE ESTADÍSTICAS - AVIACIÓN DE EJÉRCITO
 * Reporte Operativo 2026 - Versión Full Viewport
 */
const Estadisticas = () => {
  const lookerUrl = "https://lookerstudio.google.com/embed/reporting/c35094df-fd33-49de-945c-0858bea2e2bf/page/p_6t1dnppwzd";

  return (
    <div style={styles.container}>
      <iframe
        title="Reporte Operativo Aviación de Ejército 2026"
        src={lookerUrl}
        style={styles.iframe}
        frameBorder="0"
        allowFullScreen
        sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      ></iframe>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    // Usamos el 100% del contenedor padre que ya controlamos desde App.jsx
    height: '100%', 
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    display: 'flex'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    // Asegura que no haya scrollbars internos innecesarios
    display: 'block' 
  }
};

export default Estadisticas;