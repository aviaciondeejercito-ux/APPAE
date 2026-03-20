import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo.
 * Garantiza que los errores sean capturados y reportados correctamente.
 */

// Función para obtener eventos de la base de datos
export const getEvents = async () => {
    try {
        // La segmentación por Unidad/Comando se maneja automáticamente vía Token en el Backend
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
        // eventData ya incluye sdaListado, etapa, etc.
        const response = await API.post('/events', eventData);
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
        const response = await API.put(`/events/${id}`, eventData);
        return response.data;
    } catch (error) {
        console.error(`❌ Error al actualizar el evento ${id}:`, 
            error.response?.data?.message || error.message);
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
 * Mantiene compatibilidad con importaciones destructuradas o por default.
 */
export default {
    getEvents,
    createEvent,
    updateEvent,
    deleteEvent
};