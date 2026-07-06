const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http'); 
const { Server } = require('socket.io'); 
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE - SINCRO JOKER
 * Configuración de motor centralizado para API de Aviación de Ejército.
 */

// --- 1. CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- 2. CONEXIÓN A BASE DE DATOS ---
console.log('⏳ PROTOCOLO DE ACCESO: Iniciando conexión a MongoDB...');
conectarDB();

const app = express();
const server = http.createServer(app);

// --- 3. MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
    crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
    'https://appae.onrender.com',
    'https://sistema-ae-frontend.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.error(`🛑 BLOQUEO DE SEGURIDAD CORS: Origen no autorizado: ${origin}`);
            callback(new Error('No autorizado por el protocolo de seguridad AE'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
    credentials: true,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '500kb' })); 
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// --- 4. INICIALIZACIÓN DE SOCKET.IO ---
const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

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
const tripulanteRoutes = require('./routes/tripulantesRoutes'); 
const vueloRoutes = require('./routes/vueloRoutes');
const ebmRoutes = require('./routes/ebmRoutes'); 
const alertRoutes = require('./routes/alertRoutes');
// --- 6. DEFINICIÓN DE RUTAS API ---

app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército Argentina',
        version: '1.5.0-OPERATIONAL-TRIP'
    });
});

// Registro de Rutas
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); 
app.use('/api/aircraft', aircraftRoutes); 
app.use('/api/weather', weatherRoutes); 
app.use('/api/astronomy', astronomyRoutes); 
app.use('/api/tripulantes', tripulanteRoutes); 
app.use('/api/vuelos', vueloRoutes);

// MONTAJE EBM
app.use('/api/ebm', ebmRoutes);
// MONTAJE DE ALERTAS OPERATIVAS
app.use('/api/alerts', alertRoutes); //
// --- 7. MANEJO DE RUTAS NO MAPEADAS (404) ---
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe o está en mantenimiento.`
    });
});

// --- 8. MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
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
    
    // Verificación de carga de rutas EBM
    if (ebmRoutes) {
        console.log("✅ Módulo EBM cargado correctamente.");
    } else {
        console.warn("⚠️ Advertencia: El módulo EBM no pudo cargarse.");
    }
});

module.exports = app;