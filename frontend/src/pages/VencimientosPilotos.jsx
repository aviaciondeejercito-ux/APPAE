import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, Search, User } from 'lucide-react';
import { getTripulantes, getVuelos } from '../services/api';

const VencimientosPilotos = () => {
    const [personal, setPersonal] = useState([]);
    const [vuelosHistorial, setVuelosHistorial] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');

    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || '';
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);

    // Escala jerárquica de antigüedad para Oficiales
    const ORDEN_JERARQUICO = {
        'CR': 1,
        'TC': 2,
        'MY': 3,
        'CT': 4,
        'TP': 5,
        'TT': 6,
        'ST': 7
    };

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            
            const [resTripulantes, resVuelos] = await Promise.all([
                getTripulantes().catch(() => ({ data: [] })),
                getVuelos ? getVuelos().catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
            ]);

            const tripulantesData = resTripulantes.data || resTripulantes || [];
            const vuelosData = resVuelos.data || resVuelos || [];

            setVuelosHistorial(vuelosData);

            // 1. Filtrar solo Oficiales requeridos
            const soloOficiales = tripulantesData.filter(p => {
                const gradoNorm = p.grado ? p.grado.trim().toUpperCase() : '';
                return ORDEN_JERARQUICO.hasOwnProperty(gradoNorm);
            });

            // 2. Filtrado por unidad según rol
            const dataFiltrada = esMandoEstrategico
                ? soloOficiales 
                : soloOficiales.filter(p => {
                    const u = p.elemento || p.unidad || '';
                    return u.trim().toUpperCase() === userUnidad;
                });

            // 3. Ordenar por jerarquía de antigüedad y luego alfabéticamente por apellido
            const dataOrdenada = [...dataFiltrada].sort((a, b) => {
                const gradoA = a.grado ? a.grado.trim().toUpperCase() : '';
                const gradoB = b.grado ? b.grado.trim().toUpperCase() : '';

                const jerarquiaA = ORDEN_JERARQUICO[gradoA] || 99;
                const jerarquiaB = ORDEN_JERARQUICO[gradoB] || 99;

                if (jerarquiaA !== jerarquiaB) {
                    return jerarquiaA - jerarquiaB;
                }

                const apellidoA = (a.apellido || '').toLowerCase();
                const apellidoB = (b.apellido || '').toLowerCase();
                return apellidoA.localeCompare(apellidoB, 'es', { sensitivity: 'base' });
            });

            setPersonal(dataOrdenada);
        } catch (error) {
            console.error("Error al cargar datos de vencimientos:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper robusto para parsear fechas de MongoDB ($date o ISO string)
    const parseFecha = (fechaValor) => {
        if (!fechaValor) return null;
        let fechaStr = fechaValor;
        if (typeof fechaValor === 'object' && fechaValor.$date) {
            fechaStr = fechaValor.$date;
        }
        const f = new Date(fechaStr);
        return isNaN(f.getTime()) ? null : f;
    };

    // Helper para extraer ID seguro de MongoDB ($oid, string u objeto)
    const extraerId = (campo) => {
        if (!campo) return '';
        if (typeof campo === 'object') {
            if (campo.$oid) return campo.$oid.toLowerCase();
            if (campo._id) return extraerId(campo._id);
            if (campo.id) return extraerId(campo.id);
        }
        return String(campo).toLowerCase();
    };

    // Helper para calcular días transcurridos a la fecha
    const calcularDias = (fechaObj) => {
        if (!fechaObj) return null;
        const hoy = new Date();
        const difMs = hoy - fechaObj;
        return Math.floor(difMs / (1000 * 60 * 60 * 24));
    };

    // Normalizador de texto para comparar especialidades/misiones
    const normalizarTexto = (str) => {
        if (!str) return '';
        return String(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    };

    // 🔹 Cruce estricto de vuelos por MongoDB Extended JSON
    const obtenerAnalisisVuelos = (piloto) => {
        const idPiloto = extraerId(piloto._id || piloto.id);

        // Filtrar vuelos donde el piloto figura como piloto, copiloto o instructor por ID
        const vuelosDelPiloto = vuelosHistorial.filter(vuelo => {
            const idPilotoVuelo = extraerId(vuelo.piloto);
            const idCopilotoVuelo = extraerId(vuelo.copiloto);
            const idInstructorVuelo = extraerId(vuelo.instructor);

            return idPiloto && (idPilotoVuelo === idPiloto || idCopilotoVuelo === idPiloto || idInstructorVuelo === idPiloto);
        });

        // 1. Fecha de último vuelo general
        let fechaGral = parseFecha(piloto.fechaUltimoVuelo || piloto.ultimoVuelo);
        vuelosDelPiloto.forEach(v => {
            const fVuelo = parseFecha(v.fecha);
            if (fVuelo && (!fechaGral || fVuelo > fechaGral)) {
                fechaGral = fVuelo;
            }
        });

        // 2. Fecha de último vuelo nocturno (condicion === 'Nocturno' o usoNVG === true)
        let fechaNoc = parseFecha(piloto.fechaUltimoVueloNocturno || piloto.ultimoVueloNocturno);
        vuelosDelPiloto.forEach(v => {
            const condicionStr = normalizarTexto(v.condicion);
            const esNocturno = condicionStr === 'nocturno' || v.usoNVG === true;
            if (esNocturno) {
                const fVuelo = parseFecha(v.fecha);
                if (fVuelo && (!fechaNoc || fVuelo > fechaNoc)) {
                    fechaNoc = fVuelo;
                }
            }
        });

        // 3. Evaluar habilitaciones / misiones realizadas dentro del año (365 días)
        const especialidadesBase = piloto.capacitacionesEspeciales || piloto.capacitaciones || [];
        const especialidadesEvaluadas = especialidadesBase.map(cap => {
            const nombreCap = cap.tipo || cap.nombre || cap.descripcion || (typeof cap === 'string' ? cap : 'Especialidad');
            const normCap = normalizarTexto(nombreCap);

            // Buscar en el historial si ejecutó una misión equivalente hace menos de 365 días
            let fechaUltimaMision = parseFecha(cap.fechaUltimaActividad || cap.fechaAdquisicion || cap.fecha);

            vuelosDelPiloto.forEach(v => {
                const tipoMisionNorm = normalizarTexto(v.tipoMision);
                const condicionNorm = normalizarTexto(v.condicion);
                const reglasNorm = normalizarTexto(v.reglasVuelo);

                const coincideMision = tipoMisionNorm.includes(normCap) || 
                                       normCap.includes(tipoMisionNorm) ||
                                       (normCap.includes('nocturno') && (condicionNorm === 'nocturno' || v.usoNVG)) ||
                                       (normCap.includes('ifr') && reglasNorm === 'ifr');

                if (coincideMision) {
                    const fVuelo = parseFecha(v.fecha);
                    if (fVuelo && (!fechaUltimaMision || fVuelo > fechaUltimaMision)) {
                        fechaUltimaMision = fVuelo;
                    }
                }
            });

            const diasTranscurridos = calcularDias(fechaUltimaMision);
            const esVencida = diasTranscurridos === null || diasTranscurridos > 365;

            return {
                nombre: nombreCap,
                fecha: fechaUltimaMision,
                dias: diasTranscurridos,
                esVencida
            };
        });

        return { fechaGral, fechaNoc, especialidadesEvaluadas };
    };

    const evaluarPiloto = (piloto) => {
        const { fechaGral, fechaNoc, especialidadesEvaluadas } = obtenerAnalisisVuelos(piloto);

        const diasUltimoVuelo = calcularDias(fechaGral);
        const diasUltimoNocturno = calcularDias(fechaNoc);

        const vencidoGeneral = diasUltimoVuelo === null || diasUltimoVuelo > 45;
        const vencidoNocturno = diasUltimoNocturno === null || diasUltimoNocturno > 60;
        const tieneEspecialidadesVencidas = especialidadesEvaluadas.some(e => e.esVencida);

        // 🔹 Determinación exacta del Estado según combinación
        let estadoLabel = 'RECIENTE';
        let estadoTipo = 'OK'; // 'OK', 'WARNING', 'DANGER'

        if (vencidoGeneral && vencidoNocturno) {
            estadoLabel = 'Readaptación completa';
            estadoTipo = 'DANGER';
        } else if (vencidoGeneral) {
            estadoLabel = 'Readaptación General';
            estadoTipo = 'WARNING';
        } else if (vencidoNocturno) {
            estadoLabel = 'Readaptación Nocturno';
            estadoTipo = 'WARNING';
        } else if (tieneEspecialidadesVencidas) {
            estadoLabel = 'Aptitudes Vencidas';
            estadoTipo = 'WARNING';
        }

        const esVencidoTotal = estadoTipo !== 'OK';

        return {
            fechaGral,
            fechaNoc,
            diasUltimoVuelo,
            diasUltimoNocturno,
            vencidoGeneral,
            vencidoNocturno,
            especialidadesEvaluadas,
            estadoLabel,
            estadoTipo,
            esVencidoTotal
        };
    };

    const listaProcesada = personal.map(p => ({
        ...p,
        evaluacion: evaluarPiloto(p)
    }));

    const listaFiltrada = listaProcesada.filter(p => {
        const coincideBusqueda = `${p.grado} ${p.apellido} ${p.nombre}`.toLowerCase().includes(busqueda.toLowerCase());
        if (!coincideBusqueda) return false;

        if (filtroEstado === 'VENCIDOS') return p.evaluacion.esVencidoTotal;
        if (filtroEstado === 'AL_DIA') return !p.evaluacion.esVencidoTotal;
        return true;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', fontWeight: 'bold', color: '#1b3a57' }}>
                ⌛ Sincronizando vuelos en formato MongoDB y verificando recientía...
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h2 style={styles.title}>⏱️ Vencimiento Pilotos (Oficiales)</h2>
                    <p style={styles.subtitle}>Límites de recientía (45d General / 60d Nocturno / 365d Habilitaciones Especiales)</p>
                </div>
            </div>

            {/* Filtros */}
            <div style={styles.filterBar}>
                <div style={styles.searchWrapper}>
                    <Search size={16} color="#7f8c8d" />
                    <input 
                        type="text" 
                        placeholder="Buscar por apellido, nombre o grado..." 
                        value={busqueda} 
                        onChange={(e) => setBusqueda(e.target.value)}
                        style={styles.inputSearch}
                    />
                </div>

                <div style={styles.btnGroup}>
                    <button 
                        onClick={() => setFiltroEstado('TODOS')} 
                        style={{...styles.btnFilter, backgroundColor: filtroEstado === 'TODOS' ? '#1b3a57' : '#e2e8f0', color: filtroEstado === 'TODOS' ? 'white' : '#334155'}}
                    >
                        Todos ({listaProcesada.length})
                    </button>
                    <button 
                        onClick={() => setFiltroEstado('VENCIDOS')} 
                        style={{...styles.btnFilter, backgroundColor: filtroEstado === 'VENCIDOS' ? '#c0392b' : '#fef2f2', color: filtroEstado === 'VENCIDOS' ? 'white' : '#991b1b'}}
                    >
                        🚨 Vencidos ({listaProcesada.filter(p => p.evaluacion.esVencidoTotal).length})
                    </button>
                    <button 
                        onClick={() => setFiltroEstado('AL_DIA')} 
                        style={{...styles.btnFilter, backgroundColor: filtroEstado === 'AL_DIA' ? '#27ae60' : '#f0fdf4', color: filtroEstado === 'AL_DIA' ? 'white' : '#166534'}}
                    >
                        ✅ Al Día ({listaProcesada.filter(p => !p.evaluacion.esVencidoTotal).length})
                    </button>
                </div>
            </div>

            {/* Tabla de Vencimientos */}
            <div style={styles.tableCard}>
                <table style={styles.table}>
                    <thead>
                        <tr style={styles.thRow}>
                            <th style={styles.th}>Oficial</th>
                            <th style={styles.th}>Último Vuelo (Gral)</th>
                            <th style={styles.th}>Último Vuelo Nocturno</th>
                            <th style={styles.th}>Aptitudes / Habilitaciones (365d)</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Estado Global</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaFiltrada.map(p => {
                            const { fechaGral, fechaNoc, diasUltimoVuelo, diasUltimoNocturno, vencidoGeneral, vencidoNocturno, especialidadesEvaluadas, estadoLabel, estadoTipo } = p.evaluacion;

                            return (
                                <tr key={p._id?.$oid || p._id || p.id} style={styles.tr}>
                                    <td style={{...styles.td, fontWeight: 'bold'}}>
                                        <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#1b3a57' }} />
                                        {p.grado} {p.apellido}, {p.nombre}
                                    </td>

                                    {/* Regla 1: Fecha Vuelo General */}
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 'bold', color: vencidoGeneral ? '#c0392b' : '#27ae60' }}>
                                                {fechaGral ? fechaGral.toLocaleDateString('es-AR') : 'Sin Registro'}
                                            </span>
                                            <span style={{...styles.badgeDays, backgroundColor: vencidoGeneral ? '#fef2f2' : '#f0fdf4', color: vencidoGeneral ? '#991b1b' : '#166534'}}>
                                                {diasUltimoVuelo !== null ? `${diasUltimoVuelo}d` : 'S/D'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Regla 2: Fecha Vuelo Nocturno */}
                                    <td style={styles.td}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 'bold', color: vencidoNocturno ? '#c0392b' : '#27ae60' }}>
                                                {fechaNoc ? fechaNoc.toLocaleDateString('es-AR') : 'Sin Registro'}
                                            </span>
                                            <span style={{...styles.badgeDays, backgroundColor: vencidoNocturno ? '#fef2f2' : '#f0fdf4', color: vencidoNocturno ? '#991b1b' : '#166534'}}>
                                                {diasUltimoNocturno !== null ? `${diasUltimoNocturno}d` : 'S/D'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Regla 3: Habilitaciones Especiales */}
                                    <td style={styles.td}>
                                        {especialidadesEvaluadas.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {especialidadesEvaluadas.map((cap, i) => (
                                                    <span key={i} style={{
                                                        ...styles.tagCap,
                                                        backgroundColor: cap.esVencida ? '#fef2f2' : '#f0fdf4',
                                                        color: cap.esVencida ? '#991b1b' : '#166534',
                                                        border: cap.esVencida ? '1px solid #f87171' : '1px solid #86efac'
                                                    }}>
                                                        {cap.nombre} {cap.dias !== null ? `(${cap.dias}d)` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin aptitudes registradas</span>
                                        )}
                                    </td>

                                    {/* Estado Consolidado según condiciones */}
                                    <td style={{...styles.td, textAlign: 'center'}}>
                                        {estadoTipo === 'OK' && (
                                            <span style={styles.statusAlDia}>
                                                <CheckCircle size={12} /> {estadoLabel}
                                            </span>
                                        )}
                                        {estadoTipo === 'WARNING' && (
                                            <span style={styles.statusWarning}>
                                                <AlertTriangle size={12} /> {estadoLabel}
                                            </span>
                                        )}
                                        {estadoTipo === 'DANGER' && (
                                            <span style={styles.statusDanger}>
                                                <AlertTriangle size={12} /> {estadoLabel}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {listaFiltrada.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    No se encontraron Oficiales registrados o en el filtro seleccionado.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto' },
    header: { marginBottom: '20px' },
    title: { fontSize: '1.4rem', fontWeight: 'bold', color: '#1b3a57', margin: 0 },
    subtitle: { fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' },
    filterBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', gap: '15px', flexWrap: 'wrap' },
    searchWrapper: { display: 'flex', alignItems: 'center', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', minWidth: '280px' },
    inputSearch: { border: 'none', outline: 'none', marginLeft: '8px', fontSize: '0.85rem', width: '100%' },
    btnGroup: { display: 'flex', gap: '8px' },
    btnFilter: { border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' },
    tableCard: { backgroundColor: 'white', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflowX: 'auto', border: '1px solid #e2e8f0' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' },
    thRow: { backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' },
    th: { padding: '12px 15px', fontSize: '0.75rem', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' },
    tr: { borderBottom: '1px solid #f1f5f9' },
    td: { padding: '12px 15px', color: '#334155' },
    badgeDays: { fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
    tagCap: { fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
    statusAlDia: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem', border: '1px solid #86efac' },
    statusWarning: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fefce8', color: '#a16207', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem', border: '1px solid #fde047' },
    statusDanger: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem', border: '1px solid #f87171' }
};

export default VencimientosPilotos;