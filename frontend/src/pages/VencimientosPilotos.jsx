import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Clock, AlertTriangle, Search, User } from 'lucide-react';
import { getTripulantes } from '../services/api';

const VencimientosPilotos = () => {
    const [personal, setPersonal] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('TODOS');

    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || '';
    const rawRole = localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const esMandoEstrategico = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);

    // Grados de oficiales permitidos
    const GRADOS_OFICIALES = ['CR', 'TC', 'MY', 'CT', 'TP', 'TT', 'ST'];

    useEffect(() => {
        cargarPilotos();
    }, []);

    const cargarPilotos = async () => {
        try {
            setLoading(true);
            const res = await getTripulantes();
            const data = res.data || [];
            
            // 1. Filtrar solo Oficiales (CR, TC, MY, CT, TP, TT, ST)
            const soloOficiales = data.filter(p => {
                const gradoNorm = p.grado ? p.grado.trim().toUpperCase() : '';
                return GRADOS_OFICIALES.includes(gradoNorm);
            });

            // 2. Filtrado por unidad / jerarquía de rol
            const dataFiltrada = esMandoEstrategico
                ? soloOficiales 
                : soloOficiales.filter(p => {
                    const u = p.elemento || p.unidad || '';
                    return u.trim().toUpperCase() === userUnidad;
                });

            setPersonal(dataFiltrada);
        } catch (error) {
            console.error("Error al cargar pilotos para vencimientos:", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper para obtener y validar la fecha (resuelve distintas nomenclaturas de backend)
    const obtenerFechaValida = (piloto, campos) => {
        for (let campo of campos) {
            if (piloto[campo]) {
                const f = new Date(piloto[campo]);
                if (!isNaN(f.getTime())) return f;
            }
        }
        return null;
    };

    // Helper para calcular días transcurridos a partir de un objeto Date o String
    const calcularDias = (fechaObj) => {
        if (!fechaObj) return null;
        const hoy = new Date();
        const difMs = hoy - fechaObj;
        return Math.floor(difMs / (1000 * 60 * 60 * 24));
    };

    // Evaluación estricta de las 3 reglas
    const evaluarPiloto = (piloto) => {
        // Mapeo robusto de campos para fecha de último vuelo general y nocturno
        const fechaGral = obtenerFechaValida(piloto, ['fechaUltimoVuelo', 'ultimoVuelo', 'fecha_ultimo_vuelo', 'fechaVuelo']);
        const fechaNoc = obtenerFechaValida(piloto, ['fechaUltimoVueloNocturno', 'ultimoVueloNocturno', 'fecha_ultimo_vuelo_nocturno', 'fechaNocturno']);

        const diasUltimoVuelo = calcularDias(fechaGral);
        const diasUltimoNocturno = calcularDias(fechaNoc);

        // Regla 1: 45 Días General
        const vencidoGeneral = diasUltimoVuelo === null || diasUltimoVuelo > 45;
        
        // Regla 2: 60 Días Nocturno
        const vencidoNocturno = diasUltimoNocturno === null || diasUltimoNocturno > 60;

        // Regla 3: Habilitaciones / Capacitaciones Especiales (365 Días)
        const especialidades = piloto.capacitacionesEspeciales || piloto.capacitaciones || [];
        const especialidadesVencidas = especialidades.filter(cap => {
            const fechaCap = obtenerFechaValida(cap, ['fechaUltimaActividad', 'fechaAdquisicion', 'fecha']);
            const diasCap = calcularDias(fechaCap);
            return diasCap === null || diasCap > 365;
        });

        const esVencidoTotal = vencidoGeneral || vencidoNocturno || especialidadesVencidas.length > 0;

        return {
            fechaGral,
            fechaNoc,
            diasUltimoVuelo,
            diasUltimoNocturno,
            vencidoGeneral,
            vencidoNocturno,
            especialidadesVencidas,
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
                ⌛ Analizando recientía de Oficiales...
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
                            <th style={styles.th}>Unidad</th>
                            <th style={styles.th}>Último Vuelo (Gral)</th>
                            <th style={styles.th}>Último Vuelo Nocturno</th>
                            <th style={styles.th}>Aptitudes / Habilitaciones</th>
                            <th style={{...styles.th, textAlign: 'center'}}>Estado Global</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaFiltrada.map(p => {
                            const { fechaGral, fechaNoc, diasUltimoVuelo, diasUltimoNocturno, vencidoGeneral, vencidoNocturno, especialidadesVencidas, esVencidoTotal } = p.evaluacion;

                            return (
                                <tr key={p._id || p.id} style={styles.tr}>
                                    <td style={{...styles.td, fontWeight: 'bold'}}>
                                        <User size={14} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#1b3a57' }} />
                                        {p.grado} {p.apellido}, {p.nombre}
                                    </td>
                                    <td style={styles.td}>{p.elemento || p.unidad || 'S/U'}</td>
                                    
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

                                    {/* Regla 3: Capacitaciones / Habilitaciones Especiales */}
                                    <td style={styles.td}>
                                        {(p.capacitacionesEspeciales || p.capacitaciones)?.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {(p.capacitacionesEspeciales || p.capacitaciones).map((cap, i) => {
                                                    const nombreCap = cap.tipo || cap.nombre || cap.descripcion || 'Especialidad';
                                                    const esVencidaCap = especialidadesVencidas.some(ev => (ev.tipo || ev.nombre) === nombreCap);
                                                    return (
                                                        <span key={i} style={{
                                                            ...styles.tagCap,
                                                            backgroundColor: esVencidaCap ? '#fef2f2' : '#f0fdf4',
                                                            color: esVencidaCap ? '#991b1b' : '#166534',
                                                            border: esVencidaCap ? '1px solid #f87171' : '1px solid #86efac'
                                                        }}>
                                                            {nombreCap}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Sin aptitudes registradas</span>
                                        )}
                                    </td>

                                    {/* Estado Consolidado */}
                                    <td style={{...styles.td, textAlign: 'center'}}>
                                        {esVencidoTotal ? (
                                            <span style={styles.statusVencido}>
                                                <AlertTriangle size={12} /> INHABILITADO
                                            </span>
                                        ) : (
                                            <span style={styles.statusAlDia}>
                                                <CheckCircle size={12} /> EN RECIENTÍA
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {listaFiltrada.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
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
    statusVencido: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#fef2f2', color: '#991b1b', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem', border: '1px solid #f87171' },
    statusAlDia: { display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f0fdf4', color: '#166534', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.7rem', border: '1px solid #86efac' }
};

export default VencimientosPilotos;