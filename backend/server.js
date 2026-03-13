const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const conectarDB = require('./config/db');

// --- IMPORTACIÓN DE RUTAS ---
// Normalizamos a minúsculas para evitar errores MODULE_NOT_FOUND en Render (Linux)
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events'); 

// Inicialización de variables de entorno
dotenv.config();

// Conexión a la base de datos
conectarDB();

const app = express();

// --- MIDDLEWARES GLOBALES ---
app.use(cors()); 

// Seguridad: Limitamos el tamaño del JSON para evitar ataques DoS
app.use(express.json({ limit: '10kb' })); 

// --- DEFINICIÓN DE RUTAS ---

// Ruta raíz para verificar estado
app.get('/', (req, res) => {
    res.status(200).json({ message: 'API de Calendario AE corriendo perfectamente ✅' });
});

// Rutas de Autenticación (Login/Registro)
app.use('/api/auth', authRoutes);

// Rutas de Eventos del Calendario
app.use('/api/events', eventRoutes); 

// --- MANEJO DE ERRORES DE RUTA ---
app.use((req, res, next) => {
    res.status(404).json({
        message: `La ruta ${req.originalUrl} no existe en este servidor.`
    });
});

// --- LANZAMIENTO DEL SERVIDOR ---
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});

// Crash protection
process.on('unhandledRejection', (err) => {
    console.log(`❌ Error crítico no manejado: ${err.message}`);
    server.close(() => process.exit(1));
});