import React, { useEffect, useState } from 'react';
import { getAircrafts } from '../services/api';

const EstadoAeronaves = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Recuperar datos del usuario para el filtro de seguridad
    const role = localStorage.getItem('role');
    const userElemento = localStorage.getItem('elemento');

    useEffect(() => {
        fetchData();
        // Auto-refresco cada 5 minutos
        const interval = setInterval(fetchData, 300000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const { data } = await getAircrafts();
            
            // FILTRO DE SEGURIDAD:
            // Si es S4, solo ve su unidad. Admin y Boss ven todo.
            const filtrados = (role === 'admin' || role === 'boss') 
                ? data 
                : data.filter(a => String(a.unidad).trim() === String(userElemento).trim());
            
            setAircrafts(filtrados);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo al obtener estado de flota", error);
            setLoading(false);
        }
    };

    // Agrupar aeronaves por Unidad (Elemento)
    const unidades = [...new Set(aircrafts.map(a => a.unidad))].sort();

    if (loading) return <div style={styles.loader}>Cargando Estado de Situación AE...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={styles.mainTitle}>📊 Monitor de Estado de Material Aéreo</h2>
                <div style={styles.statusRow}>
                    <div style={styles.summaryItem}>
                        <span style={{...styles.dot, backgroundColor: '#2ecc71'}}></span> 
                        Total E/S: {aircrafts.filter(a => a.estado === 'E/S').length}
                    </div>
                    <div style={styles.summaryItem}>
                        <span style={{...styles.dot, backgroundColor: '#e74c3c'}}></span> 
                        Total F/S: {aircrafts.filter(a => a.estado === 'F/S').length}
                    </div>
                </div>
            </header>

            <div style={styles.grid}>
                {unidades.length === 0 ? (
                    <div style={styles.noData}>
                        <p>No hay aeronaves registradas para visualizar.</p>
                    </div>
                ) : (
                    unidades.map(unidad => (
                        <div key={unidad} style={styles.unitCard}>
                            <div style={styles.unitHeader}>
                                <div>
                                    <h3 style={styles.unitName}>{unidad}</h3>
                                    <div style={{fontSize: '0.7rem', opacity: 0.8}}>ELEMENTO OPERATIVO</div>
                                </div>
                                <div style={styles.badgeCount}>
                                    {aircrafts.filter(a => a.unidad === unidad && a.estado === 'E/S').length} DISPONIBLES
                                </div>
                            </div>
                            
                            <div style={styles.tableWrapper}>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>SdA</th>
                                            <th style={styles.th}>Matrícula</th>
                                            <th style={styles.th}>Estado</th>
                                            <th style={styles.th}>Hs Rem.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aircrafts.filter(a => a.unidad === unidad).map(air => (
                                            <tr key={air._id} style={{
                                                ...styles.tr,
                                                backgroundColor: air.estado === 'F/S' ? '#fff5f5' : 'transparent'
                                            }}>
                                                <td style={styles.td}>{air.sda}</td>
                                                <td style={{...styles.td, fontWeight: 'bold'}}>{air.matricula}</td>
                                                <td style={styles.td}>
                                                    <span style={{
                                                        ...styles.statusBadge,
                                                        backgroundColor: air.estado === 'E/S' ? '#2ecc71' : '#e74c3c'
                                                    }}>
                                                        {air.estado}
                                                    </span>
                                                </td>
                                                <td style={{
                                                    ...styles.td, 
                                                    color: air.horasRemanentes <= 10 ? '#e74c3c' : '#2c3e50',
                                                    fontWeight: air.horasRemanentes <= 10 ? 'bold' : 'normal'
                                                }}>
                                                    {air.horasRemanentes} {air.horasRemanentes <= 10 && '⚠️'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '30px', maxWidth: '1600px', margin: '0 auto', fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
    header: { marginBottom: '40px', textAlign: 'center' },
    mainTitle: { color: '#1b3a57', marginBottom: '10px', fontSize: '1.8rem', letterSpacing: '-0.5px' },
    statusRow: { display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '0.9rem', color: '#555' },
    summaryItem: { display: 'flex', alignItems: 'center', gap: '8px', background: '#f8f9fa', padding: '5px 15px', borderRadius: '20px', border: '1px solid #eee' },
    dot: { width: '10px', height: '10px', borderRadius: '50%' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '25px' },
    unitCard: { background: 'white', borderRadius: '15px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', overflow: 'hidden', border: '1px solid #eef2f6' },
    unitHeader: { background: '#1b3a57', padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' },
    unitName: { margin: 0, fontSize: '1.1rem', fontWeight: 'bold', textTransform: 'uppercase' },
    badgeCount: { fontSize: '0.75rem', background: 'rgba(255,255,255,0.15)', padding: '6px 12px', borderRadius: '6px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.3)' },
    tableWrapper: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { textAlign: 'left', padding: '15px 20px', background: '#f8fafd', color: '#7f8c8d', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '2px solid #edf2f7' },
    td: { padding: '15px 20px', borderBottom: '1px solid #f1f4f8', color: '#2c3e50' },
    tr: { transition: '0.2s' },
    statusBadge: { padding: '4px 10px', borderRadius: '6px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-block', minWidth: '40px', textAlign: 'center' },
    loader: { textAlign: 'center', marginTop: '100px', color: '#1b3a57', fontSize: '1.2rem', fontWeight: 'bold' },
    noData: { textAlign: 'center', gridColumn: '1 / -1', opacity: 0.6, marginTop: '50px', padding: '60px', background: '#f9f9f9', borderRadius: '15px', border: '2px dashed #ccc' }
};

export default EstadoAeronaves;