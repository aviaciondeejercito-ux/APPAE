const mongoose = require('mongoose');
const User = require('./models/User'); 
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const seedAdmin = async () => {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error("La variable MONGO_URI no está definida");
        }

        await mongoose.connect(process.env.MONGO_URI);
        
        // Eliminamos al admin viejo para limpiar el error del doble hasheo
        await User.deleteOne({ username: 'admin' });

        const newAdmin = new User({
            username: 'admin',
            email: 'admin@ae.mil.ar',
            password: 'admin123', // <--- TEXTO PLANO. El modelo User.js lo encriptará.
            role: 'admin'
        });

        await newAdmin.save();
        console.log('✅ Admin reseteado correctamente. Usuario: admin | Clave: admin123');
        process.exit();
    } catch (error) {
        console.error('❌ Error crítico:', error.message);
        process.exit(1);
    }
};

seedAdmin();