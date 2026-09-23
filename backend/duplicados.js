const mongoose = require('mongoose');

// URI de conexión provista
const MONGO_URI = 'mongodb+srv://aviaciondeejercito_db_user:offQfkZ4ULIR8tUz@aplicacionae.upez14q.mongodb.net/CalendarioDB?retryWrites=true&w=majority';

async function buscarDuplicados() {
  try {
    console.log('Conectando a MongoDB Atlas (CalendarioDB)...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado exitosamente.\n');

    const db = mongoose.connection.db;
    
    // Si la colección en la base de datos se llama distinto a 'tripulantes', cámbiala aquí
    const collection = db.collection('tripulantes');

    const duplicados = await collection.aggregate([
      {
        $group: {
          _id: {
            apellido: { $toLower: "$apellido" },
            nombre: { $toLower: "$nombre" }
          },
          total: { $sum: 1 },
          documentos: {
            $push: {
              id: "$_id",
              grado: "$grado",
              unidad: { $ifNull: ["$unidad", "$elemento"] },
              activo: "$activo",
              updatedAt: "$updatedAt"
            }
          }
        }
      },
      {
        $match: {
          total: { $gt: 1 }
        }
      }
    ]).toArray();

    console.log('==================================================');
    if (duplicados.length === 0) {
      console.log('✅ No se encontraron tripulantes duplicados.');
    } else {
      console.log(`⚠️ Se encontraron ${duplicados.length} grupos con nombres duplicados:\n`);
      
      duplicados.forEach((item, index) => {
        const nombreCompleto = `${item._id.apellido.toUpperCase()}, ${item._id.nombre.toUpperCase()}`;
        console.log(`[${index + 1}] ${nombreCompleto} (${item.total} registros)`);
        
        item.documentos.forEach(doc => {
          const fechaMod = doc.updatedAt ? new Date(doc.updatedAt).toISOString().split('T')[0] : 'S/D';
          console.log(`    └─ ID: ${doc.id} | Grado: ${doc.grado || 'S/G'} | Unidad: ${doc.unidad || 'S/U'} | Activo: ${doc.activo} | Modificado: ${fechaMod}`);
        });
        console.log('--------------------------------------------------');
      });
    }
    console.log('==================================================\n');

  } catch (error) {
    console.error('❌ Error durante la búsqueda:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Conexión cerrada.');
  }
}

buscarDuplicados();