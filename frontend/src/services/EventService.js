import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación con soporte OFFLINE y Persistencia Local.
 * Mantiene la compatibilidad estricta con la estructura de la DIR AE.
 */

// --- FUNCIONES AUXILIARES PARA MODO OFFLINE ---

const getLocalData = (key) => JSON.parse(localStorage.getItem(key) || '[]');

const saveLocalData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// Agrega una operación a la cola de sincronización cuando no hay internet
const addToSyncQueue = (method, url, payload) => {
    const queue = getLocalData('pending_sync');
    queue.push({ method, url, payload, timestamp: Date.now() });
    saveLocalData('pending_sync', queue);
};

// Sincroniza datos pendientes cuando vuelve la conexión
export const syncPendingData = async () => {
    const queue = getLocalData('pending_sync');
    if (queue.length === 0) return;

    console.log(`🔄 Sincronizando ${queue.length} operaciones pendientes...`);
    const remaining = [];

    for (const item of queue) {
        try {
            if (item.method === 'POST') await API.post(item.url, item.payload);
            if (item.method === 'PUT') await API.put(item.url, item.payload);
        } catch (error) {
            console.error("❌ Fallo de sincronización para un item, se mantiene en cola.");
            remaining.push(item);
        }
    }
    saveLocalData('pending_sync', remaining);
};

// --- 1. OBTENER OPERACIONES PARA MAPA TÁCTICO ---
export const getActiveOperations = async () => {
    try {
        const response = await API.get('/events/active-map');
        const data = Array.isArray(response.data) ? response.data : [];
        saveLocalData('cached_active_map', data); // Backup local
        return data;
    } catch (error) {
        console.warn("⚠️ Usando datos locales para Mapa Táctico.");
        return getLocalData('cached_active_map');
    }
};

// --- 2. OBTENER AERONAVES E/S POR UNIDAD ---
export const getAvailableAircraft = async (elemento) => {
    try {
        const encodedElemento = encodeURIComponent(elemento || 'all');
        const response = await API.get(`/aircraft/${encodedElemento}`);
        saveLocalData(`cached_aircraft_${elemento}`, response.data);
        return response.data;
    } catch (error) {
        console.warn(`⚠️ Usando datos locales de aeronaves para ${elemento}`);
        return getLocalData(`cached_aircraft_${elemento}`);
    }
};

// --- 3. FUNCIONES DE CALENDARIO OPERATIVO ---

export const getEvents = async () => {
    try {
        const response = await API.get('/events');
        const data = Array.isArray(response.data) ? response.data : [];
        saveLocalData('cached_events', data); // Backup para offline
        return data;
    } catch (error) {
        console.error("❌ Error al obtener eventos. Cargando caché local.");
        return getLocalData('cached_events');
    }
};

// Crear un nuevo registro (Soporta Offline)
export const createEvent = async (eventData) => {
    const payload = {
        ...eventData,
        start: eventData.start || null,
        end: eventData.end || null,
        isRealTime: eventData.isRealTime || false,
        
        misionDetalle: {
            comandante: eventData.misionDetalle?.comandante || eventData.comandante || "S/D",
            copiloto: eventData.misionDetalle?.copiloto || eventData.copiloto || "S/D",
            mecanico: eventData.misionDetalle?.mecanico || eventData.mecanico || "S/D",
            pax: eventData.misionDetalle?.pax || eventData.pax || "0",
            carga: eventData.misionDetalle?.carga || eventData.carga || "0",
            aeronave: (eventData.misionDetalle?.aeronave || eventData.aeronave || "S/D").toUpperCase(),
            matricula: (eventData.misionDetalle?.matricula || eventData.matricula || "S/M").toUpperCase(),
            tipoIcono: eventData.misionDetalle?.tipoIcono || eventData.tipoIcono || "ala_rotativa",
            isRealTime: eventData.isRealTime || false,
            lat: parseFloat(eventData.lat || eventData.ubicacion?.lat || -34.61315),
            lng: parseFloat(eventData.lng || eventData.ubicacion?.lng || -58.37723)
        },

        ubicacion: {
            nombre: (eventData.ubicacion?.nombre || 'POSICIÓN TÁCTICA').toUpperCase(),
            salida: {
                nombre: (eventData.ubicacion?.salida?.nombre || 'ORIGEN').toUpperCase(),
                lat: parseFloat(eventData.ubicacion?.salida?.lat || eventData.lat || -34.61315),
                lng: parseFloat(eventData.ubicacion?.salida?.lng || eventData.lng || -58.37723)
            },
            llegada: {
                nombre: (eventData.ubicacion?.llegada?.nombre || 'DESTINO').toUpperCase(),
                lat: parseFloat(eventData.ubicacion?.llegada?.lat || eventData.lat || -34.61315),
                lng: parseFloat(eventData.ubicacion?.llegada?.lng || eventData.lng || -58.37723)
            },
            lat: parseFloat(eventData.lat || eventData.ubicacion?.lat || -34.61315),
            lng: parseFloat(eventData.lng || eventData.ubicacion?.lng || -58.37723)
        },
        notasMarginales: (eventData.notasMarginales || eventData.notes || '').toUpperCase()
    };
    
    if (!payload.start) delete payload.start;
    if (!payload.end) delete payload.end;

    try {
        const response = await API.post('/events', payload);
        return response.data;
    } catch (error) {
        if (!navigator.onLine || error.message === 'Network Error') {
            addToSyncQueue('POST', '/events', payload);
            return { ...payload, _id: `temp-${Date.now()}`, offline: true };
        }
        throw error;
    }
};

// Actualizar un evento (Soporta Offline)
export const updateEvent = async (id, eventData) => {
    try {
        const cleanData = JSON.parse(JSON.stringify(eventData));

        if (cleanData.ubicacion) {
            cleanData.ubicacion = {
                nombre: (cleanData.ubicacion.nombre || 'ACTUALIZACIÓN DE POSICIÓN').toUpperCase(),
                salida: {
                    nombre: (cleanData.ubicacion.salida?.nombre || 'ORIGEN').toUpperCase(),
                    lat: parseFloat(cleanData.ubicacion.salida?.lat ?? cleanData.lat),
                    lng: parseFloat(cleanData.ubicacion.salida?.lng ?? cleanData.lng)
                },
                llegada: {
                    nombre: (cleanData.ubicacion.llegada?.nombre || 'DESTINO').toUpperCase(),
                    lat: parseFloat(cleanData.ubicacion.llegada?.lat ?? cleanData.lat),
                    lng: parseFloat(cleanData.ubicacion.llegada?.lng ?? cleanData.lng)
                },
                lat: parseFloat(cleanData.lat || cleanData.ubicacion.lat),
                lng: parseFloat(cleanData.lng || cleanData.ubicacion.lng)
            };
        }

        if (cleanData.misionDetalle || cleanData.matricula || cleanData.aeronave) {
            cleanData.misionDetalle = {
                ...(cleanData.misionDetalle || {}),
                aeronave: (cleanData.aeronave || cleanData.misionDetalle?.aeronave || "").toUpperCase(),
                matricula: (cleanData.matricula || cleanData.misionDetalle?.matricula || "").toUpperCase(),
                tipoIcono: cleanData.tipoIcono || cleanData.misionDetalle?.tipoIcono || "ala_rotativa",
                lat: parseFloat(cleanData.lat || cleanData.ubicacion?.lat || cleanData.misionDetalle?.lat),
                lng: parseFloat(cleanData.lng || cleanData.ubicacion?.lng || cleanData.misionDetalle?.lng)
            };
        }

        if (cleanData.start) cleanData.start = eventData.start;
        if (cleanData.end) cleanData.end = eventData.end;
        if (cleanData.title) cleanData.title = cleanData.title.toUpperCase();
        if (cleanData.notasMarginales) cleanData.notasMarginales = cleanData.notasMarginales.toUpperCase();

        const forbidden = ['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'userName'];
        forbidden.forEach(field => delete cleanData[field]);

        try {
            const response = await API.put(`/events/${id}`, cleanData);
            return response.data;
        } catch (error) {
            if (!navigator.onLine || error.message === 'Network Error') {
                addToSyncQueue('PUT', `/events/${id}`, cleanData);
                return { ...cleanData, _id: id, offline: true };
            }
            throw error;
        }
    } catch (error) {
        throw error;
    }
};

export const deleteEvent = async (id) => {
    try {
        const response = await API.delete(`/events/${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

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
        throw error;
    }
};

export const getAstronomyData = async (lat, lng) => {
    try {
        const response = await API.get('/astronomy/data', { params: { lat, lng } });
        return response.data; 
    } catch (error) {
        throw error;
    }
};

const EventService = {
    getEvents,
    getActiveOperations, 
    getAvailableAircraft,
    createEvent,
    updateEvent,
    deleteEvent,
    getWeatherData,
    getAstronomyData,
    syncPendingData
};

export default EventService;