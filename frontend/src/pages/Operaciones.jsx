import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent, getAvailableAircraft } from '../services/EventService';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [role] = useState(localStorage.getItem('role')?.toLowerCase());
    const [userUnidad] = useState(localStorage.getItem('elemento'));
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const [publicarGlobal, setPublicarGlobal] = useState(false);
    const [availableAircraft, setAvailableAircraft] = useState([]);
    const [loadingAircraft, setLoadingAircraft] = useState(false);

    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
        "SEC AE 11", "ESC AV EXPL ATQ 602", "EC AE", "SEC AE DR", 
        "SEC AE MTE 12", "B AB MANT AERON 601", "SEC AE MTE 3", "SEC AE 9"
    ];

    const missionOptions = [
        { label: 'Sostenimiento', value: 'Sostenimiento', color: '#3498db' },
        { label: 'Fuerza Operativa', value: 'Fuerza Operativa', color: '#e67e22' },
        { label: 'Educación', value: 'Educacion', color: '#2ecc71' },
        { label: 'Otros', value: 'Otros', color: '#000000' }
    ];

    // DEFINICIÓN DE COLORES POR ETAPA (Sincro Joker)
    const etapaColors = {
        recepcion: '#f39c12', // Naranja/Amarillo
        revision: '#3498db',  // Azul
        ordenada: '#27ae60'   // Verde
    };

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#3498db', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
        etapa: 'recepcion', 
        unidadesInvolucradas: []
    });

    useEffect(() => { 
        fetchData(); 
    }, []);

    useEffect(() => {
        const fetchAeronaves = async () => {
            if (!userUnidad && formData.unidadesInvolucradas.length === 0) return;
            setLoadingAircraft(true);
            try {
                const destinoBusqueda = (formData.unidadesInvolucradas.length > 0) 
                    ? formData.unidadesInvolucradas[0] 
                    : userUnidad;

                if (destinoBusqueda) {
                    const data = await getAvailableAircraft(destinoBusqueda);
                    const cleanData = data.map(a => ({
                        ...a,
                        matricula: a.matricula || 'S/M',
                        modelo: a.modelo || a.sda || 'S/D'
                    }));
                    setAvailableAircraft(cleanData);
                }
            } catch (err) {
                console.error("Error cargando aeronaves");
            } finally {
                setLoadingAircraft(false);
            }
        };
        fetchAeronaves();
    }, [formData.unidadesInvolucradas, userUnidad]);

    const fetchData = async () => {
        try {
            const data = await getEvents();
            const esMando = role === 'admin' || role === 'boss';
            
            const filteredData = data.filter(ev => {
                if (ev.isRealTime) return false; 
                const esOrdenOperativa = ev.tipoApoyo || (ev.sdaListado && ev.sdaListado.length > 0);
                if (!esOrdenOperativa) return false;
                if (esMando) return true;
                return ev.elemento?.includes(userUnidad) || ev.esGlobal;
            });
            
            setEvents(Array.isArray(filteredData) ? filteredData : []);
        } catch (error) { 
            console.error("❌ Error de Sincronización AE"); 
        }
    };

    const parseFromBackend = (dateString) => {
        if (!dateString) return '';
        return dateString.split('.')[0].slice(0, 16);
    };

    const formatDateForDisplay = (dateString) => {
        if (!dateString) return '';
        const [datePart] = dateString.split('T');
        if (!datePart) return '';
        const [year, month, day] = datePart.split('-');
        return `${day}/${month}/${year}`;
    };

    const handleMissionChange = (valor) => {
        const mision = missionOptions.find(m => m.value === valor);
        setFormData({ 
            ...formData, 
            tipoApoyo: valor, 
            color: mision ? mision.color : '#7f8c8d' 
        });
    };

    const handleEtapaChange = (nuevaEtapa) => {
        setFormData({ ...formData, etapa: nuevaEtapa });
    };

    const toggleUnidad = (unidad) => {
        const current = formData.unidadesInvolucradas;
        const updated = current.includes(unidad) 
            ? current.filter(u => u !== unidad) 
            : [...current, unidad];
        setFormData({ ...formData, unidadesInvolucradas: updated });
    };

    const addSda = () => {
        if (!formData.sdaSelected || 
            formData.sdaSelected.trim() === "" || 
            formData.sdaSelected.toLowerCase().includes('undefined')) {
            return;
        }
        const valorLimpio = formData.sdaSelected.trim();
        const nuevoSda = `${formData.sdaCantidad}x ${valorLimpio}`;
        if (!formData.sdaListado.includes(nuevoSda)) {
            setFormData({ 
                ...formData, 
                sdaListado: [...formData.sdaListado, nuevoSda], 
                sdaSelected: '', 
                sdaCantidad: 1 
            });
        }
    };

    const removeSda = (index) => {
        const newList = [...formData.sdaListado];
        newList.splice(index, 1);
        setFormData({ ...formData, sdaListado: newList });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.start || !formData.end) {
            alert("Por favor complete las fechas de inicio y fin.");
            return;
        }
        const esMando = role === 'admin' || role === 'boss';
        const cleanNotes = formData.notes.replace(/^SdA:.*\| Obs: /, '');
        const finalData = {
            title: formData.title.toUpperCase(),
            start: formData.start, 
            end: formData.end,
            color: formData.color,
            tipoApoyo: formData.tipoApoyo.toUpperCase(),
            sdaListado: formData.sdaListado,
            etapa: formData.etapa,
            esGlobal: publicarGlobal,
            notes: `SdA: ${formData.sdaListado.join(', ')} | Obs: ${cleanNotes}`,
            elemento: (esMando && formData.unidadesInvolucradas.length > 0)
                      ? formData.unidadesInvolucradas.join(', ') 
                      : (isEditing ? formData.unidadesInvolucradas.join(', ') : userUnidad)
        };
        try {
            if (isEditing) {
                await updateEvent(selectedId, finalData);
                alert("✅ Registro actualizado correctamente.");
            } else {
                await createEvent(finalData);
                alert("✅ Grabado con éxito en el Monitor AE.");
            }
            resetForm();
            fetchData();
        } catch (error) { 
            console.error("Error en Submit:", error);
            alert("❌ Error al guardar. Verifique los datos y su conexión."); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            title: '', start: '', end: '', color: '#3498db', notes: '', 
            tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
            etapa: 'recepcion', unidadesInvolucradas: []
        });
        setPublicarGlobal(false);
        setIsEditing(false);
        setSelectedId(null);
    };

    const handleEdit = (ev) => {
        const puedeEditar = role === 'admin' || role === 'boss' || ev.elemento?.includes(userUnidad);
        if (!puedeEditar) {
            alert("No tiene permisos para editar órdenes de otra unidad.");
            return;
        }
        setIsEditing(true);
        setSelectedId(ev._id);
        setPublicarGlobal(ev.esGlobal || false);
        const parts = ev.notes?.split(' | Obs: ');
        const obsPart = parts && parts.length > 1 ? parts[1] : ev.notes;
        setFormData({
            title: ev.title || '',
            start: parseFromBackend(ev.start),
            end: parseFromBackend(ev.end),
            color: ev.color || '#3498db',
            notes: obsPart || '',
            sdaListado: Array.isArray(ev.sdaListado) ? ev.sdaListado : [], 
            tipoApoyo: ev.tipoApoyo || '',
            etapa: ev.etapa || 'recepcion',
            unidadesInvolucradas: ev.elemento ? ev.elemento.split(', ') : []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, elementoEv, etapaEv) => {
        const esMando = role === 'admin' || role === 'boss';
        const esDueno = elementoEv?.includes(userUnidad);
        const estaOrdenada = etapaEv === 'ordenada';

        const puedeEliminar = esMando || esDueno || estaOrdenada;

        if (!puedeEliminar) {
            alert("No tiene permisos para eliminar esta orden.");
            return;
        }

        const msg = estaOrdenada 
            ? "⚠️ ADVERTENCIA: Esta orden ya está en estado 'ORDENADA'. ¿Está seguro de que desea eliminarla manualmente?"
            : "¿Confirmar ELIMINACIÓN de la orden operativa?";

        if (window.confirm(msg)) {
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

                    {(role === 'admin' || role === 'boss' || isEditing) && (
                        <div style={styles.etapaWrapper}>
                            <label style={styles.labelEtapa}>ESTADO DE LA ORDEN:</label>
                            <div style={styles.etapaGrid}>
                                <button type="button" onClick={() => handleEtapaChange('recepcion')} 
                                        style={{...styles.btnStep, background: formData.etapa === 'recepcion' ? etapaColors.recepcion : 'white', color: formData.etapa === 'recepcion' ? 'white' : '#555'}}>🟡 Recibida</button>
                                <button type="button" onClick={() => handleEtapaChange('revision')} 
                                        style={{...styles.btnStep, background: formData.etapa === 'revision' ? etapaColors.revision : 'white', color: formData.etapa === 'revision' ? 'white' : '#555'}}>🔵 Revisión</button>
                                <button type="button" onClick={() => handleEtapaChange('ordenada')} 
                                        style={{...styles.btnStep, background: formData.etapa === 'ordenada' ? etapaColors.ordenada : 'white', color: formData.etapa === 'ordenada' ? 'white' : '#555'}}>🟢 Ordenada</button>
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

                        {(role === 'admin' || role === 'boss') && (
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

                        <select value={formData.tipoApoyo} onChange={e => handleMissionChange(e.target.value)} style={styles.input} required>
                            <option value="">Tipo de Misión...</option>
                            {missionOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>

                        <div style={styles.sdaBox}>
                            <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                <option value="">{loadingAircraft ? "Cargando..." : "Seleccionar Aeronave E/S..."}</option>
                                {availableAircraft.map(air => {
                                    const aircraftLabel = `${air.modelo} (${air.matricula})`;
                                    return <option key={air._id} value={aircraftLabel}>{aircraftLabel}</option>;
                                })}
                            </select>
                            <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px'}} />
                            <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                        </div>

                        <div style={styles.tagWrap}>
                            {formData.sdaListado.map((s, i) => (
                                <span key={i} style={styles.tag}>
                                    {s} 
                                    <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button>
                                </span>
                            ))}
                        </div>

                        <textarea placeholder="Coordenadas, Carga, Personal o detalles adicionales..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <button type="submit" style={{...styles.btnSave, backgroundColor: formData.color}}>
                            {isEditing ? "ACTUALIZAR REGISTRO" : "GRABAR EN MONITOR OPERATIVO"}
                        </button>
                        {isEditing && (
                            <button type="button" onClick={resetForm} style={{...styles.btnSave, backgroundColor: '#7f8c8d', marginTop: '5px'}}>
                                CANCELAR EDICIÓN
                            </button>
                        )}
                    </form>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Registro de Órdenes {role === 'admin' || role === 'boss' ? 'Generales' : `de ${userUnidad}`}</h3>
                    <div style={styles.scrollList}>
                        {events.length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>No hay órdenes registradas.</p> : 
                        events.map(ev => {
                            const esMando = role === 'admin' || role === 'boss';
                            const esDueno = ev.elemento?.includes(userUnidad);
                            
                            // LÓGICA DE ORIGEN: ¿Es interna o del elemento superior?
                            const esInterna = ev.elemento === userUnidad && !ev.esGlobal;
                            const labelOrigen = esInterna ? "INTERNA" : "ELEM. SUPERIOR";

                            const puedeGestionar = esMando || esDueno || ev.etapa === 'ordenada';
                            
                            return (
                                <div key={ev._id} style={{...styles.logItem, borderLeft: `5px solid ${ev.color}`}}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 'bold', color: '#1b3a57', fontSize: '1rem'}}>
                                            {ev.esGlobal && "🌐 "}{ev.title}
                                        </div>
                                        <div style={{fontSize: '0.75rem', color: '#666', fontWeight: '600'}}>
                                            {ev.elemento} | {formatDateForDisplay(ev.start)}
                                        </div>
                                        <div style={{fontSize: '0.75rem', color: '#555', marginTop: '3px', fontWeight: 'bold'}}>
                                            {ev.tipoApoyo}
                                        </div>
                                        
                                        {/* CONTENEDOR DE BADGES REFORZADO */}
                                        <div style={{display: 'flex', gap: '6px', marginTop: '8px'}}>
                                            <span style={{
                                                ...styles.miniBadge, 
                                                backgroundColor: etapaColors[ev.etapa] || '#95a5a6',
                                                padding: '4px 10px',
                                                fontSize: '0.7rem'
                                            }}>
                                                {ev.etapa?.toUpperCase() || 'PROCESANDO'}
                                            </span>
                                            <span style={{
                                                ...styles.miniBadge, 
                                                backgroundColor: esInterna ? '#7f8c8d' : '#1b3a57',
                                                padding: '4px 10px',
                                                fontSize: '0.7rem'
                                            }}>
                                                {labelOrigen}
                                            </span>
                                        </div>
                                    </div>
                                    {puedeGestionar && (
                                        <div style={styles.logActions}>
                                            <button onClick={() => handleEdit(ev)} style={styles.btnIconEdit} title="Editar">✏️</button>
                                            <button onClick={() => handleDelete(ev._id, ev.elemento, ev.etapa)} style={styles.btnIconDel} title="Eliminar">🗑️</button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
    btnStep: { flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #ddd', transition: '0.3s' },
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
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', marginLeft: '5px' },
    btnSave: { color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' },
    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0' },
    miniBadge: { color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 'bold', display: 'inline-block' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;