import React, { useState } from 'react';

const F16Page = () => {
    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "B206B3"];
    const unidadesList = ["Aviación de Ejército 601", "Aviación de Ejército 602", "Sección de Aviación de Ejército 2", "Sección de Aviación de Ejército 3"];

    // Estados de navegación y búsqueda
    const [busquedaForm, setBusquedaForm] = useState('');
    const [unidadNavegacion, setUnidadNavegacion] = useState(unidadesList[0]);
    const [unidadDestinoTraslado, setUnidadDestinoTraslado] = useState('');
    
    // Estado para saber si la información proviene de una búsqueda (Bloquea campos clave)
    const [esEdicion, setEsEdicion] = useState(false);

    // Estado inicial limpio para resetear el formulario
    const estadoInicialCabecera = {
        sda: sdaList[0], matricula: '', nroSerie: '', estadoOperativo: 'E/S',
        inicioAeFecha: '', inicioAeHs: '', tgPlaneadorActual: '',
        motorSn: '', motorTsn: '', motorCsnCso: '',
        vencimientoElt: '', vencimientoPitot: '', vencimientoTransponder: '',
        vencimientoSeguro: '', vencimientoAvionica: '', observacionesPopup: ''
    };

    // Plantilla para generar filas limpias con sub-renglones iniciales
    const generarFilaVacia = (nro) => ({
        nro: nro, ata: '', pn: '', componente: '', sn: '',
        limiteTipo: 'TBO', 
        limites: [{ valor: '', unidad: 'H' }],
        instaladoFecha: '', instaladoHoras: '', 
        tsnCsnRenglones: [{ valor: '', unidad: 'H' }], 
        tgInstalacion: '', estadoTipo: 'TSO', estadoActual: '',
        disponibilidades: [{ valor: '', unidad: 'H' }]
    });

    // Estados principales del Formulario
    const [cabecera, setCabecera] = useState(estadoInicialCabecera);
    const [compPlaneador, setCompPlaneador] = useState([generarFilaVacia(1)]);
    const [motores, setMotores] = useState([
        { id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }
    ]);
    // NUEVO: Estado para hélices (sigue la misma lógica que motores)
    const [helices, setHelices] = useState([
        { id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }
    ]);

    // ACCIONES GLOBALES DE FORMULARIO
    const limpiarFormularioParaNuevoAlta = () => {
        if (window.confirm("¿Desea limpiar la pantalla para rellenar un nuevo Formulario de Alta? Los datos no guardados se perderán.")) {
            setCabecera(estadoInicialCabecera);
            setCompPlaneador([generarFilaVacia(1)]);
            setMotores([{ id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }]);
            setHelices([{ id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }]);
            setBusquedaForm('');
            setEsEdicion(false);
        }
    };

    // Simulación de búsqueda (activa el bloqueo de celdas clave)
    const handleKeyDownBusqueda = (e) => {
        if (e.key === 'Enter' && busquedaForm.trim() !== '') {
            setEsEdicion(true); 
            alert(`Cargando datos de la aeronave: ${busquedaForm}. Campos críticos SdA, Matrícula y Nro Serie bloqueados.`);
        }
    };

    const guardarAltaAeronave = () => {
        if (!cabecera.matricula) {
            alert("Por favor, ingrese al menos la Matrícula para dar de alta la aeronave.");
            return;
        }
        alert(`¡Formulario de la aeronave ${cabecera.matricula} guardado/actualizado con éxito!`);
    };

    const eliminarFormularioAeronave = () => {
        if (!cabecera.matricula) {
            alert("No hay ninguna aeronave cargada o identificada con matrícula para eliminar.");
            return;
        }
        if (window.confirm(`⚠️ AVISO CRÍTICO: ¿Está completamente seguro de eliminar el formulario de la aeronave ${cabecera.matricula}? Esta acción es irreversible.`)) {
            alert(`El registro de la aeronave ${cabecera.matricula} ha sido eliminado.`);
            setCabecera(estadoInicialCabecera);
            setCompPlaneador([generarFilaVacia(1)]);
            setMotores([{ id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }]);
            setHelices([{ id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }]);
            setEsEdicion(false);
        }
    };

    // Manejadores de cambios en Cabecera
    const handleCabeceraChange = (field, val) => {
        setCabecera(prev => ({
            ...prev,
            [field]: field.includes('Hs') || field.includes('Actual') || field.includes('Tsn') || field.includes('CsnCso') ? (val === '' ? '' : Number(val)) : val
        }));
    };

    // MANEJO DE ESTADOS: PLANEADOR
    const handlePlaneadorChange = (idx, field, val) => {
        const nuevos = [...compPlaneador];
        nuevos[idx][field] = val;
        setCompPlaneador(nuevos);
    };

    const handlePlaneadorSubChange = (idx, arrayField, subIdx, subSubField, val) => {
        const nuevos = [...compPlaneador];
        nuevos[idx][arrayField][subIdx][subSubField] = val;
        setCompPlaneador(nuevos);
    };

    const agregarSubFilaPlaneador = (compIdx, arrayField) => {
        const nuevos = [...compPlaneador];
        nuevos[compIdx][arrayField].push({ valor: '', unidad: 'H' });
        setCompPlaneador(nuevos);
    };

    const removerSubFilaPlaneador = (compIdx, arrayField, subIdx) => {
        const nuevos = [...compPlaneador];
        if (nuevos[compIdx][arrayField].length > 1) {
            nuevos[compIdx][arrayField] = nuevos[compIdx][arrayField].filter((_, i) => i !== subIdx);
            setCompPlaneador(nuevos);
        }
    };

    // MANEJO DE ESTADOS: MOTORES
    const handleNombreMotorChange = (motorIdx, nuevoNombre) => {
        const nuevosMotores = [...motores];
        nuevesMotores[motorIdx].nombre = nuevoNombre;
        setMotores(nuevosMotores);
    };

    const handleMotorCompChange = (motorIdx, compIdx, field, val) => {
        const nuevosMotores = [...motores];
        nuevosMotores[motorIdx].componentes[compIdx][field] = val;
        setMotores(nuevosMotores);
    };

    const handleMotorSubChange = (motorIdx, compIdx, arrayField, subIdx, subSubField, val) => {
        const nuevosMotores = [...motores];
        nuevosMotores[motorIdx].componentes[compIdx][arrayField][subIdx][subSubField] = val;
        setMotores(nuevosMotores);
    };

    const agregarFilaMotor = (motorIdx) => {
        const nuevosMotores = [...motores];
        const listado = nuevosMotores[motorIdx].componentes;
        listado.push(generarFilaVacia(listado.length + 1));
        setMotores(nuevosMotores);
    };

    const removerFilaMotor = (motorIdx, compIdx) => {
        const nuevosMotores = [...motores];
        if (nuevosMotores[motorIdx].componentes.length === 1) return;
        nuevosMotores[motorIdx].componentes = nuevosMotores[motorIdx].componentes
            .filter((_, idx) => idx !== compIdx)
            .map((c, idx) => ({ ...c, nro: idx + 1 }));
        setMotores(nuevosMotores);
    };

    const agregarSubFilaMotor = (motorIdx, compIdx, arrayField) => {
        const nuevosMotores = [...motores];
        nuevosMotores[motorIdx].componentes[compIdx][arrayField].push({ valor: '', unidad: 'H' });
        setMotores(nuevosMotores);
    };

    const removerSubFilaMotor = (motorIdx, compIdx, arrayField, subIdx) => {
        const nuevosMotores = [...motores];
        if (nuevosMotores[motorIdx].componentes[compIdx][arrayField].length > 1) {
            nuevosMotores[motorIdx].componentes[compIdx][arrayField] = nuevosMotores[motorIdx].componentes[compIdx][arrayField].filter((_, i) => i !== subIdx);
            setMotores(nuevosMotores);
        }
    };

    // NUEVO MANEJO DE ESTADOS: HÉLICES
    const handleNombreHeliceChange = (heliceIdx, nuevoNombre) => {
        const nuevasHelices = [...helices];
        nuevasHelices[heliceIdx].nombre = nuevoNombre;
        setHelices(nuevasHelices);
    };

    const handleHeliceCompChange = (heliceIdx, compIdx, field, val) => {
        const nuevasHelices = [...helices];
        nuevasHelices[heliceIdx].componentes[compIdx][field] = val;
        setHelices(nuevasHelices);
    };

    const handleHeliceSubChange = (heliceIdx, compIdx, arrayField, subIdx, subSubField, val) => {
        const nuevasHelices = [...helices];
        nuevasHelices[heliceIdx].componentes[compIdx][arrayField][subIdx][subSubField] = val;
        setHelices(nuevasHelices);
    };

    const agregarFilaHelice = (heliceIdx) => {
        const nuevasHelices = [...helices];
        const listado = nuevasHelices[heliceIdx].componentes;
        listado.push(generarFilaVacia(listado.length + 1));
        setHelices(nuevasHelices);
    };

    const removerFilaHelice = (heliceIdx, compIdx) => {
        const nuevasHelices = [...helices];
        if (nuevasHelices[heliceIdx].componentes.length === 1) return;
        nuevasHelices[heliceIdx].componentes = nuevasHelices[heliceIdx].componentes
            .filter((_, idx) => idx !== compIdx)
            .map((c, idx) => ({ ...c, nro: idx + 1 }));
        setHelices(nuevasHelices);
    };

    const agregarSubFilaHelice = (heliceIdx, compIdx, arrayField) => {
        const nuevasHelices = [...helices];
        nuevasHelices[heliceIdx].componentes[compIdx][arrayField].push({ valor: '', unidad: 'H' });
        setHelices(nuevasHelices);
    };

    const removerSubFilaHelice = (heliceIdx, compIdx, arrayField, subIdx) => {
        const nuevasHelices = [...helices];
        if (nuevasHelices[heliceIdx].componentes[compIdx][arrayField].length > 1) {
            nuevasHelices[heliceIdx].componentes[compIdx][arrayField] = nuevasHelices[heliceIdx].componentes[compIdx][arrayField].filter((_, i) => i !== subIdx);
            setHelices(nuevasHelices);
        }
    };

    // ACTUALIZADO: Alternador Bimotor sincroniza Motores y Hélices
    const alternarSegundoMotor = () => {
        if (motores.length === 1) {
            setMotores([...motores, { id: 2, nombre: 'MOTOR Nº 2', componentes: [generarFilaVacia(1)] }]);
            setHelices([...helices, { id: 2, nombre: 'HÉLICE Nº 2', componentes: [generarFilaVacia(1)] }]);
        } else {
            if (window.confirm("¿Confirma remover la configuración adicional de Motor y Hélice Nº 2 junto a sus componentes?")) {
                setMotores([motores[0]]);
                setHelices([helices[0]]);
            }
        }
    };

    const colorEstadoOperativo = cabecera.estadoOperativo === 'E/S' ? '#2ecc71' : '#e74c3c';

    return (
        <div style={styles.container}>
            {/* ENCABEZADO PRINCIPAL Y BOTONES DE ACCIÓN GLOBAL */}
            <div style={styles.mainHeaderFlex}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>SISTEMA DE GESTIÓN F-16 - HISTORIAL METRICIAL</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={limpiarFormularioParaNuevoAlta} style={styles.btnFormAlta}>📄 Formulario de Alta (Nuevo)</button>
                    <button type="button" onClick={guardarAltaAeronave} style={styles.btnFormGuardar}>💾 Dar de Alta / Guardar</button>
                    <button type="button" onClick={eliminarFormularioAeronave} style={styles.btnFormEliminar}>🗑️ Eliminar Formulario</button>
                </div>
            </div>

            {/* SECCIÓN SUPERIOR: CONTROL DE BÚSQUEDA Y NAVEGACIÓN */}
            <div style={styles.cardAdminPanel}>
                <div style={styles.adminGrid}>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>🔍 BUSCADOR POR MATRÍCULA (Ver/Controlar Historiales Existentes)</label>
                        <input 
                            type="text" 
                            value={busquedaForm} 
                            onChange={e => setBusquedaForm(e.target.value)} 
                            onKeyDown={handleKeyDownBusqueda}
                            style={styles.inputAdmin} 
                            placeholder="Escriba matrícula y presione Enter para buscar..." 
                        />
                    </div>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>🛡️ NAVEGACIÓN ENTRE UNIDADES</label>
                        <select value={unidadNavegacion} onChange={e => setUnidadNavegacion(e.target.value)} style={{...styles.inputAdmin, backgroundColor: '#f0f4f8'}}>
                            {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>✈️ TRANSFERIR FORMULARIO ACTUAL</label>
                        <div style={{ display: 'flex', gap: '2px' }}>
                            <select value={unidadDestinoTraslado} onChange={e => setUnidadDestinoTraslado(e.target.value)} style={{...styles.inputAdmin, flex: 1, backgroundColor: '#fff0f0'}}>
                                <option value="">-- Destino --</option>
                                {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <button type="button" onClick={() => alert("Transferencia guardada en cola.")} style={styles.btnTransfer}>Transferir</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CABECERA SIMÉTRICA */}
            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    {/* BLOQUE DATOS DE LA AERONAVE */}
                    <div style={styles.block}>
                        <div style={styles.blockTitleFlex}>
                            <span>DATOS DE LA AERONAVE {esEdicion && <span style={{color: '#d35400', fontSize: '0.65rem'}}>🔒 BLOQUEADO</span>}</span>
                            <select 
                                value={cabecera.estadoOperativo} 
                                onChange={e => handleCabeceraChange('estadoOperativo', e.target.value)} 
                                style={{...styles.inputCondicionSelector, backgroundColor: colorEstadoOperativo}}
                            >
                                <option value="E/S">E/S</option>
                                <option value="F/S">F/S</option>
                            </select>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>SdA</label>
                                <select 
                                    value={cabecera.sda} 
                                    onChange={e => handleCabeceraChange('sda', e.target.value)} 
                                    disabled={esEdicion}
                                    style={{...styles.input, backgroundColor: esEdicion ? '#e9ecef' : 'white', cursor: esEdicion ? 'not-allowed' : 'default'}}
                                >
                                    {sdaList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Matrícula</label>
                                <input 
                                    type="text" 
                                    value={cabecera.matricula} 
                                    onChange={e => handleCabeceraChange('matricula', e.target.value)} 
                                    disabled={esEdicion}
                                    style={{...styles.input, backgroundColor: esEdicion ? '#e9ecef' : 'white', cursor: esEdicion ? 'not-allowed' : 'default'}}
                                    placeholder="AE-XXX" 
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Nro Serie</label>
                                <input 
                                    type="text" 
                                    value={cabecera.nroSerie} 
                                    onChange={e => handleCabeceraChange('nroSerie', e.target.value)} 
                                    disabled={esEdicion}
                                    style={{...styles.input, backgroundColor: esEdicion ? '#e9ecef' : 'white', cursor: esEdicion ? 'not-allowed' : 'default'}}
                                    placeholder="N/S" 
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>TIEMPOS E HISTORIAL</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Fecha)</label><input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Hs)</label><input type="number" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} placeholder="0.0" /></div>
                            <div style={styles.field}><label style={styles.label}>TG Planeador Actual</label><input type="number" value={cabecera.tgPlaneadorActual} onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} style={{...styles.input, backgroundColor: '#fff9db', fontWeight: 'bold'}} placeholder="0.0" /></div>
                        </div>
                    </div>
                    <div style={styles.block}>
                        <div style={styles.blockTitle}>GRUPO MOTOPROPULSOR</div>
                        <div style={styles.formRow}>
                            <div style={styles.field}><label style={styles.label}>Motor S/N</label><input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} placeholder="S/N" /></div>
                            <div style={styles.field}><label style={styles.label}>TSN</label><input type="number" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={styles.input} placeholder="0.0" /></div>
                            <div style={styles.field}><label style={styles.label}>CSN/CSO</label><input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={styles.input} placeholder="0" /></div>
                        </div>
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '12px 0' }} />

                {/* FILA DE VENCIMIENTOS LEGALES */}
                <div style={styles.headerGrid}>
                    <div style={{...styles.block, flex: 3}}>
                        <div style={styles.blockTitle}>REQUISITOS LEGALES & VENCIMIENTOS HABILITACIONES</div>
                        <div style={styles.formRowAlign}>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.207 (ELT)</label><input type="date" value={cabecera.vencimientoElt} onChange={e => handleCabeceraChange('vencimientoElt', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.411 (Pitot)</label><input type="date" value={cabecera.vencimientoPitot} onChange={e => handleCabeceraChange('vencimientoPitot', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.413 (Xponder)</label><input type="date" value={cabecera.vencimientoTransponder} onChange={e => handleCabeceraChange('vencimientoTransponder', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Seguro</label><input type="date" value={cabecera.vencimientoSeguro} onChange={e => handleCabeceraChange('vencimientoSeguro', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Aviónica</label><input type="date" value={cabecera.vencimientoAvionica} onChange={e => handleCabeceraChange('vencimientoAvionica', e.target.value)} style={styles.inputUniform} /></div>
                        </div>
                    </div>
                    <div style={{...styles.block, flex: 1, borderRight: 'none'}}>
                        <div style={styles.blockTitle}>OBSERVACIONES / NOVEDADES</div>
                        <div style={styles.formRowAlign}>
                            <input type="text" value={cabecera.observacionesPopup} onChange={e => handleCabeceraChange('observacionesPopup', e.target.value)} style={{...styles.inputUniform, flex: 1}} placeholder="Escribir novedad..." />
                            <button type="button" onClick={() => alert(cabecera.observacionesPopup || "Sin novedades.")} style={styles.btnUniformPopup}>👁️ Ver</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTROL DE CONFIGURACIÓN BIFUNCIONAL (BIMOTOR Y BIHÉLICE) */}
            <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                <button type="button" onClick={alternarSegundoMotor} style={motores.length === 1 ? styles.btnBimotorAdd : styles.btnBimotorRem}>
                    {motores.length === 1 ? "➕ Configurar como Aeronave Bimotor / Bihélice" : "🗑️ Quitar Configuración Bimotor / Bihélice"}
                </button>
            </div>

            {/* TABLA PLANEADOR */}
            <div style={styles.cardTable}>
                <div style={styles.tableHeaderFlex}>
                    <div style={styles.tableTitle}>COMPONENTES DEL PLANEADOR</div>
                    <button onClick={() => setCompPlaneador([...compPlaneador, generarFilaVacia(compPlaneador.length + 1)])} style={styles.btnSecundario}>➕ Añadir Fila Planeador</button>
                </div>
                {renderTablaComponentes(
                    compPlaneador, 
                    handlePlaneadorChange, 
                    handlePlaneadorSubChange, 
                    (idx) => setCompPlaneador(compPlaneador.filter((_, i) => i !== idx).map((c, i) => ({...c, nro: i+1}))),
                    agregarSubFilaPlaneador,
                    removerSubFilaPlaneador
                )}
            </div>

            {/* TABLAS DE MOTORES (DINÁMICAS) */}
            {motores.map((mot, motIdx) => (
                <div key={mot.id} style={{...styles.cardTable, marginTop: '20px', borderTop: '3px solid #d35400'}}>
                    <div style={styles.tableHeaderFlex}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#d35400' }}>⚙️</span>
                            <input 
                                type="text" 
                                value={mot.nombre} 
                                onChange={(e) => handleNombreMotorChange(motIdx, e.target.value.toUpperCase())} 
                                style={styles.inputNombreMotor}
                                placeholder="EJ: MOTOR IZQUIERDO"
                            />
                        </div>
                        <button onClick={() => agregarFilaMotor(motIdx)} style={{...styles.btnSecundario, backgroundColor: '#d35400'}}>➕ Añadir Fila</button>
                    </div>
                    {renderTablaComponentes(
                        mot.componentes,
                        (cIdx, f, v) => handleMotorCompChange(motIdx, cIdx, f, v),
                        (cIdx, af, sIdx, ssf, v) => handleMotorSubChange(motIdx, cIdx, af, sIdx, ssf, v),
                        (cIdx) => removerFilaMotor(motIdx, cIdx),
                        (cIdx, af) => agregarSubFilaMotor(motIdx, cIdx, af),
                        (cIdx, af, sIdx) => removerSubFilaMotor(motIdx, cIdx, af, sIdx)
                    )}
                </div>
            ))}

            {/* NUEVAS TABLAS DE HÉLICES (DINÁMICAS - MISMA LÓGICA QUE MOTOR) */}
            {helices.map((hel, helIdx) => (
                <div key={hel.id} style={{...styles.cardTable, marginTop: '20px', borderTop: '3px solid #2980b9'}}>
                    <div style={styles.tableHeaderFlex}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#2980b9' }}>🌀</span>
                            <input 
                                type="text" 
                                value={hel.nombre} 
                                onChange={(e) => handleNombreHeliceChange(helIdx, e.target.value.toUpperCase())} 
                                style={{...styles.inputNombreMotor, color: '#2980b9', borderBottom: '1px dashed #2980b9'}}
                                placeholder="EJ: HÉLICE IZQUIERDA"
                            />
                        </div>
                        <button onClick={() => agregarFilaHelice(helIdx)} style={{...styles.btnSecundario, backgroundColor: '#2980b9'}}>➕ Añadir Fila</button>
                    </div>
                    {renderTablaComponentes(
                        hel.componentes,
                        (cIdx, f, v) => handleHeliceCompChange(helIdx, cIdx, f, v),
                        (cIdx, af, sIdx, ssf, v) => handleHeliceSubChange(helIdx, cIdx, af, sIdx, ssf, v),
                        (cIdx) => removerFilaHelice(helIdx, cIdx),
                        (cIdx, af) => agregarSubFilaHelice(helIdx, cIdx, af),
                        (cIdx, af, sIdx) => removerSubFilaHelice(helIdx, cIdx, af, sIdx)
                    )}
                </div>
            ))}
        </div>
    );
};

// RENDERIZADO MODULAR DE TABLAS CON SUB-RENGLONES DINÁMICOS
const renderTablaComponentes = (lista, onChange, onSubChange, onRemover, onAgregarSub, onRemoverSub) => (
    <div style={styles.tableResponsive}>
        <table style={styles.table}>
            <thead>
                <tr style={styles.thRow}>
                    <th rowSpan="2" style={styles.th}>Nro</th>
                    <th rowSpan="2" style={styles.th}>ATA</th>
                    <th rowSpan="2" style={styles.th}>P/N</th>
                    <th rowSpan="2" style={styles.th}>Componente</th>
                    <th rowSpan="2" style={styles.th}>S/N</th>
                    <th rowSpan="2" style={{...styles.th, minWidth: '170px' }}>Límites</th>
                    <th colSpan="3" style={styles.thGroup}>Instalado con</th>
                    <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                    <th colSpan="2" style={styles.thGroup}>Estado Componente</th>
                    <th rowSpan="2" style={{...styles.th, minWidth: '150px'}}>Disp</th>
                    <th rowSpan="2" style={styles.th}>Baja</th>
                </tr>
                <tr style={styles.thRow}>
                    <th style={{...styles.thSub, width: '60px', backgroundColor: '#f2f2f2'}}>Fab/UI</th>
                    <th style={styles.thSub}>Tiempos/Ciclos</th>
                    <th style={{...styles.thSub, minWidth: '140px'}}>TSN/CSN</th>
                    <th style={styles.thSub}>a Instal</th>
                    <th style={styles.thSub}>Retiro/OH</th>
                    <th style={styles.thSub}>Tipo</th>
                    <th style={styles.thSub}>Valor Act.</th>
                </tr>
            </thead>
            <tbody>
                {lista.map((comp, compIndex) => {
                    const limiteHoras = Number(comp.limites[0]?.valor) || 0;
                    const tgInstal = Number(comp.tgInstalacion) || 0;
                    const retiroOhCalculado = tgInstal > 0 || limiteHoras > 0 ? (tgInstal + limiteHoras).toFixed(1) : '-';

                    return (
                        <tr key={comp.nro}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', border: '1px solid #ccc' }}>{comp.nro}</td>
                            <td style={styles.td}><input type="text" value={comp.ata} onChange={e => onChange(compIndex, 'ata', e.target.value)} style={styles.inputFlat} placeholder="62-99" /></td>
                            <td style={styles.td}><input type="text" value={comp.pn} onChange={e => onChange(compIndex, 'pn', e.target.value)} style={{...styles.inputFlat, width: '90px'}} placeholder="P/N" /></td>
                            <td style={styles.td}><input type="text" value={comp.componente} onChange={e => onChange(compIndex, 'componente', e.target.value)} style={{...styles.inputFlat, width: '130px'}} placeholder="Descripción" /></td>
                            <td style={styles.td}><input type="text" value={comp.sn} onChange={e => onChange(compIndex, 'sn', e.target.value)} style={styles.inputFlat} placeholder="S/N" /></td>
                            
                            {/* COLUMNA LÍMITES */}
                            <td style={styles.td}>
                                <div style={styles.cellContainerVertical}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                                        <select value={comp.limiteTipo} onChange={e => onChange(compIndex, 'limiteTipo', e.target.value)} style={styles.selectFlatType}>
                                            <option value="TBO">TBO</option><option value="LL">LL</option>
                                        </select>
                                        <button type="button" onClick={() => onAgregarSub(compIndex, 'limites')} style={styles.btnInlineAdd}>+ Renglón</button>
                                    </div>
                                    <div style={styles.stackContainer}>
                                        {comp.limites.map((lim, subIndex) => (
                                            <div key={subIndex} style={styles.rowStack}>
                                                <input type="text" value={lim.valor} onChange={e => onSubChange(compIndex, 'limites', subIndex, 'valor', e.target.value)} style={styles.inputStack} placeholder="Valor" />
                                                <select value={lim.unidad} onChange={e => onSubChange(compIndex, 'limites', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                    <option value="H">H</option><option value="M">M</option><option value="C">C</option>
                                                </select>
                                                {comp.limites.length > 1 && (
                                                    <button type="button" onClick={() => onRemoverSub(compIndex, 'limites', subIndex)} style={styles.btnInlineRem}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                            
                            <td style={{...styles.td, backgroundColor: '#f9f9f9'}}><input type="text" value={comp.instaladoFecha} onChange={e => onChange(compIndex, 'instaladoFecha', e.target.value)} style={styles.inputFlatMin} placeholder="M-A" /></td>
                            <td style={styles.td}><input type="number" value={comp.instaladoHoras} onChange={e => onChange(compIndex, 'instaladoHoras', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                            
                            {/* COLUMNA TSN/CSN */}
                            <td style={styles.td}>
                                <div style={styles.cellContainerVertical}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }}>
                                        <button type="button" onClick={() => onAgregarSub(compIndex, 'tsnCsnRenglones')} style={{...styles.btnInlineAdd, backgroundColor: '#7f8c8d'}}>+ Renglón</button>
                                    </div>
                                    <div style={styles.stackContainer}>
                                        {comp.tsnCsnRenglones.map((tc, subIndex) => (
                                            <div key={subIndex} style={styles.rowStack}>
                                                <input type="number" value={tc.valor} onChange={e => onSubChange(compIndex, 'tsnCsnRenglones', subIndex, 'valor', e.target.value)} style={styles.inputStack} placeholder="0.0" />
                                                <select value={tc.unidad} onChange={e => onSubChange(compIndex, 'tsnCsnRenglones', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                    <option value="H">H</option><option value="M">M</option><option value="C">C</option>
                                                </select>
                                                {comp.tsnCsnRenglones.length > 1 && (
                                                    <button type="button" onClick={() => onRemoverSub(compIndex, 'tsnCsnRenglones', subIndex)} style={styles.btnInlineRem}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>

                            <td style={styles.td}><input type="number" value={comp.tgInstalacion} onChange={e => onChange(compIndex, 'tgInstalacion', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                            <td style={styles.tdCalculated}>{retiroOhCalculado}</td>
                            <td style={styles.td}>
                                <select value={comp.estadoTipo} onChange={e => onChange(compIndex, 'estadoTipo', e.target.value)} style={styles.selectFlat}>
                                    <option value="TSO">TSO</option><option value="TSHMI">TSHMI</option><option value="TSN">TSN</option>
                                </select>
                            </td>
                            <td style={styles.td}><input type="number" value={comp.estadoActual} onChange={e => onChange(compIndex, 'estadoActual', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>

                            {/* COLUMNA DISPONIBILIDAD */}
                            <td style={{...styles.td, backgroundColor: '#f4fbf7'}}>
                                <div style={styles.cellContainerVertical}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }}>
                                        <button type="button" onClick={() => onAgregarSub(compIndex, 'disponibilidades')} style={{...styles.btnInlineAdd, backgroundColor: '#27ae60'}}>+ Renglón</button>
                                    </div>
                                    <div style={styles.stackContainer}>
                                        {comp.disponibilidades.map((disp, subIndex) => (
                                            <div key={subIndex} style={styles.rowStack}>
                                                <input type="number" value={disp.valor} onChange={e => onSubChange(compIndex, 'disponibilidades', subIndex, 'valor', e.target.value)} style={{...styles.inputStack, backgroundColor: '#e8f8f5'}} placeholder="0.0" />
                                                <select value={disp.unidad} onChange={e => onSubChange(compIndex, 'disponibilidades', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                    <option value="H">H</option><option value="M">M</option><option value="C">C</option>
                                                </select>
                                                {comp.disponibilidades.length > 1 && (
                                                    <button type="button" onClick={() => onRemoverSub(compIndex, 'disponibilidades', subIndex)} style={styles.btnInlineRem}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                            <td style={{ textAlign: 'center', border: '1px solid #ccc' }}><button type="button" onClick={() => onRemover(compIndex)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button></td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
);

// HOJA DE ESTILOS UNIFICADA
const styles = {
    container: { padding: '10px', backgroundColor: '#fafafa', minHeight: '100vh', fontFamily: 'monospace' },
    mainHeaderFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
    
    btnFormAlta: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },
    btnFormGuardar: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },
    btnFormEliminar: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },

    cardAdminPanel: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ced4da' },
    adminGrid: { display: 'flex', gap: '15px', flexWrap: 'wrap' },
    fieldAdmin: { display: 'flex', flexDirection: 'column', flex: 1, minWidth: '280px' },
    labelAdmin: { fontSize: '0.7rem', fontWeight: 'bold', color: '#495057', marginBottom: '4px' },
    inputAdmin: { padding: '5px', border: '1px solid #adb5bd', fontSize: '0.75rem', outline: 'none' },
    btnTransfer: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
    
    cardCabecera: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ccc' },
    headerGrid: { display: 'flex', gap: '20px', flexWrap: 'wrap' },
    block: { flex: 1, minWidth: '250px', borderRight: '1px solid #eee', paddingRight: '10px' },
    blockTitle: { fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '5px', color: '#555' },
    blockTitleFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '5px', color: '#555' },
    
    inputCondicionSelector: { padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', textAlign: 'center', outline: 'none' },
    
    formRow: { display: 'flex', gap: '5px' },
    field: { display: 'flex', flexDirection: 'column', flex: 1 },
    label: { fontSize: '0.65rem', color: '#666', marginBottom: '2px' },
    input: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', outline: 'none' },
    
    formRowAlign: { display: 'flex', gap: '5px', alignItems: 'stretch' },
    inputUniform: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', height: '26px', boxSizing: 'border-box', outline: 'none' },
    btnUniformPopup: { height: '26px', padding: '0 10px', fontSize: '0.7rem', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', boxSizing: 'border-box' },

    inputNombreMotor: { fontSize: '0.8rem', fontWeight: 'bold', color: '#d35400', border: 'none', borderBottom: '1px dashed #d35400', outline: 'none', padding: '2px', backgroundColor: 'transparent', width: '180px' },
    cardTable: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
    tableHeaderFlex: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' },
    tableTitle: { fontWeight: 'bold', color: '#1b3a57' },
    tableResponsive: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    thRow: { backgroundColor: '#eaeaea' },
    th: { border: '1px solid #aaa', padding: '5px', fontWeight: 'bold', textAlign: 'center', color: '#111' },
    thGroup: { border: '1px solid #aaa', padding: '4px', fontSize: '0.7rem', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ddd' },
    thSub: { border: '1px solid #aaa', padding: '4px', textAlign: 'center', fontSize: '0.65rem', backgroundColor: '#e5e5e5' },
    td: { border: '1px solid #ccc', padding: '4px', verticalAlign: 'middle' },
    tdCalculated: { border: '1px solid #ccc', padding: '4px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0', verticalAlign: 'middle' },
    inputFlat: { width: '65px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    inputFlatNum: { width: '55px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'right', outline: 'none' },
    inputFlatMin: { width: '50px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'center', outline: 'none' },
    selectFlat: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem' },
    selectFlatType: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#e6f2ff' },
    
    cellContainerVertical: { display: 'flex', flexDirection: 'column', width: '100%' },
    stackContainer: { display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' },
    rowStack: { display: 'flex', alignItems: 'center', gap: '2px', width: '100%' },
    inputStack: { flex: 1, minWidth: '45px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none' },
    selectStackUnit: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#fff2cc' },
    
    btnInlineAdd: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '2px 5px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' },
    btnInlineRem: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '2px 5px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', marginLeft: '2px' },
    
    btnBimotorAdd: { backgroundColor: '#2c3e50', color: '#fff', border: '1px solid #34495e', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' },
    btnBimotorRem: { backgroundColor: '#e74c3c', color: '#fff', border: '1px solid #c0392b', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' },
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: '1px solid #219653', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }
};

export default F16Page;