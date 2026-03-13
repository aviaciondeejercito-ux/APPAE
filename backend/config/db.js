const mongoose = require('mongoose');

const conectarDB = async () => {
    try {
        console.log('⏳ Iniciando protocolo de conexión a MongoDB...');
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`✅ MongoDB Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        process.exit(1);
    }
};

module.exports = conectarDB;