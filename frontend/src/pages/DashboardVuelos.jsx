import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area
} from 'recharts';

// Servicios de conexión
import { EventService } from '../services/api';

const normalizarTexto = (str) => {
    if (!str) return '';
    return String(str).trim().toUpperCase().replace(/\s+/g, ' ');
};

const normalizarClave = (str) => {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[\s_-]/g, '');
};

export default function DashboardVuelos({ vuelosData: vuelosProps }) {
    const [vuelosData, setVuelosData] = useState(vuelosProps || []);
    const [loading, setLoading] = useState(true);
    const [unidadFiltro, setUnidadFiltro] = useState('TODAS');
    const [misionFiltro, setMisionFiltro] = useState('TODAS');

    // 👤 DETECTAR Y NORMALIZAR EL USUARIO ACTUAL
    const { unidadUsuario, esAdminGlobal } = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');
            const userObj = rawUser ? JSON.parse(rawUser) : {};
            
            const elem = userObj.elemento || userObj.unidad || userObj.unidadResponsable || userObj.element || localStorage.getItem('elemento') || '';
            const rol = userObj.role || userObj.rol || localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
            
            const rolNorm = normalizarClave(rol);
            const esAdmin = rolNorm.includes('ADMIN');
            
            return {
                unidadUsuario: normalizarTexto(elem),
                esAdminGlobal: esAdmin
            };
        } catch (e) {
            console.error("Error crítico al leer datos de sesión:", e);
            return { unidadUsuario: '', esAdminGlobal: false };
        }
    }, []);

    // 📌 SINCRO DE FILTRO INICIAL POR ROL
    useEffect(() => {
        if (!esAdminGlobal && unidadUsuario) {
            setUnidadFiltro(unidadUsuario);
        } else if (esAdminGlobal) {
            setUnidadFiltro('TODAS');
        }
    }, [unidadUsuario, esAdminGlobal]);

    // 🔄 CARGA DE DATOS DE VUELOS
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const params = {};
                if (!esAdminGlobal && unidadUsuario) {
                    params.unidad = unidadUsuario;
                } else if (esAdminGlobal && unidadFiltro !== 'TODAS') {
                    params.unidad = unidadFiltro;
                }

                const resVuelos = await EventService.getVuelos(params);
                const listaVuelos = resVuelos?.data || resVuelos || [];
                setVuelosData(Array.isArray(listaVuelos) ? listaVuelos : []);
            } catch (err) {
                console.error("Error al recuperar datos del dashboard de vuelos:", err);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [vuelosProps, unidadFiltro, esAdminGlobal, unidadUsuario]);

    // 📌 UNIDADES Y MISIONES ÚNICAS PARA SELECTORES
    const listaUnidades = useMemo(() => {
        if (!esAdminGlobal) {
            return [unidadUsuario || 'MI UNIDAD'];
        }
        const unidadesVuelos = vuelosData.map(v => normalizarTexto(v.unidadResponsable)).filter(Boolean);
        return ['TODAS', ...Array.from(new Set(unidadesVuelos))];
    }, [vuelosData, esAdminGlobal, unidadUsuario]);

    const listaMisiones = useMemo(() => {
        const misiones = vuelosData.map(v => v.tipoMision).filter(Boolean);
        return ['TODAS', ...Array.from(new Set(misiones))];
    }, [vuelosData]);

    // 📌 FILTRADO ROBUSTO DE VUELOS
    const vuelosFiltrados = useMemo(() => {
        const unidadObjetivo = esAdminGlobal ? unidadFiltro : (unidadUsuario || 'SIN_UNIDAD');
        const claveObjetivo = normalizarClave(unidadObjetivo);

        return vuelosData.filter(v => {
            const unidadVueloClave = normalizarClave(v.unidadResponsable);
            let pasaUnidad = false;

            if (esAdminGlobal && unidadFiltro === 'TODAS') {
                pasaUnidad = true;
            } else if (claveObjetivo !== '') {
                pasaUnidad = unidadVueloClave === claveObjetivo || 
                             unidadVueloClave.includes(claveObjetivo) || 
                             claveObjetivo.includes(unidadVueloClave);
            }

            const pasaMision = misionFiltro === 'TODAS' || v.tipoMision === misionFiltro;
            return pasaUnidad && pasaMision;
        });
    }, [vuelosData, unidadFiltro, misionFiltro, esAdminGlobal, unidadUsuario]);

    // ==========================================
    // 📊 CÁLCULOS Y PROCESAMIENTO - VUELOS
    // ==========================================

    const totalHorasGenerales = useMemo(() => {
        return vuelosFiltrados.reduce((acc, v) => acc + (Number(v.horasVoladas) || 0), 0);
    }, [vuelosFiltrados]);

    const totalPasajeros = useMemo(() => {
        return vuelosFiltrados.reduce((acc, v) => acc + (Number(v.cantidadPasajeros) || 0), 0);
    }, [vuelosFiltrados]);

    const totalCargaKg = useMemo(() => {
        return vuelosFiltrados.reduce((acc, v) => acc + (Number(v.pesoCarga) || 0), 0);
    }, [vuelosFiltrados]);

    // 📈 PERFIL DE ACTIVIDAD EN EL TIEMPO
    const actividadPorFecha = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const rawFecha = v.fecha || v.fechaVuelo || v.createdAt;
            if (!rawFecha) return;
            const fechaKey = String(rawFecha).substring(0, 10);
            mapa[fechaKey] = (mapa[fechaKey] || 0) + 1;
        });

        return Object.entries(mapa)
            .map(([fecha, vuelos]) => ({
                fecha,
                fechaFormatted: fecha.split('-').reverse().join('/'),
                vuelos
            }))
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
    }, [vuelosFiltrados]);

    const horasPorElemento = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const elem = v.elementoApoyado || 'SIN ESPECIFICAR';
            const hs = Number(v.horasVoladas) || 0;
            mapa[elem] = (mapa[elem] || 0) + hs;
        });
        return Object.entries(mapa).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
    }, [vuelosFiltrados]);

    const horasPorMision = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const mision = v.tipoMision || 'GENERAL';
            const hs = Number(v.horasVoladas) || 0;
            mapa[mision] = (mapa[mision] || 0) + hs;
        });
        return Object.entries(mapa)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
            .sort((a, b) => b.value - a.value);
    }, [vuelosFiltrados]);

    const horasPorTripulante = useMemo(() => {
        const mapa = {};
        const formatearNombre = (t) => {
            if (!t) return null;
            if (typeof t === 'string') return t;
            return `${t.grado || ''} ${t.apellido || ''}`.trim();
        };

        vuelosFiltrados.forEach(v => {
            const hs = Number(v.horasVoladas) || 0;
            const piloto = formatearNombre(v.piloto);
            const copiloto = formatearNombre(v.copiloto);

            if (piloto) mapa[piloto] = (mapa[piloto] || 0) + hs;
            if (copiloto) mapa[copiloto] = (mapa[copiloto] || 0) + hs;
        });

        return Object.entries(mapa)
            .map(([name, horas]) => ({ name, horas: Number(horas.toFixed(1)) }))
            .sort((a, b) => b.horas - a.horas);
    }, [vuelosFiltrados]);

    const visitasPorAerodromo = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const origen = (v.desde || '').trim().toUpperCase();
            const destino = (v.hasta || '').trim().toUpperCase();

            if (origen) mapa[origen] = (mapa[origen] || 0) + 1;
            if (destino) mapa[destino] = (mapa[destino] || 0) + 1;
        });

        return Object.entries(mapa)
            .map(([aerodromo, visitas]) => ({ aerodromo, visitas }))
            .sort((a, b) => b.visitas - a.visitas);
    }, [vuelosFiltrados]);

    const handleImprimir = () => {
        window.print();
    };

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#1b3a57', fontWeight: 'bold' }}>
                🔄 Cargando datos operativos de vuelos...
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* 🖨️ ESTILOS CSS DE IMPRESIÓN - ALTO CONTRASTE Y NEGRO MONOCROMÁTICO */}
            <style>{`
                @media print {
                    .no-print, button, select {
                        display: none !important;
                    }

                    /* Fondo blanco estricto y texto negro puro */
                    body, div, container {
                        background-color: #ffffff !important;
                        color: #000000 !important;
                    }

                    /* Todos los textos del Dashboard a negro puro */
                    h2, h3, h4, span, label, p {
                        color: #000000 !important;
                        text-shadow: none !important;
                    }

                    /* Forzar que las barras de Recharts se rellenen en negro sólido */
                    .recharts-bar-rectangle path {
                        fill: #000000 !important;
                        stroke: #000000 !important;
                    }

                    /* Forzar que el área de perfil sea sombra negra limpia */
                    .recharts-area-area {
                        fill: #000000 !important;
                        fill-opacity: 0.25 !important;
                    }

                    .recharts-area-curve {
                        stroke: #000000 !important;
                        stroke-width: 2px !important;
                    }

                    /* Rejillas y ejes a negro/gris oscuro para máxima visibilidad */
                    .recharts-cartesian-grid-line {
                        stroke: #666666 !important;
                    }

                    .recharts-text {
                        fill: #000000 !important;
                        font-weight: bold !important;
                    }

                    /* Tarjetas de KPI y gráficos con borde negro grueso */
                    .chart-card-print, .kpi-card-print {
                        border: 2px solid #000000 !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        page-break-inside: avoid;
                        break-inside: avoid;
                        margin-bottom: 15px !important;
                    }

                    .kpi-card-print {
                        border-left: 6px solid #000000 !important;
                    }

                    /* Extender contenedores con scroll para imprimir la lista completa */
                    .scroll-container {
                        max-height: none !important;
                        overflow: visible !important;
                    }

                    @page {
                        size: A4 portrait;
                        margin: 1cm;
                    }
                }
            `}</style>

            {/* ENCABEZADO Y FILTROS */}
            <header style={styles.header}>
                <div>
                    <h2 style={{ margin: 0, color: '#1b3a57' }}>📊 Dashboard Operativo de Vuelos</h2>
                    <span style={styles.subtitle}>
                        {esAdminGlobal && unidadFiltro === 'TODAS' 
                            ? 'Resumen consolidado general (Vista Administrador Global)' 
                            : `Resumen de la unidad: ${unidadUsuario || unidadFiltro}`}
                    </span>
                </div>

                <div style={styles.filtrosBar}>
                    <button 
                        onClick={handleImprimir}
                        style={styles.btnPrint}
                        className="no-print"
                        title="Imprimir o Guardar en PDF (Optimizado para Blanco y Negro)"
                    >
                        🖨️ Exportar / Imprimir PDF
                    </button>

                    <div style={styles.filtroGroup}>
                        <label style={styles.label}>Unidad Responsable:</label>
                        <select 
                            value={esAdminGlobal ? unidadFiltro : (unidadUsuario || '')} 
                            onChange={(e) => setUnidadFiltro(e.target.value)}
                            style={{
                                ...styles.select,
                                backgroundColor: !esAdminGlobal ? '#e2e8f0' : '#ffffff',
                                cursor: !esAdminGlobal ? 'not-allowed' : 'pointer'
                            }}
                            disabled={!esAdminGlobal}
                        >
                            {listaUnidades.map((u, i) => (
                                <option key={i} value={u}>{u}</option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.filtroGroup}>
                        <label style={styles.label}>Tipo Misión:</label>
                        <select 
                            value={misionFiltro} 
                            onChange={(e) => setMisionFiltro(e.target.value)}
                            style={styles.select}
                        >
                            {listaMisiones.map((m, i) => (
                                <option key={i} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* RESUMEN OPERATIVO DE VUELOS */}
            <h3 style={styles.sectionHeader}>✈️ Muestreo y Métricas de Operaciones Aéreas</h3>
            <div style={styles.kpiContainer}>
                <div style={styles.kpiCard} className="kpi-card-print">
                    <span style={styles.kpiTitle}>TOTAL HORAS VOLADAS</span>
                    <span style={styles.kpiValue}>{totalHorasGenerales.toFixed(1)} hs</span>
                </div>
                <div style={styles.kpiCard} className="kpi-card-print">
                    <span style={styles.kpiTitle}>VUELOS REGISTRADOS</span>
                    <span style={styles.kpiValue}>{vuelosFiltrados.length}</span>
                </div>
                <div style={styles.kpiCard} className="kpi-card-print">
                    <span style={styles.kpiTitle}>PASAJEROS TRANSPORTADOS</span>
                    <span style={styles.kpiValue}>{totalPasajeros} pax</span>
                </div>
                <div style={styles.kpiCard} className="kpi-card-print">
                    <span style={styles.kpiTitle}>CARGA TRANSPORTADA</span>
                    <span style={styles.kpiValue}>{totalCargaKg} kg</span>
                </div>
            </div>

            {/* 📈 PERFIL DE ACTIVIDAD EN EL TIEMPO */}
            <div style={{ ...styles.chartCard, marginBottom: '20px' }} className="chart-card-print">
                <h4 style={styles.chartTitle}>📈 Perfil Temporal de Actividad (Cantidad de Vuelos por Fecha)</h4>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={actividadPorFecha} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorVuelos" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1b3a57" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#1b3a57" stopOpacity={0.05}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="fechaFormatted" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip 
                            formatter={(value) => [`${value} vuelos`, 'Cantidad de Vuelos']}
                            labelFormatter={(label) => `Fecha: ${label}`}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="vuelos" 
                            stroke="#1b3a57" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorVuelos)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* GRILLA DE GRÁFICOS RESTANTES */}
            <div style={styles.chartsGrid}>
                <div style={styles.chartCard} className="chart-card-print">
                    <h4 style={styles.chartTitle}>🏢 Horas por Elemento Apoyado</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={horasPorElemento} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas']} />
                            <Bar dataKey="value" fill="#1b3a57" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={styles.chartCard} className="chart-card-print">
                    <h4 style={styles.chartTitle}>🎯 Horas por Misión ({horasPorMision.length})</h4>
                    <div className="scroll-container" style={{ width: '100%', maxHeight: '300px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={Math.max(280, horasPorMision.length * 35)}>
                            <BarChart layout="vertical" data={horasPorMision} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} hs`, 'Horas voladas']} />
                                <Bar dataKey="value" fill="#10ac84" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.chartCard} className="chart-card-print">
                    <h4 style={styles.chartTitle}>👨‍✈️ Horas por Piloto / Copiloto ({horasPorTripulante.length})</h4>
                    <div className="scroll-container" style={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={Math.max(300, horasPorTripulante.length * 35)}>
                            <BarChart layout="vertical" data={horasPorTripulante} margin={{ top: 5, right: 30, left: 90, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} hs`, 'Horas acumuladas']} />
                                <Bar dataKey="horas" fill="#4a69bd" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div style={styles.chartCard} className="chart-card-print">
                    <h4 style={styles.chartTitle}>📍 Frecuencia de Operaciones por Aeródromo ({visitasPorAerodromo.length})</h4>
                    <div className="scroll-container" style={{ width: '100%', maxHeight: '400px', overflowY: 'auto' }}>
                        <ResponsiveContainer width="100%" height={Math.max(300, visitasPorAerodromo.length * 35)}>
                            <BarChart layout="vertical" data={visitasPorAerodromo} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="aerodromo" type="category" tick={{ fontSize: 11 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} operaciones`, 'Visitas / Operaciones']} />
                                <Bar dataKey="visitas" fill="#38ada9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: { padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px', maxWidth: '1600px', margin: '0 auto' },
    header: { marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    sectionHeader: { fontSize: '1rem', color: '#1b3a57', borderLeft: '4px solid #1b3a57', paddingLeft: '10px', marginBottom: '15px', marginTop: '10px', fontWeight: 'bold' },
    subtitle: { fontSize: '0.85rem', color: '#64748b' },
    filtrosBar: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' },
    filtroGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#1b3a57' },
    select: { padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '600', color: '#1b3a57' },
    btnPrint: { backgroundColor: '#1b3a57', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem', cursor: 'pointer' },
    kpiContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' },
    kpiCard: { backgroundColor: '#ffffff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderLeft: '4px solid #1b3a57', display: 'flex', flexDirection: 'column' },
    kpiTitle: { fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' },
    kpiValue: { fontSize: '1.5rem', fontWeight: 'bold', color: '#1b3a57', marginTop: '4px' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
    chartCard: { backgroundColor: '#ffffff', padding: '18px', borderRadius: '8px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' },
    chartTitle: { margin: '0 0 15px 0', fontSize: '0.9rem', color: '#1b3a57', fontWeight: 'bold' }
};