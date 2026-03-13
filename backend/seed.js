const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 
const path = require('path');

// Buscamos el .env en la raíz
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("La variable MONGO_URI no está definida en el archivo .env");
        }

        await mongoose.connect(process.env.MONGO_URI);
        
        // Buscamos por username o email para evitar duplicados
        const adminExists = await User.findOne({ 
            $or: [{ username: 'admin' }, { email: 'admin@ae.mil.ar' }] 
        });

        if (adminExists) {
            console.log('⚠️ El usuario administrador ya existe.');
            process.exit();
        }

        const hashedPassword = await bcrypt.hash('admin123', 10); // <--- CAMBIÁ ESTO POR TU CLAVE
        
        const newAdmin = new User({
            username: 'admin',
            email: 'admin@ae.mil.ar', // Agregamos el email requerido
            password: hashedPassword,
            role: 'admin'
        });

        await newAdmin.save();
        console.log('✅ Usuario Administrador ("admin") creado con éxito en MongoDB.');
        process.exit();
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        process.exit(1);
    }
};

seedAdmin();