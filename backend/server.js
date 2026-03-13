const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet'); // Seguridad extra para cabeceras HTTP
const path = require('path');
const conectarDB = require('./config/db');

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); // <--- CRÍTICO: Debe existir el archivo en esa ruta

// --- CONEXIÓN A BASE DE DATOS ---
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); 

// --- DEFINICIÓN DE RUTAS ---

app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        message: 'Sistema de Gestión AE - API Operativa ✅',
        timestamp: new Date().toISOString()
    });
});

// Registro de rutas en el middleware de Express
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); // <--- ESTO ES LO QUE BUSCA EL FRONTEND

// --- MANEJO DE RUTAS NO ENCONTRADAS ---
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.originalUrl}. Acceso denegado o inexistente.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    console.error(`❌ Error detectado: ${err.stack}`);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Consulte al administrador.'
    });
});

// --- LANZAMIENTO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor AE corriendo en puerto ${PORT}`);
    console.log(`📡 Modo: ${process.env.NODE_ENV || 'producción'}`);
});

process.on('unhandledRejection', (err) => {
    console.error(`❌ Error crítico no manejado: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;