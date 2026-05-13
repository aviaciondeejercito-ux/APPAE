const Tripulante = require('../models/Tripulante');

exports.getPlanificacionCompleta = async (req, res) => {
    try {
        console.log("📡 Petición de nómina EBM recibida para unidad:", req.query.unidad);
        
        // 1. Lista de grados solicitada
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        
        // 2. Construcción del filtro
        let query = { 
            grado: { $in: gradosHabilitados }, 
            activo: true 
        };

        // 3. Lógica Admin vs Usuario (Sincro Joker)
        const role = (req.user.role || '').toUpperCase();
        if (role !== 'ADMIN') {
            const unidadUser = req.user.unidad || req.user.elemento;
            query.$or = [{ unidad: unidadUser }, { elemento: unidadUser }];
        } else if (req.query.unidad && req.query.unidad !== 'all' && req.query.unidad !== 'COMANDO') {
            const uBusqueda = req.query.unidad.trim();
            query.$or = [{ unidad: uBusqueda }, { elemento: uBusqueda }];
        }

        // 4. Búsqueda y envío
        const pilotos = await Tripulante.find(query)
            .select('grado apellido nombre unidad elemento')
            .sort({ grado: 1, apellido: 1 })
            .lean();

        console.log(`✅ Pilotos encontrados: ${pilotos.length}`);
        res.status(200).json(pilotos);
    } catch (error) {
        console.error("❌ ERROR CRÍTICO EBM:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
};