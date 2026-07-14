import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const getBaseURL = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
        let url = envUrl.trim().replace(/\/$/, "");
        return url.endsWith('/api') ? url : `${url}/api`;
    }
    
    const isProduction = window.location.hostname !== 'localhost';
    return isProduction 
        ? 'https://aviaciondeejercito-ux.onrender.com/api' 
        : 'http://localhost:5000/api';
};

const API = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json'
    },
    timeout: 15000 
});

/**
 * INTERCEPTOR DE SEGURIDAD JWT (Peticiones)
 * Añade automáticamente el token de sesión a cada consulta al servidor.
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
 * INTERCEPTOR DE RESPUESTA (Manejo unificado de errores de red y sesión)
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                console.warn("⚠️ SESIÓN EXPIRADA - REDIRIGIENDO A LOGIN");
                localStorage.clear();
                window.location.href = '/login';
            } else if (error.response.status === 403) {
                console.error("🛑 ACCESO DENEGADO (403): Verifica los permisos de tu usuario.");
            }
        } else {
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
 * SERVICIOS DE PERSONAL (TRIPULANTES)
 */
export const getTripulantes = () => API.get('/tripulantes');
export const getTripulanteById = (id) => API.get(`/tripulantes/${id}`);
export const createTripulante = (data) => API.post('/tripulantes', data);
export const updateTripulante = (id, data) => API.put(`/tripulantes/${id}`, data);
export const deleteTripulante = (id) => API.delete(`/tripulantes/${id}`);

/**
 * NUEVO SERVICIO MÓDULO EBM - PLANIFICACIÓN AUTOMÁTICA
 */
export const getPlanificacionEbm = () => API.get('/ebm');
export const actualizarConfiguracionEbm = (id, payload) => API.put(`/ebm/${id}`, payload);

/**
 * NUEVO SUBMÓDULO: ALERTAS PREVENTIVAS DE UNIDAD
 */
export const getAlertasDashboard = () => API.get('/alerts/dashboard');

/**
 * SERVICIOS DE GESTIÓN DE VUELOS (LIBRETA DE VUELO DIGITAL)
 */
export const getVuelos = (params = {}) => API.get('/vuelos', { params });

export const registrarVuelo = (vueloData) => {
    const dataNormalized = {
        ...vueloData,
        matricula: vueloData.matricula?.toUpperCase().trim(),
        desde: vueloData.desde?.toUpperCase().trim(),
        hasta: vueloData.hasta?.toUpperCase().trim(),
        tipoMision: vueloData.tipoMision?.trim(),
        elementoApoyado: (vueloData.elementoApoyado || "").toUpperCase().trim(),
        horasVoladas: Number(vueloData.horasVoladas) || 0,
        instructor: vueloData.instructor || null,
        piloto: vueloData.piloto || null,
        copiloto: vueloData.copiloto || null,
        mecanico: vueloData.mecanico || null
    };
    return API.post('/vuelos', dataNormalized);
};

export const deleteVuelo = (id) => API.delete(`/vuelos/${id}`);

/**
 * SERVICIOS DE EVENTOS Y OPERACIONES (MAPA TÁCTICO)
 */
export const getEvents = () => API.get('/events');

export const getActiveOperations = async () => {
    try {
        const res = await API.get('/events/active-map');
        return res.data; 
    } catch (error) {
        console.error("❌ Fallo al recuperar operaciones activas del radar");
        return [];
    }
};

export const createEvent = (eventData) => {
    const userElemento = localStorage.getItem('elemento');
    
    const latOri = eventData.origen?.lat !== undefined ? Number(eventData.origen.lat) : 0;
    const lngOri = eventData.origen?.lng !== undefined ? Number(eventData.origen.lng) : 0;
    const latDes = eventData.destino?.lat !== undefined ? Number(eventData.destino.lat) : 0;
    const lngDes = eventData.destino?.lng !== undefined ? Number(eventData.destino.lng) : 0;

    const dataNormalized = {
        ...eventData,
        title: eventData.title?.toUpperCase().trim(),
        notes: eventData.notes?.toUpperCase().trim() || "",
        elemento: (eventData.elemento || userElemento)?.toUpperCase(),
        esGlobal: eventData.esGlobal || false,
        isRealTime: eventData.isRealTime || false,
        tipoIcono: eventData.tipoIcono || 'ala_rotativa', 
        aeronave: eventData.aeronave?.toUpperCase().trim() || "",
        matricula: eventData.matricula?.toUpperCase().trim() || "",
        status: eventData.status || 'programado',
        notasMarginales: (eventData.notasMarginales || "").toUpperCase().trim(),
        
        lat: latOri,
        lng: lngOri,
        
        origen: {
            nombre: (eventData.origen?.nombre || "ORIGEN PENDIENTE").toUpperCase(),
            lat: latOri,
            lng: lngOri
        },
        destino: {
            nombre: (eventData.destino?.nombre || "DESTINO PENDIENTE").toUpperCase(),
            lat: latDes,
            lng: lngDes
        },
        ubicacion: {
            nombre: (eventData.origen?.nombre || "POSICIÓN TÁCTICA").toUpperCase(),
            lat: latOri,
            lng: lngOri
        },
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.post('/events', dataNormalized);
};

export const updateEvent = (id, eventData) => {
    const latOri = eventData.origen?.lat !== undefined ? Number(eventData.origen.lat) : undefined;
    const lngOri = eventData.origen?.lng !== undefined ? Number(eventData.origen.lng) : undefined;
    const latDes = eventData.destino?.lat !== undefined ? Number(eventData.destino.lat) : undefined;
    const lngDes = eventData.destino?.lng !== undefined ? Number(eventData.destino.lng) : undefined;

    const dataNormalized = {
        ...eventData,
        title: eventData.title?.toUpperCase().trim(),
        notes: eventData.notes?.toUpperCase().trim(),
        aeronave: eventData.aeronave?.toUpperCase().trim(),
        matricula: eventData.matricula?.toUpperCase().trim(),
        notasMarginales: (eventData.notasMarginales || "").toUpperCase().trim(),
        
        lat: latOri,
        lng: lngOri,
        origen: latOri !== undefined ? {
            nombre: (eventData.origen?.nombre || "").toUpperCase(),
            lat: latOri,
            lng: lngOri
        } : undefined,
        destino: latDes !== undefined ? {
            nombre: (eventData.destino?.nombre || "").toUpperCase(),
            lat: latDes,
            lng: lngDes
        } : undefined,
        ubicacion: latOri !== undefined ? {
            nombre: (eventData.origen?.nombre || "").toUpperCase(),
            lat: latOri,
            lng: lngOri
        } : undefined,
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.put(`/events/${id}`, dataNormalized);
};

export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 */
export const getAircrafts = () => {
    const role = localStorage.getItem('role')?.toUpperCase().trim().replace(/\s+/g, '_') || '';
    const userElemento = localStorage.getItem('elemento')?.trim();
    const hasGlobalView = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(role);

    if (!hasGlobalView && userElemento) {
        return API.get(`/aircraft`, { params: { unidad: userElemento.toUpperCase() } });
    }
    return API.get('/aircraft');
};

export const createAircraft = (aircraftData) => {
    const rawRole = localStorage.getItem('role')?.toUpperCase().trim().replace(/\s+/g, '_') || '';
    const userElemento = localStorage.getItem('elemento')?.trim();
    const userName = localStorage.getItem('username') || 'Usuario';
    const isMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO', 'OTOAE'].includes(rawRole);

    const dataNormalized = {
        ...aircraftData, 
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim(),
        unidad: (isMandoEstrategico) 
                ? (aircraftData.unidad?.trim().toUpperCase() || userElemento?.toUpperCase()) 
                : userElemento?.toUpperCase(),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0,
        novedades: (aircraftData.novedades || "").toUpperCase().trim(),
        creadoPor: userName
    };
    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const userName = localStorage.getItem('username') || 'Usuario';
    const dataNormalized = {
        ...aircraftData,
        horasRemanentes: aircraftData.horasRemanentes !== undefined ? Number(aircraftData.horasRemanentes) : undefined,
        novedades: aircraftData.novedades !== undefined 
            ? String(aircraftData.novedades).toUpperCase().trim() 
            : (aircraftData.notas ? String(aircraftData.notas).toUpperCase().trim() : ""), 
        actualizadoPor: userName,
        fechaActualizacion: new Date()
    };
    delete dataNormalized.notas;
    return API.put(`/aircraft/${id}`, dataNormalized);
};

export const deleteAircraft = (id) => API.delete(`/aircraft/${id}`);

/**
 * 🌟 SERVICIOS EXCLUSIVOS MÓDULO F-13 (REGISTRO HISTÓRICO DE AERONAVES)
 */
export const getF13s = () => API.get('/f13');
export const registrarF13 = (payload) => API.post('/f13/nuevo', payload);
export const deleteF13 = (id) => API.delete(`/f13/eliminar/${id}`);

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
        const response = await API.get(`/weather/${icao}`);
        return response;
    } catch (error) {
        console.error(`❌ Error en conexión meteorológica local para ${icao}:`, error);
        throw error;
    }
};

/**
 * SERVICIOS DE ASTRONOMÍA TÁCTICA
 */
export const getAstronomyData = async (lat, lng) => {
    try {
        const params = lat && lng ? { params: { lat, lng } } : {};
        const response = await API.get('/astronomy', params);
        return response.data;
    } catch (error) {
        console.error("❌ Error al recuperar datos astronómicos operativos:", error);
        throw error;
    }
};

const EventService = {
    getEvents,
    getActiveOperations,
    createEvent,
    updateEvent,
    deleteEvent,
    getTripulantes,
    getTripulanteById,
    createTripulante,
    updateTripulante,
    deleteTripulante,
    getPlanificacionEbm,
    getAlertasDashboard,
    getWeatherData,
    getAstronomyData,
    getVuelos,
    registrarVuelo,
    deleteVuelo,
    getF13s,
    registrarF13,
    deleteF13
};

export { EventService };
export default API;