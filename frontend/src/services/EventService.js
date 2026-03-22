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
        return response.data;
    } catch (error) {
        console.error("❌ Error al obtener operaciones en desarrollo:", 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// --- 2. NUEVA FUNCIÓN: Obtener aeronaves E/S por unidad ---
export const getAvailableAircraft = async (elemento) => {
    try {
        const encodedElemento = encodeURIComponent(elemento);
        const response = await API.get(`/events/aircraft/${encodedElemento}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al obtener aeronaves para ${elemento}:`, 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// --- 3. FUNCIONES DE CALENDARIO OPERATIVO ---

// Obtener todos los eventos filtrados (El calendario solo mostrará los que tengan start/end válidos)
export const getEvents = async () => {
    try {
        const response = await API.get('/events');
        return response.data;
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
            // LOGICA DE INDEPENDENCIA: 
            // Si el evento no trae fecha (vuelo táctico puro), NO creamos fechas ISO automáticas
            // para que el calendario no lo "enganche" en su visualización.
            start: eventData.start ? new Date(eventData.start).toISOString() : null,
            end: eventData.end ? new Date(eventData.end).toISOString() : null,
            
            // --- CAMPOS CRÍTICOS PARA EL MAPA ---
            isRealTime: eventData.isRealTime || false,
            ubicacion: {
                nombre: eventData.ubicacion?.nombre || 'Posición No Definida',
                lat: parseFloat(eventData.ubicacion?.lat) || 0,
                lng: parseFloat(eventData.ubicacion?.lng) || 0
            },
            notasMarginales: (eventData.notasMarginales || '').toUpperCase()
        };
        
        // Limpiamos el payload de fechas nulas si es un vuelo táctico
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
        const cleanData = { ...eventData };

        // Sanitización de coordenadas para el radar
        if (cleanData.ubicacion) {
            cleanData.ubicacion = {
                nombre: cleanData.ubicacion.nombre || 'Actualización de posición',
                lat: parseFloat(cleanData.ubicacion.lat) || 0,
                lng: parseFloat(cleanData.ubicacion.lng) || 0
            };
        }

        // Normalización militar
        if (cleanData.title) cleanData.title = cleanData.title.toUpperCase();
        if (cleanData.notasMarginales) cleanData.notasMarginales = cleanData.notasMarginales.toUpperCase();

        // Limpieza de metadatos de MongoDB
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

// Eliminar un evento
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

/**
 * EXPORTACIÓN UNIFICADA
 */
const EventService = {
    getEvents,
    getActiveOperations, 
    getAvailableAircraft,
    createEvent,
    updateEvent,
    deleteEvent
};

export default EventService;