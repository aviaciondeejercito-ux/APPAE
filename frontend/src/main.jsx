import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Eliminamos el import de index.css porque está fallando en el Build
// y estamos usando estilos inline (Sincro Joker).

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// LIMPIEZA AUTOMÁTICA DE SERVICE WORKERS ROTOS
// Esto ayuda a solucionar el error de "Not Found" en tu navegador
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for(let registration of registrations) {
            registration.unregister();
            console.log('SW Unregistered para limpieza');
        }
    });
}