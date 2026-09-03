import Aircraft from '../models/Aircraft.js';

// Función auxiliar para parsear números decimales con seguridad
const parsearHs = (val) => {
    if (val === null || val === undefined || val === '') return 0;
    const num = parseFloat(String(val).replace(',', '.'));
    return isNaN(num) ? 0 : num;
};

// Sanitizador reutilizable para arreglos de componentes
const sanitizarComponentes = (comps = []) => {
    if (!Array.isArray(comps)) return [];
    return comps.map(c => ({
        ...c,
        nro: Number(c.nro) || 1,
        ata: String(c.ata || ''),
        pn: String(c.pn || ''),
        componente: String(c.componente || ''),
        sn: String(c.sn || ''),
        limiteTipo: String(c.limiteTipo || 'TBO'),
        limites: Array.isArray(c.limites) ? c.limites.map(l => ({
            valor: String(l.valor || ''),
            unidad: String(l.unidad || 'H')
        })) : [],
        instaladoFecha: String(c.instaladoFecha || ''),
        instaladoHoras: c.instaladoHoras !== undefined ? c.instaladoHoras : '',
        tsnCsnRenglones: Array.isArray(c.tsnCsnRenglones) ? c.tsnCsnRenglones.map(r => ({
            valor: String(r.valor || ''),
            unidad: String(r.unidad || 'H')
        })) : [],
        tgInstalacion: c.tgInstalacion !== undefined ? c.tgInstalacion : '',
        estadoTipo: String(c.estadoTipo || 'TSO'),
        estadoActual: c.estadoActual !== undefined ? c.estadoActual : '',
        disponibilidades: Array.isArray(c.disponibilidades) ? c.disponibilidades.map(d => ({
            valor: String(d.valor || ''),
            unidad: String(d.unidad || 'H')
        })) : []
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
            filtro = { unidad: elemento };
        } else if (unidad) {
            filtro = { unidad };
        } else if (!esMandoEstrategico) {
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

        // Parseo seguro de acumuladores numéricos del panel superior
        payload.inicioAeHs = parsearHs(payload.inicioAeHs);
        payload.tgPlaneadorActual = parsearHs(payload.tgPlaneadorActual);
        payload.tgPlaneadorLandings = parsearHs(payload.tgPlaneadorLandings);
        
        payload.motorTsn = parsearHs(payload.motorTsn);
        payload.motorCsnCso = parsearHs(payload.motorCsnCso);
        payload.motor2Tsn = parsearHs(payload.motor2Tsn);
        payload.motor2CsnCso = parsearHs(payload.motor2CsnCso);
        
        // HÉLICE 1 (TSN, DUR y Ciclos/CSN)
        payload.helice1Tsn = parsearHs(payload.helice1Tsn);
        payload.helice1Dur = parsearHs(payload.helice1Dur);
        payload.helice1CsnCso = parsearHs(payload.helice1CsnCso);

        // HÉLICE 2 (TSN, DUR y Ciclos/CSN)
        payload.helice2Tsn = parsearHs(payload.helice2Tsn);
        payload.helice2Dur = parsearHs(payload.helice2Dur);
        payload.helice2CsnCso = parsearHs(payload.helice2CsnCso);

        // Sanitización de arrays
        if (payload.compPlaneador) {
            payload.compPlaneador = sanitizarComponentes(payload.compPlaneador);
        }
        if (Array.isArray(payload.motores)) {
            payload.motores = payload.motores.map(m => ({
                ...m,
                componentes: sanitizarComponentes(m.componentes || [])
            }));
        }
        if (Array.isArray(payload.helices)) {
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

// 4. ACTUALIZAR AERONAVE O ESTADO (AQUÍ SE GUARDAN Y PERSISTEN TODOS LOS CAMPOS)
export const updateAircraftStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const campos = req.body;

        const aeronaveDoc = await Aircraft.findById(id);
        if (!aeronaveDoc) {
            return res.status(404).json({ success: false, message: 'Aeronave no encontrada' });
        }

        // --- PLANEADOR ---
        if (campos.tgPlaneadorActual !== undefined) {
            aeronaveDoc.tgPlaneadorActual = parsearHs(campos.tgPlaneadorActual);
            aeronaveDoc.markModified('tgPlaneadorActual');
        }
        if (campos.tgPlaneadorLandings !== undefined) {
            aeronaveDoc.tgPlaneadorLandings = parsearHs(campos.tgPlaneadorLandings);
            aeronaveDoc.markModified('tgPlaneadorLandings');
        }
        if (campos.inicioAeHs !== undefined) {
            aeronaveDoc.inicioAeHs = parsearHs(campos.inicioAeHs);
            aeronaveDoc.markModified('inicioAeHs');
        }
        
        // --- MOTORES ---
        if (campos.motorTsn !== undefined) {
            aeronaveDoc.motorTsn = parsearHs(campos.motorTsn);
            aeronaveDoc.markModified('motorTsn');
        }
        if (campos.motorCsnCso !== undefined) {
            aeronaveDoc.motorCsnCso = parsearHs(campos.motorCsnCso);
            aeronaveDoc.markModified('motorCsnCso');
        }
        if (campos.motor2Tsn !== undefined) {
            aeronaveDoc.motor2Tsn = parsearHs(campos.motor2Tsn);
            aeronaveDoc.markModified('motor2Tsn');
        }
        if (campos.motor2CsnCso !== undefined) {
            aeronaveDoc.motor2CsnCso = parsearHs(campos.motor2CsnCso);
            aeronaveDoc.markModified('motor2CsnCso');
        }

        // --- HÉLICE 1 (ASIGNACIÓN Y MARKMODIFIED EXPLÍCITO) ---
        if (campos.helice1Tsn !== undefined) {
            aeronaveDoc.helice1Tsn = parsearHs(campos.helice1Tsn);
            aeronaveDoc.markModified('helice1Tsn');
        }
        if (campos.helice1Dur !== undefined) {
            aeronaveDoc.helice1Dur = parsearHs(campos.helice1Dur);
            aeronaveDoc.markModified('helice1Dur');
        }
        if (campos.helice1CsnCso !== undefined) {
            aeronaveDoc.helice1CsnCso = parsearHs(campos.helice1CsnCso);
            aeronaveDoc.markModified('helice1CsnCso');
        }

        // --- HÉLICE 2 (ASIGNACIÓN Y MARKMODIFIED EXPLÍCITO) ---
        if (campos.helice2Tsn !== undefined) {
            aeronaveDoc.helice2Tsn = parsearHs(campos.helice2Tsn);
            aeronaveDoc.markModified('helice2Tsn');
        }
        if (campos.helice2Dur !== undefined) {
            aeronaveDoc.helice2Dur = parsearHs(campos.helice2Dur);
            aeronaveDoc.markModified('helice2Dur');
        }
        if (campos.helice2CsnCso !== undefined) {
            aeronaveDoc.helice2CsnCso = parsearHs(campos.helice2CsnCso);
            aeronaveDoc.markModified('helice2CsnCso');
        }

        // --- SUBCOMPONENTES Y ARRAYS ---
        if (campos.compPlaneador) {
            aeronaveDoc.compPlaneador = sanitizarComponentes(campos.compPlaneador);
            aeronaveDoc.markModified('compPlaneador');
        }

        if (Array.isArray(campos.motores)) {
            aeronaveDoc.motores = campos.motores.map(m => ({
                ...m,
                componentes: sanitizarComponentes(m.componentes || [])
            }));
            aeronaveDoc.markModified('motores');
        }

        if (Array.isArray(campos.helices)) {
            aeronaveDoc.helices = campos.helices.map(h => ({
                ...h,
                componentes: sanitizarComponentes(h.componentes || [])
            }));
            aeronaveDoc.markModified('helices');
        }

        // Lista completa de todos los acumuladores tratados manualmente
        const camposExcluidos = [
            'compPlaneador', 'motores', 'helices', 
            'tgPlaneadorLandings', 'tgPlaneadorActual', 'inicioAeHs',
            'motorTsn', 'motorCsnCso', 'motor2Tsn', 'motor2CsnCso',
            'helice1Tsn', 'helice1Dur', 'helice1CsnCso',
            'helice2Tsn', 'helice2Dur', 'helice2CsnCso'
        ];

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