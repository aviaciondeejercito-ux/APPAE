const mongoose = require('mongoose');
const Aircraft = require('./models/Aircraft'); // Ajustá la ruta según dónde tengas tu modelo Aircraft
require('dotenv').config(); // Por si usás variables de entorno para la URI de MongoDB

// 🔗 CONFIGURACIÓN DE CONEXIÓN
// Reemplazá con tu URI si no usás variables de entorno
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tu_base_de_datos';

async function migrarSistemasDeArmas() {
    try {
        console.log('🔌 Conectando a la base de datos...');
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conexión establecida con éxito.');

        // 🔍 1. Buscar cuántas aeronaves coinciden para tener un control previo
        const navesAfectadas = await Aircraft.find({ sda: 'AB206B3' });
        console.log(`🤖 Se encontraron ${navesAfectadas.length} aeronaves con el SDA "AB206B3".`);

        if (navesAfectadas.length === 0) {
            console.log('✔️ No hay aeronaves que requieran actualización. Finalizando...');
            return;
        }

        // 🔄 2. Ejecutar la actualización masiva
        console.log('🚀 Iniciando actualización masiva...');
        const resultado = await Aircraft.updateMany(
            { sda: 'AB206B3' }, // Filtro de búsqueda
            { 
                $set: { 
                    sda: 'B206B3',
                    actualizadoPor: 'SISTEMA (Migración Técnica - Corrección SDA)',
                    // Opcionalmente actualizamos la fecha de modificación de forma manual
                    ultimaActualizacion: new Date()
                } 
            }
        );

        console.log('--- RESULTADO DE LA OPERACIÓN ---');
        console.log(`✨ Aeronaves encontradas/emparejadas: ${resultado.matchedCount}`);
        console.log(`✏️ Aeronaves modificadas con éxito: ${resultado.modifiedCount}`);
        console.log('---------------------------------');

    } catch (error) {
        console.error('❌ Error durante la migración técnica:', error);
    } finally {
        // Cerrar siempre la conexión para no dejar procesos colgados
        await mongoose.disconnect();
        console.log('🔌 Conexión a MongoDB cerrada.');
        process.exit(0);
    }
}

// Ejecutar script
migrarSistemasDeArmas();