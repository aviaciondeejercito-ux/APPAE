const mongoose = require('mongoose');

// REEMPLAZA ESTO con tu URI de Atlas (la que usas en el .env)
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const runMigration = async () => {
    try {
        console.log("🛠️  Iniciando normalización de base de datos...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida con MongoDB Atlas.");

        const db = mongoose.connection.db;
        const collection = db.collection('events');

        // Obtenemos todos los eventos para procesarlos uno por uno
        const events = await collection.find({}).toArray();
        console.log(`📦 Se encontraron ${events.length} eventos para revisar.`);

        let modificados = 0;

        for (let ev of events) {
            // LÓGICA DE REPARACIÓN:
            // 1. Si existe 'ubicacion', extraemos sus datos.
            // 2. Si no existen, ponemos valores por defecto para que aparezcan en el Monitor.
            const repair = {
                elemento: ev.ubicacion?.elemento || ev.elemento || "POR CLASIFICAR",
                etapa: ev.ubicacion?.etapa || ev.etapa || "recepcion",
                tipoOrigen: ev.ubicacion?.tipoOrigen || ev.tipoOrigen || "MIGRACION",
                esGlobal: ev.ubicacion?.esGlobal !== undefined 
                            ? ev.ubicacion.esGlobal 
                            : (ev.esGlobal !== undefined ? ev.esGlobal : true),
                sdaListado: Array.isArray(ev.sdaListado) ? ev.sdaListado : [],
                tipoApoyo: ev.tipoApoyo || "SOSTENIMIENTO"
            };

            await collection.updateOne(
                { _id: ev._id },
                { 
                    $set: repair,
                    $unset: { ubicacion: "" } // Borramos el objeto viejo para limpiar la DB
                }
            );
            modificados++;
        }

        console.log(`\n✅ PROCESO COMPLETADO`);
        console.log(`✨ Eventos normalizados: ${modificados}`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO DURANTE LA MIGRACIÓN:", error);
        process.exit(1);
    }
};

runMigration();