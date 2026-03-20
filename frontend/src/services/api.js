import axios from 'axios';

/**
 * CONFIGURACIÓN DE INSTANCIA AXIOS - ESTÁNDAR DE SEGURIDAD AE
 * Manejo dinámico de comunicación entre Frontend y Backend.
 */
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * INTERCEPTOR DE SEGURIDAD JWT
 * Adjunta automáticamente el token de sesión a cada petición.
 * Esto garantiza que el backend identifique al usuario de forma inviolable.
 */
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * INTERCEPTOR DE RESPUESTA (MANEJO DE SESIÓN EXPIRADA)
 * Si el servidor responde 401, limpia el acceso para proteger los datos operativos.
 */
API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('elemento');
            localStorage.removeItem('username');
            // Opcional: Redirigir si el router está disponible
            // window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

/**
 * SERVICIOS DE AUTENTICACIÓN
 */
export const login = (credentials) => API.post('/auth/login', credentials);
export const register = (userData) => API.post('/auth/register', userData);

/**
 * SERVICIOS DE EVENTOS (CALENDARIO OPERATIVO)
 * Optimizado para Sincronización Doble Capa (Unidad / DIR AE)
 */

// Obtener eventos: El backend filtrará por el Token (Seguridad Atómica)
export const getEvents = () => API.get('/events');

// Crear evento con metadatos de segmentación y limpieza de SdA
export const createEvent = (eventData) => {
    const userElemento = localStorage.getItem('elemento');

    const dataNormalized = {
        ...eventData,
        // Limpieza de datos antes del envío
        title: eventData.title?.trim(),
        elemento: eventData.elemento || userElemento,
        esGlobal: eventData.esGlobal || false,
        // Aseguramos que la lista de SdA viaje limpia
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };

    return API.post('/events', dataNormalized);
};

export const updateEvent = (id, eventData) => {
    const dataNormalized = {
        ...eventData,
        sdaListado: eventData.sdaListado?.map(s => s.toUpperCase().trim()) || []
    };
    return API.put(`/events/${id}`, dataNormalized);
};

export const deleteEvent = (id) => API.delete(`/events/${id}`);

/**
 * SERVICIOS DE MATERIAL AERONÁUTICO (ESTADO DE FLOTA)
 */

// Obtener aeronaves con filtrado preventivo
export const getAircrafts = () => {
    const role = localStorage.getItem('role')?.toLowerCase();
    const userElemento = localStorage.getItem('elemento')?.trim();

    // Si no es jefe, solo pedimos lo de su unidad para reducir carga
    if (role !== 'admin' && role !== 'boss' && userElemento) {
        return API.get(`/aircraft`, { params: { unidad: userElemento } });
    }
    
    return API.get('/aircraft');
};

// Crear nueva aeronave con Inyección de Seguridad y Tipado Fuerte
export const createAircraft = (aircraftData) => {
    const userRole = localStorage.getItem('role')?.toLowerCase();
    const userElemento = localStorage.getItem('elemento')?.trim();

    const dataNormalized = {
        ...aircraftData,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim(),
        // Seguridad: Un usuario común no puede dar de alta aviones en otras unidades
        unidad: (userRole !== 'admin' && userRole !== 'boss') 
                ? userElemento 
                : (aircraftData.unidad?.toUpperCase().trim() || userElemento),
        horasRemanentes: Number(aircraftData.horasRemanentes) || 0,
        proximaInspeccion: Number(aircraftData.proximaInspeccion) || 0
    };

    if (!dataNormalized.matricula || !dataNormalized.sda) {
        return Promise.reject({ 
            response: { data: { message: "Error AE: Matrícula y SdA son obligatorios." } } 
        });
    }

    return API.post('/aircraft', dataNormalized);
};

export const updateAircraftStatus = (id, aircraftData) => {
    const dataNormalized = {
        ...aircraftData,
        horasRemanentes: aircraftData.horasRemanentes !== undefined ? Number(aircraftData.horasRemanentes) : undefined,
        proximaInspeccion: aircraftData.proximaInspeccion !== undefined ? Number(aircraftData.proximaInspeccion) : undefined,
        matricula: aircraftData.matricula?.toUpperCase().trim(),
        sda: aircraftData.sda?.toUpperCase().trim()
    };
    return API.put(`/aircraft/${id}`, dataNormalized);
};

export const deleteAircraft = (id) => API.delete(`/aircraft/${id}`);

/**
 * SERVICIOS DE ADMINISTRACIÓN
 */
export const getUsers = () => API.get('/admin/users');
export const deleteUser = (id) => API.delete('/admin/users/' + id);
export const updateUserRole = (id, role) => API.put(`/admin/users/${id}/role`, { role });
export const resetPassword = (id, newPassword) => API.put(`/admin/users/${id}/password`, { newPassword });

export default API;