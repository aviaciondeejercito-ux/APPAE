import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS
 * Estándar de Seguridad AE: Manejo dinámico de URL y Token JWT.
 */
const API = axios.create({
    // Prioriza la URL de Render configurada en el entorno. 
    // Asegúrate de que en Render VITE_API_URL sea https://appae.onrender.com/api
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * INTERCEPTOR DE SEGURIDAD
 * Asegura que el Token de identificación se adjunte a cada comando enviado al servidor.
 */
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Inyectamos el Bearer Token en las cabeceras de autorización
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
 * SERVICIOS DE EVENTOS (CALENDARIO OPERATIVO)
 */
export const getEvents = () => API.get('/events');
export const createEvent = (eventData) => API.post('/events', eventData);
export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE ADMINISTRACIÓN (GESTIÓN DE PERSONAL)
 * Estas rutas deben coincidir exactamente con backend/routes/admin.js
 */

// Obtener lista de personal (Para la tabla del Panel de Admin)
export const getUsers = () => API.get('/admin/users');

// Dar de baja definitiva a un usuario
export const deleteUser = (id) => API.delete(`/admin/users/${id}`);

// Actualizar rango/permisos (admin, boss, user)
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });

// Reset de clave de acceso desde el panel
export const resetPassword = (id, newPassword) => API.put(`/admin/users/${id}/password`, { newPassword });

export default API;