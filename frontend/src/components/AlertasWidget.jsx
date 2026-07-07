import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unidad, setUnidad] = useState('');
    
    const [showPersonal, setShowPersonal] = useState(false);
    const [showAeronaves, setShowAeronaves] = useState(false);
    const [showDocumentacion, setShowDocumentacion] = useState(false);

    useEffect(() => {
        cargarAlertasUnidad();
    }, []);

    const cargarAlertasUnidad = async () => {
        try {
            const response = await getAlertasDashboard();
            if (response.data?.success) {
                setAlertas(response.data.data || []);
                setUnidad(response.data.jurisdiccion || '');
            }
        } catch (error) {
            console.error("Error al recuperar el panel de alertas:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div style={styles.loader}>Evaluando potenciales y vencimientos del Elemento...</div>;
    }

    if (alertas.length === 0) {
        return (
            <div style={styles.cardOk}>
                <div>
                    <h4 style={{ margin: 0, color: '#166534', fontSize: '14px', fontWeight: 'bold' }}>Elemento: {unidad}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#15803d' }}>
                        Sin novedades críticas ni advertencias preventivas vigentes. Material aéreo disponible y tripulaciones aptas.
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // 👥 LÓGICA DE PROCESAMIENTO Y AGRUPACIÓN DE PERSONAL
    // ==========================================
    const personalBase = alertas.filter(a => a.categoria === 'TRIPULANTE');
    
    const proximosAVencer = personalBase.filter(a => a.gravedad === 'ADVERTENCIA');
    const vencidosRaw = personalBase.filter(a => a.gravedad === 'CRITICO');
    const sinDatosRaw = personalBase.filter(a => a.gravedad === 'SINDATOS');

    const personalAgrupadoEstructurado = [];

    // 1️⃣ PRIMERO: Amarillos (Próximos a vencer, individuales arriba)
    proximosAVencer.forEach(p => {
        personalAgrupadoEstructurado.push({
            mensaje: p.mensaje, // El backend ya viene con el emoji ⏳ y el texto formateado
            colorBorde: '#d97706' 
        });
    });

    // 2️⃣ SEGUNDO: Rojos (Vencidos, agrupados en el medio)
    if (vencidosRaw.length > 0) {
        // Limpiamos los emojis nativos del mensaje para armar la lista limpia comprimida
        const listaVencidos = vencidosRaw.map(p => p.mensaje.replace('🚨 ', '')).join(', ');
        personalAgrupadoEstructurado.push({
            mensaje: `🚨 VENCIDO / PERSONAL NO APTO: ${listaVencidos}`,
            colorBorde: '#dc2626'
        });
    }

    // 3️⃣ TERCERO: Negros (Sin datos / Falta cargar, agrupados abajo)
    if (sinDatosRaw.length > 0) {
        const listaSinDatos = sinDatosRaw.map(p => p.mensaje.replace('⚫ ', '')).join(', ');
        personalAgrupadoEstructurado.push({
            mensaje: `⚫ SIN DATOS / FALTA CARGAR CERTIFICACIONES: ${listaSinDatos}`,
            colorBorde: '#1e293b'
        });
    }

    // ==========================================
    // 🚁 LÓGICA DE AGRUPACIÓN: AERONAVES Y DOCS
    // ==========================================
    const potencialBase = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo === 'MANTENIMIENTO');
    const aeronavesDocs = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo !== 'MANTENIMIENTO');

    const getColorBordeGenerico = (gravedad) => {
        if (gravedad === 'CRITICO') return '#dc2626';
        if (gravedad === 'ADVERTENCIA') return '#d97706';
        return '#1e293b';
    };

    return (
        <div style={styles.container}>
            <h4 style={styles.titleArea}>Novedades Operativas ({unidad})</h4>
            
            <div style={styles.buttonGroup}>
                <button style={styles.btnPersonal} onClick={() => setShowPersonal(true)}>
                    👥 Personal ({personalBase.length})
                </button>
                <button style={styles.btnAeronaves} onClick={() => setShowAeronaves(true)}>
                    🚁 Aeronaves ({potencialBase.length})
                </button>
                <button style={styles.btnDocs} onClick={() => setShowDocumentacion(true)}>
                    📄 Docs/Venc ({aeronavesDocs.length})
                </button>
            </div>

            {showPersonal && (
                <ModalPersonal 
                    titulo="Novedades de Personal" 
                    datos={personalAgrupadoEstructurado} 
                    onClose={() => setShowPersonal(false)} 
                />
            )}
            
            {showAeronaves && (
                <ModalGenerico 
                    titulo="Estado de Potencial (Mantenimiento)" 
                    datos={potencialBase} 
                    getColorBorde={getColorBordeGenerico}
                    onClose={() => setShowAeronaves(false)} 
                />
            )}

            {showDocumentacion && (
                <ModalGenerico 
                    titulo="Vencimientos de Documentación / Seguros" 
                    datos={aeronavesDocs} 
                    getColorBorde={getColorBordeGenerico}
                    onClose={() => setShowDocumentacion(false)} 
                />
            )}
        </div>
    );
};

// Modal específico para Personal (Mantiene el orden exacto de inserción: Amarillo -> Rojo -> Negro)
const ModalPersonal = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            {datos.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>No se registran novedades vigentes.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {datos.map((item, i) => (
                        <div key={i} style={{ ...styles.item, borderLeftColor: item.colorBorde }}>
                            {item.mensaje}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

// Modal genérico para Aeronaves y Documentación
const ModalGenerico = ({ titulo, datos, getColorBorde, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            {datos.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>No se registran novedades vigentes.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {datos.map((item, i) => (
                        <div key={i} style={{ ...styles.item, borderLeftColor: getColorBorde(item.gravedad) }}>
                            {item.mensaje}
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const styles = {
    container: { backgroundColor: 'white', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' },
    titleArea: { fontSize: '14px', color: '#1e293b', marginBottom: '12px', fontWeight: 'bold' },
    buttonGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    btnPersonal: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    btnAeronaves: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    btnDocs: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#6366f1', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
    closeBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#64748b' },
    item: { padding: '12px', borderLeft: '5px solid', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.4', borderRadius: '0 4px 4px 0', color: '#334155' },
    cardOk: { display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', borderLeft: '5px solid #166534', padding: '15px 20px', borderRadius: '6px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    loader: { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }
};

export default AlertasWidget;