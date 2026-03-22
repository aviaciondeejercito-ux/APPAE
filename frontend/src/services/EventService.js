import API from './api';

/**
 * SERVICIO DE EVENTOS - SISTEMA GESTIÓN AE
 * Interfaz de comunicación de alto nivel para el Calendario Operativo y Mapa Táctico.
 * Garantiza que los datos de Tripulación, Carga y Combustible se procesen correctamente.
 */

// --- 1. NUEVA FUNCIÓN: Obtener operaciones para el Mapa Táctico (BOSS/ADMIN) ---
// Conecta con la ruta router.get('/active-map', ...) del backend
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
// Se usa en el selector de medios del formulario de Vuelo Táctico
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

// Obtener todos los eventos filtrados por la jerarquía del usuario logueado
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

// Crear un nuevo evento (CALENDARIO o DESPACHO TÁCTICO)
export const createEvent = async (eventData) => {
    try {
        const payload = {
            ...eventData,
            // Normalización de fechas para estándar ISO
            start: eventData.start ? new Date(eventData.start).toISOString() : new Date().toISOString(),
            end: eventData.end ? new Date(eventData.end).toISOString() : new Date().toISOString(),
            
            // --- CAMPOS CRÍTICOS PARA EL MAPA ---
            isRealTime: eventData.isRealTime || false,
            // Aseguramos que lat/lng sean números para evitar fallos en Leaflet
            ubicacion: {
                nombre: eventData.ubicacion?.nombre || 'Posición No Definida',
                lat: parseFloat(eventData.ubicacion?.lat) || 0,
                lng: parseFloat(eventData.ubicacion?.lng) || 0
            },
            // Contiene info de Tripulación, Carga y Combustible
            notasMarginales: (eventData.notasMarginales || '').toUpperCase()
        };
        
        const response = await API.post('/events', payload);
        return response.data;
    } catch (error) {
        console.error("❌ Error al crear registro operativo:", 
            error.response?.data?.message || error.message);
        throw error;
    }
};

// Actualizar un evento (Actualización de posición o avance de etapa)
export const updateEvent = async (id, eventData) => {
    try {
        // Clonamos y limpiamos para evitar enviar basura técnica de MongoDB al backend
        const cleanData = { ...eventData };

        // Sanitización de coordenadas
        if (cleanData.ubicacion) {
            cleanData.ubicacion = {
                nombre: cleanData.ubicacion.nombre || 'Actualización de posición',
                lat: parseFloat(cleanData.ubicacion.lat) || 0,
                lng: parseFloat(cleanData.ubicacion.lng) || 0
            };
        }

        // Normalización de strings para estandarización militar
        if (cleanData.title) cleanData.title = cleanData.title.toUpperCase();
        if (cleanData.notasMarginales) cleanData.notasMarginales = cleanData.notasMarginales.toUpperCase();

        // Eliminación de campos protegidos
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

// Eliminar un evento (Solo nivel BOSS / ADMIN)
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
 * EXPORTACIÓN UNIFICADA (Default y Nominal)
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