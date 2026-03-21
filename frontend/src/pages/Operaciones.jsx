import React, { useEffect, useState } from 'react';
// IMPORTANTE: Usamos el servicio centralizado para normalizar fechas y seguridad
import { getEvents, createEvent, deleteEvent, updateEvent } from '../services/EventService';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role')?.toLowerCase());
    const [userUnidad] = useState(localStorage.getItem('elemento'));
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const [publicarGlobal, setPublicarGlobal] = useState(false);

    const sdaList = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
        "SEC AE 11", "ESC AV EXPL ATQ 602", "EC AE", "SEC AE DR", 
        "SEC AE MTE 12", "B AB MANT AERON 601", "SEC AE MTE 3", "SEC AE 9"
    ];

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#f39c12', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
        etapa: 'recepcion', 
        unidadesInvolucradas: []
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const data = await getEvents();
            const esMando = role === 'admin' || role === 'boss';
            const filteredData = esMando 
                ? data 
                : data.filter(ev => ev.elemento?.includes(userUnidad) || ev.esGlobal);
            setEvents(Array.isArray(filteredData) ? filteredData : []);
        } catch (error) { 
            console.error("❌ Error de Sincronización AE"); 
        }
    };

    const handleEtapaChange = (nuevaEtapa) => {
        let colorEtapa = '#95a5a6';
        if (nuevaEtapa === 'recepcion') colorEtapa = '#f39c12';
        if (nuevaEtapa === 'revision') colorEtapa = '#3498db';
        if (nuevaEtapa === 'ordenada') colorEtapa = '#27ae60';
        setFormData({ ...formData, etapa: nuevaEtapa, color: colorEtapa });
    };

    const toggleUnidad = (unidad) => {
        const current = formData.unidadesInvolucradas;
        const updated = current.includes(unidad) 
            ? current.filter(u => u !== unidad) 
            : [...current, unidad];
        setFormData({ ...formData, unidadesInvolucradas: updated });
    };

    const addSda = () => {
        if (!formData.sdaSelected) return;
        const nuevoSda = `${formData.sdaCantidad}x ${formData.sdaSelected}`;
        setFormData({ 
            ...formData, 
            sdaListado: [...formData.sdaListado, nuevoSda], 
            sdaSelected: '', 
            sdaCantidad: 1 
        });
    };

    const removeSda = (index) => {
        const newList = [...formData.sdaListado];
        newList.splice(index, 1);
        setFormData({ ...formData, sdaListado: newList });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const esAutorizadoGlobal = role === 'admin' || role === 'boss';
        // Limpiamos notas para evitar duplicación de prefijos "SdA:" al editar varias veces
        const cleanNotes = formData.notes.replace(/^SdA:.*\| Obs: /, '');

        /**
         * ESTÁNDAR DE SEGURIDAD: 
         * Construimos el objeto final asegurando que los campos coincidan con el Schema
         */
        const finalData = {
            title: formData.title,
            start: formData.start,
            end: formData.end,
            color: formData.color,
            tipoApoyo: formData.tipoApoyo,
            sdaListado: formData.sdaListado,
            etapa: formData.etapa,
            esGlobal: esAutorizadoGlobal ? publicarGlobal : false,
            tipoOrigen: esAutorizadoGlobal && publicarGlobal ? 'COMANDO' : 'UNIDAD',
            notes: `SdA: ${formData.sdaListado.join(', ')} | Obs: ${cleanNotes}`,
            elemento: (esAutorizadoGlobal && formData.unidadesInvolucradas.length > 0)
                      ? formData.unidadesInvolucradas.join(', ') 
                      : userUnidad
        };

        try {
            if (isEditing) {
                // El service se encarga de quitar el _id y normalizar fechas ISO
                await updateEvent(selectedId, finalData);
            } else {
                await createEvent(finalData);
            }
            resetForm();
            fetchData();
            alert("Operación procesada con éxito en el Monitor AE.");
        } catch (error) { 
            console.error("Error en Submit:", error);
            alert("Error crítico en el registro de la orden."); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            title: '', start: '', end: '', color: '#f39c12', notes: '', 
            tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
            etapa: 'recepcion', unidadesInvolucradas: []
        });
        setPublicarGlobal(false);
        setIsEditing(false);
        setSelectedId(null);
    };

    const handleEdit = (ev) => {
        setIsEditing(true);
        setSelectedId(ev._id);
        setPublicarGlobal(ev.esGlobal || false);

        const parts = ev.notes?.split(' | Obs: ');
        const obsPart = parts && parts.length > 1 ? parts[1] : ev.notes;

        // CORRECCIÓN HORARIA: Formateo ISO local para evitar el desfase de 3hs en el input
        const formatFecha = (d) => {
            if (!d) return '';
            const date = new Date(d);
            const offset = date.getTimezoneOffset() * 60000;
            return new Date(date.getTime() - offset).toISOString().slice(0, 16);
        };

        setFormData({
            title: ev.title,
            start: formatFecha(ev.start),
            end: formatFecha(ev.end),
            color: ev.color,
            notes: obsPart || '',
            sdaListado: ev.sdaListado || [], 
            tipoApoyo: ev.tipoApoyo || '',
            etapa: ev.etapa || 'recepcion',
            unidadesInvolucradas: ev.elemento ? ev.elemento.split(', ') : []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("¿Confirmar ELIMINACIÓN de la orden operativa?")) {
            try {
                await deleteEvent(id);
                fetchData();
            } catch (error) {
                alert("No se pudo eliminar el evento.");
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr'}}>
                
                <div style={styles.card}>
                    <h3 style={styles.title}>{isEditing ? "📝 Editar Orden de Vuelo" : "➕ Nueva Solicitud Operativa"}</h3>
                    
                    {(role === 'admin' || role === 'boss') && (
                        <div style={styles.globalToggleContainer}>
                            <button 
                                type="button" 
                                onClick={() => setPublicarGlobal(!publicarGlobal)}
                                style={{
                                    ...styles.btnGlobal, 
                                    backgroundColor: publicarGlobal ? '#27ae60' : '#bdc3c7'
                                }}
                            >
                                {publicarGlobal ? "🌐 PUBLICACIÓN GLOBAL (DIR AE)" : "🏠 PUBLICACIÓN LOCAL (UNIDAD)"}
                            </button>
                        </div>
                    )}

                    {(role === 'admin' || role === 'boss') && (
                        <div style={styles.etapaWrapper}>
                            <label style={styles.labelEtapa}>CONTROL DE ESTADO (FLUJO AE):</label>
                            <div style={styles.etapaGrid}>
                                <button type="button" onClick={() => handleEtapaChange('recepcion')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'recepcion' ? 1 : 0.4, border: '2px solid #f39c12'}}>🟡 Recibida</button>
                                <button type="button" onClick={() => handleEtapaChange('revision')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'revision' ? 1 : 0.4, border: '2px solid #3498db'}}>🔵 Revisión</button>
                                <button type="button" onClick={() => handleEtapaChange('ordenada')} 
                                        style={{...styles.btnStep, opacity: formData.etapa === 'ordenada' ? 1 : 0.4, border: '2px solid #27ae60'}}>🟢 Ordenada</button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input type="text" required placeholder="Nombre de la Misión / Ejercicio" value={formData.title} 
                               onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input} />
                        
                        <div style={styles.row}>
                            <div style={{flex: 1}}><label style={styles.label}>H-Inicio</label>
                            <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={styles.label}>H-Fin</label>
                            <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/></div>
                        </div>

                        {(role === 'admin' || role === 'boss') && publicarGlobal && (
                            <div style={styles.unidadSelector}>
                                <label style={styles.label}>Asignar Unidades Destinatarias:</label>
                                <div style={styles.unidadChips}>
                                    {unidadesAE.map(u => (
                                        <button key={u} type="button" onClick={() => toggleUnidad(u)}
                                                style={{...styles.chip, backgroundColor: formData.unidadesInvolucradas.includes(u) ? '#1b3a57' : '#eee', color: formData.unidadesInvolucradas.includes(u) ? 'white' : '#555'}}>
                                            {u}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <select value={formData.tipoApoyo} onChange={e => setFormData({...formData, tipoApoyo: e.target.value})} style={styles.input} required>
                            <option value="">Tipo de Misión...</option>
                            <option value="Sostenimiento">Sostenimiento</option>
                            <option value="Fuerza Operativa">Fuerza Operativa</option>
                            <option value="Educacion">Educación / Instrucción</option>
                            <option value="Guardia">Servicio de Guardia</option>
                        </select>

                        <div style={styles.sdaBox}>
                            <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                <option value="">SdA...</option>
                                {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px'}} />
                            <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                        </div>

                        <div style={styles.tagWrap}>
                            {formData.sdaListado.map((s, i) => (
                                <span key={i} style={styles.tag}>{s} <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button></span>
                            ))}
                        </div>

                        <textarea placeholder="Coordenadas, Carga, Personal o detalles adicionales..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <button type="submit" style={{...styles.btnSave, backgroundColor: formData.color}}>
                            {isEditing ? "ACTUALIZAR REGISTRO" : "GRABAR EN MONITOR OPERATIVO"}
                        </button>
                        {isEditing && <button type="button" onClick={resetForm} style={{...styles.btnSave, backgroundColor: '#7f8c8d', marginTop: '5px'}}>CANCELAR EDICIÓN</button>}
                    </form>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Registro de Órdenes {role === 'admin' || role === 'boss' ? 'Generales' : `de ${userUnidad}`}</h3>
                    <div style={styles.scrollList}>
                        {events.length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>No hay órdenes registradas.</p> : 
                        events.map(ev => (
                            <div key={ev._id} style={{...styles.logItem, borderLeft: `5px solid ${ev.color}`}}>
                                <div style={{flex: 1}}>
                                    <div style={{fontWeight: 'bold', color: '#1b3a57'}}>
                                        {ev.esGlobal && "🌐 "}{ev.title}
                                    </div>
                                    <div style={{fontSize: '0.75rem', color: '#666'}}>
                                        {ev.elemento} | {new Date(ev.start).toLocaleDateString('es-AR')}
                                    </div>
                                    <span style={{...styles.miniBadge, backgroundColor: ev.color}}>
                                        {ev.etapa?.toUpperCase() || 'PROCESANDO'}
                                    </span>
                                </div>
                                <div style={styles.logActions}>
                                    <button onClick={() => handleEdit(ev)} style={styles.btnIconEdit}>✏️</button>
                                    <button onClick={() => handleDelete(ev._id)} style={styles.btnIconDel}>🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const styles = {
    container: { padding: '20px', maxWidth: '1200px', margin: '0 auto' },
    grid: { display: 'grid', gap: '25px', alignItems: 'start' },
    card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' },
    title: { marginTop: 0, borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', fontSize: '1.2rem', color: '#1b3a57', marginBottom: '20px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    globalToggleContainer: { marginBottom: '15px' },
    btnGlobal: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },
    etapaWrapper: { marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' },
    labelEtapa: { fontSize: '0.7rem', fontWeight: 'bold', color: '#777', marginBottom: '8px', display: 'block' },
    etapaGrid: { display: 'flex', gap: '8px' },
    btnStep: { flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', background: 'white', transition: '0.3s' },
    unidadSelector: { margin: '10px 0' },
    unidadChips: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
    chip: { border: 'none', padding: '5px 10px', borderRadius: '15px', fontSize: '0.7rem', cursor: 'pointer', transition: '0.2s' },
    row: { display: 'flex', gap: '12px' },
    label: { fontSize: '0.75rem', fontWeight: 'bold', color: '#555' },
    input: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '0.9rem', outline: 'none' },
    textarea: { padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '80px', fontSize: '0.9rem', resize: 'none' },
    sdaBox: { display: 'flex', gap: '10px' },
    btnAdd: { background: '#1b3a57', color: 'white', border: 'none', borderRadius: '8px', width: '40px', cursor: 'pointer' },
    tagWrap: { display: 'flex', flexWrap: 'wrap', gap: '5px' },
    tag: { background: '#e1e8ed', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', color: '#1b3a57', display: 'flex', alignItems: 'center' },
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer' },
    btnSave: { color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' },
    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderBottom: '1px solid #f0f0f0' },
    miniBadge: { color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', marginTop: '5px', display: 'inline-block' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;