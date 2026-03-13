const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE
 * Configuración de motor centralizado para API de Aviación de Ejército.
 */

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
console.log('⏳ Iniciando protocolo de conexión a MongoDB...');
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
}));

// CORS: Permitir comunicación desde cualquier origen para evitar bloqueos en despliegue dinámico
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Límite de carga para prevenir ataques DoS básicos
app.use(express.json({ limit: '10kb' })); 

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 

// --- DEFINICIÓN DE RUTAS API ---

/**
 * @route GET /api/health
 * @desc Verificación de estado operativa para Render.
 */
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
app.use('/api/admin', adminRoutes); 

/**
 * SECCIÓN DE FRONTEND ELIMINADA:
 * El Frontend se despliega como "Static Site" en Render. 
 * Esta API solo procesa datos (Estándar de Seguridad AE).
 */

// --- MANEJO DE RUTAS NO ENCONTRADAS (Captura el 404 de la API) ---
app.use((req, res) => {
    console.warn(`⚠️ Intento de acceso a ruta no mapeada: ${req.method} ${req.originalUrl}`);
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
        message: 'Error interno de procesamiento en el servidor AE.',
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor AE en puerto ${PORT}`);
    console.log(`📡 Rutas API activas: /api/auth, /api/events, /api/admin`);
});

// Manejo de cierres inesperados (Graceful Shutdown)
process.on('unhandledRejection', (err) => {
    console.error(`❌ Fallo de sistema no manejado: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;