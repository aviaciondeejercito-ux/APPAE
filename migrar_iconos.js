const mongoose = require('mongoose');

// CORRECCIÓN: Se agregaron las comillas y los dos puntos faltantes en la URI
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const aircraftSchema = new mongoose.Schema({
    matricula: String,
    sda: String,
    tipoIcono: String
}, { collection: 'aircrafts' }); 

const Aircraft = mongoose.model('Aircraft', aircraftSchema);

async function migrarIconos() {
    try {
        console.log("⏳ Intentando conectar a MongoDB Atlas...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida correctamente.");

        const helicopteros = [
            'UH-1H', 'UH-1H/II', 'BELL 212', 'AS-332B', 
            'AB206B1', 'SA-315 B LAMA', '407 GXi', 'AB206B3'
        ];

        const aviones = [
            'C-212', 'C-208', 'C-550', 'DA-62', 'DHC-6'
        ];

        console.log("📡 Iniciando actualización masiva...");

        // Actualizar Ala Rotativa
        const resHeli = await Aircraft.updateMany(
            { sda: { $in: helicopteros.map(s => s.toUpperCase()) } },
            { $set: { tipoIcono: 'ala_rotativa' } }
        );
        console.log(`🚁 Helicópteros actualizados: ${resHeli.modifiedCount}`);

        // Actualizar Ala Fija
        const resAvion = await Aircraft.updateMany(
            { sda: { $in: aviones.map(s => s.toUpperCase()) } },
            { $set: { tipoIcono: 'ala_fija' } }
        );
        console.log(`✈️ Aviones actualizados: ${resAvion.modifiedCount}`);

        // Verificación de documentos sin icono
        const sinIcono = await Aircraft.countDocuments({ tipoIcono: { $exists: false } });
        if (sinIcono > 0) {
            console.log(`⚠️ Atención: Quedan ${sinIcono} aeronaves sin icono definido (SdA no coinciden).`);
        }

    } catch (error) {
        console.error("❌ Error durante la migración:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Proceso finalizado y desconectado.");
    }
}

migrarIconos();