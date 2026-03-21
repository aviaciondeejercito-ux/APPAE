import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo.
 * Garantiza que los errores sean capturados y reportados correctamente.
 * Estándar de Seguridad: Limpieza de datos atómica antes del envío.
 */

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
        // Aseguramos que las fechas sean objetos Date o strings ISO válidos
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

// Función para actualizar un evento existente (Indispensable para el flujo de aprobación)
export const updateEvent = async (id, eventData) => {
    try {
        /**
         * SEGURIDAD Y LIMPIEZA:
         * Eliminamos campos que MongoDB no permite actualizar o que causan Error 400.
         */
        const cleanData = { ...eventData };
        
        delete cleanData._id;   // Inmutable en MongoDB
        delete cleanData.__v;   // Versión del documento
        delete cleanData.createdAt; 
        delete cleanData.updatedAt;

        // Normalización de fechas para evitar rechazos del validador de Mongoose
        if (cleanData.start) cleanData.start = new Date(cleanData.start).toISOString();
        if (cleanData.end) cleanData.end = new Date(cleanData.end).toISOString();

        // Si sdaListado viene vacío o nulo, aseguramos que viaje como array vacío
        if (!cleanData.sdaListado) cleanData.sdaListado = [];

        const response = await API.put(`/events/${id}`, cleanData);
        return response.data;
    } catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        console.error(`❌ Error al actualizar el evento ${id}:`, errorMsg);
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
export default {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};