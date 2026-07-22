import Aircraft from '../models/Aircraft.js';

// Función auxiliar para parsear números decimales con seguridad
const parsearHs = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? 0 : num;
};

// Sanitizador reutilizable para arreglos de componentes
const sanitizarComponentes = (comps = []) => {
    return comps.map(c => ({
        ...c,
        nro: Number(c.nro) || 1,
        ata: String(c.ata || ''),
        pn: String(c.pn || ''),
        componente: String(c.componente || ''),
        sn: String(c.sn || ''),
        limiteTipo: String(c.limiteTipo || 'TBO'),
        limites: (c.limites || []).map(l => ({
            valor: String(l.valor || ''),
            unidad: String(l.unidad || 'H')
        })),
        instaladoFecha: String(c.instaladoFecha || ''),
        instaladoHoras: c.instaladoHoras !== undefined ? c.instaladoHoras : '',
        tsnCsnRenglones: (c.tsnCsnRenglones || []).map(r => ({
            valor: String(r.valor || ''),
            unidad: String(r.unidad || 'H')
        })),
        tgInstalacion: c.tgInstalacion !== undefined ? c.tgInstalacion : '',
        estadoTipo: String(c.estadoTipo || 'TSO'),
        estadoActual: c.estadoActual !== undefined ? c.estadoActual : '',
        disponibilidades: (c.disponibilidades || []).map(d => ({
            valor: String(d.valor || ''),
            unidad: String(d.unidad || 'H')
        }))
    }));
};

// 1. OBTENER TODAS LAS AERONAVES CON FILTRADO POR UNIDAD / ELEMENTO
export const getAircrafts = async (req, res) => {
    try {
        const { elemento } = req.params;
        const { unidad } = req.query;

        // Roles con acceso global a toda la flota
        const rolesEstrategicos = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'];
        const esMandoEstrategico = rolesEstrategicos.includes(req.user?.role?.toUpperCase()) || req.user?.elemento === 'COMANDO';

        let filtro = {};

        if (elemento) {
            // Filtro por parámetro de ruta /elemento/:elemento
            filtro = { unidad: elemento };
        } else if (unidad) {
            // Filtro por parámetro query ?unidad=...
            filtro = { unidad };
        } else if (!esMandoEstrategico) {
            // Si es un usuario de unidad sin permisos globales, forzamos el filtro por su unidad asignada
            filtro = { unidad: req.user?.elemento || req.user?.unidad };
        }

        const aircrafts = await Aircraft.find(filtro).sort({ matricula: 1 });

        res.status(200).json({
            success: true,
            count: aircrafts.length,
            data: aircrafts
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener aeronaves', error: error.message });
    }
};

// 2. OBTENER AERONAVE POR MATRÍCULA
export const getAircraftByMatricula = async (req, res) => {
    try {
        const { matricula } = req.params;
        const aircraft = await Aircraft.findOne({ matricula: matricula.toUpperCase() });
        
        if (!aircraft) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        res.status(200).json({
            success: true,
            data: aircraft
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al obtener la aeronave', error: error.message });
    }
};

// 3. CREAR AERONAVE
export const createAircraft = async (req, res) => {
    try {
        const payload = { ...req.body };

        if (payload.matricula) payload.matricula = payload.matricula.toUpperCase();

        payload.inicioAeHs = parsearHs(payload.inicioAeHs);
        payload.tgPlaneadorActual = parsearHs(payload.tgPlaneadorActual);
        payload.tgPlaneadorLandings = parsearHs(payload.tgPlaneadorLandings);
        
        payload.motorTsn = parsearHs(payload.motorTsn);
        payload.motorCsnCso = parsearHs(payload.motorCsnCso);
        payload.motor2Tsn = parsearHs(payload.motor2Tsn);
        payload.motor2CsnCso = parsearHs(payload.motor2CsnCso);
        
        payload.helice1Tsn = parsearHs(payload.helice1Tsn);
        payload.helice2Tsn = parsearHs(payload.helice2Tsn);

        if (payload.compPlaneador) {
            payload.compPlaneador = sanitizarComponentes(payload.compPlaneador);
        }
        if (payload.motores) {
            payload.motores = payload.motores.map(m => ({
                ...m,
                componentes: sanitizarComponentes(m.componentes || [])
            }));
        }
        if (payload.helices) {
            payload.helices = payload.helices.map(h => ({
                ...h,
                componentes: sanitizarComponentes(h.componentes || [])
            }));
        }

        const newAircraft = new Aircraft(payload);
        await newAircraft.save();

        res.status(201).json({
            success: true,
            message: 'Aeronave creada exitosamente.',
            data: newAircraft
        });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error al crear la aeronave', error: error.message });
    }
};

// 4. ACTUALIZAR AERONAVE O ESTADO
export const updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const campos = req.body;

        const aeronaveDoc = await Aircraft.findById(id);
        if (!aeronaveDoc) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        if (campos.tgPlaneadorActual !== undefined) aeronaveDoc.tgPlaneadorActual = parsearHs(campos.tgPlaneadorActual);
        if (campos.tgPlaneadorLandings !== undefined) aeronaveDoc.tgPlaneadorLandings = parsearHs(campos.tgPlaneadorLandings);
        if (campos.inicioAeHs !== undefined) aeronaveDoc.inicioAeHs = parsearHs(campos.inicioAeHs);
        
        if (campos.motorTsn !== undefined) aeronaveDoc.motorTsn = parsearHs(campos.motorTsn);
        if (campos.motorCsnCso !== undefined) aeronaveDoc.motorCsnCso = parsearHs(campos.motorCsnCso);
        if (campos.motor2Tsn !== undefined) aeronaveDoc.motor2Tsn = parsearHs(campos.motor2Tsn);
        if (campos.motor2CsnCso !== undefined) aeronaveDoc.motor2CsnCso = parsearHs(campos.motor2CsnCso);
        if (campos.helice1Tsn !== undefined) aeronaveDoc.helice1Tsn = parsearHs(campos.helice1Tsn);
        if (campos.helice2Tsn !== undefined) aeronaveDoc.helice2Tsn = parsearHs(campos.helice2Tsn);

        if (campos.compPlaneador) {
            aeronaveDoc.compPlaneador = sanitizarComponentes(campos.compPlaneador);
            aeronaveDoc.markModified('compPlaneador');
        }

        if (campos.motores) {
            aeronaveDoc.motores = campos.motores.map(m => ({
                ...m,
                componentes: sanitizarComponentes(m.componentes || [])
            }));
            aeronaveDoc.markModified('motores');
        }

        if (campos.helices) {
            aeronaveDoc.helices = campos.helices.map(h => ({
                ...h,
                componentes: sanitizarComponentes(h.componentes || [])
            }));
            aeronaveDoc.markModified('helices');
        }

        const camposExcluidos = ['compPlaneador', 'motores', 'helices', 'tgPlaneadorLandings', 'tgPlaneadorActual', 'inicioAeHs'];
        Object.keys(campos).forEach(key => {
            if (!camposExcluidos.includes(key)) {
                aeronaveDoc[key] = campos[key];
            }
        });

        const aeronaveGuardada = await aeronaveDoc.save();

        res.status(200).json({
            success: true,
            message: 'Aeronave actualizada exitosamente.',
            data: aeronaveGuardada
        });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Error al actualizar la aeronave', error: error.message });
    }
};

// 5. ELIMINAR AERONAVE
export const deleteAircraft = async (req, res) => {
    try {
        const { id } = req.params;
        await Aircraft.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: 'Aeronave eliminada con éxito' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error al eliminar la aeronave', error: error.message });
    }
};