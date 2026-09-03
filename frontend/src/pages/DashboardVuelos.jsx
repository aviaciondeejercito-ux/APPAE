import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend
} from 'recharts';

// Servicios de conexión
import { EventService, getTripulantes } from '../services/api';

const COLORS = ['#1b3a57', '#4a69bd', '#10ac84', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#38ada9'];

const normalizarTexto = (str) => {
    if (!str) return '';
    return String(str).trim().toUpperCase().replace(/\s+/g, ' ');
};

const normalizarClave = (str) => {
    if (!str) return '';
    return String(str).toUpperCase().replace(/[\s_-]/g, '');
};

// Función auxiliar para determinar el estado de vencimiento
const esCertificacionValida = (fechaVencimiento) => {
    if (!fechaVencimiento) return false;
    const hoy = new Date();
    const fVenc = new Date(fechaVencimiento);
    return fVenc >= hoy;
};

export default function DashboardVuelos({ vuelosData: vuelosProps }) {
    const [vuelosData, setVuelosData] = useState(vuelosProps || []);
    const [tripulantesData, setTripulantesData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unidadFiltro, setUnidadFiltro] = useState('TODAS');
    const [misionFiltro, setMisionFiltro] = useState('TODAS');

    // 👤 1. DETECTAR Y NORMALIZAR EL USUARIO ACTUAL
    const { unidadUsuario, esAdminGlobal, rawRol, userObjDebug } = useMemo(() => {
        try {
            const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');
            const userObj = rawUser ? JSON.parse(rawUser) : {};
            
            const elem = userObj.elemento || userObj.unidad || userObj.unidadResponsable || userObj.element || localStorage.getItem('elemento') || '';
            const rol = userObj.role || userObj.rol || localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';
            
            const rolNorm = normalizarClave(rol);
            const esAdmin = rolNorm.includes('ADMIN');
            
            return {
                unidadUsuario: normalizarTexto(elem),
                esAdminGlobal: esAdmin,
                rawRol: rol,
                userObjDebug: userObj
            };
        } catch (e) {
            console.error("Error crítico al leer datos de sesión:", e);
            return { unidadUsuario: '', esAdminGlobal: false, rawRol: 'USER', userObjDebug: {} };
        }
    }, []);

    // 📌 2. SINCRO DE FILTRO INICIAL POR ROL
    useEffect(() => {
        if (!esAdminGlobal && unidadUsuario) {
            setUnidadFiltro(unidadUsuario);
        } else if (esAdminGlobal) {
            setUnidadFiltro('TODAS');
        }
    }, [unidadUsuario, esAdminGlobal]);

    // 🔄 3. CARGA DE DATOS DESDE EL BACKEND (VUELOS Y TRIPULANTES)
    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                // Carga de vuelos
                const params = {};
                if (!esAdminGlobal && unidadUsuario) {
                    params.unidad = unidadUsuario;
                } else if (esAdminGlobal && unidadFiltro !== 'TODAS') {
                    params.unidad = unidadFiltro;
                }

                const resVuelos = await EventService.getVuelos(params);
                const listaVuelos = resVuelos?.data || resVuelos || [];
                setVuelosData(Array.isArray(listaVuelos) ? listaVuelos : []);

                // Carga de tripulantes / personal
                const resTripulantes = await getTripulantes();
                const listaTripulantes = resTripulantes?.data || resTripulantes || [];
                setTripulantesData(Array.isArray(listaTripulantes) ? listaTripulantes : []);

            } catch (err) {
                console.error("Error al recuperar datos del dashboard:", err);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [vuelosProps, unidadFiltro, esAdminGlobal, unidadUsuario]);

    // 📌 4. UNIDADES Y MISIONES ÚNICAS PARA SELECTORES
    const listaUnidades = useMemo(() => {
        if (!esAdminGlobal) {
            return [unidadUsuario || 'MI UNIDAD'];
        }

        const unidadesVuelos = vuelosData.map(v => normalizarTexto(v.unidadResponsable)).filter(Boolean);
        const unidadesTrip = tripulantesData.map(t => normalizarTexto(t.elemento || t.unidad)).filter(Boolean);
        
        return ['TODAS', ...Array.from(new Set([...unidadesVuelos, ...unidadesTrip]))];
    }, [vuelosData, tripulantesData, esAdminGlobal, unidadUsuario]);

    const listaMisiones = useMemo(() => {
        const misiones = vuelosData.map(v => v.tipoMision).filter(Boolean);
        return ['TODAS', ...Array.from(new Set(misiones))];
    }, [vuelosData]);

    // 📌 5. FILTRADO ROBUSTO DE VUELOS
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

    // 📌 6. FILTRADO DE TRIPULANTES POR UNIDAD
    const tripulantesFiltrados = useMemo(() => {
        const unidadObjetivo = esAdminGlobal ? unidadFiltro : (unidadUsuario || 'SIN_UNIDAD');
        const claveObjetivo = normalizarClave(unidadObjetivo);

        return tripulantesData.filter(t => {
            if (esAdminGlobal && unidadFiltro === 'TODAS') return true;
            const unidadTripClave = normalizarClave(t.elemento || t.unidad);
            return unidadTripClave === claveObjetivo || 
                   unidadTripClave.includes(claveObjetivo) || 
                   claveObjetivo.includes(unidadTripClave);
        });
    }, [tripulantesData, unidadFiltro, esAdminGlobal, unidadUsuario]);

    // ==========================================
    // 📊 CÁLCULOS Y PROCESAMIENTO - TRIPULANTES
    // ==========================================

    const metricasTripulantes = useMemo(() => {
        let simuladorAlDia = 0;
        let simuladorVencido = 0;
        
        let crmAlDia = 0;
        let crmVencido = 0;

        let rorRealizado = 0;
        let cargasPeligrosasRealizado = 0;
        let seguridadOperacionalRealizado = 0;

        tripulantesFiltrados.forEach(t => {
            // Simulador
            const vSim = t.certificaciones?.simulador?.vencimiento;
            if (esCertificacionValida(vSim)) simuladorAlDia++;
            else simuladorVencido++;

            // CRM
            const vCrm = t.certificaciones?.crm?.vencimiento;
            if (esCertificacionValida(vCrm)) crmAlDia++;
            else crmVencido++;

            // Aptitudes Adicionales
            const aptitudes = t.aptitudesAdicionales || [];
            
            const tieneROR = aptitudes.some(a => 
                normalizarClave(a.tipo).includes('RADIOOPERADOR') || normalizarClave(a.tipo).includes('ROR')
            );
            if (tieneROR) rorRealizado++;

            const tieneCargas = aptitudes.some(a => 
                normalizarClave(a.tipo).includes('CARGASPELIGROSAS')
            );
            if (tieneCargas) cargasPeligrosasRealizado++;

            const tieneSeguridad = aptitudes.some(a => 
                normalizarClave(a.tipo).includes('SEGURIDADOPERACIONAL')
            );
            if (tieneSeguridad) seguridadOperacionalRealizado++;
        });

        return {
            simulador: [
                { name: 'Al Día', value: simuladorAlDia, color: '#10ac84' },
                { name: 'Vencido / Sin Datos', value: simuladorVencido, color: '#e74c3c' }
            ],
            crm: [
                { name: 'Al Día', value: crmAlDia, color: '#10ac84' },
                { name: 'Vencido / Sin Datos', value: crmVencido, color: '#e74c3c' }
            ],
            rorRealizado,
            cargasPeligrosasRealizado,
            seguridadOperacionalRealizado,
            totalTripulantes: tripulantesFiltrados.length
        };
    }, [tripulantesFiltrados]);

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
        return Object.entries(mapa).map(([name, value]) => ({ name, value: Number(value.toFixed(1)) }));
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
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 10);
    }, [vuelosFiltrados]);

    const horasPorDestino = useMemo(() => {
        const mapa = {};
        vuelosFiltrados.forEach(v => {
            const origen = (v.desde || '').trim().toUpperCase();
            const destino = (v.hasta || '').trim().toUpperCase();

            if (origen === 'SADO' && destino === 'SADO') return;

            const ruta = `${origen || 'S/D'} ➔ ${destino || 'S/D'}`;
            const hs = Number(v.horasVoladas) || 0;
            mapa[ruta] = (mapa[ruta] || 0) + hs;
        });

        return Object.entries(mapa)
            .map(([ruta, horas]) => ({ ruta, horas: Number(horas.toFixed(1)) }))
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 8);
    }, [vuelosFiltrados]);

    if (loading) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#1b3a57', fontWeight: 'bold' }}>
                🔄 Cargando datos operativos y legajos de personal...
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {/* ENCABEZADO Y FILTROS */}
            <header style={styles.header}>
                <div>
                    <h2 style={{ margin: 0, color: '#1b3a57' }}>📊 Dashboard Operativo & Estado de Fuerza</h2>
                    <span style={styles.subtitle}>
                        {esAdminGlobal && unidadFiltro === 'TODAS' 
                            ? 'Resumen consolidado general (Vista Administrador Global)' 
                            : `Resumen de la unidad: ${unidadUsuario || unidadFiltro}`}
                    </span>
                </div>

                <div style={styles.filtrosBar}>
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

            {/* SECCIÓN 1: KPI DE PERSONAL Y CAPACITACIONES */}
            <h3 style={styles.sectionHeader}>🎖️ Estado de Capacitación y Aptitudes del Personal ({metricasTripulantes.totalTripulantes} Tripulantes)</h3>
            <div style={styles.kpiContainer}>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>CURSO ROR REALIZADO</span>
                    <span style={styles.kpiValue}>{metricasTripulantes.rorRealizado} <span style={styles.kpiSubvalue}>/ {metricasTripulantes.totalTripulantes}</span></span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>CARGAS PELIGROSAS REALIZADO</span>
                    <span style={styles.kpiValue}>{metricasTripulantes.cargasPeligrosasRealizado} <span style={styles.kpiSubvalue}>/ {metricasTripulantes.totalTripulantes}</span></span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>SEGURIDAD OPERACIONAL</span>
                    <span style={styles.kpiValue}>{metricasTripulantes.seguridadOperacionalRealizado} <span style={styles.kpiSubvalue}>/ {metricasTripulantes.totalTripulantes}</span></span>
                </div>
            </div>

            {/* GRILLA DE CERTIFICACIONES TÉCNICAS (SIMULADOR Y CRM) */}
            <div style={{ ...styles.chartsGrid, marginBottom: '30px' }}>
                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🖥️ Estado de Simulador de Vuelo</h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={metricasTripulantes.simulador}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                                {metricasTripulantes.simulador.map((entry, index) => (
                                    <Cell key={`cell-sim-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Pilotos`, 'Cantidad']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🧠 Estado de Certificación CRM</h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                            <Pie
                                data={metricasTripulantes.crm}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                            >
                                {metricasTripulantes.crm.map((entry, index) => (
                                    <Cell key={`cell-crm-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} Pilotos`, 'Cantidad']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* SECCIÓN 2: KPI DE OPERACIONES Y VUELOS */}
            <h3 style={styles.sectionHeader}>✈️ Resumen Operativo de Vuelos (-12)</h3>
            <div style={styles.kpiContainer}>
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

            {/* GRILLA DE GRÁFICOS DE VUELO */}
            <div style={styles.chartsGrid}>
                <div style={styles.chartCard}>
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

                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🎯 Horas por Misión</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={horasPorMision}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={95}
                                label={(entry) => `${entry.name}: ${entry.value}h`}
                            >
                                {horasPorMision.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>👨‍✈️ Top 10 Horas por Piloto / Copiloto</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={horasPorTripulante} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas acumuladas']} />
                            <Bar dataKey="horas" fill="#4a69bd" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🗺️ Destinos & Rutas (Excluye SADO ➔ SADO)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={horasPorDestino} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="ruta" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas voladas']} />
                            <Bar dataKey="horas" fill="#38ada9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        maxWidth: '1600px',
        margin: '0 auto'
    },
    header: {
        marginBottom: '20px',
        borderBottom: '2px solid #e2e8f0',
        paddingBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
    },
    sectionHeader: {
        fontSize: '1rem',
        color: '#1b3a57',
        borderLeft: '4px solid #1b3a57',
        paddingLeft: '10px',
        marginBottom: '15px',
        marginTop: '10px',
        fontWeight: 'bold'
    },
    subtitle: {
        fontSize: '0.85rem',
        color: '#64748b'
    },
    filtrosBar: {
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap'
    },
    filtroGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px'
    },
    label: {
        fontSize: '0.7rem',
        fontWeight: 'bold',
        color: '#1b3a57'
    },
    select: {
        padding: '5px 10px',
        borderRadius: '4px',
        border: '1px solid #cbd5e1',
        fontSize: '0.8rem',
        fontWeight: '600',
        color: '#1b3a57'
    },
    kpiContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
    },
    kpiCard: {
        backgroundColor: '#ffffff',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        borderLeft: '4px solid #1b3a57',
        display: 'flex',
        flexDirection: 'column'
    },
    kpiTitle: {
        fontSize: '0.7rem',
        color: '#64748b',
        fontWeight: 'bold'
    },
    kpiValue: {
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1b3a57',
        marginTop: '4px'
    },
    kpiSubvalue: {
        fontSize: '0.9rem',
        color: '#94a3b8',
        fontWeight: 'normal'
    },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '20px'
    },
    chartCard: {
        backgroundColor: '#ffffff',
        padding: '18px',
        borderRadius: '8px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
    },
    chartTitle: {
        margin: '0 0 15px 0',
        fontSize: '0.9rem',
        color: '#1b3a57',
        fontWeight: 'bold'
    }
};