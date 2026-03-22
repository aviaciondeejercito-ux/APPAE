import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const API = axios.create({
    // Prioriza el .env (Render) y usa localhost como respaldo
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
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.clear(); 
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
 * SERVICIOS DE EVENTOS (CALENDARIO Y MAPA TÁCTICO)
 * Aquí integramos las 'notasMarginales' para el Boss.
 */
export const getEvents = () => API.get('/events');

export const createEvent = (eventData) => {
    const userElemento = localStorage.getItem('elemento');
    const dataNormalized = {
        ...eventData,
        title: eventData.title?.trim(),
        elemento: eventData.elemento || userElemento,
        esGlobal: eventData.esGlobal || false,
        // Aseguramos que las notas marginales (Trip/Carga/Comb) viajen al backend
        notasMarginales: eventData.notasMarginales || "",
        // Mapeo de ubicación para el Mapa Leaflet
        ubicacion: eventData.ubicacion || { nombre: "", lat: null, lng: null },
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.post('/events', dataNormalized);
};

export const updateEvent = (id, eventData) => {
    const dataNormalized = {
        ...eventData,
        notasMarginales: eventData.notasMarginales || "",
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.put(`/events/${id}`, dataNormalized);
};

export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 */
export const getAircrafts = () => {
    const role = localStorage.getItem('role')?.toLowerCase();
    const userElemento = localStorage.getItem('elemento')?.trim();

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
        unidad: (userRole !== 'admin' && userRole !== 'boss') 
                ? userElemento 
                : (aircraftData.unidad?.trim() || userElemento),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0,
        novedades: aircraftData.novedades || "",
        creadoPor: userName
    };

    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const userName = localStorage.getItem('username') || 'Usuario';
    
    const dataNormalized = {
        ...aircraftData,
        horasRemanentes: aircraftData.horasRemanentes !== undefined 
            ? Number(aircraftData.horasRemanentes) 
            : undefined,
        novedades: aircraftData.novedades !== undefined 
            ? aircraftData.novedades 
            : aircraftData.notas, 
        actualizadoPor: userName,
        fechaActualizacion: new Date()
    };

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