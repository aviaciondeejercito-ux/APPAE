import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const API = axios.create({
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
            localStorage.removeItem('role');
            localStorage.removeItem('elemento');
            localStorage.removeItem('username');
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
 */
export const getAircrafts = () => API.get('/aircraft');

// Crear nueva aeronave con Inyección de Seguridad
export const createAircraft = (aircraftData) => {
    // Obtenemos la unidad del localStorage para asegurar que no viaje vacía
    const userRole = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento');

    const dataNormalized = {
        ...aircraftData,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim(),
        // Si es S4, forzamos su unidad; si es Admin, usamos la que eligió en el formulario
        unidad: userRole === 'S4_UNIDAD' ? userElemento : aircraftData.unidad?.toUpperCase().trim(),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0
    };

    // Validación preventiva en Frontend para no saturar el Backend si faltan datos
    if (!dataNormalized.matricula || !dataNormalized.sda || !dataNormalized.unidad) {
        return Promise.reject({ 
            response: { data: { message: "Error Local: Faltan campos obligatorios (Matrícula, SdA o Unidad)" } } 
        });
    }

    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const dataNormalized = {
        ...aircraftData,
        horasRemanentes: aircraftData.horasRemanentes !== undefined ? Number(aircraftData.horasRemanentes) : undefined
    };
    return API.put(`/aircraft/${id}`, dataNormalized);
};

export const deleteAircraft = (id) => API.delete(`/aircraft/${id}`);

/**
 * SERVICIOS DE ADMINISTRACIÓN
 */
export const getUsers = () => API.get('/admin/users');
export const deleteUser = (id) => API.delete('/admin/users/' + id);
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const resetPassword = (id, newPassword) => API.put(`/admin/users/${id}/password`, { newPassword });

export default API;