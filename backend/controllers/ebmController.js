const ExigenciaPlan = require('../models/ExigenciaPlan');
const Tripulante = require('../models/Tripulante');

exports.getPlanUnidad = async (req, res) => {
    try {
        const { unidad, anio } = req.query;
        // Buscamos el plan de esa unidad para ese año
        const planes = await ExigenciaPlan.find({ unidad, año: anio }).populate('piloto');
        res.json(planes);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener el plan EBM" });
    }
};

exports.savePlanIndividual = async (req, res) => {
    try {
        const { pilotoId, año, trimestres, unidad } = req.body;

        // Buscamos si ya existe un plan para ese piloto y año, si existe lo actualiza, si no lo crea
        const plan = await ExigenciaPlan.findOneAndUpdate(
            { piloto: pilotoId, año: año },
            { trimestres, unidad, piloto: pilotoId },
            { upsert: true, new: true }
        );

        res.json({ message: "Plan actualizado correctamente", plan });
    } catch (error) {
        res.status(500).json({ message: "Error al guardar el plan individual" });
    }
};

exports.getOficialesEBM = async (req, res) => {
    try {
        const { unidad, role } = req.query;
        
        // Filtro de jerarquía: Coronel a Subteniente
        const gradosOficiales = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];
        let query = { grado: { $in: gradosOficiales } };

        // Si no es superusuario, filtramos por su unidad
        const esSuperUser = ['ADMIN', 'DIRECTOR', 'BOSS'].includes(role?.toUpperCase());
        if (!esSuperUser) {
            query.unidad = unidad;
        }

        const oficiales = await Tripulante.find(query).sort({ grado: 1, apellido: 1 });
        res.json(oficiales);
    } catch (error) {
        res.status(500).json({ message: "Error al obtener oficiales" });
    }
};