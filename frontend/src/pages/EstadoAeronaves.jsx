import React, { useEffect, useState } from 'react';
import { getAircrafts } from '../services/api';

const EstadoAeronaves = () => {
    const [aircrafts, setAircrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Recuperar datos del usuario logueado para aplicar el filtro de seguridad
    const user = JSON.parse(localStorage.getItem('user')) || {};

    useEffect(() => {
        fetchData();
        // Auto-refresco cada 5 minutos para tener el monitor actualizado
        const interval = setInterval(fetchData, 300000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            // SEGURIDAD: Si es S4_UNIDAD, enviamos su 'elemento' para filtrar desde el servidor
            const elementoFiltro = user.role === 'S4_UNIDAD' ? user.elemento : null;
            const { data } = await getAircrafts(elementoFiltro);
            
            setAircrafts(data);
            setLoading(false);
        } catch (error) {
            console.error("Error AE: Fallo al obtener estado de flota", error);
            setLoading(false);
        }
    };

    // Agrupar aeronaves por Unidad (Elemento) para la visualización en tarjetas
    const unidades = [...new Set(aircrafts.map(a => a.unidad))];

    if (loading) return <div style={styles.loader}>Cargando Estado de Situación AE...</div>;

    return (
        <div style={styles.container}>
            <header style={styles.header}>
                <h2 style={styles.mainTitle}>📊 Monitor de Estado de Material Aéreo</h2>
                <p style={styles.subtitle}>
                    {user.role === 'S4_UNIDAD' 
                        ? `Vista operativa para la Unidad: ${user.elemento}` 
                        : "Panorama General de la Aviación de Ejército"}
                </p>
            </header>

            <div style={styles.grid}>
                {unidades.length === 0 ? (
                    <div style={styles.noData}>
                        <p>No hay datos de aeronaves cargados para su unidad o perfil.</p>
                    </div>
                ) : (
                    unidades.map(unidad => (
                        <div key={unidad} style={styles.unitCard}>
                            <div style={styles.unitHeader}>
                                <h3 style={styles.unitName}>{unidad}</h3>
                                <span style={styles.badgeCount}>
                                    {aircrafts.filter(a => a.unidad === unidad && a.estado === 'E/S').length} E/S | {aircrafts.filter(a => a.unidad === unidad && a.estado === 'F/S').length} F/S
                                </span>
                            </div>
                            
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
                                        <tr key={air._id} style={styles.tr}>
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
                    ))
                )}
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    header: { marginBottom: '30px', textAlign: 'center' },
    mainTitle: { color: '#1b3a57', marginBottom: '5px' },
    subtitle: { color: '#666', fontSize: '1rem', fontWeight: '500' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' },
    unitCard: { background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', border: '1px solid #eee' },
    unitHeader: { background: '#1b3a57', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white' },
    unitName: { margin: 0, fontSize: '1rem', fontWeight: 'bold' },
    badgeCount: { fontSize: '0.8rem', background: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '4px' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' },
    th: { textAlign: 'left', padding: '12px', background: '#f8f9fa', color: '#666', fontWeight: 'bold', borderBottom: '1px solid #eee' },
    td: { padding: '12px', borderBottom: '1px solid #f9f9f9', color: '#2c3e50' },
    tr: { transition: '0.2s' },
    statusBadge: { padding: '4px 8px', borderRadius: '4px', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' },
    loader: { textAlign: 'center', marginTop: '100px', color: '#1b3a57', fontWeight: 'bold' },
    noData: { textAlign: 'center', gridColumn: '1 / -1', opacity: 0.6, marginTop: '50px', padding: '40px', background: '#f9f9f9', borderRadius: '10px' }
};

export default EstadoAeronaves;