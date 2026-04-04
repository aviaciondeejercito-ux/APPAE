import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// REGISTRO DE SERVICE WORKER PARA PWA
// Esto permite que el navegador reconozca el sitio como una aplicación instalable
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('✅ PWA: Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.log('❌ PWA: Error al registrar el Service Worker:', error);
      });
  });
}