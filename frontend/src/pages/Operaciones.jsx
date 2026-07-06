import React, { useEffect, useState } from 'react';
import { getEvents, createEvent, deleteEvent, updateEvent, getAvailableAircraft } from '../services/EventService';
import { TIPOS_DE_APOYO } from '../constants/TacticalData';

const Operaciones = () => {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]); 
    const [searchTerm, setSearchTerm] = useState(""); 
    
    // NORMALIZACIÓN SINCRO JOKER
    const rawRole = localStorage.getItem('role') || 'user';
    const roleNormalizado = rawRole.toUpperCase().replace(/[\s_]/g, '');
    const userUnidad = localStorage.getItem('elemento')?.trim().toUpperCase() || "";

    const [isEditing, setIsEditing] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [isMobile] = useState(window.innerWidth < 768);

    const [publicarGlobal, setPublicarGlobal] = useState(false);
    const [availableAircraft, setAvailableAircraft] = useState([]);
    const [loadingAircraft, setLoadingAircraft] = useState(false);

    // --- LÓGICA DE ROLES ACTUALIZADA ---
    const rolesGestionUnidad = [
        'ADMIN', 'BOSS', 'OPERACIONES', 'JEFE', 
        'OFICINATECNICA', 'LOGISTICO', 'USER', 'PERSONAL'
    ];
    
    const esMando = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(roleNormalizado);
    const esGestorUnidad = rolesGestionUnidad.includes(roleNormalizado);
    const puedePublicarGlobal = esMando || roleNormalizado === 'JEFE';

    const unidadesAE = [
        "B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", 
        "SEC AE 11", "ESC AV EXPL ATQ 602", "EC AE", "SEC AE DR", 
        "SEC AE MTE 12", "B AB MANT AERON 601", "SEC AE MTE 3", "SEC AE 9"
    ];

    const sdaListadoDirAe = [
        "UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", 
        "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "AB206B3"
    ];

    const misionesConfig = {
        'SOSTENIMIENTO': '#3498db',
        'FUERZA OPERATIVA': '#28a745',
        'EDUCACION': '#800000',
        'OTROS': '#95a5a6'
    };

    const etapaColors = {
        recepcion: '#f39c12',
        revision: '#3498db',
        ordenada: '#27ae60'
    };

    const [formData, setFormData] = useState({
        title: '', start: '', end: '', color: '#3498db', notes: '',
        mision: '', 
        tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
        etapa: 'recepcion', 
        unidadesInvolucradas: [],
        unidadApoyada: '', 
        pntoContactoNom: '', pntoContactoTel: '',
        responsableNom: '', responsableTel: ''
    });

    useEffect(() => { 
        fetchData(); 
    }, [userUnidad, roleNormalizado]);

    useEffect(() => {
        const results = events.filter(ev => 
            ev.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ev.elemento?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ev.tipoApoyo?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredEvents(results);
    }, [searchTerm, events]);

    // --- REPARACIÓN CRÍTICA: HOOK DE DISPONIBILIDAD DE AERONAVES ---
    useEffect(() => {
        const fetchAeronaves = async () => {
            // Permitir la ejecución si hay unidad de usuario válida, independientemente de esMando
            if (!userUnidad || userUnidad === "") return;
            
            setLoadingAircraft(true);
            try {
                const data = await getAvailableAircraft(userUnidad);
                if (data && Array.isArray(data)) {
                    const cleanData = data
                        .filter(a => a.estado === 'E/S')
                        .map(a => ({
                            ...a,
                            matricula: a.matricula || 'S/M',
                            modelo: a.modelo || a.sda || 'S/D'
                        }));
                    setAvailableAircraft(cleanData);
                }
            } catch (err) {
                console.error("❌ Error cargando aeronaves de la unidad:", err);
            } finally {
                setLoadingAircraft(false);
            }
        };

        fetchAeronaves();
    }, [userUnidad, isEditing]); // Monitoreo correcto de dependencias estables

    const fetchData = async () => {
        try {
            const data = await getEvents();
            const logicFiltered = data.filter(ev => {
                if (ev.isRealTime) return false;
                if (roleNormalizado === 'ADMIN') return true;

                const creador = ev.creadorUnidad?.toUpperCase() || "";
                const unidadesResponsables = ev.elemento?.toUpperCase() || "";
                const unidadUsuario = userUnidad?.toUpperCase() || "";
                const etapa = ev.etapa ? String(ev.etapa).toLowerCase() : '';
                const esGlobal = ev.esGlobal === true;

                if (['DIRECTOR', 'BOSS', 'OTO'].includes(roleNormalizado)) {
                    if (creador.includes('DIR AE') || creador.includes('SEC AE')) return true;
                    if (esGlobal && etapa === 'ordenada') return true;
                    if (unidadesResponsables.includes(unidadUsuario)) return true; 
                    return false;
                }

                if (rolesGestionUnidad.includes(roleNormalizado)) {
                    if (creador === unidadUsuario) return true;
                    if (unidadesResponsables.includes(unidadUsuario) && etapa === 'ordenada') return true;
                }
                return false;
            });
            setEvents(Array.isArray(logicFiltered) ? logicFiltered : []);
        } catch (error) { 
            console.error("❌ Error de Sincronización"); 
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
        const nuevoSdaObj = { sda: formData.sdaSelected.toUpperCase(), cantidad: cantidad };
        
        if (!formData.sdaListado.some(item => item.sda === nuevoSdaObj.sda)) {
            setFormData(prev => ({ 
                ...prev, 
                sdaListado: [...prev.sdaListado, nuevoSdaObj], 
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
        if (!formData.start || !formData.end) return alert("Complete fechas.");

        const cleanNotes = formData.notes.replace(/^SdA:.*\| Obs: /, '');
        const finalElemento = (formData.unidadesInvolucradas.length > 0)
            ? formData.unidadesInvolucradas.join(', ')
            : userUnidad;

        const finalData = {
            ...formData,
            title: formData.title.toUpperCase(),
            tipoApoyo: formData.tipoApoyo.toUpperCase(),
            esGlobal: publicarGlobal,
            notes: `SdA: ${formData.sdaListado.map(s => `${s.cantidad}x ${s.sda}`).join(', ')} | Apoyado: ${formData.unidadApoyada} | Obs: ${cleanNotes}`,
            elemento: finalElemento,
            unidadApoyada: formData.unidadApoyada.toUpperCase(),
            pntoContactoNom: formData.pntoContactoNom.toUpperCase(),
            responsableNom: formData.responsableNom.toUpperCase()
        };

        try {
            if (isEditing) {
                await updateEvent(selectedId, finalData);
            } else {
                await createEvent({ ...finalData, creadorUnidad: userUnidad });
            }
            resetForm();
            fetchData();
            alert("✅ Operación procesada correctamente.");
        } catch (error) { 
            alert("❌ Error al procesar la orden."); 
        }
    };

    const resetForm = () => {
        setFormData({ 
            title: '', start: '', end: '', color: '#3498db', notes: '', 
            mision: '', tipoApoyo: '', sdaSelected: '', sdaCantidad: 1, sdaListado: [],
            etapa: 'recepcion', unidadesInvolucradas: [], unidadApoyada: '',
            pntoContactoNom: '', pntoContactoTel: '', responsableNom: '', responsableTel: ''
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
            ...ev,
            title: ev.title || '',
            start: parseFromBackend(ev.start),
            end: parseFromBackend(ev.end),
            notes: parts && parts.length > 1 ? parts[1] : ev.notes || '',
            unidadesInvolucradas: ev.elemento ? ev.elemento.split(', ') : []
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (ev) => {
        if (window.confirm("¿Confirmar eliminación definitiva?")) {
            try {
                await deleteEvent(ev._id);
                fetchData();
                if(isEditing && selectedId === ev._id) resetForm();
            } catch (error) { alert("Error al eliminar."); }
        }
    };

    return (
        <div style={styles.container}>
            <div style={{...styles.grid, gridTemplateColumns: isMobile ? '1fr' : '1fr 1.2fr'}}>
                {/* COLUMNA FORMULARIO */}
                {esGestorUnidad ? (
                    <div style={styles.card}>
                        <h3 style={styles.title}>{isEditing ? "📝 Editar Orden" : "➕ Nueva Orden de Vuelo"}</h3>
                        
                        {puedePublicarGlobal && (
                            <button type="button" 
                                onClick={() => setPublicarGlobal(!publicarGlobal)}
                                style={{ ...styles.btnGlobal, backgroundColor: publicarGlobal ? '#27ae60' : '#bdc3c7', marginBottom: '15px' }}>
                                {publicarGlobal ? "🌐 PUBLICACIÓN GLOBAL (VISTO POR DIR AE)" : "🏠 PUBLICACIÓN LOCAL (Solo Unidad)"}
                            </button>
                        )}

                        <div style={styles.etapaWrapper}>
                            <label style={styles.labelEtapa}>ETAPA OPERATIVA:</label>
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
                            <div style={styles.sectionTitle}>CLASIFICACIÓN</div>
                            <select value={formData.mision} onChange={e => setFormData({...formData, mision: e.target.value, color: misionesConfig[e.target.value] || '#3498db'})} style={styles.input} required>
                                <option value="">Seleccione Misión...</option>
                                {Object.keys(misionesConfig).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>

                            <input type="text" required placeholder="Nombre de la Misión / Orden" value={formData.title} 
                                   onChange={e => setFormData({...formData, title: e.target.value})} style={styles.input} />
                            
                            <div style={styles.row}>
                                <div style={{flex: 1}}><label style={styles.label}>Inicio</label>
                                <input type="datetime-local" required value={formData.start} onChange={e => setFormData({...formData, start: e.target.value})} style={styles.input}/></div>
                                <div style={{flex: 1}}><label style={styles.label}>Fin</label>
                                <input type="datetime-local" required value={formData.end} onChange={e => setFormData({...formData, end: e.target.value})} style={styles.input}/></div>
                            </div>

                            {esMando && (
                                <div style={styles.unidadSelector}>
                                    <label style={styles.label}>Asignar Unidad Ejecutora:</label>
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

                            <div style={styles.sectionTitle}>DATOS DE APOYO</div>
                            <input type="text" placeholder="Unidad Apoyada" value={formData.unidadApoyada} 
                                   onChange={e => setFormData({...formData, unidadApoyada: e.target.value})} style={styles.input} />

                            <div style={styles.row}>
                                <input type="text" placeholder="Punto de Contacto" value={formData.pntoContactoNom} 
                                       onChange={e => setFormData({...formData, pntoContactoNom: e.target.value})} style={{...styles.input, flex: 2}} />
                                <input type="text" placeholder="Teléfono" value={formData.pntoContactoTel} 
                                       onChange={e => setFormData({...formData, pntoContactoTel: e.target.value})} style={{...styles.input, flex: 1}} />
                            </div>

                            <select value={formData.tipoApoyo} onChange={e => setFormData({...formData, tipoApoyo: e.target.value})} style={styles.input} required>
                                <option value="">Tipo de Apoyo...</option>
                                {TIPOS_DE_APOYO.map((apoyo, idx) => <option key={idx} value={apoyo}>{apoyo}</option>)}
                            </select>

                            <div style={styles.sectionTitle}>REQUERIMIENTO TÉCNICO (SdA)</div>
                            <div style={styles.sdaBox}>
                                <select value={formData.sdaSelected} onChange={e => setFormData({...formData, sdaSelected: e.target.value})} style={{...styles.input, flex: 1}}>
                                    <option value="">{loadingAircraft ? "Cargando material..." : "Seleccionar Aeronave..."}</option>
                                    {esMando ? (
                                        sdaListadoDirAe.map((sda, idx) => <option key={idx} value={sda}>{sda}</option>)
                                    ) : (
                                        availableAircraft.map(air => <option key={air._id} value={`${air.modelo} (${air.matricula})`}>{air.modelo} - {air.matricula}</option>)
                                    )}
                                </select>
                                <input type="number" min="1" value={formData.sdaCantidad} onChange={e => setFormData({...formData, sdaCantidad: e.target.value})} style={{...styles.input, width: '60px'}} />
                                <button type="button" onClick={addSda} style={styles.btnAdd}>+</button>
                            </div>

                            <div style={styles.tagWrap}>
                                {formData.sdaListado.map((s, i) => (
                                    <span key={i} style={styles.tag}>{s.cantidad}x {s.sda} <button type="button" onClick={() => removeSda(i)} style={styles.btnTagX}>×</button></span>
                                ))}
                            </div>

                            <textarea placeholder="Observaciones de la misión..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} style={styles.textarea}></textarea>
                            
                            <button type="submit" style={{...styles.btnSave, backgroundColor: formData.color}}>
                                {isEditing ? "ACTUALIZAR DATOS" : "GRABAR ORDEN"}
                            </button>
                            {isEditing && <button type="button" onClick={resetForm} style={{...styles.btnSave, backgroundColor: '#95a5a6', marginTop: '5px'}}>CANCELAR</button>}
                        </form>
                    </div>
                ) : (
                    <div style={styles.card}>
                        <h3 style={styles.title}>📋 Información</h3>
                        <p style={{fontSize: '0.9rem', color: '#666'}}>Su nivel de acceso (<strong>{rawRole.toUpperCase()}</strong>) es de solo consulta.</p>
                    </div>
                )}

                {/* COLUMNA REGISTRO */}
                <div style={styles.card}>
                    <h3 style={styles.title}>📜 Misiones Registradas</h3>
                    <input type="text" placeholder="🔍 Filtrar por nombre, unidad o apoyo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{...styles.input, width: '100%', marginBottom: '15px'}} />
                    <div style={styles.scrollList}>
                        {filteredEvents.length === 0 ? <p style={{textAlign: 'center', color: '#999'}}>No hay misiones bajo su jurisdicción.</p> : 
                        filteredEvents.map(ev => {
                            const esCreador = ev.creadorUnidad?.toUpperCase() === userUnidad;
                            const esResponsable = ev.elemento?.toUpperCase().includes(userUnidad);
                            const puedeEditar = esMando || esCreador || (esResponsable && ev.etapa === 'ordenada');
                            const puedeBorrar = esMando || esCreador;

                            return (
                                <div key={ev._id} style={{...styles.logItem, borderLeft: `5px solid ${ev.color}`}}>
                                    <div style={{flex: 1}}>
                                        <div style={{fontWeight: 'bold', color: '#1b3a57'}}>{ev.esGlobal && "🌐 "}{ev.title}</div>
                                        <div style={{fontSize: '0.7rem', color: ev.color, fontWeight: 'bold'}}>{ev.mision}</div>
                                        <div style={{fontSize: '0.75rem', color: '#666'}}>Resp: {ev.elemento} | Apoyado: {ev.unidadApoyada}</div>
                                        <div style={{marginTop: '5px'}}>
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
    container: { padding: '20px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    grid: { display: 'grid', gap: '25px', alignItems: 'start' },
    card: { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #f0f2f5' },
    title: { marginTop: 0, borderBottom: '2px solid #f0f2f5', paddingBottom: '12px', fontSize: '1.2rem', color: '#1b3a57', marginBottom: '20px', fontWeight: 'bold' },
    sectionTitle: { fontSize: '0.8rem', fontWeight: 'bold', color: '#1b3a57', marginTop: '10px', borderLeft: '3px solid #3498db', paddingLeft: '8px', textTransform: 'uppercase' },
    form: { display: 'flex', flexDirection: 'column', gap: '15px' },
    btnGlobal: { width: '100%', padding: '12px', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' },
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
    btnTagX: { background: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', marginLeft: '5px', fontSize: '1rem' },
    btnSave: { color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem', marginTop: '10px' },
    scrollList: { maxHeight: '600px', overflowY: 'auto' },
    logItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #f0f0f0' },
    miniBadge: { color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' },
    logActions: { display: 'flex', gap: '5px' },
    btnIconEdit: { background: '#f1c40f', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' },
    btnIconDel: { background: '#fadbd8', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }
};

export default Operaciones;