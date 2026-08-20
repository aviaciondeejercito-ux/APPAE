import Componente from '../models/Componente.js';
import Aircraft from '../models/Aircraft.js';

// 1. ALTA EN POOL GENERAL (Creación inicial en la bolsa)
export const crearComponente = async (req, res) => {
  try {
    const { nombre, pn, sn, ata, nro, fechaFabricacion, limites, tsnCsnRenglones, estadoTipo, estadoActual, observaciones, usuario } = req.body;

    const existe = await Componente.findOne({ sn });
    if (existe) {
      return res.status(400).json({ mensaje: 'Ya existe un componente con ese Número de Serie (S/N).' });
    }

    const nuevoComponente = new Componente({
      componente: nombre,
      pn,
      sn,
      ata: ata || '',
      nro: nro || 1,
      fechaFabricacion: fechaFabricacion || null,
      limites: limites || [],
      tsnCsnRenglones: tsnCsnRenglones || [],
      estadoTipo: estadoTipo || 'TSO',
      estadoActual: estadoActual || '',
      estadoUbicacion: 'POOL_GENERAL',
      observaciones: observaciones || '',
      creadoPor: usuario || 'Sistema',
      historial: [{
        evento: 'ALTA_POOL',
        motivoObservaciones: 'Componente ingresado al Pool General.',
        usuario: usuario || 'Sistema'
      }]
    });

    await nuevoComponente.save();
    res.status(201).json({ mensaje: 'Componente creado exitosamente en el Pool General', componente: nuevoComponente });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al crear componente', error: error.message });
  }
};

// 2. LISTAR COMPONENTES (Filtros por estado, unidad o aeronave)
export const obtenerComponentes = async (req, res) => {
  try {
    const { estadoUbicacion, unidadAsignada, aeronaveInstalada, sn, pn } = req.query;
    const filtro = {};

    if (estadoUbicacion) filtro.estadoUbicacion = estadoUbicacion;
    if (unidadAsignada) filtro.unidadAsignada = unidadAsignada;
    if (aeronaveInstalada) filtro.aeronaveInstalada = aeronaveInstalada;
    if (sn) filtro.sn = new RegExp(sn, 'i');
    if (pn) filtro.pn = new RegExp(pn, 'i');

    const componentes = await Componente.find(filtro).sort({ createdAt: -1 });
    res.json(componentes);
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener componentes', error: error.message });
  }
};

// 3. ASIGNAR COMPONENTE A UNA UNIDAD (Reclamar del Pool General)
export const asignarAUnidad = async (req, res) => {
  try {
    const { id } = req.params;
    const { unidad, usuario, observaciones } = req.body;

    const componente = await Componente.findById(id);
    if (!componente) return res.status(404).json({ mensaje: 'Componente no encontrado' });

    componente.estadoUbicacion = 'ASIGNADO_UNIDAD';
    componente.unidadAsignada = unidad;
    
    componente.historial.push({
      evento: 'ASIGNACION_UNIDAD',
      unidad,
      motivoObservaciones: observaciones || `Asignado a la unidad ${unidad}`,
      usuario: usuario || 'Sistema'
    });

    await componente.save();
    res.json({ mensaje: `Componente asignado a ${unidad}`, componente });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al asignar unidad', error: error.message });
  }
};

// 4. MONTAR / INSTALAR EN AERONAVE
export const instalarEnAeronave = async (req, res) => {
  try {
    const { id } = req.params;
    const { matricula, posicionMontaje, fecha, hsAeronave, landingsAeronave, tgPlaneador, usuario } = req.body;

    const componente = await Componente.findById(id);
    if (!componente) return res.status(404).json({ mensaje: 'Componente no encontrado' });

    // Registro de Punto Cero de instalación
    componente.estadoUbicacion = 'INSTALADO';
    componente.aeronaveInstalada = matricula;
    componente.posicionMontaje = posicionMontaje; // "compPlaneador", "motores", "helices"
    componente.instaladoFecha = fecha || new Date().toISOString().split('T')[0];
    componente.instaladoHoras = hsAeronave || 0;
    componente.tgInstalacion = tgPlaneador || 0;
    componente.landingsInstalacion = landingsAeronave || 0;

    componente.historial.push({
      evento: 'MONTAJE_AERONAVE',
      unidad: componente.unidadAsignada,
      aeronaveMatricula: matricula,
      posicion: posicionMontaje,
      hsAeronaveAlMomento: hsAeronave,
      landingsAeronaveAlMomento: landingsAeronave,
      motivoObservaciones: `Instalado en aeronave ${matricula} en posición ${posicionMontaje}`,
      usuario: usuario || 'Sistema'
    });

    await componente.save();
    res.json({ mensaje: `Componente montado en aeronave ${matricula}`, componente });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al instalar en aeronave', error: error.message });
  }
};

// 5. DESMONTARE / REMOVER DE AERONAVE
export const desmontarDeAeronave = async (req, res) => {
  try {
    const { id } = req.params;
    const { destino, hsAeronaveActuales, landingsAeronaveActuales, motivo, usuario } = req.body; 
    // destino: 'ASIGNADO_UNIDAD', 'POOL_GENERAL', 'EN_TALLER'

    const componente = await Componente.findById(id);
    if (!componente) return res.status(404).json({ mensaje: 'Componente no encontrado' });

    // Cálculo del delta consumido mientras estuvo montado
    const deltaHoras = Math.max(0, Number(hsAeronaveActuales || 0) - Number(componente.instaladoHoras || 0));
    const deltaLandings = Math.max(0, Number(landingsAeronaveActuales || 0) - Number(componente.landingsInstalacion || 0));

    // Consolidación de horas/ciclos consumidos en el estado del componente
    if (typeof componente.estadoActual === 'number') {
      componente.estadoActual += deltaHoras;
    }

    const matriculaPrevia = componente.aeronaveInstalada;

    // Reset de instalación y cambio de estado
    componente.estadoUbicacion = destino || 'ASIGNADO_UNIDAD';
    componente.aeronaveInstalada = '';
    componente.posicionMontaje = '';
    componente.instaladoHoras = 0;
    componente.landingsInstalacion = 0;

    componente.historial.push({
      evento: 'DESMONTAJE_AERONAVE',
      aeronaveMatricula: matriculaPrevia,
      hsAeronaveAlMomento: hsAeronaveActuales,
      landingsAeronaveAlMomento: landingsAeronaveActuales,
      estadoActualComponente: componente.estadoActual,
      motivoObservaciones: motivo || `Desmontado de ${matriculaPrevia}. Horas consumidas en el tramo: ${deltaHoras} hs`,
      usuario: usuario || 'Sistema'
    });

    await componente.save();
    res.json({ mensaje: `Componente removido de ${matriculaPrevia} y enviado a ${componente.estadoUbicacion}`, componente });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al desmontar de aeronave', error: error.message });
  }
};

// 6. ACTUALIZACIÓN AUTOMÁTICA POR VUELO (Invocado al registrar un vuelo en la aeronave)
export const sincronizarVueloComponentes = async (matricula, horasVoladas, landingsRealizados) => {
  try {
    const componentesInstalados = await Componente.find({ aeronaveInstalada: matricula, estadoUbicacion: 'INSTALADO' });

    for (let comp of componentesInstalados) {
      // Suma de horas al estado actual dinámico
      if (typeof comp.estadoActual === 'number') {
        comp.estadoActual += Number(horasVoladas);
      }

      // Descuento de disponibilidades si están declaradas
      if (comp.disponibilidades && comp.disponibilidades.length > 0) {
        comp.disponibilidades = comp.disponibilidades.map(d => {
          if (d.unidad === 'H') {
            const valNum = parseFloat(d.valor) || 0;
            return { ...d, valor: String(Math.max(0, valNum - horasVoladas).toFixed(1)) };
          }
          if (d.unidad === 'L' || d.unidad === 'C') {
            const valNum = parseFloat(d.valor) || 0;
            return { ...d, valor: String(Math.max(0, valNum - landingsRealizados).toFixed(0)) };
          }
          return d;
        });
      }

      await comp.save();
    }
    return { ok: true, actualizados: componentesInstalados.length };
  } catch (error) {
    console.error('Error al sincronizar componentes post-vuelo:', error);
    throw error;
  }
};

// 7. DAR DE BAJA
export const darDeBaja = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, usuario } = req.body;

    const componente = await Componente.findById(id);
    if (!componente) return res.status(404).json({ mensaje: 'Componente no encontrado' });

    componente.estadoUbicacion = 'BAJA';
    componente.aeronaveInstalada = '';

    componente.historial.push({
      evento: 'BAJA',
      motivoObservaciones: motivo || 'Componente dado de baja por límite de vida útil o descarte',
      usuario: usuario || 'Sistema'
    });

    await componente.save();
    res.json({ mensaje: 'Componente dado de baja correctamente', componente });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al dar de baja el componente', error: error.message });
  }
};