const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http'); // Requerido para Socket.io
const { Server } = require('socket.io'); // Motor de tiempo real
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE - SINCRO JOKER
 * Configuración de motor centralizado para API de Aviación de Ejército.
 * ESTADO: RECONEXIÓN METEOROLÓGICA Y NVG ACTIVA
 */

// --- 1. CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- 2. CONEXIÓN A BASE DE DATOS ---
console.log('⏳ PROTOCOLO DE ACCESO: Iniciando conexión a MongoDB...');
conectarDB();

const app = express();
// Creamos el servidor HTTP para envolver Express y permitir WebSockets
const server = http.createServer(app);

// --- 3. MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
}));

/**
 * CONFIGURACIÓN DE CORS - RECONEXIÓN OPERATIVA
 * Definimos los orígenes autorizados para evitar bloqueos en Render. 
 */
const allowedOrigins = [
    'https://appae.onrender.com',               // Tu URL de producción principal
    'https://sistema-ae-frontend.onrender.com', // URL alternativa de producción
    'http://localhost:5173',                   // Entorno local Vite
    'http://localhost:3000'                    // Entorno local alternativo
];

const corsOptions = {
    origin: function (origin, callback) {
        // Permitir peticiones sin origen (como apps móviles o curl) o de orígenes permitidos
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`🛑 BLOQUEO DE SEGURIDAD CORS: Origen no autorizado: ${origin}`);
            callback(new Error('No autorizado por el protocolo de seguridad AE'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'], // Agregado x-auth-token por seguridad
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// --- CORRECCIÓN CRÍTICA: LÍMITE DE CARGA ---
// Se aumenta a 500kb para permitir misiones con múltiples coordenadas y metadatos técnicos
app.use(express.json({ limit: '500kb' })); 
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// --- 4. INICIALIZACIÓN DE SOCKET.IO (TIEMPO REAL) ---
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Hacemos que 'io' sea accesible desde los controladores mediante app.get('socketio')
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log(`📡 NUEVA CONEXIÓN TÁCTICA: ID ${socket.id}`);
    
    socket.on('disconnect', () => {
        console.log(`🔌 DESCONEXIÓN TÁCTICA: ID ${socket.id}`);
    });
});

// --- 5. IMPORTACIÓN DE MÓDULOS OPERATIVOS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 
const aircraftRoutes = require('./routes/aircraft'); 
const weatherRoutes = require('./routes/metar'); 
const astronomyRoutes = require('./routes/astronomy');

// --- 6. DEFINICIÓN DE RUTAS API ---

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército Argentina',
        database: 'Connected',
        socketStatus: 'Active',
        timestamp: new Date().toISOString(),
        version: '1.4.1-OPERATIONAL'
    });
});

// MAPEADO DE RUTAS - ASEGURANDO COMPATIBILIDAD CON EL RADAR
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/aircraft', aircraftRoutes); 

/**
 * IMPORTANTE: Si el radar llama a /api/weather/SADP, 
 * el router de weatherRoutes debe manejar la raíz '/' como el ID.
 */
app.use('/api/weather', weatherRoutes); 
app.use('/api/astronomy', astronomyRoutes); 

// --- 7. MANEJO DE RUTAS NO MAPEADAS (404) ---
app.use((req, res) => {
    console.warn(`⚠️ ACCESO NO AUTORIZADO / RUTA INEXISTENTE: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe o está en mantenimiento.`
    });
});

// --- 8. MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Carga de datos JSON malformada.' });
    }

    // Manejo específico de errores de límite de carga
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'La carga de datos excede el límite operativo permitido.' });
    }

    console.error(`❌ FALLO CRÍTICO EN SERVIDOR: ${err.message}`);

    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Información reservada'
    });
});

// --- 9. LANZAMIENTO DEL SERVICIO ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 SISTEMA OPERATIVO EN PUERTO: ${PORT}`);
    console.log(`📡 FRECUENCIAS ACTIVAS: /api/auth, /api/events, /api/admin, /api/aircraft, /api/weather, /api/astronomy`);
    console.log(`🛰️ MOTOR SOCKET.IO: Listo para Sincro Joker - ESTADO OPERATIVO`);
});

// --- 10. PROTOCOLO DE CIERRE SEGURO ---
process.on('unhandledRejection', (err) => {
    console.error(`❌ FALLO CRÍTICO DE PROMESA: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;