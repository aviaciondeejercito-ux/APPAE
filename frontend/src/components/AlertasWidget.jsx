import React, { useState, useEffect } from 'react';
import { getAlertasDashboard } from '../services/api';

const AlertasWidget = () => {
    const [rawDocs, setRawDocs] = useState([]);
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
                // Soportamos tanto si el backend manda alertas procesadas como si manda los documentos crudos
                const dataFeeds = response.data.data || [];
                setRawDocs(dataFeeds);
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

    // ========================================================
    // 🛡️ FUNCIÓN DE INGENIERÍA INVERSA: EXTRACCIÓN SEGURA DE FECHAS
    // ========================================================
    const parsearFechaSegura = (campo) => {
        if (!campo) return null;
        // Si el campo es directamente el string de la fecha
        if (typeof campo === 'string') return new Date(campo);
        // Si viene envuelto en el objeto $date de MongoDB (EJSON)
        if (campo.$date) return new Date(campo.$date);
        // Si se le pasa el nodo completo de la certificación
        if (campo.vencimiento) {
            if (typeof campo.vencimiento === 'string') return new Date(campo.vencimiento);
            if (campo.vencimiento.$date) return new Date(campo.vencimiento.$date);
        }
        return null;
    };

    // ==========================================
    // 👥 PROCESAMIENTO DINÁMICO DE ALERTAS (FRONTEND ENGINE)
    // ==========================================
    const fechaActual = new Date();
    const limite30Dias = new Date();
    limite30Dias.setDate(fechaActual.getDate() + 30);

    const listaAmarillos = [];
    const listaRojos = [];
    const listaNegros = [];

    // Separadores de categorías base
    const tripulantesRaw = rawDocs.filter(d => d.apellido !== undefined);
    const aeronavesRaw = rawDocs.filter(d => d.matricula !== undefined);

    tripulantesRaw.forEach(t => {
        const identificacion = `${t.grado || ''} ${t.apellido || ''} ${t.nombre || ''}`.trim();
        
        // 1. Evaluar Psicofísico
        const fPsico = parsearFechaSegura(t.certificaciones?.psicofisico);
        if (!fPsico) {
            listaNegros.push(`${identificacion} (Falta cargar Psicofísico)`);
        } else if (fPsico <= fechaActual) {
            listaRojos.push(`${identificacion} (Psicofísico VENCIDO)`);
        } else if (fPsico <= limite30Dias) {
            const dias = Math.ceil((fPsico - fechaActual) / (1000 * 60 * 60 * 24));
            listaAmarillos.push({ mensaje: `⏳ ${identificacion} (Psicofísico vence en ${dias} días)`, colorBorde: '#d97706' });
        }

        // 2. Evaluar CRM
        const fCrm = parsearFechaSegura(t.certificaciones?.crm);
        if (!fCrm) {
            listaNegros.push(`${identificacion} (Falta cargar CRM)`);
        } else if (fCrm <= fechaActual) {
            listaRojos.push(`${identificacion} (CRM VENCIDO)`);
        } else if (fCrm <= limite30Dias) {
            const dias = Math.ceil((fCrm - fechaActual) / (1000 * 60 * 60 * 24));
            listaAmarillos.push({ mensaje: `⏳ ${identificacion} (CRM vence en ${dias} días)`, colorBorde: '#d97706' });
        }
    });

    // Construcción del Layout Estructurado Final: Amarillo -> Rojo -> Negro
    const personalAgrupadoEstructurado = [...listaAmarillos];

    if (listaRojos.length > 0) {
        personalAgrupadoEstructurado.push({
            mensaje: `🚨 VENCIDO / PERSONAL NO APTO: ${listaRojos.join(', ')}`,
            colorBorde: '#dc2626'
        });
    }

    if (listaNegros.length > 0) {
        personalAgrupadoEstructurado.push({
            mensaje: `⚫ SIN DATOS / FALTA CARGAR CERTIFICACIONES: ${listaNegros.join(', ')}`,
            colorBorde: '#1e293b'
        });
    }

    // Contadores para los botones del Dashboard
    const totalAlertasPersonal = listaAmarillos.length + (listaRojos.length > 0 ? 1 : 0) + (listaNegros.length > 0 ? 1 : 0);

    return (
        <div style={styles.container}>
            <h4 style={styles.titleArea}>Novedades Operativas ({unidad || 'Unidad No Especificada'})</h4>
            
            <div style={styles.buttonGroup}>
                <button style={styles.btnPersonal} onClick={() => setShowPersonal(true)}>
                    👥 Personal ({totalAlertasPersonal})
                </button>
                <button style={styles.btnAeronaves} onClick={() => setShowAeronaves(true)}>
                    🚁 Aeronaves ({aeronavesRaw.length})
                </button>
            </div>

            {showPersonal && (
                <ModalPersonal 
                    titulo="Novedades de Personal" 
                    datos={personalAgrupadoEstructurado} 
                    onClose={() => setShowPersonal(false)} 
                />
            )}
        </div>
    );
};

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

const styles = {
    container: { backgroundColor: 'white', padding: '18px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '20px' },
    titleArea: { fontSize: '14px', color: '#1e293b', marginBottom: '12px', fontWeight: 'bold' },
    buttonGroup: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
    btnPersonal: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    btnAeronaves: { padding: '8px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#0ea5e9', color: 'white', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
    modalContent: { backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '90%', maxWidth: '500px', maxHeight: '80vh', overflowY: 'auto' },
    modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' },
    closeBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', color: '#64748b' },
    item: { padding: '12px', borderLeft: '5px solid', backgroundColor: '#f8fafc', fontSize: '13px', lineHeight: '1.4', borderRadius: '0 4px 4px 0', color: '#334155' },
    loader: { textAlign: 'center', padding: '20px', fontSize: '12px', color: '#64748b', fontWeight: 'bold' }
};

export default AlertasWidget;