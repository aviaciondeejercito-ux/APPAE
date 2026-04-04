const mongoose = require('mongoose');

// URI de Atlas
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

const runMigration = async () => {
    try {
        console.log("🛠️  Iniciando normalización de base de datos (Respetando Globales de Subalternos)...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Conexión establecida.");

        const db = mongoose.connection.db;
        const collection = db.collection('events');

        const events = await collection.find({}).toArray();
        console.log(`📦 Procesando ${events.length} eventos.`);

        let modificados = 0;

        for (let ev of events) {
            const elementoFinal = (ev.elemento || ev.ubicacion?.elemento || "POR CLASIFICAR").toUpperCase().trim();
            const creadorFinal = (ev.creadorUnidad || elementoFinal).toUpperCase().trim();
            
            // LÓGICA DE GLOBALIDAD ACTUALIZADA:
            // 1. Si el creador es DIR AE/SEC AE -> Es Global.
            // 2. SI EL USUARIO YA LO HABÍA MARCADO COMO GLOBAL -> Se mantiene Global (para que DIR AE lo vea).
            let esGlobalFinal = false;
            if (creadorFinal.includes('DIR AE') || creadorFinal.includes('SEC AE') || ev.esGlobal === true) {
                esGlobalFinal = true;
            }

            // Normalización de Etapa
            let etapaFinal = (ev.etapa || ev.ubicacion?.etapa || "ordenada").toLowerCase().trim();
            const etapasValidas = ['recepcion', 'revision', 'ordenada'];
            if (!etapasValidas.includes(etapaFinal)) etapaFinal = 'ordenada';

            // Reparación de sdaListado (Formato objeto)
            let sdaReparado = [];
            if (Array.isArray(ev.sdaListado)) {
                sdaReparado = ev.sdaListado.map(item => {
                    if (typeof item === 'string') return { sda: item.toUpperCase(), cantidad: 1 };
                    return { sda: (item.sda || "S/D").toUpperCase(), cantidad: item.cantidad || 1 };
                });
            }

            const repair = {
                elemento: elementoFinal,
                creadorUnidad: creadorFinal,
                etapa: etapaFinal,
                tipoOrigen: ev.tipoOrigen || ev.ubicacion?.tipoOrigen || "MIGRACION",
                esGlobal: esGlobalFinal,
                sdaListado: sdaReparado,
                tipoApoyo: (ev.tipoApoyo || "SOSTENIMIENTO").toUpperCase(),
                unidadApoyada: (ev.unidadApoyada || "").toUpperCase(),
                pntoContactoNom: (ev.pntoContactoNom || "").toUpperCase(),
                pntoContactoTel: ev.pntoContactoTel || "",
                responsableNom: (ev.responsableNom || "").toUpperCase(),
                responsableTel: ev.responsableTel || "",
                origen: {
                    nombre: (ev.origen?.nombre || ev.ubicacion?.origen || "ORIGEN").toUpperCase(),
                    lat: ev.origen?.lat || ev.ubicacion?.lat || null,
                    lng: ev.origen?.lng || ev.ubicacion?.lng || null
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
                    $unset: { ubicacion: "", esRealTime: "" } 
                }
            );
            modificados++;
        }

        console.log(`\n✅ MIGRACIÓN EXITOSA`);
        console.log(`✨ ${modificados} eventos alineados con el sistema de visibilidad.`);
        process.exit(0);

    } catch (error) {
        console.error("❌ ERROR:", error);
        process.exit(1);
    }
};

runMigration();