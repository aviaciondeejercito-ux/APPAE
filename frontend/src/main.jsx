import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Asegúrate de que esta línea esté para cargar los estilos

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// DESACTIVAMOS TEMPORALMENTE EL SERVICE WORKER PARA LIMPIAR EL ERROR
/* if ('serviceWorker' in navigator) {
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
*/

// ESTO FUERZA A QUE EL NAVEGADOR ELIMINE CUALQUIER SERVICE WORKER ROTO
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
        }
    });
}