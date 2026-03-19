import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const API = axios.create({
    // VITE_API_URL debe estar configurada en las variables de entorno de Render
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * INTERCEPTOR DE SEGURIDAD JWT
 * Adjunta automáticamente el token de sesión a cada petición.
 */
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * INTERCEPTOR DE RESPUESTA (MANEJO DE SESIÓN EXPIRADA)
 * Si el servidor responde 401, limpia el acceso para proteger los datos.
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('role');
            localStorage.removeItem('elemento');
            // Redirección opcional si falla la sesión
            // window.location.href = '/login';
        }
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
export const updateEvent = (id, eventData) => API.put(`/events/${id}`, eventData);
export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 * Rutas para la gestión de SdA, Matrículas y Horas Remanentes.
 */
// Obtener flota completa. El filtrado se realiza en el Frontend para mayor velocidad de carga.
export const getAircrafts = () => API.get('/aircraft');

// Crear nueva aeronave (Habilitado para S4_UNIDAD y Admin según lógica de Operaciones)
export const createAircraft = (aircraftData) => {
    // Normalizamos a mayúsculas antes de enviar para evitar errores de búsqueda
    const dataNormalized = {
        ...aircraftData,
        matricula: aircraftData.matricula?.toUpperCase(),
        sda: aircraftData.sda?.toUpperCase(),
        unidad: aircraftData.unidad?.toUpperCase()
    };
    return API.post('/aircraft', dataNormalized);
};

// Actualizar Estado, Horas o Novedades
export const updateAircraftStatus = (id, aircraftData) => API.put(`/aircraft/${id}`, aircraftData);

// Eliminar aeronave del registro (Solo Admin)
export const deleteAircraft = (id) => API.delete(`/aircraft/${id}`);

/**
 * SERVICIOS DE ADMINISTRACIÓN (GESTIÓN DE PERSONAL)
 */
export const getUsers = () => API.get('/admin/users');
export const deleteUser = (id) => API.delete('/admin/users/' + id);
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const resetPassword = (id, newPassword) => API.put(`/admin/users/${id}/password`, { newPassword });

export default API;