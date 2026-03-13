const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const conectarDB = require('./config/db');

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD Y CONFIGURACIÓN ---
app.use(helmet({
    contentSecurityPolicy: false, 
}));

// CORS abierto para asegurar comunicación con el dominio de Render
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); 

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 

// --- DEFINICIÓN DE RUTAS API (Prioridad Alta) ---

// Ruta de salud: Si esto no responde con "online", el servidor no cargó el archivo nuevo.
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército',
        timestamp: new Date().toISOString()
    });
});

// Registro de módulos operativos
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); // Ruta para el Panel de Gestión

// --- SERVIR FRONTEND (Solo en Producción) ---
// Se coloca DESPUÉS de las rutas de la API para evitar conflictos de 404
if (process.env.NODE_ENV === 'production') {
    const buildPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(buildPath));

    app.get('*', (req, res) => {
        // Si la petición no es de API, servimos el index.html del frontend
        if (!req.url.startsWith('/api')) {
            res.sendFile(path.join(buildPath, 'index.html'));
        }
    });
}

// --- MANEJO DE RUTAS NO ENCONTRADAS (Captura el 404 de la API) ---
app.use((req, res) => {
    console.warn(`⚠️ Ruta no mapeada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe en este servidor AE.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    console.error(`❌ ERROR CRÍTICO: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor AE en puerto ${PORT}`);
    console.log(`📡 Rutas API activas: /api/auth, /api/events, /api/admin`);
});

process.on('unhandledRejection', (err) => {
    console.error(`❌ Fallo de sistema no manejado: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;