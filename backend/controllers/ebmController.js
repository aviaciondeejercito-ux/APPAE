const Tripulante = require('../models/Tripulante');

exports.getPlanificacionCompleta = async (req, res) => {
    try {
        const { unidad } = req.query;
        const { role } = req.user; // Obtenido del middleware protect

        // 1. Filtro de Grados de Oficiales Pilotos
        const gradosHabilitados = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let query = { 
            grado: { $in: gradosHabilitados }, 
            activo: { $ne: false } 
        };

        // 2. Lógica de Jurisdicción (Sincro Joker)
        // Si no es ADMIN, filtramos obligatoriamente por su unidad/elemento
        const esAdmin = role.toUpperCase().replace(/[\s_-]/g, '') === 'ADMIN';
        
        if (!esAdmin) {
            const unidadUser = req.user.unidad || req.user.elemento;
            query.$or = [{ unidad: unidadUser }, { elemento: unidadUser }];
        } 
        // Si es Admin y seleccionó una unidad específica en el filtro del frontend
        else if (unidad && unidad !== 'all') {
            const uLimpia = unidad.trim().toUpperCase();
            query.$or = [{ unidad: uLimpia }, { elemento: uLimpia }];
        }

        const pilotos = await Tripulante.find(query)
            .select('grado apellido nombre unidad elemento habilitaciones')
            .sort({ grado: 1, apellido: 1 })
            .lean();

        res.status(200).json(pilotos);
    } catch (error) {
        console.error("❌ Error al obtener pilotos EBM:", error);
        res.status(500).json({ mensaje: "Error al obtener nómina de pilotos" });
    }
};