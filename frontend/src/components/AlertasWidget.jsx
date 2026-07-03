import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [resumen, setResumen] = useState({ criticas: 0, advertencias: 0 });
    const [unidad, setUnidad] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        cargarAlertasUnidad();
    }, []);

    const cargarAlertasUnidad = async () => {
        try {
            setLoading(true);
            const response = await getAlertasDashboard();
            if (response.data?.success) {
                setAlertas(response.data.data || []);
                setResumen(response.data.resumen || { criticas: 0, advertencias: 0 });
                setUnidad(response.data.jurisdiccion || '');
            }
        } catch (error) {
            console.error("Error al recuperar el panel de alertas:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null; // O podés dejar un spinner pequeño
    if (alertas.length === 0) return null; // No muestra nada si todo está en orden

    return (
        <>
            {/* Tarjeta de Resumen Compacta */}
            <div style={styles.cardResumen} onClick={() => setShowModal(true)}>
                <div style={styles.cardHeader}>
                    <h4 style={styles.title}>Estado de Personal ({unidad})</h4>
                </div>
                <div style={styles.resumenBloques}>
                    <div style={{...styles.bloque, color: '#dc2626'}}>🔴 {resumen.criticas} Vencidos</div>
                    <div style={{...styles.bloque, color: '#d97706'}}>⚠️ {resumen.advertencias} Próximos</div>
                </div>
            </div>

            {/* Modal de Detalle */}
            {showModal && (
                <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3>Detalle de Psicofísicos</h3>
                            <button style={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <div style={styles.listaModal}>
                            {alertas.map((a, i) => (
                                <div key={i} style={{...styles.item, borderLeftColor: a.gravedad === 'CRITICO' ? '#dc2626' : '#d97706'}}>
                                    <strong>{a.mensaje}</strong>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const styles = {
    cardResumen: { backgroundColor: '#fff', padding: '15px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px', transition: '0.3s' },
    cardHeader: { marginBottom: '10px' },
    title: { margin: 0, fontSize: '14px', color: '#475569' },
    resumenBloques: { display: 'flex', gap: '20px', fontSize: '14px', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', marginBottom: '15px' },
    closeBtn: { border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' },
    item: { padding: '10px', borderLeft: '4px solid', marginBottom: '8px', backgroundColor: '#f8fafc', fontSize: '13px' }
};

export default AlertasWidget;