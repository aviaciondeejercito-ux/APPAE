import React, { useState, useEffect, useMemo } from 'react';

import {

  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie, Legend

} from 'recharts';



// Servicio central de conexión

import { EventService } from '../services/api';



// Colores institucionales

const COLORS = ['#1b3a57', '#4a69bd', '#10ac84', '#f39c12', '#e74c3c', '#9b59b6', '#34495e', '#38ada9'];



// Función de limpieza de texto para comparaciones flexibles

const normalizarTexto = (str) => {

    if (!str) return '';

    return String(str)

        .trim()

        .toUpperCase()

        .replace(/\s+/g, ' '); // Elimina múltiples espacios seguidos

};



export default function DashboardVuelos({ vuelosData: vuelosProps }) {

    const [vuelosData, setVuelosData] = useState(vuelosProps || []);

    const [loading, setLoading] = useState(!vuelosProps || vuelosProps.length === 0);

    const [unidadFiltro, setUnidadFiltro] = useState('TODAS');

    const [misionFiltro, setMisionFiltro] = useState('TODAS');



    // 👤 1. DETECTAR Y NORMALIZAR EL USUARIO ACTUAL

    const { unidadUsuario, esAdminGlobal, rawRol } = useMemo(() => {

        try {

            const rawUser = localStorage.getItem('usuario') || localStorage.getItem('user');

            const userObj = rawUser ? JSON.parse(rawUser) : {};

            

            // Buscar la unidad/elemento en cualquier variación posible

            const elem = userObj.elemento || userObj.unidad || userObj.unidadResponsable || localStorage.getItem('elemento') || '';

            const rol = userObj.role || userObj.rol || localStorage.getItem('role') || localStorage.getItem('rol') || 'USER';

            

            const rolNorm = normalizarTexto(rol).replace(/[\s_-]/g, '');

            // Incluye roles de gestión/mando con visibilidad global

            const esMando = ['ADMIN', 'OPERACIONES', 'JEFE', 'BOSS', 'DIRECTOR', 'OTO', 'OFICINATECNICA'].includes(rolNorm);

            

            return {

                unidadUsuario: normalizarTexto(elem),

                esAdminGlobal: esMando,

                rawRol: rol

            };

        } catch (e) {

            console.error("Error al leer datos de sesión del usuario:", e);

            return { unidadUsuario: '', esAdminGlobal: false, rawRol: 'USER' };

        }

    }, []);



    // 🔄 2. CARGA DE DATOS DE VUELOS

    useEffect(() => {

        if (!vuelosProps || vuelosProps.length === 0) {

            setLoading(true);

            EventService.getVuelos()

                .then(res => {

                    const listaVuelos = res?.data || res || [];

                    setVuelosData(Array.isArray(listaVuelos) ? listaVuelos : []);

                })

                .catch(err => {

                    console.error("Error al recuperar planillas -12 de la BD:", err);

                })

                .finally(() => {

                    setLoading(false);

                });

        } else {

            setVuelosData(vuelosProps);

            setLoading(false);

        }

    }, [vuelosProps]);



    // 📌 3. FILTRO DEFAULT POR UNIDAD

    useEffect(() => {

        if (!esAdminGlobal && unidadUsuario) {

            setUnidadFiltro(unidadUsuario);

        } else if (esAdminGlobal) {

            setUnidadFiltro('TODAS');

        }

    }, [unidadUsuario, esAdminGlobal]);



    // 📌 4. OBTENER LISTA DE UNIDADES ÚNICAS

    const listaUnidades = useMemo(() => {

        if (!esAdminGlobal) {

            return [unidadUsuario || 'MI UNIDAD'];

        }



        const unidades = vuelosData.map(v => normalizarTexto(v.unidadResponsable)).filter(Boolean);

        return ['TODAS', ...Array.from(new Set(unidades))];

    }, [vuelosData, esAdminGlobal, unidadUsuario]);



    const listaMisiones = useMemo(() => {

        const misiones = vuelosData.map(v => v.tipoMision).filter(Boolean);

        return ['TODAS', ...Array.from(new Set(misiones))];

    }, [vuelosData]);



    // 📌 5. FILTRADO ROBUSTO DE VUELOS

    const vuelosFiltrados = useMemo(() => {

        const filtrados = vuelosData.filter(v => {

            const unidadVueloNorm = normalizarTexto(v.unidadResponsable);

            const unidadFiltroNorm = normalizarTexto(unidadFiltro);



            // Si es Admin / Mando Global, aplica el selector.

            // Si es usuario estándar, acepta todos los datos que ya vienen filtrados por el backend.

            let pasaUnidad = true;

            if (esAdminGlobal && unidadFiltro !== 'TODAS') {

                pasaUnidad = (unidadVueloNorm === unidadFiltroNorm);

            }



            const pasaMision = misionFiltro === 'TODAS' || v.tipoMision === misionFiltro;



            return pasaUnidad && pasaMision;

        });



        // 🔍 IMPRESIÓN DE DIAGNÓSTICO EN CONSOLA (F12)

        console.log("📊 [DIAGNÓSTICO DASHBOARD VUELOS]:", {

            rolUsuario: rawRol,

            esAdminGlobal: esAdminGlobal,

            unidadUsuarioDetectada: unidadUsuario,

            totalVuelosResueltosBD: vuelosData.length,

            vuelosFiltradosResultado: filtrados.length,

            unidadesPresentesEnVuelosBD: [...new Set(vuelosData.map(v => v.unidadResponsable))]

        });



        return filtrados;

    }, [vuelosData, unidadFiltro, misionFiltro, esAdminGlobal, unidadUsuario, rawRol]);



    // ==========================================

    // 📊 CÁLCULOS Y PROCESAMIENTO

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

                🔄 Cargando base de datos de planillas -12...

            </div>

        );

    }



    return (

        <div style={styles.container}>

            {/* ENCABEZADO Y FILTROS */}

            <header style={styles.header}>

                <div>

                    <h2 style={{ margin: 0, color: '#1b3a57' }}>📊 Dashboard de Reportes de Vuelo (-12)</h2>

                    <span style={styles.subtitle}>

                        {esAdminGlobal && unidadFiltro === 'TODAS' 

                            ? 'Resumen consolidado general (Vista Administrador Global)' 

                            : `Resumen consolidado de la unidad: ${unidadUsuario || unidadFiltro}`}

                    </span>

                </div>



                <div style={styles.filtrosBar}>

                    <div style={styles.filtroGroup}>

                        <label style={styles.label}>Unidad Responsable:</label>

                        <select 

                            value={unidadFiltro} 

                            onChange={(e) => setUnidadFiltro(e.target.value)}

                            style={styles.select}

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



            {/* TARJETAS DE INDICADORES PRINCIPALES */}

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



            {/* GRILLA DE GRÁFICOS */}

            <div style={styles.chartsGrid}>

                

                {/* 1. HORAS POR ELEMENTO APOYADO */}

                <div style={styles.chartCard}>

                    <h4 style={styles.chartTitle}>🏢 Horas por Elemento Apoyado</h4>

                    <ResponsiveContainer width="100%" height={260}>

                        <BarChart data={horasPorElemento} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>

                            <CartesianGrid strokeDasharray="3 3" vertical={false} />

                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" />

                            <YAxis />

                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas']} />

                            <Bar dataKey="value" fill="#1b3a57" radius={[4, 4, 0, 0]} />

                        </BarChart>

                    </ResponsiveContainer>

                </div>



                {/* 2. HORAS POR TIPO DE MISIÓN */}

                <div style={styles.chartCard}>

                    <h4 style={styles.chartTitle}>🎯 Horas por Misión</h4>

                    <ResponsiveContainer width="100%" height={260}>

                        <PieChart>

                            <Pie

                                data={horasPorMision}

                                dataKey="value"

                                nameKey="name"

                                cx="50%"

                                cy="50%"

                                outerRadius={80}

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



                {/* 3. TOTAL DE HORAS POR PILOTO / COPILOTO */}

                <div style={styles.chartCard}>

                    <h4 style={styles.chartTitle}>👨‍✈️ Top 10 Horas por Piloto / Copiloto</h4>

                    <ResponsiveContainer width="100%" height={260}>

                        <BarChart layout="vertical" data={horasPorTripulante} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>

                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                            <XAxis type="number" />

                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />

                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas acumuladas']} />

                            <Bar dataKey="horas" fill="#4a69bd" radius={[0, 4, 4, 0]} />

                        </BarChart>

                    </ResponsiveContainer>

                </div>



                {/* 4. DESTINOS EXTERNOS */}

                <div style={styles.chartCard}>

                    <h4 style={styles.chartTitle}>🗺️ Destinos & Rutas (Excluye SADO ➔ SADO)</h4>

                    <ResponsiveContainer width="100%" height={260}>

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

        maxWidth: '1400px',

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

        backgroundColor: '#ffffff',

        fontSize: '0.8rem',

        fontWeight: '600',

        color: '#1b3a57'

    },

    kpiContainer: {

        display: 'grid',

        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',

        gap: '15px',

        marginBottom: '25px'

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

    chartsGrid: {

        display: 'grid',

        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',

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

