const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE - SINCRO JOKER
 * Configuración de motor centralizado para API de Aviación de Ejército.
 * Actualización: Refuerzo de seguridad en cabeceras y manejo de procesos.
 */

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
// Aplicamos lógica atómica: si no hay base de datos, el sistema informa pero no colapsa en bucle
console.log('⏳ PROTOCOLO DE ACCESO: Iniciando conexión a MongoDB...');
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
// Helmet configurado para permitir la carga de mapas (Leaflet) y recursos externos
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
}));

// CORS: Configuración estricta para producción
// Nota: En desarrollo usamos '*', pero el estándar sugiere filtrar por origen cuando lances a Render/Vercel
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// Límite de carga: Prevención de ataques de desbordamiento (Payload Too Large)
app.use(express.json({ limit: '15kb' })); 
app.use(express.urlencoded({ extended: true, limit: '15kb' }));

// --- IMPORTACIÓN DE MÓDULOS OPERATIVOS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 
const aircraftRoutes = require('./routes/aircraft'); 
const weatherRoutes = require('./routes/metar'); 

// --- DEFINICIÓN DE RUTAS API ---

/**
 * @route GET /api/health
 * Monitoreo de estado del sistema en tiempo real
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército Argentina',
        database: 'Connected',
        timestamp: new Date().toISOString(),
        version: '1.2.0-SINCRO'
    });
});

// Registro de módulos tácticos
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/aircraft', aircraftRoutes); 

/**
 * MÓDULO METEOROLÓGICO (METAR/TAF)
 * Proxy para evitar bloqueos de CORS en el frontend y centralizar peticiones.
 */
app.use('/api/weather', weatherRoutes); 

// --- MANEJO DE RUTAS NO MAPEADAS (404) ---
app.use((req, res) => {
    console.warn(`⚠️ ACCESO NO AUTORIZADO / RUTA INEXISTENTE: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no forma parte de la infraestructura AE.`
    });
});

// --- MANEJO GLOBAL DE ERRORES (Capa Final de Seguridad) ---
app.use((err, req, res, next) => {
    // Error de sintaxis en el JSON enviado
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Carga de datos JSON malformada.' });
    }

    // Log interno para el administrador
    console.error(`❌ FALLO CRÍTICO EN SERVIDOR: ${err.message}`);

    // Respuesta genérica para no exponer debilidades del sistema en producción
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento en el servidor AE.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Información reservada por seguridad'
    });
});

// --- LANZAMIENTO DEL SERVICIO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 SISTEMA OPERATIVO EN PUERTO: ${PORT}`);
    console.log(`📡 FRECUENCIAS ACTIVAS: /api/auth, /api/events, /api/admin, /api/aircraft, /api/weather`);
});

// --- PROTOCOLO DE CIERRE SEGURO ---
process.on('unhandledRejection', (err) => {
    console.error(`❌ FALLO CRÍTICO DE PROMESA: ${err.message}`);
    // Cerramos el servidor de forma ordenada si hay un error fatal
    server.close(() => process.exit(1));
});

module.exports = app;