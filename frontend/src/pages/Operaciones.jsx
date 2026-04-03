import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent, getAvailableAircraft } from '../services/EventService';
import { TIPOS_DE_APOYO } from '../constants/TacticalData';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(""); 
    const [role] = useState(localStorage.getItem('role')?.toLowerCase());
    const [userUnidad] = useState(localStorage.getItem('elemento')?.trim().toUpperCase());
    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const [publicarGlobal, setPublicarGlobal] = useState(false);
    const [availableAircraft, setAvailableAircraft] = useState([]);
    const [loadingAircraft, setLoadingAircraft] = useState(false);

    const rolesMando = ['admin', 'boss', 'director', 'oto', 'otoae'];
    const esMando = rolesMando.includes(role);

    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
        "SEC AE 11", "ESC AV EXPL ATQ 602", "EC AE", "SEC AE DR", 
        "SEC AE MTE 12", "B AB MANT AERON 601", "SEC AE MTE 3", "SEC AE 9"
    ];

    const etapaColors = {
        recepcion: '#f39c12',
        revision: '#3498db',
        ordenada: '#27ae60'
    };

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#3498db', notes: '',
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
        etapa: 'recepcion', 
        unidadesInvolucradas: [],
        unidadApoyada: '', 
        pntoContactoNom: '', pntoContactoTel: '',
        responsableNom: '', responsableTel: ''
    });

    useEffect(() => { 
        fetchData(); 
    }, [userUnidad]);

    useEffect(() => {
        const results = events.filter(ev => 
            ev.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ev.elemento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ev.tipoApoyo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredEvents(results);
    }, [searchTerm, events]);

    useEffect(() => {
        const fetchAeronaves = async () => {
            const unidadABuscar = userUnidad || (formData.unidadesInvolucradas.length > 0 ? formData.unidadesInvolucradas[0] : null);
            if (!unidadABuscar) return;
            
            setLoadingAircraft(true);
            try {
                const data = await getAvailableAircraft(unidadABuscar);
                const cleanData = data.map(a => ({
                    ...a,
                    matricula: a.matricula || 'S/M',
                    modelo: a.modelo || a.sda || 'S/D'
                }));
                setAvailableAircraft(cleanData);
            } catch (err) {
                console.error("Error cargando aeronaves");
            } finally {
                setLoadingAircraft(false);
            }
        };
        fetchAeronaves();
    }, [formData.unidadesInvolucradas, userUnidad, isEditing]);

    const fetchData = async () => {
        try {
            const data = await getEvents();
            
            const logicFiltered = data.filter(ev => {
                if (ev.isRealTime) return false;
                
                const creador = ev.creadorUnidad?.toUpperCase() || "";
                const unidadesResponsables = ev.elemento?.toUpperCase() || "";
                const esMiPropiaOrden = creador === userUnidad;
                const soyResponsable = unidadesResponsables.includes(userUnidad);

                if (ev.etapa === 'recepcion' || ev.etapa === 'revision') {
                    return esMiPropiaOrden;
                }

                if (esMando) {
                    if (esMiPropiaOrden) return true;
                    return ev.esGlobal === true;
                }

                if (esMiPropiaOrden) return true;
                return soyResponsable && ev.etapa === 'ordenada';
            });
            
            setEvents(Array.isArray(logicFiltered) ? logicFiltered : []);
        } catch (error) { 
            console.error("❌ Error de Sincronización Estanca"); 
        }
    };

    const parseFromBackend = (dateString) => {
        if (!dateString) return '';
        return dateString.split('.')[0].slice(0, 16);
    };

    const toggleUnidad = (unidad) => {
        const current = formData.unidadesInvolucradas;
        const updated = current.includes(unidad) 
            ? current.filter(u => u !== unidad) 
            : [...current, unidad];
        setFormData({ ...formData, unidadesInvolucradas: updated });
    };

    const addSda = () => {
        if (!formData.sdaSelected || formData.sdaSelected.trim() === "") return;
        const cantidad = parseInt(formData.sdaCantidad) || 1;
        const nuevoSda = `${cantidad}x ${formData.sdaSelected}`;
        if (!formData.sdaListado.includes(nuevoSda)) {
            setFormData(prev => ({ 
                ...prev, 
                sdaListado: [...prev.sdaListado, nuevoSda], 
                sdaSelected: '', 
                sdaCantidad: 1 
            }));
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
            alert("Complete fechas.");
            return;
        }

        const cleanNotes = formData.notes.replace(/^SdA:.*\| Obs: /, '');
        const finalElemento = (formData.unidadesInvolucradas.length > 0)
            ? formData.unidadesInvolucradas.join(', ')
            : userUnidad;

        const finalData = {
            title: formData.title.toUpperCase(),
            start: formData.start, 
            end: formData.end,
            color: formData.color,
            tipoApoyo: formData.tipoApoyo.toUpperCase(),
            sdaListado: formData.sdaListado,
            etapa: formData.etapa,
            esGlobal: publicarGlobal,
            notes: `SdA: ${formData.sdaListado.join(', ')} | Apoyado: ${formData.unidadApoyada} | Obs: ${cleanNotes}`,
            elemento: finalElemento,
            creadorUnidad: isEditing ? undefined : userUnidad, // No sobreescribir el creador original al editar
            unidadApoyada: formData.unidadApoyada.toUpperCase(),
            pntoContactoNom: formData.pntoContactoNom,
            pntoContactoTel: formData.pntoContactoTel,
            responsableNom: formData.responsableNom,
            responsableTel: formData.responsableTel
        };

        try {
            if (isEditing) {
                await updateEvent(selectedId, finalData);
            } else {
                await createEvent(finalData);
            }
            resetForm();
            fetchData();
            alert("✅ Operación procesada.");
        } catch (error) { 
            alert("❌ Error de red."); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            title: '', start: '', end: '', color: '#3498db', notes: '', 
            tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
            etapa: 'recepcion', unidadesInvolucradas: [], unidadApoyada: '',
            pntoContactoNom: '', pntoContactoTel: '',
            responsableNom: '', responsableTel: ''
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
        setFormData({
            title: ev.title || '',
            start: parseFromBackend(ev.start),
            end: parseFromBackend(ev.end),
            color: ev.color || '#3498db',
            notes: parts && parts.length > 1 ? parts[1] : ev.notes || '',
            sdaListado: Array.isArray(ev.sdaListado) ? ev.sdaListado : [], 
            tipoApoyo: ev.tipoApoyo || '',
            etapa: ev.etapa || 'recepcion',
            unidadesInvolucradas: ev.elemento ? ev.elemento.split(', ') : [],
            unidadApoyada: ev.unidadApoyada || '',
            pntoContactoNom: ev.pntoContactoNom || '',
            pntoContactoTel: ev.pntoContactoTel || '',
            responsableNom: ev.responsableNom || '',
            responsableTel: ev.responsableTel || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (ev) => {
        if (window.confirm("¿Eliminar?")) {
            try {
                await deleteEvent(ev._id);
                fetchData();
                if(isEditing && selectedId === ev._id) resetForm();
            } catch (error) {
                alert("Error.");
            }
        }
    };

    return (
        <div style={styles.container}>
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr'}}>
                <div style={styles.card}>
                    <h3 style={styles.title}>{isEditing ? "📝 Editar Orden" : "➕ Nueva Orden"}</h3>
                    
                    <button type="button" 
                        onClick={() => setPublicarGlobal(!publicarGlobal)}
                        style={{ ...styles.btnGlobal, backgroundColor: publicarGlobal ? '#27ae60' : '#bdc3c7', marginBottom: '15px', cursor: 'pointer' }}>
                        {publicarGlobal ? "🌐 PUBLICACIÓN GLOBAL (Visible para DIR AE)" : "🏠 PUBLICACIÓN LOCAL (Solo Unidad)"}
                    </button>

                    <div style={styles.etapaWrapper}>
                        <label style={styles.labelEtapa}>ESTADO DE LA ORDEN:</label>
                        <div style={styles.etapaGrid}>
                            {Object.keys(etapaColors).map(e => (
                                <button key={e} type="button" onClick={() => setFormData({...formData, etapa: e})} 
                                    style={{...styles.btnStep, background: formData.etapa === e ? etapaColors[e] : 'white', color: formData.etapa === e ? 'white' : '#555'}}>
                                    {e.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} style={styles.form}>
                        <input type="text" required placeholder="Nombre de la Misión" value={formData.title} 
                               onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input} />
                        
                        <div style={styles.row}>
                            <div style={{flex: 1}}><label style={styles.label}>H-Inicio</label>
                            <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/></div>
                            <div style={{flex: 1}}><label style={styles.label}>H-Fin</label>
                            <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/></div>
                        </div>

                        {esMando && (
                            <div style={styles.unidadSelector}>
                                <label style={styles.label}>Asignar Unidad AE Responsable:</label>
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

                        <div style={styles.sectionTitle}>UNIDAD APOYADA (QUIEN RECIBE)</div>
                        <input type="text" placeholder="Escriba la unidad que recibe el apoyo..." value={formData.unidadApoyada} 
                               onChange={e => setFormData({...formData, unidadApoyada: e.target.value})} style={styles.input} />

                        <div style={styles.sectionTitle}>PUNTO DE CONTACTO</div>
                        <div style={styles.row}>
                            <input type="text" placeholder="Grado / Nombre" value={formData.pntoContactoNom} 
                                   onChange={e => setFormData({...formData, pntoContactoNom: e.target.value})} style={{...styles.input, flex: 2}} />
                            <input type="text" placeholder="Tel" value={formData.pntoContactoTel} 
                                   onChange={e => setFormData({...formData, pntoContactoTel: e.target.value})} style={{...styles.input, flex: 1}} />
                        </div>

                        <div style={styles.sectionTitle}>TIPO DE APOYO</div>
                        <select value={formData.tipoApoyo} onChange={e => setFormData({...formData, tipoApoyo: e.target.value})} style={styles.input} required>
                            <option value="">Seleccione...</option>
                            {TIPOS_DE_APOYO.map((apoyo, idx) => <option key={idx} value={apoyo}>{apoyo}</option>)}
                        </select>

                        <div style={styles.sectionTitle}>RESPONSABLE DE EJECUCIÓN</div>
                        <div style={styles.row}>
                            <input type="text" placeholder="Cte Aeronave / Jefe" value={formData.responsableNom} 
                                   onChange={e => setFormData({...formData, responsableNom: e.target.value})} style={{...styles.input, flex: 2}} />
                            <input type="text" placeholder="Tel" value={formData.responsableTel} 
                                   onChange={e => setFormData({...formData, responsableTel: e.target.value})} style={{...styles.input, flex: 1}} />
                        </div>

                        <div style={styles.sdaBox}>
                            <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                <option value="">{loadingAircraft ? "Cargando..." : "Asignar SdA..."}</option>
                                {availableAircraft.map(air => <option key={air._id} value={`${air.modelo} (${air.matricula})`}>{air.modelo} ({air.matricula})</option>)}
                            </select>
                            <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px'}} />
                            <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                        </div>

                        <div style={styles.tagWrap}>
                            {formData.sdaListado.map((s, i) => (
                                <span key={i} style={styles.tag}>{s} <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button></span>
                            ))}
                        </div>

                        <textarea placeholder="Observaciones adicionales..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                        
                        <button type="submit" style={{...styles.btnSave, backgroundColor: formData.color}}>
                            {isEditing ? "ACTUALIZAR ORDEN" : "GRABAR ORDEN"}
                        </button>
                        {isEditing && <button type="button" onClick={resetForm} style={{...styles.btnSave, backgroundColor: '#95a5a6', marginTop: '5px'}}>CANCELAR</button>}
                    </form>
                </div>

                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Registro de Misiones</h3>
                    <input type="text" placeholder="🔍 Filtrar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.input, width: '100%', marginBottom: '15px'}} />
                    <div style={styles.scrollList}>
                        {filteredEvents.length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>No hay misiones visibles.</p> : 
                        filteredEvents.map(ev => {
                            const esCreador = ev.creadorUnidad?.toUpperCase() === userUnidad;
                            const esResponsable = ev.elemento?.toUpperCase().includes(userUnidad);
                            const puedeEditar = esCreador || (esResponsable && ev.etapa === 'ordenada');
                            const puedeBorrar = esCreador || esMando;

                            return (
                                <div key={ev._id} style={{...styles.logItem, borderLeft: `5px solid ${ev.color}`}}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 'bold', color: '#1b3a57'}}>{ev.esGlobal && "🌐 "}{ev.title}</div>
                                        <div style={{fontSize: '0.75rem', color: '#666'}}>Resp: {ev.elemento} | Apoyado: {ev.unidadApoyada}</div>
                                        <div style={{display: 'flex', gap: '6px', marginTop: '8px'}}>
                                            <span style={{...styles.miniBadge, backgroundColor: etapaColors[ev.etapa] || '#95a5a6'}}>{ev.etapa?.toUpperCase()}</span>
                                        </div>
                                    </div>
                                    <div style={styles.logActions}>
                                        {puedeEditar && <button onClick={() => handleEdit(ev)} style={styles.btnIconEdit}>✏️</button>}
                                        {puedeBorrar && <button onClick={() => handleDelete(ev)} style={styles.btnIconDel}>🗑️</button>}
                                    </div>
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
    sectionTitle: { fontSize: '0.85rem', fontWeight: 'bold', color: '#1b3a57', marginTop: '10px', borderLeft: '3px solid #3498db', paddingLeft: '8px' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    btnGlobal: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold' },
    etapaWrapper: { marginBottom: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' },
    labelEtapa: { fontSize: '0.7rem', fontWeight: 'bold', color: '#777', marginBottom: '8px', display: 'block' },
    etapaGrid: { display: 'flex', gap: '8px' },
    btnStep: { flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', border: '1px solid #ddd' },
    unidadSelector: { margin: '10px 0' },
    unidadChips: { display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
    chip: { border: 'none', padding: '5px 10px', borderRadius: '15px', fontSize: '0.7rem', cursor: 'pointer' },
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
    miniBadge: { color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;