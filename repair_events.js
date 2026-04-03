const mongoose = require('mongoose');

// REEMPLAZA ESTO con tu URI de Atlas (la que usas en el .env)
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const runMigration = async () => {
    try {
        console.log("🛠️  Iniciando normalización de base de datos (Estructura Pecera Estanca)...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida con MongoDB Atlas.");

        const db = mongoose.connection.db;
        const collection = db.collection('events');

        // Obtenemos todos los eventos para procesarlos uno por uno
        const events = await collection.find({}).toArray();
        console.log(`📦 Se encontraron ${events.length} eventos para revisar.`);

        let modificados = 0;

        for (let ev of events) {
            // LÓGICA DE REPARACIÓN Y NORMALIZACIÓN:
            const elementoFinal = (ev.ubicacion?.elemento || ev.elemento || "POR CLASIFICAR").toUpperCase();
            
            const repair = {
                // 1. Campos de Identificación y Jerarquía
                elemento: elementoFinal,
                creadorUnidad: (ev.creadorUnidad || elementoFinal).toUpperCase(), // Si no existe, asumimos que el creador es el mismo del elemento
                etapa: ev.ubicacion?.etapa || ev.etapa || "recepcion",
                tipoOrigen: ev.ubicacion?.tipoOrigen || ev.tipoOrigen || "MIGRACION",
                esGlobal: ev.ubicacion?.esGlobal !== undefined 
                            ? ev.ubicacion.esGlobal 
                            : (ev.esGlobal !== undefined ? ev.esGlobal : true),
                
                // 2. Datos de Misión
                sdaListado: Array.isArray(ev.sdaListado) ? ev.sdaListado : [],
                tipoApoyo: (ev.tipoApoyo || "SOSTENIMIENTO").toUpperCase(),
                
                // 3. Nuevos campos de contacto (Normalización a vacíos si no existen)
                unidadApoyada: (ev.unidadApoyada || "").toUpperCase(),
                pntoContactoNom: (ev.pntoContactoNom || "").toUpperCase(),
                pntoContactoTel: ev.pntoContactoTel || "",
                responsableNom: (ev.responsableNom || "").toUpperCase(),
                responsableTel: ev.responsableTel || "",

                // 4. Coordenadas (Aseguramos estructura si no existe)
                origen: {
                    nombre: (ev.origen?.nombre || "ORIGEN").toUpperCase(),
                    lat: ev.origen?.lat || null,
                    lng: ev.origen?.lng || null
                },
                destino: {
                    nombre: (ev.destino?.nombre || "DESTINO").toUpperCase(),
                    lat: ev.destino?.lat || null,
                    lng: ev.destino?.lng || null
                }
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
        console.log(`✨ Eventos normalizados con nuevos campos: ${modificados}`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR CRÍTICO DURANTE LA MIGRACIÓN:", error);
        process.exit(1);
    }
};

runMigration();