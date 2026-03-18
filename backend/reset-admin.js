const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Asegúrate que la ruta sea correcta
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

        // 1. Eliminamos cualquier rastro del admin previo para evitar conflictos
        await User.deleteOne({ username: 'admin' });
        console.log('🧹 Limpieza de registros previos completada.');

        // 2. Encriptamos la contraseña manualmente para asegurar compatibilidad
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        // 3. Creamos el nuevo perfil con el estándar AE (incluye nombreReal)
        const admin = new User({
            nombreReal: 'admin',      // CRÍTICO: Valor para el login y la tabla
            username: 'admin',        // Identificador GDE
            elemento: 'COMANDO',
            email: 'admin@ae.mil.ar',
            password: hashedPassword, // Guardamos la versión encriptada
            role: 'admin'             // Nivel de acceso máximo
        });

        await admin.save();

        console.log('--------------------------------------------------');
        console.log('🚀 ADMINISTRADOR RESETEADO CON ÉXITO');
        console.log('👤 Usuario para entrar: admin');
        console.log('🔑 Contraseña: admin123');
        console.log('📊 Estado: 100% Funcional con el nuevo Panel');
        console.log('--------------------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error crítico durante el reset:', error.message);
        process.exit(1);
    }
};

resetAdmin();