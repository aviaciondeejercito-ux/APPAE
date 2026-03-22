import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo y Mapa Táctico.
 * Garantiza que los datos de Tripulación, Carga y Combustible se procesen correctamente.
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

// Función para obtener todos los eventos de la base de datos
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

// Función para crear un nuevo evento (DESPACHO TÁCTICO)
export const createEvent = async (eventData) => {
    try {
        const payload = {
            ...eventData,
            // Normalización de fechas para estándar ISO
            start: eventData.start ? new Date(eventData.start).toISOString() : new Date().toISOString(),
            end: eventData.end ? new Date(eventData.end).toISOString() : new Date().toISOString(),
            
            // --- CAMPOS CRÍTICOS PARA EL MAPA ---
            isRealTime: eventData.isRealTime || false,
            // Si no hay coordenadas, inicializamos en 0 para evitar errores de renderizado
            ubicacion: {
                nombre: eventData.ubicacion?.nombre || 'Sin ubicación',
                lat: parseFloat(eventData.ubicacion?.lat) || 0,
                lng: parseFloat(eventData.ubicacion?.lng) || 0
            },
            // Aquí viaja la Tripulación, Carga y Combustible
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
         * Solo enviamos lo que el modelo de MongoDB espera.
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
            
            // --- ACTUALIZACIÓN DE DATOS TÁCTICOS ---
            isRealTime: eventData.isRealTime,
            ubicacion: {
                nombre: eventData.ubicacion?.nombre,
                lat: parseFloat(eventData.ubicacion?.lat),
                lng: parseFloat(eventData.ubicacion?.lng)
            },
            notasMarginales: eventData.notasMarginales
        };

        if (eventData.start) cleanData.start = new Date(eventData.start).toISOString();
        if (eventData.end) cleanData.end = new Date(eventData.end).toISOString();

        // Limpieza de metadatos de MongoDB para evitar errores de validación
        const protectedFields = ['_id', '__v', 'createdAt', 'updatedAt'];
        protectedFields.forEach(field => delete cleanData[field]);

        const response = await API.put(`/events/${id}`, cleanData);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.error(`❌ Error al actualizar el evento ${id}:`, errorMsg);
        throw error;
    }
};

// Función para eliminar un evento (Solo BOSS / ADMIN)
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