import React from 'react';

/**
 * COMPONENTE DE ESTADÍSTICAS - AVIACIÓN DE EJÉRCITO
 * Muestra el Reporte Operativo 2026 integrado desde Looker Studio.
 */
const Estadisticas = () => {
  // URL de inserción proporcionada
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
    height: 'calc(100vh - 60px)', // Ajusta el 60px según el alto de tu barra de navegación
    overflow: 'hidden',
    backgroundColor: '#ffffff'
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none'
  }
};

export default Estadisticas;