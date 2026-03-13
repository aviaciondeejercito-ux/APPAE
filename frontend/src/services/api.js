import axios from 'axios';

/**
 * Configuración de la instancia de Axios
 * Seguridad y Crítica: Se utiliza la variable de entorno VITE_API_URL 
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

/**
 * SERVICIOS DE AUTENTICACIÓN
 */
export const login = (credentials) => API.post('/auth/login', credentials);
export const register = (userData) => API.post('/auth/register', userData);

/**
 * SERVICIOS DE EVENTOS (CALENDARIO)
 */
export const getEvents = () => API.get('/events');
export const createEvent = (eventData) => API.post('/events', eventData);
export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE ADMINISTRACIÓN (Panel de Control AE)
 * Estas funciones permiten la gestión de personal y permisos.
 */

// Obtener lista completa de usuarios para el panel
export const getUsers = () => API.get('/admin/users');

// Baja de usuarios
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);

// Asignación y quita de permisos (Cambio de Rol: admin, boss, user)
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });

// Generación y reseteo de contraseñas desde el panel
export const resetPassword = (id, newPassword) => API.put(`/admin/users/${id}/password`, { newPassword });

export default API;