const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE - SINCRO JOKER
 * Configuración de motor centralizado para API de Aviación de Ejército.
 * Actualización: Refuerzo de CORS para reconexión con Render.
 */

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
console.log('⏳ PROTOCOLO DE ACCESO: Iniciando conexión a MongoDB...');
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
}));

/**
 * CONFIGURACIÓN DE CORS - RECONEXIÓN OPERATIVA
 * Definimos los orígenes autorizados para evitar el bloqueo visto en consola.
 */
const allowedOrigins = [
    'https://sistema-ae-frontend.onrender.com', // Tu URL de producción
    'http://localhost:5173',                   // Entorno local Vite
    'http://localhost:3000'                    // Entorno local alternativo
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como Postman o apps del sistema)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.error(`🛑 BLOQUEO DE SEGURIDAD CORS: Origen no autorizado: ${origin}`);
            callback(new Error('No autorizado por el protocolo de seguridad AE'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Límite de carga: Prevención de ataques de desbordamiento
app.use(express.json({ limit: '15kb' })); 
app.use(express.urlencoded({ extended: true, limit: '15kb' }));

// --- IMPORTACIÓN DE MÓDULOS OPERATIVOS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 
const aircraftRoutes = require('./routes/aircraft'); 
const weatherRoutes = require('./routes/metar'); 

// --- DEFINICIÓN DE RUTAS API ---

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército Argentina',
        database: 'Connected',
        timestamp: new Date().toISOString(),
        version: '1.2.1-SINCRO'
    });
});

// Registro de módulos tácticos
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/aircraft', aircraftRoutes); 
app.use('/api/weather', weatherRoutes); 

// --- MANEJO DE RUTAS NO MAPEADAS (404) ---
app.use((req, res) => {
    console.warn(`⚠️ ACCESO NO AUTORIZADO / RUTA INEXISTENTE: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Carga de datos JSON malformada.' });
    }

    console.error(`❌ FALLO CRÍTICO EN SERVIDOR: ${err.message}`);

    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Información reservada'
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
    server.close(() => process.exit(1));
});

module.exports = app;