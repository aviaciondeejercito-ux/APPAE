import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area
} from 'recharts';
import html2pdf from 'html2pdf.js';

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
    const dashboardRef = useRef(null);
    const [vuelosData, setVuelosData] = useState(vuelosProps || []);
    const [loading, setLoading] = useState(true);
    const [generandoPdf, setGenerandoPdf] = useState(false);

    // FILTROS PRINCIPALES
    const [unidadFiltro, setUnidadFiltro] = useState('TODAS');
    const [misionFiltro, setMisionFiltro] = useState('TODAS');
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [sistemaArmasFiltro, setSistemaArmasFiltro] = useState('TODOS');
    const [matriculaFiltro, setMatriculaFiltro] = useState('TODAS');

    // FILTROS SECUNDARIOS GRÁFICO MENSUAL
    const [modoGraficoMes, setModoGraficoMes] = useState('vuelos'); 
    const [elementoApoyadoFiltro, setElementoApoyadoFiltro] = useState('TODOS');

    // ROL Y UNIDAD USUARIO
    const { unidadUsuario, esAdminGlobal } = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');
            const userObj = rawUser ? JSON.parse(rawUser) : {};
            const elem = userObj.elemento || userObj.unidad || userObj.unidadResponsable || userObj.element || localStorage.getItem('elemento') || '';
            const rol = userObj.role || userObj.rol || localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
            
            return {
                unidadUsuario: normalizarTexto(elem),
                esAdminGlobal: normalizarClave(rol).includes('ADMIN')
            };
        } catch (e) {
            return { unidadUsuario: '', esAdminGlobal: false };
        }
    }, []);

    useEffect(() => {
        if (!esAdminGlobal && unidadUsuario) {
            setUnidadFiltro(unidadUsuario);
        } else if (esAdminGlobal) {
            setUnidadFiltro('TODAS');
        }
    }, [unidadUsuario, esAdminGlobal]);

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
                console.error("Error al recuperar datos:", err);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, [vuelosProps, unidadFiltro, esAdminGlobal, unidadUsuario]);

    // LISTAS DESPLEGABLES
    const listaUnidades = useMemo(() => {
        if (!esAdminGlobal) return [unidadUsuario || 'MI UNIDAD'];
        const unidades = vuelosData.map(v => normalizarTexto(v.unidadResponsable)).filter(Boolean);
        return ['TODAS', ...Array.from(new Set(unidades))];
    }, [vuelosData, esAdminGlobal, unidadUsuario]);

    const listaMisiones = useMemo(() => {
        const misiones = vuelosData.map(v => v.tipoMision).filter(Boolean);
        return ['TODAS', ...Array.from(new Set(misiones))];
    }, [vuelosData]);

    const listaSistemasArmas = useMemo(() => {
        const sdaList = vuelosData
            .map(v => v.sistemaArma || v.sistemaArmas || v.sdda || v.sistemadeArmas)
            .filter(Boolean)
            .map(s => normalizarTexto(s));
        return ['TODOS', ...Array.from(new Set(sdaList))];
    }, [vuelosData]);

    const listaMatriculas = useMemo(() => {
        const matriculasList = vuelosData
            .map(v => v.matricula || v.tailNumber || v.aeronaveMatricula || v.aeronave)
            .filter(Boolean)
            .map(m => normalizarTexto(m));
        return ['TODAS', ...Array.from(new Set(matriculasList))];
    }, [vuelosData]);

    const listaElementosApoyados = useMemo(() => {
        const elementos = vuelosData
            .map(v => v.elementoApoyado ? normalizarTexto(v.elementoApoyado) : null)
            .filter(Boolean);
        return ['TODOS', ...Array.from(new Set(elementos))];
    }, [vuelosData]);

    // FILTRADO COMBINADO (AND)
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
            
            const sdaVuelo = normalizarTexto(v.sistemaArma || v.sistemaArmas || v.sdda || v.sistemadeArmas);
            const pasaSda = sistemaArmasFiltro === 'TODOS' || sdaVuelo === sistemaArmasFiltro;

            const matVuelo = normalizarTexto(v.matricula || v.tailNumber || v.aeronaveMatricula || v.aeronave);
            const pasaMatricula = matriculaFiltro === 'TODAS' || matVuelo === matriculaFiltro;

            const rawFecha = v.fecha || v.fechaVuelo || v.createdAt;
            let pasaFecha = true;

            if (rawFecha) {
                const fechaVueloStr = String(rawFecha).substring(0, 10);
                if (fechaDesde && fechaVueloStr < fechaDesde) pasaFecha = false;
                if (fechaHasta && fechaVueloStr > fechaHasta) pasaFecha = false;
            }

            return pasaUnidad && pasaMision && pasaSda && pasaMatricula && pasaFecha;
        });
    }, [vuelosData, unidadFiltro, misionFiltro, sistemaArmasFiltro, matriculaFiltro, fechaDesde, fechaHasta, esAdminGlobal, unidadUsuario]);

    // CÁLCULOS KPI
    const totalHorasGenerales = useMemo(() => vuelosFiltrados.reduce((acc, v) => acc + (Number(v.horasVoladas) || 0), 0), [vuelosFiltrados]);
    const totalPasajeros = useMemo(() => vuelosFiltrados.reduce((acc, v) => acc + (Number(v.cantidadPasajeros) || 0), 0), [vuelosFiltrados]);
    const totalCargaKg = useMemo(() => vuelosFiltrados.reduce((acc, v) => acc + (Number(v.pesoCarga) || 0), 0), [vuelosFiltrados]);

    // METRICAS DE GRÁFICOS
    const actividadPorMes = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const rawFecha = v.fecha || v.fechaVuelo || v.createdAt;
            if (!rawFecha) return;

            if (modoGraficoMes === 'elemento' && elementoApoyadoFiltro !== 'TODOS') {
                if (normalizarTexto(v.elementoApoyado) !== elementoApoyadoFiltro) return;
            }

            const mesKey = String(rawFecha).substring(0, 7); 
            const hs = Number(v.horasVoladas) || 0;

            if (!mapa[mesKey]) mapa[mesKey] = { vuelos: 0, horas: 0 };
            mapa[mesKey].vuelos += 1;
            mapa[mesKey].horas += hs;
        });

        const mesesNombre = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        return Object.entries(mapa)
            .map(([mesKey, data]) => {
                const [anio, mes] = mesKey.split('-');
                const numMes = parseInt(mes, 10) - 1;
                const valorFinal = (modoGraficoMes === 'horas' || modoGraficoMes === 'elemento') 
                    ? Number(data.horas.toFixed(1)) 
                    : data.vuelos;

                return {
                    mesKey,
                    mesFormatted: `${mesesNombre[numMes] || mes} ${anio}`,
                    valor: valorFinal,
                    vuelos: data.vuelos,
                    horas: Number(data.horas.toFixed(1))
                };
            })
            .sort((a, b) => a.mesKey.localeCompare(b.mesKey));
    }, [vuelosFiltrados, modoGraficoMes, elementoApoyadoFiltro]);

    const horasPorElemento = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const elem = v.elementoApoyado || 'SIN ESPECIFICAR';
            mapa[elem] = (mapa[elem] || 0) + (Number(v.horasVoladas) || 0);
        });
        return Object.entries(mapa).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
    }, [vuelosFiltrados]);

    const horasPorMision = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const mision = v.tipoMision || 'GENERAL';
            mapa[mision] = (mapa[mision] || 0) + (Number(v.horasVoladas) || 0);
        });
        return Object.entries(mapa)
            .map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }))
            .sort((a, b) => b.value - a.value);
    }, [vuelosFiltrados]);

    const horasPorTripulante = useMemo(() => {
        const mapa = {};
        const fmt = (t) => t ? (typeof t === 'string' ? t : `${t.grado || ''} ${t.apellido || ''}`.trim()) : null;

        vuelosFiltrados.forEach(v => {
            const hs = Number(v.horasVoladas) || 0;
            const p = fmt(v.piloto);
            const c = fmt(v.copiloto);
            if (p) mapa[p] = (mapa[p] || 0) + hs;
            if (c) mapa[c] = (mapa[c] || 0) + hs;
        });

        return Object.entries(mapa)
            .map(([name, horas]) => ({ name, horas: Number(horas.toFixed(1)) }))
            .sort((a, b) => b.horas - a.horas);
    }, [vuelosFiltrados]);

    const visitasPorAerodromo = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const o = (v.desde || '').trim().toUpperCase();
            const d = (v.hasta || '').trim().toUpperCase();
            if (o) mapa[o] = (mapa[o] || 0) + 1;
            if (d) mapa[d] = (mapa[d] || 0) + 1;
        });

        return Object.entries(mapa)
            .map(([aerodromo, visitas]) => ({ aerodromo, visitas }))
            .sort((a, b) => b.visitas - a.visitas);
    }, [vuelosFiltrados]);

    // EXPORTACIÓN PDF
    const exportarPDF = async (orientacion = 'portrait') => {
        setGenerandoPdf(true);
        
        try {
            const element = dashboardRef.current;

            const opt = {
                margin:       [10, 10, 10, 10],
                filename:     `Dashboard_Vuelos_${orientacion}_${new Date().toISOString().slice(0, 10)}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { 
                    scale: 2, 
                    useCORS: true, 
                    logging: false,
                    scrollY: 0
                },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: orientacion },
                pagebreak:    { mode: ['avoid-all', 'css', 'legacy'], avoid: '.no-break' }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (err) {
            console.error("Error al generar PDF:", err);
            window.print();
        } finally {
            setGenerandoPdf(false);
        }
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
            {/* CSS para forzar reglas de impresión y saltos de página */}
            <style>{`
                .no-break {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                }
                @media print {
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* BARRA SUPERIOR CON CONTROLES */}
            <header style={styles.header}>
                <div>
                    <h2 style={{ margin: 0, color: '#1b3a57' }}>📊 Dashboard Operativo de Vuelos</h2>
                    <span style={styles.subtitle}>
                        {esAdminGlobal && unidadFiltro === 'TODAS' 
                            ? 'Resumen consolidado general (Vista Administrador Global)' 
                            : `Resumen de la unidad: ${unidadUsuario || unidadFiltro}`}
                    </span>
                </div>

                <div style={styles.exportControls} className="no-print">
                    <span style={styles.exportLabel}>Exportar PDF:</span>
                    <button 
                        onClick={() => exportarPDF('portrait')}
                        style={styles.btnExport}
                        disabled={generandoPdf}
                    >
                        {generandoPdf ? '⏳ Procesando...' : '📄 Vertical'}
                    </button>
                    <button 
                        onClick={() => exportarPDF('landscape')}
                        style={{ ...styles.btnExport, backgroundColor: '#10ac84' }}
                        disabled={generandoPdf}
                    >
                        {generandoPdf ? '⏳ Procesando...' : '🖼️ Horizontal'}
                    </button>
                </div>
            </header>

            {/* FILTROS GENERALES */}
            <div style={styles.filtrosBar} className="no-print">
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
                    <label style={styles.label}>Sistema de Armas:</label>
                    <select 
                        value={sistemaArmasFiltro} 
                        onChange={(e) => setSistemaArmasFiltro(e.target.value)}
                        style={styles.select}
                    >
                        {listaSistemasArmas.map((s, i) => (
                            <option key={i} value={s}>{s}</option>
                        ))}
                    </select>
                </div>

                <div style={styles.filtroGroup}>
                    <label style={styles.label}>Matrícula:</label>
                    <select 
                        value={matriculaFiltro} 
                        onChange={(e) => setMatriculaFiltro(e.target.value)}
                        style={styles.select}
                    >
                        {listaMatriculas.map((mat, i) => (
                            <option key={i} value={mat}>{mat}</option>
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

                <div style={styles.filtroGroup}>
                    <label style={styles.label}>Desde:</label>
                    <input 
                        type="date" 
                        value={fechaDesde} 
                        onChange={(e) => setFechaDesde(e.target.value)}
                        style={styles.inputDate}
                    />
                </div>

                <div style={styles.filtroGroup}>
                    <label style={styles.label}>Hasta:</label>
                    <input 
                        type="date" 
                        value={fechaHasta} 
                        onChange={(e) => setFechaHasta(e.target.value)}
                        style={styles.inputDate}
                    />
                </div>

                {(fechaDesde || fechaHasta) && (
                    <button 
                        onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
                        style={styles.btnResetDates}
                    >
                        🔄 Limpiar
                    </button>
                )}
            </div>

            {/* AREA IMPRESA/EXPORTABLE */}
            <div ref={dashboardRef} style={styles.printableArea}>
                <h3 style={styles.sectionHeader}>✈️ Muestreo y Métricas de Operaciones Aéreas</h3>
                
                {/* TARJETAS KPI */}
                <div style={styles.kpiContainer} className="no-break">
                    <div style={styles.kpiCard}>
                        <span style={styles.kpiTitle}>TOTAL HORAS VOLADAS</span>
                        <span style={styles.kpiValue}>{totalHorasGenerales.toFixed(1)} hs</span>
                    </div>
                    <div style={styles.kpiCard}>
                        <span style={styles.kpiTitle}>VUELOS REGISTRADOS</span>
                        <span style={styles.kpiValue}>{vuelosFiltrados.length}</span>
                    </div>
                    <div style={styles.kpiCard}>
                        <span style={styles.kpiTitle}>PASAJEROS TRANSPORTADOS</span>
                        <span style={styles.kpiValue}>{totalPasajeros} pax</span>
                    </div>
                    <div style={styles.kpiCard}>
                        <span style={styles.kpiTitle}>CARGA TRANSPORTADA</span>
                        <span style={styles.kpiValue}>{totalCargaKg} kg</span>
                    </div>
                </div>

                {/* GRÁFICO MENSUAL */}
                <div style={{ ...styles.chartCard, marginBottom: '20px' }} className="no-break">
                    <div style={styles.chartHeaderFlex}>
                        <h4 style={{ ...styles.chartTitle, margin: 0 }}>
                            📈 Actividad Mensual 
                            {modoGraficoMes === 'vuelos' && ' (Cantidad de Vuelos)'}
                            {modoGraficoMes === 'horas' && ' (Horas Voladas Totales)'}
                            {modoGraficoMes === 'elemento' && ` (Horas de Apoyo: ${elementoApoyadoFiltro})`}
                        </h4>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }} className="no-print">
                            <div style={styles.filtroGroup}>
                                <label style={styles.label}>Visualizar por:</label>
                                <select 
                                    value={modoGraficoMes} 
                                    onChange={(e) => setModoGraficoMes(e.target.value)}
                                    style={styles.select}
                                >
                                    <option value="vuelos">Vuelos por mes</option>
                                    <option value="horas">Horas de vuelo por mes</option>
                                    <option value="elemento">Horas por Tipo de Apoyo</option>
                                </select>
                            </div>

                            {modoGraficoMes === 'elemento' && (
                                <div style={styles.filtroGroup}>
                                    <label style={styles.label}>Elemento Apoyado:</label>
                                    <select 
                                        value={elementoApoyadoFiltro} 
                                        onChange={(e) => setElementoApoyadoFiltro(e.target.value)}
                                        style={{ ...styles.select, borderColor: '#10ac84' }}
                                    >
                                        {listaElementosApoyados.map((elem, i) => (
                                            <option key={i} value={elem}>{elem}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={actividadPorMes} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorMes" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={modoGraficoMes === 'vuelos' ? '#1b3a57' : '#10ac84'} stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor={modoGraficoMes === 'vuelos' ? '#1b3a57' : '#10ac84'} stopOpacity={0.05}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="mesFormatted" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                            <YAxis allowDecimals={modoGraficoMes !== 'vuelos'} />
                            <Tooltip 
                                formatter={(value) => [
                                    modoGraficoMes === 'vuelos' ? `${value} vuelos` : `${value} hs`,
                                    modoGraficoMes === 'vuelos' ? 'Vuelos' : 'Horas Voladas'
                                ]}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="valor" 
                                stroke={modoGraficoMes === 'vuelos' ? '#1b3a57' : '#10ac84'} 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorMes)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* GRID DE GRÁFICOS */}
                <div style={styles.chartsGrid}>
                    <div style={styles.chartCard} className="no-break">
                        <h4 style={styles.chartTitle}>🏢 Horas por Elemento Apoyado</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={horasPorElemento} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" />
                                <YAxis />
                                <Tooltip formatter={(value) => [`${value} hs`, 'Horas']} />
                                <Bar dataKey="value" fill="#1b3a57" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={styles.chartCard} className="no-break">
                        <h4 style={styles.chartTitle}>🎯 Horas por Misión ({horasPorMision.length})</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart layout="vertical" data={horasPorMision} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} hs`, 'Horas voladas']} />
                                <Bar dataKey="value" fill="#10ac84" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={styles.chartCard} className="no-break">
                        <h4 style={styles.chartTitle}>👨‍✈️ Horas por Piloto / Copiloto ({horasPorTripulante.length})</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart layout="vertical" data={horasPorTripulante.slice(0, 8)} margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} hs`, 'Horas acumuladas']} />
                                <Bar dataKey="horas" fill="#4a69bd" radius={[0, 4, 4, 0]} barSize={15} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={styles.chartCard} className="no-break">
                        <h4 style={styles.chartTitle}>📍 Frecuencia de Operaciones por Aeródromo ({visitasPorAerodromo.length})</h4>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart layout="vertical" data={visitasPorAerodromo.slice(0, 8)} margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="aerodromo" type="category" tick={{ fontSize: 10 }} interval={0} />
                                <Tooltip formatter={(value) => [`${value} operaciones`, 'Visitas / Operaciones']} />
                                <Bar dataKey="visitas" fill="#38ada9" radius={[0, 4, 4, 0]} barSize={15} />
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
    header: { marginBottom: '15px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' },
    exportControls: { display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    exportLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57' },
    btnExport: { backgroundColor: '#1b3a57', color: '#ffffff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer' },
    subtitle: { fontSize: '0.85rem', color: '#64748b' },
    filtrosBar: { display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px', backgroundColor: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' },
    filtroGroup: { display: 'flex', flexDirection: 'column', gap: '2px' },
    label: { fontSize: '0.7rem', fontWeight: 'bold', color: '#1b3a57' },
    select: { padding: '5px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '600', color: '#1b3a57' },
    inputDate: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: '600', color: '#1b3a57' },
    btnResetDates: { backgroundColor: '#e2e8f0', color: '#1b3a57', border: '1px solid #cbd5e1', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.75rem', cursor: 'pointer', alignSelf: 'flex-end' },
    printableArea: { backgroundColor: '#ffffff', padding: '15px', borderRadius: '8px' },
    sectionHeader: { fontSize: '1rem', color: '#1b3a57', borderLeft: '4px solid #1b3a57', paddingLeft: '10px', marginBottom: '15px', marginTop: '0', fontWeight: 'bold' },
    kpiContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
    kpiCard: { backgroundColor: '#f8f9fa', padding: '14px', borderRadius: '8px', borderLeft: '4px solid #1b3a57', display: 'flex', flexDirection: 'column' },
    kpiTitle: { fontSize: '0.68rem', color: '#64748b', fontWeight: 'bold' },
    kpiValue: { fontSize: '1.3rem', fontWeight: 'bold', color: '#1b3a57', marginTop: '4px' },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' },
    chartCard: { backgroundColor: '#ffffff', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }
};