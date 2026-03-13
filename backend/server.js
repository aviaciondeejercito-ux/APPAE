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

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, 
}));

app.use(cors({
    origin: '*', // Permitimos temporalmente cualquier origen para asegurar conexión en Render
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); 

// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 

// --- DEFINICIÓN DE RUTAS API ---

// Ruta de salud para verificar si el servidor responde
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'online',
        server: 'Aviación de Ejército',
        timestamp: new Date().toISOString()
    });
});

// Registro de módulos operativos (Asegúrate que los archivos en /routes existan)
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes); 
app.use('/api/admin', adminRoutes); 

// --- SERVIR FRONTEND (Configuración para Producción en Render) ---
if (process.env.NODE_ENV === 'production') {
    // Apuntamos a la carpeta dist del frontend
    const buildPath = path.join(__dirname, '../frontend/dist');
    app.use(express.static(buildPath));

    app.get('*', (req, res, next) => {
        // Si la petición empieza con /api, no debe servir el index.html
        if (req.url.startsWith('/api')) return next();
        res.sendFile(path.join(buildPath, 'index.html'));
    });
}

// --- MANEJO DE RUTAS NO ENCONTRADAS (El 404 que estamos viendo) ---
app.use((req, res) => {
    console.warn(`⚠️ Intento de acceso fallido: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe en el servidor AE. Verifique el endpoint.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    console.error(`❌ ERROR CRÍTICO DEL SISTEMA: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Error de procesamiento.'
    });
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 API Operativa en puerto ${PORT}`);
    console.log(`📡 Ruta Admin activa en: /api/admin`);
});

process.on('unhandledRejection', (err) => {
    console.error(`❌ Rejection no manejada: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;