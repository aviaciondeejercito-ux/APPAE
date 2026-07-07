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
    // --- NUEVA LÓGICA DE CLASIFICACIÓN: PERSONAL ---
    // ==========================================
    const personalBase = alertas.filter(a => a.categoria === 'TRIPULANTE');
    
    // 1. Proximos a vencer (30 días - Advertencias)
    const proximosAVencer = personalBase.filter(a => 
        a.gravedad === 'ADVERTENCIA' && 
        !a.mensaje.toLowerCase().includes('sin cargar') && 
        !a.mensaje.toLowerCase().includes('falta cargar') &&
        !a.mensaje.toLowerCase().includes('no posee registro')
    );

    // 2. Vencidos (Tienen registro pero expiró)
    const vencidosRaw = personalBase.filter(a => 
        (a.gravedad === 'CRITICO' || a.mensaje.toLowerCase().includes('vencido')) &&
        !a.mensaje.toLowerCase().includes('sin cargar') && 
        !a.mensaje.toLowerCase().includes('falta cargar') &&
        !a.mensaje.toLowerCase().includes('no posee registro')
    );

    // 3. Sin datos cargados
    const sinDatosRaw = personalBase.filter(a => 
        a.mensaje.toLowerCase().includes('sin cargar') || 
        a.mensaje.toLowerCase().includes('falta cargar') ||
        a.mensaje.toLowerCase().includes('no posee registro')
    );

    // Estructuramos el array final respetando estrictamente el orden requerido
    const personalAgrupadoEstructurado = [];

    // - Primero: Próximos a vencer (Individuales o listados arriba, color amarillo)
    proximosAVencer.forEach(p => {
        personalAgrupadoEstructurado.push({
            tipo: 'PROXIMO',
            mensaje: `⏳ PRÓXIMO VENCIMIENTO: ${p.mensaje}`,
            colorBorde: '#d97706' // Amarillo/Ámbar
        });
    });

    // - Segundo: Vencidos (Agrupados debajo, color rojo)
    if (vencidosRaw.length > 0) {
        const nombresVencidos = vencidosRaw.map(p => {
            return p.mensaje.includes(':') ? p.mensaje.split(':')[0].trim() : p.mensaje;
        }).join(', ');

        personalAgrupadoEstructurado.push({
            tipo: 'VENCIDO',
            mensaje: `🚨 VENCIDO / PERSONAL NO APTO: ${nombresVencidos}`,
            colorBorde: '#dc2626' // Rojo
        });
    }

    // - Tercero: Sin datos cargados (Agrupados al final, color negro)
    if (sinDatosRaw.length > 0) {
        const nombresSinDatos = sinDatosRaw.map(p => {
            return p.mensaje.includes(':') ? p.mensaje.split(':')[0].trim() : p.mensaje;
        }).join(', ');

        personalAgrupadoEstructurado.push({
            tipo: 'SINDATOS',
            mensaje: `⚫ SIN DATOS / FALTA CARGAR PSICOFÍSICO O CRM: ${nombresSinDatos}`,
            colorBorde: '#1e293b' // Negro/Gris Oscuro
        });
    }

    // --- LÓGICA DE AGRUPACIÓN: AERONAVES ---
    const potencialBase = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo === 'POTENCIAL');
    const criticos = potencialBase.filter(a => a.gravedad === 'CRITICO');
    const advertencias = potencialBase.filter(a => a.gravedad === 'ADVERTENCIA');

    const aeronavesPotencialAgrupado = [];
    if (advertencias.length > 0) {
        advertencias.forEach(a => {
            aeronavesPotencialAgrupado.push({ mensaje: `⚠️ ${a.mensaje}`, gravedad: 'ADVERTENCIA' });
        });
    }
    if (criticos.length > 0) {
        aeronavesPotencialAgrupado.push({
            mensaje: `🚨 CRÍTICO (0 hs): ${criticos.map(a => a.mensaje.match(/AE-\d+/)?.[0] || 'AE').join(', ')}`,
            gravedad: 'CRITICO'
        });
    }

    const aeronavesDocs = alertas.filter(a => a.categoria === 'AERONAVE' && a.tipo !== 'POTENCIAL');

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
            {showAeronaves && <ModalGenerico titulo="Estado de Potencial" datos={aeronavesPotencialAgrupado} onClose={() => setShowAeronaves(false)} />}
            {showDocumentacion && <ModalGenerico titulo="Vencimientos de Documentación" datos={aeronavesDocs} onClose={() => setShowDocumentacion(false)} />}
        </div>
    );
};

// Componente de Modal específico para Personal (Respeta orden y colores exactos)
const ModalPersonal = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            {datos.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>No hay novedades registradas en esta sección.</p>
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

// Componente genérico para Aeronaves y Documentación
const ModalGenerico = ({ titulo, datos, onClose }) => (
    <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
                <h3 style={{ fontSize: '16px', margin: 0 }}>{titulo}</h3>
                <button style={styles.closeBtn} onClick={onClose}>✕</button>
            </div>
            {datos.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', padding: '10px 0' }}>No hay novedades registradas en esta sección.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {datos.map((a, i) => (
                        <div key={i} style={{ ...styles.item, borderLeftColor: a.gravedad === 'CRITICO' ? '#dc2626' : '#d97706' }}>
                            {a.mensaje}
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
    item: { padding: '12px', borderLeft: '5px solid', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.4', borderRadius: '0 4px 4px 0' },
    cardOk: { display: 'flex', alignItems: 'center', backgroundColor: '#f0fdf4', borderLeft: '5px solid #166534', padding: '15px 20px', borderRadius: '6px', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' },
    loader: { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }
};

export default AlertasWidget;