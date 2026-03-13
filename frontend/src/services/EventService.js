import API from './api';

// Función para obtener eventos de la base de datos
export const getEvents = async () => {
    try {
        const response = await API.get('/events');
        return response.data;
    } catch (error) {
        console.error("Error al obtener eventos del backend:", error);
        throw error;
    }
};

// Función para crear un nuevo evento
export const createEvent = async (eventData) => {
    try {
        const response = await API.post('/events', eventData);
        return response.data;
    } catch (error) {
        console.error("Error al crear evento:", error);
        throw error;
    }
};

export default {
    getEvents,
    createEvent
};