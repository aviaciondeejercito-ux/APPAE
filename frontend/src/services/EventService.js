import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo.
 * Garantiza que los errores sean capturados y reportados correctamente.
 * Estándar de Seguridad: Limpieza de datos atómica antes del envío.
 */

// --- NUEVA FUNCIÓN: Obtener aeronaves E/S por unidad ---
export const getAvailableAircraft = async (elemento) => {
    try {
        // Codificamos el nombre del elemento para evitar problemas con espacios en la URL
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
        // Aseguramos que las fechas sean strings ISO válidos para el Backend
        const payload = {
            ...eventData,
            start: new Date(eventData.start).toISOString(),
            end: new Date(eventData.end).toISOString()
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
         * FullCalendar a veces envía objetos circulares o propiedades privadas (empezando con _)
         * que causan Error 400. Aquí extraemos solo lo que el modelo Event necesita.
         */
        const cleanData = {
            title: eventData.title,
            notes: eventData.notes,
            color: eventData.color,
            elemento: eventData.elemento,
            etapa: eventData.etapa,
            tipoApoyo: eventData.tipoApoyo,
            esGlobal: eventData.esGlobal,
            sdaListado: Array.isArray(eventData.sdaListado) ? eventData.sdaListado : []
        };

        // Normalización estricta de fechas a ISO String
        if (eventData.start) cleanData.start = new Date(eventData.start).toISOString();
        if (eventData.end) cleanData.end = new Date(eventData.end).toISOString();

        // Eliminación redundante por seguridad ante Mongoose
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
    getAvailableAircraft, // Agregado a la exportación
    createEvent,
    updateEvent,
    deleteEvent
};

export default EventService;