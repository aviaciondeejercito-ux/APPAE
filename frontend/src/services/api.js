import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const getBaseURL = () => {
    let url = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim().replace(/\/$/, "");
    if (!url.endsWith('/api')) {
        return `${url}/api`;
    }
    return url;
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
 * ==========================================
 * SERVICIOS DE PERSONAL (TRIPULANTES) - AGREGADO PARA FIX 404
 * ==========================================
 */
export const getTripulantes = () => API.get('/tripulantes');
export const getTripulanteById = (id) => API.get(`/tripulantes/${id}`);
export const createTripulante = (data) => API.post('/tripulantes', data);
export const updateTripulante = (id, data) => API.put(`/tripulantes/${id}`, data);
export const deleteTripulante = (id) => API.delete(`/tripulantes/${id}`);

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
    
    // Normalización de Coordenadas de Origen
    const latOri = eventData.origen?.lat !== undefined ? Number(eventData.origen.lat) : 0;
    const lngOri = eventData.origen?.lng !== undefined ? Number(eventData.origen.lng) : 0;

    // Normalización de Coordenadas de Destino
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
        horasRemanentes: aircraftData.horasRemanentes !== undefined 
            ? Number(aircraftData.horasRemanentes) 
            : undefined,
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

/**
 * SERVICIOS DE LÓGICA DE NEGOCIO (SINCRO JOKER - ESTÁNDAR DE SEGURIDAD)
 */
export const getJackpotStatus = () => API.get('/casino/jackpot');

export const processBet = async (betData) => {
    const dataNormalized = {
        ...betData,
        amount: Number(betData.amount),
        timestamp: new Date(),
        jackpotContribution: Number(betData.amount) * 0.01
    };
    return API.post('/casino/bet', dataNormalized);
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
    getWeatherData,
    getAstronomyData,
    getJackpotStatus,
    processBet
};

export { EventService };
export default API;