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
 * Si el servidor responde 401, limpia el acceso para proteger los datos operativos.
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.clear(); // Limpieza total de seguridad
            window.location.href = '/login';
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

export const createEvent = (eventData) => {
    const userElemento = localStorage.getItem('elemento');
    const dataNormalized = {
        ...eventData,
        title: eventData.title?.trim(),
        elemento: eventData.elemento || userElemento,
        esGlobal: eventData.esGlobal || false,
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.post('/events', dataNormalized);
};

export const updateEvent = (id, eventData) => {
    const dataNormalized = {
        ...eventData,
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.put(`/events/${id}`, dataNormalized);
};

export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 * Sincronizado con el modelo de MongoDB actualizado.
 */

export const getAircrafts = () => {
    const role = localStorage.getItem('role')?.toLowerCase();
    const userElemento = localStorage.getItem('elemento')?.trim();

    // Si es un usuario de unidad, pedimos filtrado por query param para optimizar
    if (role !== 'admin' && role !== 'boss' && userElemento) {
        return API.get(`/aircraft`, { params: { unidad: userElemento } });
    }
    return API.get('/aircraft');
};

export const createAircraft = (aircraftData) => {
    const userRole = localStorage.getItem('role')?.toLowerCase();
    const userElemento = localStorage.getItem('elemento')?.trim();
    const userName = localStorage.getItem('username') || 'Usuario';

    const dataNormalized = {
        ...aircraftData,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim(),
        // Forzamos la unidad del usuario si no es jerárquico
        unidad: (userRole !== 'admin' && userRole !== 'boss') 
                ? userElemento 
                : (aircraftData.unidad?.trim() || userElemento),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0,
        novedades: aircraftData.novedades || "", // Cambio de 'notas' a 'novedades'
        creadoPor: userName
    };

    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const userName = localStorage.getItem('username') || 'Usuario';
    
    // Normalización crítica para el PUT
    const dataNormalized = {
        ...aircraftData,
        // Convertimos a número si el campo existe para evitar errores de validación
        horasRemanentes: aircraftData.horasRemanentes !== undefined 
            ? Number(aircraftData.horasRemanentes) 
            : undefined,
        // Aseguramos que novedades viaje con el nombre correcto
        novedades: aircraftData.novedades !== undefined 
            ? aircraftData.novedades 
            : aircraftData.notas, // Fallback por si acaso
        actualizadoPor: userName,
        fechaActualizacion: new Date()
    };

    // Eliminamos el campo 'notas' si existe para no confundir al backend
    delete dataNormalized.notas;

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