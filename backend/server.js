const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const conectarDB = require('./config/db');

// --- CONFIGURACIÓN DE ENTORNO ---
dotenv.config();

// --- CONEXIÓN A BASE DE DATOS ---
// Conectamos antes de cargar las rutas para asegurar integridad
conectarDB();

const app = express();

// --- MIDDLEWARES DE SEGURIDAD ---
app.use(helmet({
    contentSecurityPolicy: false, // Permitir recursos externos para el calendario
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limitación de cuerpo para evitar ataques DoS
app.use(express.json({ limit: '10kb' })); 

// --- IMPORTACIÓN DE RUTAS ---
// Usamos nombres explícitos y verificamos la carga
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 
const adminRoutes = require('./routes/admin'); 

// --- DEFINICIÓN DE RUTAS API ---

// Ruta de salud del sistema
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
app.use('/api/admin', adminRoutes); // Ruta crítica para el Panel de Control

// --- SERVIR FRONTEND (Opcional si es Monolito en Render) ---
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../frontend/dist')));
    app.get('*', (req, res, next) => {
        if (req.originalUrl.startsWith('/api')) return next();
        res.sendFile(path.resolve(__dirname, '../frontend', 'dist', 'index.html'));
    });
}

// --- MANEJO DE RUTAS NO ENCONTRADAS (404) ---
app.use((req, res) => {
    console.warn(`⚠️ 404 detectado en: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: `La ruta ${req.originalUrl} no existe en este servidor.`
    });
});

// --- MANEJO GLOBAL DE ERRORES ---
app.use((err, req, res, next) => {
    console.error(`❌ ERROR DEL SISTEMA: ${err.message}`);
    res.status(err.status || 500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : 'Consulte al administrador.'
    });
});

// --- LANZAMIENTO ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 API Operativa en puerto ${PORT}`);
});

// Gestión de cierres inesperados
process.on('unhandledRejection', (err) => {
    console.error(`❌ Error Crítico: ${err.message}`);
    server.close(() => process.exit(1));
});

module.exports = app;