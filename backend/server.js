const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const conectarDB = require('./config/db');

/**
 * ESTÁNDAR DE SEGURIDAD AE
 * Configuración de motor centralizado para API de Aviación de Ejército.
 * Actualización: Inclusión de Módulo de Gestión de Material (Aeronaves).
 */

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
console.log('⏳ Iniciando protocolo de conexión a MongoDB...');
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, // Permitido para facilitar el despliegue dinámico
}));

// CORS: Configuración robusta para producción en Render
app.use(cors({
    origin: '*', // En producción, podrías cambiar '*' por la URL de tu frontend en Render
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Límite de carga para prevenir ataques DoS básicos
app.use(express.json({ limit: '15kb' })); 

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 
const aircraftRoutes = require('./routes/aircraft'); // <--- NUEVA RUTA DE MATERIAL

// --- DEFINICIÓN DE RUTAS API ---

/**
 * @route GET /api/health
 * @desc Verificación de estado operativa para monitoreo de Render.
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
app.use('/api/aircraft', aircraftRoutes); // <--- REGISTRO DE MÓDULO AERONAVES

/**
 * SECCIÓN DE FRONTEND ELIMINADA:
 * El Frontend se despliega como "Static Site" en Render. 
 * Esta API solo procesa datos (Estándar de Seguridad AE).
 */

// --- MANEJO DE RUTAS NO ENCONTRADAS ---
app.use((req, res) => {
    console.warn(`⚠️ Intento de acceso a ruta no mapeada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe en este servidor AE.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    // Si el error ocurre durante el parseo de JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ success: false, message: 'Carga de datos JSON malformada.' });
    }

    console.error(`❌ ERROR DE SISTEMA: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno de procesamiento en el servidor AE.',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Información reservada'
    });
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor AE operativo en puerto ${PORT}`);
    console.log(`📡 Módulos activos: /api/auth, /api/events, /api/admin, /api/aircraft`);
});

// Manejo de cierres inesperados para evitar corrupción de memoria (Graceful Shutdown)
process.on('unhandledRejection', (err) => {
    console.error(`❌ Fallo crítico de promesa no manejada: ${err.message}`);
});

module.exports = app;