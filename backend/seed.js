const mongoose = require('mongoose');
const User = require('./models/User'); 
const path = require('path');

// Configuración de ruta para el .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("La variable MONGO_URI no está definida");
        }

        await mongoose.connect(process.env.MONGO_URI);
        console.log('⏳ Conectado a la base de datos para resetear administrador...');
        
        // Eliminamos al admin viejo para limpiar inconsistencias
        await User.deleteOne({ username: 'admin' });

        const newAdmin = new User({
            nombreReal: 'admin',      // <--- CAMPO CRÍTICO: Ahora el login y la tabla lo reconocerán
            username: 'admin',        // Identificador GDE
            elemento: 'COMANDO',      // Valor por defecto para el administrador
            email: 'admin@ae.mil.ar',
            password: 'admin123',     // El middleware de tu User.js se encargará de encriptarlo
            role: 'admin'
        });

        await newAdmin.save();
        
        console.log('--------------------------------------------------');
        console.log('✅ Admin reseteado correctamente con estándar AE');
        console.log('👤 Usuario (Nombre): admin');
        console.log('🆔 GDE: admin');
        console.log('🔑 Clave: admin123');
        console.log('--------------------------------------------------');
        
        process.exit();
    } catch (error) {
        console.error('❌ Error crítico en el Seed:', error.message);
        process.exit(1);
    }
};

seedAdmin();