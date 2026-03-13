import axios from 'axios';

/**
 * Configuración de la instancia de Axios
 * * Seguridad y Crítica: Se utiliza la variable de entorno VITE_API_URL 
 * para el despliegue en Render. Si no existe, cae a localhost para desarrollo.
 */
const API = axios.create({
    // Prioriza la URL de Render (definida en el Dashboard de Render o .env)
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

// Interceptor para seguridad (Token JWT)
// Este bloque asegura que cada petición lleve la identidad del usuario una vez logueado.
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    }, 
    (error) => {
        return Promise.reject(error);
    }
);

export default API;