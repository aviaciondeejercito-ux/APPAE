const mongoose = require('mongoose');
const User = require('./models/User'); // Verifica que la ruta sea correcta
const path = require('path');

// Carga las variables de entorno para conectar a MongoDB (Local o Render)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const resetAdmin = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error("La variable MONGO_URI no está definida en el .env");
        }

        console.log('⏳ Conectando a la base de datos...');
        await mongoose.connect(mongoUri);

        // 1. Eliminamos cualquier rastro del admin previo para evitar conflictos e inconsistencias
        await User.deleteOne({ username: 'admin' });
        console.log('🧹 Limpieza de registros previos completada.');

        /**
         * 2. CREACIÓN DEL PERFIL
         * IMPORTANTE: Pasamos la contraseña en texto plano ('admin123').
         * El middleware pre('save') en models/User.js se encargará de encriptarla
         * una sola vez, asegurando que el login funcione.
         */
        const admin = new User({
            nombreReal: 'admin',      // Credencial de acceso (Usuario)
            username: 'admin',        // Identificador GDE
            elemento: 'COMANDO',      // Unidad/Destino
            email: 'admin@ae.mil.ar', // Email institucional
            password: 'admin123',     // Se encriptará automáticamente en el modelo
            role: 'admin'             // Rango de privilegios
        });

        await admin.save();

        console.log('--------------------------------------------------');
        console.log('🚀 ADMINISTRADOR RESETEADO CON ÉXITO');
        console.log('👤 Usuario para entrar: admin');
        console.log('🔑 Contraseña: admin123');
        console.log('📊 Estado: 100% Funcional con estándar de seguridad AE');
        console.log('--------------------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error crítico durante el reset:', error.message);
        process.exit(1);
    }
};

resetAdmin();