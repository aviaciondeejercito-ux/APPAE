import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const API = axios.create({
    baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').trim().replace(/\/$/, ""),
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 
});

/**
 * INTERCEPTOR DE SEGURIDAD JWT (Peticiones)
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
 * INTERCEPTOR DE RESPUESTA
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("⚠️ SESIÓN EXPIRADA - REDIRIGIENDO A LOGIN");
            localStorage.clear(); 
            window.location.href = '/login';
        }
        if (!error.response) {
            console.error("❌ ERROR DE RED: Servidor AE inalcanzable en " + API.defaults.baseURL);
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
 * SERVICIOS DE EVENTOS Y OPERACIONES (MAPA TÁCTICO)
 */
export const getEvents = () => API.get('/events');

export const getActiveOperations = async () => {
    try {
        const res = await API.get('/events');
        return res.data.filter(e => e.isRealTime && e.ubicacion?.lat != null);
    } catch (error) {
        console.error("❌ Fallo al recuperar operaciones activas");
        return [];
    }
};

export const createEvent = (eventData) => {
    const userElemento = localStorage.getItem('elemento');
    const dataNormalized = {
        ...eventData,
        title: eventData.title?.trim(),
        elemento: eventData.elemento || userElemento,
        esGlobal: eventData.esGlobal || false,
        tipoIcono: eventData.tipoIcono || 'ala_rotativa', 
        notasMarginales: eventData.notasMarginales || "",
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
            : (aircraftData.notas || ""), 
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

/**
 * SERVICIOS DE METEOROLOGÍA OPERATIVA (METAR/TAF)
 */
export const getWeatherData = async (icao) => {
    try {
        const response = await API.get('/weather/data', { params: { ids: icao } });
        return {
            data: {
                raw: response.data.raw || "SIN DATOS METAR",
                taf: response.data.taf || "TAF NO DISPONIBLE"
            }
        };
    } catch (error) {
        console.error(`❌ Error en conexión meteorológica local para ${icao}:`, error);
        throw error;
    }
};

/**
 * SERVICIOS DE ASTRONOMÍA TÁCTICA
 * Cálculo de Fase Lunar y Efemérides (Salida/Puesta Sol y Luna).
 */
export const getAstronomyData = async (lat, lng) => {
    try {
        const response = await API.get('/astronomy/data', { params: { lat, lng } });
        return response.data;
    } catch (error) {
        console.error("❌ Error al recuperar datos astronómicos operativos:", error);
        throw error;
    }
};

// Objeto de servicio para exportación única
const EventService = {
    getEvents,
    getActiveOperations,
    createEvent,
    updateEvent,
    deleteEvent,
    getWeatherData,
    getAstronomyData
};

export { EventService };
export default API;