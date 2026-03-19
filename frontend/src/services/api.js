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
 * Optimizado para Sincronización Doble Capa (Unidad / DIR AE)
 */

// Obtener eventos con filtrado por Jerarquía
export const getEvents = () => {
    const role = localStorage.getItem('role');
    const elemento = localStorage.getItem('elemento');
    
    // Enviamos parámetros para que el backend aplique la Visión Total o Segmentada
    return API.get('/events', { 
        params: { role, elemento } 
    });
};

// Crear evento con metadatos de segmentación
export const createEvent = (eventData) => {
    const role = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento');

    const dataNormalized = {
        ...eventData,
        // Si el usuario es DIR AE/Admin, el evento puede ser global o de comando
        // Estos campos son procesados por el controlador que modificamos previamente
        elemento: eventData.elemento || userElemento,
        esGlobal: eventData.esGlobal || false
    };

    return API.post('/events', dataNormalized);
};

export const updateEvent = (id, eventData) => API.put(`/events/${id}`, eventData);
export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 */

// Obtener aeronaves con filtrado preventivo por unidad
export const getAircrafts = () => {
    const role = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento')?.trim();

    if (role !== 'admin' && role !== 'boss' && userElemento) {
        return API.get(`/aircraft`, { params: { unidad: userElemento } });
    }
    
    return API.get('/aircraft');
};

// Crear nueva aeronave con Inyección de Seguridad
export const createAircraft = (aircraftData) => {
    const userRole = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento')?.trim();

    const dataNormalized = {
        ...aircraftData,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim(),
        unidad: (userRole !== 'admin' && userRole !== 'boss') 
                ? userElemento 
                : (aircraftData.unidad?.toUpperCase().trim() || userElemento),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0
    };

    if (!dataNormalized.matricula || !dataNormalized.sda || !dataNormalized.unidad) {
        return Promise.reject({ 
            response: { data: { message: "Error AE: Datos de unidad incompletos para el alta." } } 
        });
    }

    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const dataNormalized = {
        ...aircraftData,
        horasRemanentes: aircraftData.horasRemanentes !== undefined ? Number(aircraftData.horasRemanentes) : undefined,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim()
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