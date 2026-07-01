import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [resumen, setResumen] = useState({ criticas: 0, advertencias: 0 });
    const [unidad, setUnidad] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cargarAlertasUnidad();
    }, []);

    const cargarAlertasUnidad = async () => {
        try {
            setLoading(false);
            const response = await getAlertasDashboard();
            if (response.data?.success) {
                setAlertas(response.data.data || []);
                setResumen(response.data.resumen || { criticas: 0, advertencias: 0 });
                setUnidad(response.data.jurisdiccion || '');
            }
        } catch (error) {
            console.error("Error al recuperar el panel de alertas operativas:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div style={styles.loader}>Evaluando potenciales y vencimientos de la Unidad...</div>;

    // Si no existen alertas en el hangar ni en el personal de la unidad
    if (alertas.length === 0) {
        return (
            <div style={styles.cardOk}>
                <span style={{ fontSize: '20px' }}>💚</span>
                <div>
                    <h4 style={{ margin: 0, color: '#15803d' }}>Jurisdicción Operativa: {unidad}</h4>
                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#166534' }}>Sin novedades críticas. Aeronaves disponibles y tripulaciones con psicofísicos vigentes.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.headerArea}>
                <div>
                    <h3 style={styles.title}>Panel de Alertas Preventivas</h3>
                    <span style={styles.unidadBadge}>📋 {unidad}</span>
                </div>
                <div style={styles.resumenContenedor}>
                    {resumen.criticas > 0 && <span style={styles.badgeCritico}>{resumen.criticas} CRÍTICOS</span>}
                    {resumen.advertencias > 0 && <span style={styles.badgeAdvertencia}>{resumen.advertencias} ADVERTENCIAS</span>}
                </div>
            </div>

            <div style={styles.listaAlertas}>
                {alertas.map((alerta, index) => {
                    const esCritico = alerta.gravedad === 'CRITICO';
                    return (
                        <div 
                            key={alerta.identificador || index} 
                            style={{
                                ...styles.alertaFila, 
                                borderLeft: esCritico ? '5px solid #dc2626' : '5px solid #d97706',
                                backgroundColor: esCritico ? '#fef2f2' : '#fffbeb'
                            }}
                        >
                            <div style={styles.alertaIcono}>
                                {esCritico ? '🔴' : '⚠️'}
                            </div>
                            <div style={styles.alertaCuerpo}>
                                <div style={{...styles.alertaTexto, color: esCritico ? '#991b1b' : '#92400e'}}>
                                    {alerta.mensaje}
                                </div>
                                <div style={styles.alertaSubtitulo}>
                                    Categoría: {alerta.categoria} | Factor: {alerta.tipo}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const styles = {
    container: { backgroundColor: 'white', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' },
    headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' },
    title: { margin: 0, fontSize: '16px', color: '#1e293b', fontWeight: 'bold' },
    unidadBadge: { fontSize: '11px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
    resumenContenedor: { display: 'flex', gap: '8px' },
    badgeCritico: { backgroundColor: '#dc2626', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' },
    badgeAdvertencia: { backgroundColor: '#d97706', color: 'white', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px' },
    listaAlertas: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' },
    alertaFila: { display: 'flex', alignItems: 'center', padding: '10px 14px', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' },
    alertaIcono: { marginRight: '12px', fontSize: '16px' },
    alertaCuerpo: { flex: 1 },
    alertaTexto: { fontSize: '12.5px', fontWeight: 'bold' },
    alertaSubtitulo: { fontSize: '10px', color: '#64748b', marginTop: '2px', textTransform: 'uppercase' },
    cardOk: { display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '15px 20px', borderRadius: '8px', marginBottom: '20px' },
    loader: { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }
};

export default AlertasWidget;