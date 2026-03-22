import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo.
 * Garantiza que los errores sean capturados y reportados correctamente.
 * Estándar de Seguridad: Limpieza de datos atómica antes del envío.
 */

// --- NUEVA FUNCIÓN: Obtener operaciones para el Mapa Táctico (BOSS/ADMIN) ---
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

// --- NUEVA FUNCIÓN: Obtener aeronaves E/S por unidad ---
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

// Función para obtener eventos de la base de datos
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

// Función para crear un nuevo evento
export const createEvent = async (eventData) => {
    try {
        const payload = {
            ...eventData,
            start: new Date(eventData.start).toISOString(),
            end: new Date(eventData.end).toISOString(),
            // Aseguramos estructura de ubicación si existe
            isRealTime: eventData.isRealTime || false,
            ubicacion: eventData.ubicacion || { nombre: '', lat: 0, lng: 0 },
            notasMarginales: eventData.notasMarginales || ''
        };
        
        const response = await API.post('/events', payload);
        return response.data;
    } catch (error) {
        console.error("❌ Error al crear evento:", 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// Función para actualizar un evento existente
export const updateEvent = async (id, eventData) => {
    try {
        /**
         * SEGURIDAD Y LIMPIEZA PROFUNDA:
         * Se extraen solo las propiedades necesarias para el modelo Event.
         */
        const cleanData = {
            title: eventData.title,
            notes: eventData.notes,
            color: eventData.color,
            elemento: eventData.elemento,
            etapa: eventData.etapa,
            tipoApoyo: eventData.tipoApoyo,
            esGlobal: eventData.esGlobal,
            status: eventData.status,
            sdaListado: Array.isArray(eventData.sdaListado) ? eventData.sdaListado : [],
            // NUEVOS CAMPOS TÁCTICOS
            isRealTime: eventData.isRealTime,
            ubicacion: eventData.ubicacion,
            notasMarginales: eventData.notasMarginales
        };

        if (eventData.start) cleanData.start = new Date(eventData.start).toISOString();
        if (eventData.end) cleanData.end = new Date(eventData.end).toISOString();

        // Eliminación de campos protegidos
        delete cleanData._id;
        delete cleanData.__v;
        delete cleanData.createdAt;
        delete cleanData.updatedAt;

        const response = await API.put(`/events/${id}`, cleanData);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        const details = error.response?.data?.details || ""; 
        
        console.error(`❌ Error al actualizar el evento ${id}:`, errorMsg, details);
        throw error;
    }
};

// Función para eliminar un evento (Solo nivel BOSS / ADMIN)
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
    getActiveOperations, // Agregado para el Mapa Táctico
    getAvailableAircraft,
    createEvent,
    updateEvent,
    deleteEvent
};

export default EventService;