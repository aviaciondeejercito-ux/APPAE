import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo y Mapa Táctico.
 * Independencia garantizada: Los vuelos tácticos no aparecen en la agenda administrativa.
 */

// --- 1. NUEVA FUNCIÓN: Obtener operaciones para el Mapa Táctico (BOSS/ADMIN) ---
export const getActiveOperations = async () => {
    try {
        const response = await API.get('/events/active-map');
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("❌ Error al obtener operaciones en desarrollo:", 
            error.response?.data?.message || error.message);
        return [];
    }
};

// --- 2. NUEVA FUNCIÓN: Obtener aeronaves E/S por unidad ---
export const getAvailableAircraft = async (elemento) => {
    try {
        const encodedElemento = encodeURIComponent(elemento || 'all');
        const response = await API.get(`/events/aircraft/${encodedElemento}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener aeronaves para ${elemento}:`, 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// --- 3. FUNCIONES DE CALENDARIO OPERATIVO ---

export const getEvents = async () => {
    try {
        const response = await API.get('/events');
        return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error("❌ Error al obtener eventos del backend:", 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// Crear un nuevo registro (CALENDARIO o DESPACHO TÁCTICO)
export const createEvent = async (eventData) => {
    try {
        const payload = {
            ...eventData,
            start: eventData.start || null,
            end: eventData.end || null,
            isRealTime: eventData.isRealTime || false,
            
            // --- SINCRONIZACIÓN ESTRUCTURA MONGODB (misionDetalle) ---
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

        const response = await API.post('/events', payload);
        return response.data;
    } catch (error) {
        console.error("❌ Error al crear registro operativo:", 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// Actualizar un evento (Posición táctica o datos de calendario)
export const updateEvent = async (id, eventData) => {
    try {
        const cleanData = JSON.parse(JSON.stringify(eventData));

        // Sanitización estricta de coordenadas y misionDetalle para el radar
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

        // Asegurar consistencia en misionDetalle durante la actualización
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

        const response = await API.put(`/events/${id}`, cleanData);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.error(`❌ Error al actualizar el evento ${id}:`, errorMsg);
        throw error;
    }
};

export const deleteEvent = async (id) => {
    try {
        const response = await API.delete(`/events/${id}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al eliminar el evento ${id}:`, 
            error.response?.data?.message || error.message);
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
        console.error(`❌ Error en conexión meteorológica para ${icao}:`, error.message);
        throw error;
    }
};

export const getAstronomyData = async (lat, lng) => {
    try {
        const response = await API.get('/astronomy/data', { params: { lat, lng } });
        return response.data; 
    } catch (error) {
        console.error("❌ Error al recuperar datos astronómicos:", error.message);
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
    getAstronomyData
};

export default EventService;