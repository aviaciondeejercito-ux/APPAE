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

dotenv.config();

console.log('⏳ PROTOCOLO DE ACCESO: Iniciando conexión a MongoDB...');
conectarDB();

const app = express();
const server = http.createServer(app);

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
const weatherRoutes = require('./routes/metar');
const astronomyRoutes = require('./routes/astronomy');
const tripulanteRoutes = require('./routes/tripulantesRoutes');
const vueloRoutes = require('./routes/vueloRoutes');
const ebmRoutes = require('./routes/ebmRoutes');
const alertRoutes = require('./routes/alertRoutes');
const f13Routes = require('./routes/f13');
const dashboardRoutes = require('./routes/dashboard');
const aircraftRoutes = require('./routes/aircraftRoutes');
const programaRoutes = require('./routes/programaRoutes');
const escuelaRoutes = require('./routes/escuelaRoutes');

// 📋 Módulo: Control de Entrenamiento de Tripulantes
const trainingRoutes = require('./routes/trainingRoutes');

// --- 6. DEFINICIÓN DE RUTAS API ---

app.get('/api/ping', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'online',
        server: 'Aviación de Ejército Argentina',
        version: '1.6.0-OPERATIONAL-ECAE'
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
app.use('/api/ebm', ebmRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/f13', f13Routes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/programas-mantenimiento', programaRoutes);
app.use('/api/escuela', escuelaRoutes);

// Inyección de la ruta operativa para Entrenamiento de Tripulantes
app.use('/api/training', trainingRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe o está en mantenimiento.`
    });
});

app.use((err, req, res, next) => {
    console.error(`❌ FALLO CRÍTICO EN SERVIDOR: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento.',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Información reservada'
    });
});

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 SISTEMA OPERATIVO EN PUERTO: ${PORT} (HOST: ${HOST})`);
    
    if (ebmRoutes) console.log("✅ Módulo EBM cargado correctamente.");
    if (f13Routes) console.log("✅ Módulo F-13 (Libretas Históricas) cargado correctamente.");
    if (programaRoutes) console.log("✅ Módulo de Programas de Mantenimiento verificado e integrado.");
    if (escuelaRoutes) console.log("🎓 Módulo Escuela de Aviación (EC AE) cargado y operativo.");
    
    // Verificación de carga de rutas de Entrenamiento
    if (trainingRoutes) {
        console.log("📋 Módulo de Control de Entrenamiento cargado correctamente.");
    } else {
        console.warn("⚠️ Advertencia: El módulo de Control de Entrenamiento falló al inicializarse.");
    }
});

module.exports = app;