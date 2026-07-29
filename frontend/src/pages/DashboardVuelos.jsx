import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie
} from 'recharts';

// Colores del sistema AE
const COLORS = ['#1b3a57', '#4a69bd', '#1e3799', '#38ada9', '#f6b93b', '#e55039', '#78e08f', '#fa983a'];

export default function DashboardVuelos({ vuelosData = [] }) {
    // Filtros por rango de fecha o unidad (opcional)
    const [filtroMision, setFiltroMision] = useState('TODAS');

    // ==========================================
    // 📊 PROCESAMIENTO Y CÁLCULOS DE DATOS (-12)
    // ==========================================

    // 1. TOTAL DE HORAS GENERALES
    const totalHorasGenerales = useMemo(() => {
        return vuelosData.reduce((acc, v) => acc + Number(v.horasVuelo || v.duracion || 0), 0);
    }, [vuelosData]);

    // 2. HORAS DE VUELO POR ELEMENTO APOYADO
    const horasPorElemento = useMemo(() => {
        const mapa = {};
        vuelosData.forEach(v => {
            const elem = v.elementoApoyado || v.unidadApoyada || 'SIN ESPECIFICAR';
            const hs = Number(v.horasVuelo || v.duracion || 0);
            mapa[elem] = (mapa[elem] || 0) + hs;
        });
        return Object.entries(mapa).map(([name, value]) => ({ name, value }));
    }, [vuelosData]);

    // 3. HORAS POR PILOTO / COPILOTO
    const horasPorTripulante = useMemo(() => {
        const mapa = {};
        vuelosData.forEach(v => {
            const hs = Number(v.horasVuelo || v.duracion || 0);
            if (v.piloto) mapa[v.piloto] = (mapa[v.piloto] || 0) + hs;
            if (v.copiloto) mapa[v.copiloto] = (mapa[v.copiloto] || 0) + hs;
        });
        return Object.entries(mapa)
            .map(([name, horas]) => ({ name, horas }))
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 10); // Top 10
    }, [vuelosData]);

    // 4. HORAS DE VUELO POR MISIÓN
    const horasPorMision = useMemo(() => {
        const mapa = {};
        vuelosData.forEach(v => {
            const mision = v.mision || v.tipoMision || 'GENERAL';
            const hs = Number(v.horasVuelo || v.duracion || 0);
            mapa[mision] = (mapa[mision] || 0) + hs;
        });
        return Object.entries(mapa).map(([name, value]) => ({ name, value }));
    }, [vuelosData]);

    // 5. VUELOS POR DESTINOS (FILTRANDO ORIGEN Y DESTINO SADO SADO)
    const horasPorDestino = useMemo(() => {
        const mapa = {};
        vuelosData.forEach(v => {
            const origen = (v.origen || '').trim().toUpperCase();
            const destino = (v.destino || '').trim().toUpperCase();

            // Descartamos si Origen y Destino son ambos SADO / Campo de Mayo local
            if (origen === 'SADO' && destino === 'SADO') return;

            const ruta = `${origen || 'DESC'} ➔ ${destino || 'DESC'}`;
            const hs = Number(v.horasVuelo || v.duracion || 0);
            mapa[ruta] = (mapa[ruta] || 0) + hs;
        });

        return Object.entries(mapa)
            .map(([ruta, horas]) => ({ ruta, horas }))
            .sort((a, b) => b.horas - a.horas)
            .slice(0, 8); // Top 8 rutas/destinos externos
    }, [vuelosData]);

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={{ margin: 0, color: '#1b3a57' }}>📊 Dashboard de Reportes de Vuelo (-12)</h2>
                <span style={styles.subtitle}>Resumen consolidado de horas y misiones de la unidad</span>
            </header>

            {/* TARJETAS DE INDICADORES PRINCIPALES */}
            <div style={styles.kpiContainer}>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>TOTAL DE HORAS DE VUELO</span>
                    <span style={styles.kpiValue}>{totalHorasGenerales.toFixed(1)} hs</span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>VUELOS REGISTRADOS</span>
                    <span style={styles.kpiValue}>{vuelosData.length}</span>
                </div>
                <div style={styles.kpiCard}>
                    <span style={styles.kpiTitle}>ELEMENTOS APOYADOS</span>
                    <span style={styles.kpiValue}>{horasPorElemento.length}</span>
                </div>
            </div>

            {/* GRILLA DE GRÁFICOS */}
            <div style={styles.chartsGrid}>
                
                {/* 1. HORAS EN FUNCIÓN DEL ELEMENTO APOYADO */}
                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🏢 Horas por Elemento Apoyado</h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={horasPorElemento} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" />
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
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. TOTAL DE HORAS POR PILOTO / COPILOTO (TOP 10) */}
                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>👨‍✈️ Top 10 Horas por Piloto / Copiloto</h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart layout="vertical" data={horasPorTripulante} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                            <Tooltip formatter={(value) => [`${value} hs`, 'Horas acumuladas']} />
                            <Bar dataKey="horas" fill="#4a69bd" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. DESTINOS EXTERNOS (EXCLUYENDO SADO ➔ SADO) */}
                <div style={styles.chartCard}>
                    <h4 style={styles.chartTitle}>🗺️ Destinos & Rutas (Excluye SADO ➔ SADO)</h4>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={horasPorDestino} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" />
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

// ==========================================
// 🎨 ESTILOS CSS-IN-JS
// ==========================================
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
        paddingBottom: '10px'
    },
    subtitle: {
        fontSize: '0.85rem',
        color: '#64748b'
    },
    kpiContainer: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
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
        fontSize: '0.75rem',
        color: '#64748b',
        fontWeight: 'bold'
    },
    kpiValue: {
        fontSize: '1.6rem',
        fontWeight: 'bold',
        color: '#1b3a57',
        marginTop: '6px'
    },
    chartsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
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
        fontSize: '0.95rem',
        color: '#1b3a57'
    }
};