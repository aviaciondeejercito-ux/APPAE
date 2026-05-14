import React from 'react';

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
    /**
     * EXPLICACIÓN:
     * 100vh es el alto total de la pantalla.
     * Al restar la altura de la Navbar (ej: 64px), el contenedor mide EXACTAMENTE
     * lo que sobra de pantalla hacia abajo. No tapa nada y no sobra nada.
     */
    height: 'calc(100vh - 64px)', 
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column'
  },
  iframe: {
    width: '100%',
    // Con flex: 1, el iframe se estira para ocupar TODO el espacio 
    // que el contenedor (container) le da, sin salirse de él.
    flex: 1,
    border: 'none',
    display: 'block'
  }
};

export default Estadisticas;