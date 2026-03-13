const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet'); // Seguridad extra para cabeceras HTTP
const path = require('path');
const conectarDB = require('./config/db');

// --- CONFIGURACIÓN DE ENTORNO ---
// Cargamos variables de entorno (Asegura compatibilidad con seed.js y Render)
dotenv.config();

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); // Ruta para gestión de permisos del Admin

// --- CONEXIÓN A BASE DE DATOS ---
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
// Helmet ayuda a proteger la aplicación de vulnerabilidades web conocidas
app.use(helmet());

// CORS: Configuración seria para producción
app.use(cors({
    origin: process.env.FRONTEND_URL || '*', // En producción, limita esto a tu URL de Render
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Seguridad: Limitamos el tamaño del JSON para evitar ataques DoS (Denegación de Servicio)
app.use(express.json({ limit: '10kb' })); 

// --- DEFINICIÓN DE RUTAS ---

// Ruta raíz para verificación de salud del sistema
app.get('/', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        message: 'Sistema de Gestión AE - API Operativa ✅',
        timestamp: new Date().toISOString()
    });
});

// Rutas de Autenticación (Login/Registro)
app.use('/api/auth', authRoutes);

// Rutas de Eventos del Calendario (Protegidas internamente por roles)
app.use('/api/events', eventRoutes); 

// Rutas de Administración (Gestión de usuarios y permisos)
app.use('/api/admin', adminRoutes);

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

// --- PROTECCIÓN CONTRA CAÍDAS CRÍTICAS ---
process.on('unhandledRejection', (err) => {
    console.error(`❌ Error crítico no manejado (Unhandled Rejection): ${err.message}`);
    // Cerramos el servidor con elegancia antes de salir
    server.close(() => process.exit(1));
});

module.exports = app; // Exportamos para facilitar posibles testeos