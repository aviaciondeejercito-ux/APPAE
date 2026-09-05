import React, { useEffect, useState, useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

const API_BASE_URL = window.location.hostname === 'localhost' ? '' : 'https://appae.onrender.com';

const EXIGENCIAS = {
    generales: [
        { clave: 'despegueNormal', nombre: 'Despegue Normal', periodo: 'Mes', requeridos: { COPIL: 2, PIL: 1, INSTR: 2 } },
        { clave: 'despegueMinimaDistancia', nombre: 'Despegue Corto', periodo: 'Mes', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'aterrizajeNormal', nombre: 'Aterrizaje Normal', periodo: 'Mes', requeridos: { COPIL: 2, PIL: 1, INSTR: 2 } },
        { clave: 'aterrizajeMinimaDistancia', nombre: 'Aterrizaje Corto', periodo: 'Mes', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'toqueYMotor', nombre: 'Toque y Motor', periodo: 'Mes', requeridos: { COPIL: 2, PIL: 1, INSTR: 1 } },
        { clave: 'circuitoTransitoVisual', nombre: 'Circuito Visual', periodo: 'Mes', requeridos: { COPIL: 2, PIL: 1, INSTR: 1 } },
        { clave: 'escapeGoAround', nombre: 'Circuito de Tránsito', periodo: 'Mes', requeridos: { COPIL: 3, PIL: 1, INSTR: 1 } }
    ],
    ifr: [
        { clave: 'partidaEstandarizadaIFR', nombre: 'Partida Inst. (SID)', periodo: 'Trimestre', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'arriboEstandarizadoIFR', nombre: 'Arribo Inst. (STAR)', periodo: 'Trimestre', requeridos: { COPIL: 2, PIL: 1, INSTR: 1 } },
        { clave: 'aproxNoPrecision', nombre: 'Aprox. No Precisión', periodo: 'Mes', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'aproxPrecision', nombre: 'Aprox. Precisión', periodo: 'Mes', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } }
    ],
    nocturno: [
        { clave: 'despegueNocturno', nombre: 'Despegue Nocturno', periodo: 'Trimestre', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'aterrizajeNocturno', nombre: 'Aterrizaje Nocturno', periodo: 'Trimestre', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } },
        { clave: 'circuitoTransitoNocturno', nombre: 'Circuito Nocturno', periodo: 'Trimestre', requeridos: { COPIL: 1, PIL: 1, INSTR: 1 } }
    ]
};

const TrainingDashboardPage = () => {
    const [stats, setStats] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [pilotoSeleccionado, setPilotoSeleccionado] = useState('TODOS');

    const userUnidad = localStorage.getItem('elemento') || localStorage.getItem('unidad') || '';

    useEffect(() => {
        const obtenerDatos = async () => {
            setCargando(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/training/dashboard-stats`);
                const json = await res.json();
                if (json.success && Array.isArray(json.data)) {
                    setStats(json.data);
                }
            } catch (error) {
                console.error("Error al cargar estadísticas:", error);
            } finally {
                setCargando(false);
            }
        };

        obtenerDatos();
    }, []);

    const dataDisplay = useMemo(() => {
        return stats.filter(t => {
            if (!userUnidad) return true;
            const uTrip = (t.unidad || '').toUpperCase().trim();
            const uUser = userUnidad.toUpperCase().trim();
            return !uTrip || uTrip === uUser;
        });
    }, [stats, userUnidad]);

    const evaluacionPilotos = useMemo(() => {
        return dataDisplay.map(t => {
            const funcion = (t.funcion || t.rol || 'PIL').toUpperCase();
            const funcionValida = ['COPIL', 'PIL', 'INSTR'].includes(funcion) ? funcion : 'PIL';
            const proced = t.procedimientos || {};

            let totalExigidos = 0;
            let totalCompletados = 0;
            let totalRealizadosAbsolutos = 0;

            const evaluarSeccion = (items) => {
                return items.map(req => {
                    const meta = req.requeridos[funcionValida] || 1;
                    const realizado = proced[req.clave] || 0;
                    const cumplido = realizado >= meta;

                    totalExigidos += meta;
                    totalCompletados += Math.min(realizado, meta);
                    totalRealizadosAbsolutos += realizado;

                    return { ...req, meta, realizado, cumplido, faltantes: Math.max(0, meta - realizado) };
                });
            };

            const generales = evaluarSeccion(EXIGENCIAS.generales);
            const ifr = evaluarSeccion(EXIGENCIAS.ifr);
            const nocturno = evaluarSeccion(EXIGENCIAS.nocturno);

            const porcentaje = totalExigidos > 0 ? Math.round((totalCompletados / totalExigidos) * 100) : 0;

            return {
                id: t.tripulanteId || t._id,
                nombre: t.nombre || 'Sin Nombre',
                funcion: funcionValida,
                vuelos: t.totalVuelos || 0,
                porcentaje,
                alDia: porcentaje >= 100,
                totalExigidos,
                totalCompletados,
                totalFaltantes: Math.max(0, totalExigidos - totalCompletados),
                totalRealizadosAbsolutos,
                detalles: { 'Generales': generales, 'Reglas IFR': ifr, 'Vuelo Nocturno': nocturno }
            };
        });
    }, [dataDisplay]);

    const pilotoEnFoco = useMemo(() => {
        if (pilotoSeleccionado === 'TODOS') return null;
        return evaluacionPilotos.find(p => String(p.id) === String(pilotoSeleccionado));
    }, [pilotoSeleccionado, evaluacionPilotos]);

    // Datos consolidado para Torta General
    const pieDataEstadoGeneral = useMemo(() => {
        const alDia = evaluacionPilotos.filter(p => p.alDia).length;
        const pendientes = evaluacionPilotos.length - alDia;
        return [
            { name: 'Al Día (100%)', value: alDia, color: '#27ae60' },
            { name: 'Pendiente', value: pendientes, color: '#e74c3c' }
        ];
    }, [evaluacionPilotos]);

    // Datos de Radar / Perfil para Piloto Seleccionado
    const radarDataPiloto = useMemo(() => {
        if (!pilotoEnFoco) return [];
        const lista = [];
        Object.entries(pilotoEnFoco.detalles).forEach(([cat, items]) => {
            items.forEach(m => {
                lista.push({
                    subject: m.nombre,
                    Realizado: m.realizado,
                    Exigido: m.meta
                });
            });
        });
        return lista;
    }, [pilotoEnFoco]);

    return (
        <div style={{ padding: '15px', backgroundColor: '#f8f9fa', fontFamily: 'sans-serif', minHeight: '100vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1b3a57', color: 'white', padding: '12px 18px', borderRadius: '6px', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                    📊 ESTADO OPERATIVO DE ADIESTRAMIENTO DE MANIOBRAS - {userUnidad || 'GENERAL'}
                </h2>
                <div>
                    <label style={{ fontSize: '0.85rem', marginRight: '8px', fontWeight: 'bold' }}>Foco en Piloto:</label>
                    <select 
                        value={pilotoSeleccionado} 
                        onChange={(e) => setPilotoSeleccionado(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: '4px', border: 'none', fontWeight: 'bold', color: '#1b3a57', cursor: 'pointer' }}
                    >
                        <option value="TODOS">🌐 VISTA CONSOLIDADA (Todos los Pilotos)</option>
                        {evaluacionPilotos.map(p => (
                            <option key={p.id} value={p.id}>{p.nombre} ({p.funcion}) - {p.porcentaje}%</option>
                        ))}
                    </select>
                </div>
            </div>

            {cargando ? (
                <div style={styles.stateCard}>⌛ Cargando datos de entrenamiento...</div>
            ) : evaluacionPilotos.length === 0 ? (
                <div style={styles.stateCard}>⚠️ No hay planillas registradas para {userUnidad || 'esta unidad'}.</div>
            ) : (
                <>
                    {pilotoSeleccionado === 'TODOS' ? (
                        <>
                            {/* VISTA GENERAL CON TORTA Y METRICAS EXPLICITAS */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '15px', marginBottom: '15px' }}>
                                {/* TARJETA TORTA */}
                                <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ccc' }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#1b3a57', fontSize: '0.9rem' }}>🥧 Proporción de Cumplimiento de la Fuerza</h4>
                                    <ResponsiveContainer width="100%" height={200}>
                                        <PieChart>
                                            <Pie data={pieDataEstadoGeneral} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={(entry) => `${entry.name}: ${entry.value}`}>
                                                {pieDataEstadoGeneral.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* KPI NUMÉRICOS EXPLICITOS */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div style={styles.kpiBox}>
                                        <span style={styles.kpiTitle}>EVALUADOS</span>
                                        <span style={styles.kpiNum}>{evaluacionPilotos.length} <small style={{fontSize: '0.8rem'}}>Pilotos</small></span>
                                    </div>
                                    <div style={{ ...styles.kpiBox, borderLeft: '4px solid #27ae60' }}>
                                        <span style={styles.kpiTitle}>TOTAL METAS ALCANZADAS</span>
                                        <span style={{ ...styles.kpiNum, color: '#27ae60' }}>
                                            {evaluacionPilotos.reduce((a, b) => a + b.totalCompletados, 0)}
                                        </span>
                                    </div>
                                    <div style={{ ...styles.kpiBox, borderLeft: '4px solid #e74c3c' }}>
                                        <span style={styles.kpiTitle}>MANIOBRAS FALTANTES</span>
                                        <span style={{ ...styles.kpiNum, color: '#e74c3c' }}>
                                            {evaluacionPilotos.reduce((a, b) => a + b.totalFaltantes, 0)}
                                        </span>
                                    </div>
                                    <div style={{ ...styles.kpiBox, borderLeft: '4px solid #2980b9' }}>
                                        <span style={styles.kpiTitle}>EJECUTADAS TOTALES</span>
                                        <span style={{ ...styles.kpiNum, color: '#2980b9' }}>
                                            {evaluacionPilotos.reduce((a, b) => a + b.totalRealizadosAbsolutos, 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* TABLA CONSOLIDADAS EXPLICITA */}
                            <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ccc' }}>
                                <h3 style={{ fontSize: '0.9rem', color: '#1b3a57', marginTop: 0, marginBottom: '12px' }}>📋 DETALLE NUMÉRICO DE ALCANCE POR PILOTO</h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                                            <th style={styles.th}>Piloto</th>
                                            <th style={styles.th}>Función</th>
                                            <th style={styles.th}>Vuelos</th>
                                            <th style={styles.th}>Requeridas</th>
                                            <th style={styles.th}>Cumplidas</th>
                                            <th style={styles.th}>Faltantes</th>
                                            <th style={styles.th}>% Alcanzado</th>
                                            <th style={styles.th}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {evaluacionPilotos.map((p) => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }} onClick={() => setPilotoSeleccionado(p.id)}>
                                                <td style={{ ...styles.td, textAlign: 'left', fontWeight: 'bold', color: '#2980b9' }}>{p.nombre}</td>
                                                <td style={styles.td}>{p.funcion}</td>
                                                <td style={styles.td}>{p.vuelos}</td>
                                                <td style={{ ...styles.td, fontWeight: 'bold' }}>{p.totalExigidos}</td>
                                                <td style={{ ...styles.td, color: '#27ae60', fontWeight: 'bold' }}>{p.totalCompletados}</td>
                                                <td style={{ ...styles.td, color: p.totalFaltantes > 0 ? '#e74c3c' : '#777', fontWeight: 'bold' }}>{p.totalFaltantes}</td>
                                                <td style={{ ...styles.td, fontWeight: 'bold', fontSize: '0.9rem' }}>{p.porcentaje}%</td>
                                                <td style={{ ...styles.td, fontWeight: 'bold', color: p.alDia ? '#27ae60' : '#e74c3c' }}>
                                                    {p.alDia ? '✅ AL DÍA' : '⚠️ PENDIENTE'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        /* VISTA DETALLADA DEL PILOTO EN FOCO CON RADAR & NUMEROS */
                        <div style={{ backgroundColor: 'white', padding: '18px', borderRadius: '6px', border: '1px solid #ccc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #1b3a57', paddingBottom: '10px', marginBottom: '15px', flexWrap: 'wrap' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1b3a57' }}>👤 Ficha de Adiestramiento: {pilotoEnFoco?.nombre}</h3>
                                    <span style={{ fontSize: '0.8rem', color: '#666' }}>Función Asignada: <b>{pilotoEnFoco?.funcion}</b> | Vuelos Registrados: <b>{pilotoEnFoco?.vuelos}</b></span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: pilotoEnFoco?.alDia ? '#27ae60' : '#e74c3c' }}>
                                        {pilotoEnFoco?.porcentaje}% Alcanzado {pilotoEnFoco?.alDia ? '✅' : '⚠️'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#777' }}>
                                        Cumplidas: <b>{pilotoEnFoco?.totalCompletados}</b> / Exigidas: <b>{pilotoEnFoco?.totalExigidos}</b> (Faltan: {pilotoEnFoco?.totalFaltantes})
                                    </div>
                                </div>
                            </div>

                            {/* RADAR CHART DE PERFIL */}
                            <div style={{ backgroundColor: '#fcfcfc', padding: '10px', borderRadius: '6px', border: '1px solid #eee', marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#1b3a57', textAlign: 'center' }}>🕸️ PERFIL DE ADIESTRAMIENTO (EXIGIDO VS EJECUTADO)</h4>
                                <ResponsiveContainer width="100%" height={280}>
                                    <RadarChart data={radarDataPiloto}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                                        <PolarRadiusAxis />
                                        <Radar name="Realizado" dataKey="Realizado" stroke="#27ae60" fill="#27ae60" fillOpacity={0.5} />
                                        <Radar name="Exigido (Meta)" dataKey="Exigido" stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.2} />
                                        <Legend />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* TARJETAS NUMÉRICAS POR SECCIÓN */}
                            {Object.entries(pilotoEnFoco?.detalles || {}).map(([seccion, items]) => (
                                <div key={seccion} style={{ marginBottom: '20px' }}>
                                    <h4 style={{ fontSize: '0.85rem', color: 'white', backgroundColor: '#2c3e50', padding: '6px 12px', margin: '0 0 10px 0', borderRadius: '4px' }}>
                                        {seccion}
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                                        {items.map(m => (
                                            <div key={m.clave} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', borderLeft: `5px solid ${m.cumplido ? '#27ae60' : '#e74c3c'}`, backgroundColor: '#fff' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#666', fontWeight: 'bold' }}>{m.nombre} ({m.periodo})</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                                    <div>
                                                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1b3a57' }}>{m.realizado}</span>
                                                        <span style={{ fontSize: '0.8rem', color: '#777' }}> / {m.meta} req.</span>
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', backgroundColor: m.cumplido ? '#e8f8f5' : '#fadbd8', color: m.cumplido ? '#27ae60' : '#e74c3c' }}>
                                                        {m.cumplido ? 'CUMPLIDO' : `FALTAN ${m.faltantes}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const styles = {
    kpiBox: { backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #ccc', borderLeft: '4px solid #1b3a57', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
    kpiTitle: { fontSize: '0.7rem', color: '#777', fontWeight: 'bold' },
    kpiNum: { fontSize: '1.5rem', fontWeight: 'bold', marginTop: '3px' },
    stateCard: { backgroundColor: 'white', padding: '30px', textAlign: 'center', borderRadius: '6px', border: '1px solid #ccc', color: '#555', fontSize: '0.9rem' },
    th: { padding: '10px', border: '1px solid #ddd', textAlign: 'center' },
    td: { padding: '10px', border: '1px solid #ddd', textAlign: 'center' }
};

export default TrainingDashboardPage;