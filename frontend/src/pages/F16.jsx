import React, { useState, useEffect } from 'react';

// 🌐 URL DEL BACKEND CENTRALIZADA
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? '' 
    : 'https://appae.onrender.com';

const F16Page = () => {
    const sdaList = ["UH-1H", "UH-1H/II", "BELL 212", "AS-332B", "AB206B1", "C-212", "C-208", "C-550", "DA-62", "DHC-6", "SA-315 B LAMA", "407 GXi", "B206B3", "T-41"];
    const unidadesList = ["B HELIC ASAL 601", "B AV APY COMB 601", "SEC AE M 6", "SEC AE M 8", "ESC AV EXPL ATQ 602", "SEC AE 11", "EC AE", "SEC AE MTE 3", "SEC AE DR", "B AB MANT AERON 601", "SEC AE MTE 12", "SEC AE 9", "SEC AE M 5"];

    const token = localStorage.getItem('token');
    const usuarioSesion = {
        username: localStorage.getItem('username') || "Operador",
        role: (localStorage.getItem('role') || localStorage.getItem('rol') || 'USER').toUpperCase().trim(),
        elemento: (localStorage.getItem('elemento') || '').toUpperCase().trim()
    };

    const esAdminGlobal = ['ADMIN', 'BOSS', 'DIRECTOR', 'OTO'].includes(usuarioSesion.role) || usuarioSesion.elemento === 'COMANDO';

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-auth-token': token 
    });

    const [aeronavesBD, setAeronavesBD] = useState([]); 
    const [aeronaveSeleccionadaId, setAeronaveSeleccionadaId] = useState('');
    const [unidadNavegacion, setUnidadNavegacion] = useState(usuarioSesion.elemento || unidadesList[0]);
    const [unidadDestinoTraslado, setUnidadDestinoTraslado] = useState('');
    const [esEdicion, setEsEdicion] = useState(false);

    const estadoInicialCabecera = {
        sda: sdaList[0], matricula: '', nroSerie: '', estadoOperativo: 'E/S',
        inicioAeFecha: '', inicioAeHs: '', tgPlaneadorActual: '', tgPlaneadorLandings: '',
        motorSn: '', motorTsn: '', motorCsnCso: '',
        motor2Sn: '', motor2Tsn: '', motor2CsnCso: '',
        helice1Sn: '', helice1Tsn: '', helice1CsnCso: '', helice1Dur: '',
        helice2Sn: '', helice2Tsn: '', helice2CsnCso: '', helice2Dur: '',
        vencimientoElt: '', vencimientoPitot: '', vencimientoTransponder: '',
        vencimientoSeguro: '', vencimientoAvionica: '', observacionesPopup: ''
    };

    const generarFilaVacia = (nro) => ({
        nro: nro, ata: '', pn: '', componente: '', sn: '',
        limiteTipo: 'TBO', limites: [{ valor: '', unidad: 'H' }],
        instaladoFecha: '', instaladoHoras: '', 
        tsnCsnRenglones: [{ valor: '', unidad: 'H' }], tgInstalacion: '', 
        estadoTipo: 'TSO', estadoActual: '', disponibilidades: [{ valor: '', unidad: 'H' }]
    });

    const sanitizarComponenteCargado = (comp, index) => ({
        nro: comp.nro || index + 1,
        ata: comp.ata || '',
        pn: comp.pn || '',
        componente: comp.componente || '',
        sn: comp.sn || '',
        limiteTipo: comp.limiteTipo || 'TBO',
        limites: Array.isArray(comp.limites) && comp.limites.length ? comp.limites : [{ valor: '', unidad: 'H' }],
        instaladoFecha: comp.instaladoFecha || '',
        instaladoHoras: comp.instaladoHoras ?? '',
        tsnCsnRenglones: Array.isArray(comp.tsnCsnRenglones) && comp.tsnCsnRenglones.length ? comp.tsnCsnRenglones : [{ valor: '', unidad: 'H' }],
        tgInstalacion: comp.tgInstalacion ?? '',
        estadoTipo: comp.estadoTipo || 'TSO',
        estadoActual: comp.estadoActual ?? '',
        disponibilidades: Array.isArray(comp.disponibilidades) && comp.disponibilidades.length ? comp.disponibilidades : [{ valor: '', unidad: 'H' }]
    });

    const [cabecera, setCabecera] = useState(estadoInicialCabecera);
    const [compPlaneador, setCompPlaneador] = useState([generarFilaVacia(1)]);
    const [motores, setMotores] = useState([{ id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }]);
    const [helices, setHelices] = useState([{ id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }]);

    const formatearFechaHtml = (f) => {
        if (!f) return '';
        try { return String(f).split('T')[0]; } catch (e) { return ''; }
    };

    const fetchAeronavesPermitidas = async () => {
        try {
            const url = (esAdminGlobal && unidadNavegacion) 
                ? `${API_BASE_URL}/api/aircraft/elemento/${encodeURIComponent(unidadNavegacion)}` 
                : `${API_BASE_URL}/api/aircraft`;

            const res = await fetch(url, { method: 'GET', headers: getHeaders() });
            const json = await res.json();
            if (res.ok && json.success) setAeronavesBD(json.data);
        } catch (error) {
            console.error("Error al sincronizar flota con MongoDB:", error);
        }
    };

    useEffect(() => {
        if (token) fetchAeronavesPermitidas();
    }, [unidadNavegacion, token]);

    /**
     * Helper para formatear días remanentes a Años, Meses y Días
     */
    const formatearTiempoMeses = (fechaLimite) => {
        const hoy = new Date();
        if (fechaLimite <= hoy) return 'VENCIDO';

        let anios = fechaLimite.getFullYear() - hoy.getFullYear();
        let meses = fechaLimite.getMonth() - hoy.getMonth();
        let dias = fechaLimite.getDate() - hoy.getDate();

        if (dias < 0) {
            meses--;
            const ultimoDiaMesAnterior = new Date(fechaLimite.getFullYear(), fechaLimite.getMonth(), 0).getDate();
            dias += ultimoDiaMesAnterior;
        }

        if (meses < 0) {
            anios--;
            meses += 12;
        }

        let partes = [];
        if (anios > 0) partes.push(`${anios}a`);
        if (meses > 0) partes.push(`${meses}m`);
        if (dias > 0 || partes.length === 0) partes.push(`${dias}d`);

        return partes.join(' ');
    };

    /**
     * 🧮 CÁLCULO DINÁMICO DE DISPONIBILIDAD DE RENGLÓN
     */
    const calcularDisponibilidadRenglon = (comp, limItem, tgActualMatriz) => {
        const limiteVal = parseFloat(limItem.valor) || 0;
        if (!limiteVal && limItem.unidad !== 'C') return '-';

        const unidad = limItem.unidad || 'H';
        const tgInstal = parseFloat(comp.tgInstalacion) || 0;
        
        let tgActual = 0;
        if (unidad === 'LDG' || unidad === 'CC') {
            tgActual = parseFloat(tgActualMatriz.landings) || 0;
        } else {
            tgActual = parseFloat(tgActualMatriz.horas) || 0;
        }

        const deltaTG = Math.max(0, tgActual - tgInstal);

        if (['H', 'LDG', 'CC'].includes(unidad)) {
            const tsnCsnCoincidente = comp.tsnCsnRenglones?.find(r => r.unidad === unidad);
            const valInstalado = parseFloat(tsnCsnCoincidente?.valor) || 0;

            let disp = 0;
            if (comp.limiteTipo === 'LL') {
                disp = limiteVal - (valInstalado + deltaTG);
            } else {
                disp = limiteVal - deltaTG;
            }
            return disp.toFixed(1);
        }

        if (unidad === 'M') {
            let fechaBaseStr = comp.instaladoFecha;
            if (!fechaBaseStr) {
                const renglonFecha = comp.tsnCsnRenglones?.find(r => r.unidad === 'C' && r.valor);
                if (renglonFecha) fechaBaseStr = renglonFecha.valor;
            }

            let fechaInst = fechaBaseStr ? new Date(fechaBaseStr) : new Date();
            if (isNaN(fechaInst.getTime())) fechaInst = new Date();

            fechaInst.setMonth(fechaInst.getMonth() + parseInt(limiteVal, 10));

            return formatearTiempoMeses(fechaInst);
        }

        if (unidad === 'C') {
            if (!limItem.valor) return '-';
            const fechaLimite = new Date(limItem.valor);
            return formatearTiempoMeses(fechaLimite);
        }

        return '-';
    };

    const handleSelectorAeronaveChange = (id) => {
        setAeronaveSeleccionadaId(id);
        if (!id) {
            limpiarFormularioParaNuevoAlta();
            return;
        }

        const aero = aeronavesBD.find(a => a._id === id);
        if (aero) {
            setEsEdicion(true);
            setCabecera({
                sda: aero.sda || sdaList[0],
                matricula: aero.matricula || '',
                nroSerie: aero.nroSerie || '',
                estadoOperativo: aero.estadoOperativo || 'E/S',
                inicioAeFecha: formatearFechaHtml(aero.inicioAeFecha),
                inicioAeHs: aero.inicioAeHs ?? '',
                tgPlaneadorActual: aero.tgPlaneadorActual ?? '',
                tgPlaneadorLandings: aero.tgPlaneadorLandings ?? '',
                motorSn: aero.motorSn || '',
                motorTsn: aero.motorTsn ?? '',
                motorCsnCso: aero.motorCsnCso ?? '',
                motor2Sn: aero.motor2Sn || '',
                motor2Tsn: aero.motor2Tsn ?? '',
                motor2CsnCso: aero.motor2CsnCso ?? '',
                helice1Sn: aero.helice1Sn || '',
                helice1Tsn: aero.helice1Tsn ?? '',
                helice1CsnCso: aero.helice1CsnCso ?? '',
                helice1Dur: aero.helice1Dur ?? '',
                helice2Sn: aero.helice2Sn || '',
                helice2Tsn: aero.helice2Tsn ?? '',
                helice2CsnCso: aero.helice2CsnCso ?? '',
                helice2Dur: aero.helice2Dur ?? '',
                vencimientoElt: formatearFechaHtml(aero.vencimientoElt),
                vencimientoPitot: formatearFechaHtml(aero.vencimientoPitot),
                vencimientoTransponder: formatearFechaHtml(aero.vencimientoTransponder),
                vencimientoSeguro: formatearFechaHtml(aero.vencimientoSeguro),
                vencimientoAvionica: formatearFechaHtml(aero.vencimientoAvionica),
                observacionesPopup: aero.observacionesPopup || ''
            });

            setCompPlaneador(
                Array.isArray(aero.compPlaneador) && aero.compPlaneador.length 
                    ? aero.compPlaneador.map(sanitizarComponenteCargado)
                    : [generarFilaVacia(1)]
            );

            setMotores(
                Array.isArray(aero.motores) && aero.motores.length 
                    ? aero.motores.map(m => ({ ...m, componentes: m.componentes.map(sanitizarComponenteCargado) }))
                    : [{ id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }]
            );

            setHelices(
                Array.isArray(aero.helices) && aero.helices.length 
                    ? aero.helices.map(h => ({ ...h, componentes: h.componentes.map(sanitizarComponenteCargado) }))
                    : [{ id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }]
            );
        }
    };

    const guardarAltaAeronave = async () => {
        if (!cabecera.matricula) {
            alert("Por favor, ingrese al menos la Matrícula para procesar el registro.");
            return;
        }

        const payload = {
            ...cabecera,
            inicioAeHs: cabecera.inicioAeHs === '' ? 0 : Number(cabecera.inicioAeHs),
            tgPlaneadorActual: cabecera.tgPlaneadorActual === '' ? 0 : Number(cabecera.tgPlaneadorActual),
            tgPlaneadorLandings: cabecera.tgPlaneadorLandings === '' ? 0 : Number(cabecera.tgPlaneadorLandings),
            motorTsn: cabecera.motorTsn === '' ? 0 : Number(cabecera.motorTsn),
            motorCsnCso: cabecera.motorCsnCso === '' ? 0 : Number(cabecera.motorCsnCso),
            motor2Tsn: cabecera.motor2Tsn === '' ? 0 : Number(cabecera.motor2Tsn),
            motor2CsnCso: cabecera.motor2CsnCso === '' ? 0 : Number(cabecera.motor2CsnCso),
            helice1Tsn: cabecera.helice1Tsn === '' ? 0 : Number(cabecera.helice1Tsn),
            helice1CsnCso: cabecera.helice1CsnCso === '' ? 0 : Number(cabecera.helice1CsnCso),
            helice1Dur: cabecera.helice1Dur === '' ? 0 : Number(cabecera.helice1Dur),
            helice2Tsn: cabecera.helice2Tsn === '' ? 0 : Number(cabecera.helice2Tsn),
            helice2CsnCso: cabecera.helice2CsnCso === '' ? 0 : Number(cabecera.helice2CsnCso),
            helice2Dur: cabecera.helice2Dur === '' ? 0 : Number(cabecera.helice2Dur),
            unidad: esAdminGlobal ? unidadNavegacion : usuarioSesion.elemento,
            compPlaneador, motores, helices,
            creadoPor: usuarioSesion.username, actualizadoPor: usuarioSesion.username
        };

        try {
            let url = `${API_BASE_URL}/api/aircraft`;
            let method = 'POST';

            if (esEdicion && aeronaveSeleccionadaId) {
                url = `${API_BASE_URL}/api/aircraft/${aeronaveSeleccionadaId}`;
                method = 'PUT';
            }

            const res = await fetch(url, { method, headers: getHeaders(), body: JSON.stringify(payload) });
            const json = await res.json();

            if (!res.ok) throw new Error(json.message || 'Error en el servidor.');

            if (json.success) {
                alert(json.message || "Operación ejecutada con éxito.");
                await fetchAeronavesPermitidas();
                if(!esEdicion) limpiarFormularioParaNuevoAlta();
            } else {
                alert(`⚠️ Error: ${json.message}`);
            }
        } catch (error) {
            console.error("Error API:", error);
            alert(error.message); 
        }
    };

    const eliminarFormularioAeronave = async () => {
        if (!esEdicion || !aeronaveSeleccionadaId) {
            alert("Debe seleccionar una aeronave existente para ejecutar una baja.");
            return;
        }

        if (window.confirm(`⚠️ ¿Confirma la eliminación permanente de la aeronave ${cabecera.matricula}?`)) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/aircraft/${aeronaveSeleccionadaId}`, { method: 'DELETE', headers: getHeaders() });
                const json = await res.json();
                if (res.ok && json.success) {
                    alert(json.message);
                    limpiarFormularioParaNuevoAlta();
                    await fetchAeronavesPermitidas();
                } else {
                    alert(`🚫 Error: ${json.message}`);
                }
            } catch (error) {
                alert(error.message || "Error al conectar con el servidor.");
            }
        }
    };

    const ejecutarTransferenciaUnidad = async () => {
        if (!esEdicion || !aeronaveSeleccionadaId) return alert("Primero seleccione una aeronave guardada.");
        if (!unidadDestinoTraslado) return alert("Especifique un Elemento de destino válido.");

        if (window.confirm(`¿Confirma el traslado de la aeronave ${cabecera.matricula} hacia: ${unidadDestinoTraslado}?`)) {
            try {
                const res = await fetch(`${API_BASE_URL}/api/aircraft/${aeronaveSeleccionadaId}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify({ unidad: unidadDestinoTraslado })
                });
                const json = await res.json();
                if (res.ok && json.success) {
                    alert(json.message);
                    setUnidadDestinoTraslado('');
                    limpiarFormularioParaNuevoAlta();
                    await fetchAeronavesPermitidas();
                } else {
                    alert(`⚠️ Restricción: ${json.message}`);
                }
            } catch (error) {
                alert("Error al procesar el traslado.");
            }
        }
    };

    const limpiarFormularioParaNuevoAlta = () => {
        setCabecera(estadoInicialCabecera);
        setCompPlaneador([generarFilaVacia(1)]);
        setMotores([{ id: 1, nombre: 'MOTOR Nº 1', componentes: [generarFilaVacia(1)] }]);
        setHelices([{ id: 1, nombre: 'HÉLICE Nº 1', componentes: [generarFilaVacia(1)] }]);
        setAeronaveSeleccionadaId('');
        setEsEdicion(false);
    };

    const handleCabeceraChange = (field, val) => setCabecera(prev => ({ ...prev, [field]: val }));

    // PLANEADOR HANDLERS
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

    // MOTORES HANDLERS
    const handleNombreMotorChange = (motorIdx, nuevoNombre) => {
        const nuevosMotores = [...motores];
        nuevosMotores[motorIdx].nombre = nuevoNombre;
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

    // HÉLICES HANDLERS
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

    const alternarSegundoMotor = () => {
        if (motores.length === 1) {
            setMotores([...motores, { id: 2, nombre: 'MOTOR Nº 2', componentes: [generarFilaVacia(1)] }]);
            setHelices([...helices, { id: 2, nombre: 'HÉLICE Nº 2', componentes: [generarFilaVacia(1)] }]);
        } else {
            if (window.confirm("¿Confirma remover la configuración del Motor Nº 2 y Hélice Nº 2?")) {
                setMotores([motores[0]]);
                setHelices([helices[0]]);
            }
        }
    };

    const colorEstadoOperativo = cabecera.estadoOperativo === 'E/S' ? '#2ecc71' : '#e74c3c';
    const esBimotor = motores.length > 1;

    // Estilos dinámicos para campos habilitados en etapa de prueba
    const estiloCampoTotal = {
        ...styles.input,
        backgroundColor: '#fff9db',
        fontWeight: 'bold',
        cursor: 'text'
    };

    return (
        <div style={styles.container}>
            <style>{`
                * { box-sizing: border-box; }
                input[type="date"] { min-width: 0; }
            `}</style>

            <div style={styles.mainHeaderFlex}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>SISTEMA FORMULARIO -16</h2>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" onClick={limpiarFormularioParaNuevoAlta} style={styles.btnFormAlta}>📄 Limpiar / Nuevo</button>
                    <button type="button" onClick={guardarAltaAeronave} style={styles.btnFormGuardar}>💾 {esEdicion ? 'Actualizar Cambios' : 'Dar de Alta / Guardar'}</button>
                    <button type="button" onClick={eliminarFormularioAeronave} style={styles.btnFormEliminar}>🗑️ Eliminar Registro</button>
                </div>
            </div>

            <div style={styles.cardAdminPanel}>
                <div style={styles.adminGrid}>
                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>
                            {esAdminGlobal 
                                ? `📂 SELECTOR FLOTA (Vista Global - Elemento: ${unidadNavegacion})` 
                                : `📂 SELECTOR FLOTA (Restringido a tu Base: ${usuarioSesion.elemento || 'Unidad No Asignada'})`
                            }
                        </label>
                        <select 
                            value={aeronaveSeleccionadaId} 
                            onChange={e => handleSelectorAeronaveChange(e.target.value)} 
                            style={{...styles.inputAdmin, backgroundColor: '#e8f8f5', fontWeight: 'bold', border: '1px solid #27ae60'}}
                        >
                            <option value="">-- {aeronavesBD.length ? 'Seleccionar Aeronave Guardada' : 'No hay aeronaves registradas'} --</option>
                            {aeronavesBD.map(aero => (
                                <option key={aero._id} value={aero._id}>
                                    {aero.matricula} - {aero.sda} [{aero.unidad || 'S/D'}] ({aero.estadoOperativo})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>🛡️ NAVEGACIÓN ENTRE UNIDADES {!esAdminGlobal && '🔒 (BLOQUEADO)'}</label>
                        <select 
                            value={unidadNavegacion} 
                            onChange={e => setUnidadNavegacion(e.target.value)} 
                            disabled={!esAdminGlobal}
                            style={{
                                ...styles.inputAdmin, 
                                backgroundColor: esAdminGlobal ? '#f0f4f8' : '#e9ecef',
                                cursor: esAdminGlobal ? 'default' : 'not-allowed'
                            }}
                        >
                            {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <div style={styles.fieldAdmin}>
                        <label style={styles.labelAdmin}>✈️ DESPACHAR TRASLADO DE UNIDAD</label>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <select value={unidadDestinoTraslado} onChange={e => setUnidadDestinoTraslado(e.target.value)} style={{...styles.inputAdmin, flex: 1, backgroundColor: '#fff0f0'}}>
                                <option value="">-- Destino --</option>
                                {unidadesList.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                            <button type="button" onClick={ejecutarTransferenciaUnidad} style={styles.btnTransfer}>Trasladar</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={styles.cardCabecera}>
                <div style={styles.headerGrid}>
                    <div style={styles.block}>
                        <div style={styles.blockTitleFlex}>
                            <span>DATOS DE LA AERONAVE {esEdicion && <span style={{color: '#d35400', fontSize: '0.65rem'}}>🔒 ANCLADO</span>}</span>
                            <select 
                                value={cabecera.estadoOperativo} 
                                onChange={e => handleCabeceraChange('estadoOperativo', e.target.value)} 
                                style={{...styles.inputCondicionSelector, backgroundColor: colorEstadoOperativo}}
                            >
                                <option value="E/S">E/S</option>
                                <option value="F/S">F/S</option>
                            </select>
                        </div>
                        <div style={styles.formGridCompact}>
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
                        <div style={styles.blockTitle}>
                            TIEMPOS E HISTORIAL PLANEADOR {esEdicion && <span style={{fontSize: '0.6rem', color: '#27ae60'}}>(vía F-13)</span>}
                        </div>
                        <div style={styles.formGridCompact}>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Fecha)</label><input type="date" value={cabecera.inicioAeFecha} onChange={e => handleCabeceraChange('inicioAeFecha', e.target.value)} style={styles.input} /></div>
                            <div style={styles.field}><label style={styles.label}>Inicio AE (Hs)</label><input type="number" value={cabecera.inicioAeHs} onChange={e => handleCabeceraChange('inicioAeHs', e.target.value)} style={styles.input} placeholder="0.0" /></div>
                            
                            <div style={styles.field}>
                                <label style={styles.label}>Landings (LDG)</label>
                                <input 
                                    type="number" 
                                    value={cabecera.tgPlaneadorLandings} 
                                    onChange={e => handleCabeceraChange('tgPlaneadorLandings', e.target.value)} 
                                    style={estiloCampoTotal} 
                                    placeholder="0" 
                                />
                            </div>

                            <div style={styles.field}>
                                <label style={styles.label}>TG Planeador Actual</label>
                                <input 
                                    type="number" 
                                    value={cabecera.tgPlaneadorActual} 
                                    onChange={e => handleCabeceraChange('tgPlaneadorActual', e.target.value)} 
                                    style={estiloCampoTotal} 
                                    placeholder="0.0" 
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div style={{...styles.block, gridColumn: 'span 1 / -1'}}>
                        <div style={styles.blockTitle}>
                            GRUPO MOTOPROPULSOR (TOTALES GENERALES) {esEdicion && <span style={{fontSize: '0.6rem', color: '#27ae60'}}>(vía F-13)</span>}
                        </div>
                        
                        <div style={{ marginBottom: '8px' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#d35400' }}>
                                {esBimotor ? '⚙️ MOTOR Nº 1 & 🌀 HÉLICE Nº 1' : '⚙️ MOTOR & 🌀 HÉLICE'}
                            </span>
                            <div style={styles.formGridEngine}>
                                <div style={styles.field}><label style={styles.label}>Motor S/N</label><input type="text" value={cabecera.motorSn} onChange={e => handleCabeceraChange('motorSn', e.target.value)} style={styles.input} placeholder="S/N" /></div>
                                <div style={styles.field}>
                                    <label style={styles.label}>TG Motor 1 (TSN)</label>
                                    <input type="number" value={cabecera.motorTsn} onChange={e => handleCabeceraChange('motorTsn', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>CSN/CSO M1</label>
                                    <input type="number" value={cabecera.motorCsnCso} onChange={e => handleCabeceraChange('motorCsnCso', e.target.value)} style={estiloCampoTotal} placeholder="0" />
                                </div>
                                <div style={styles.field}><label style={styles.label}>Hélice 1 S/N</label><input type="text" value={cabecera.helice1Sn} onChange={e => handleCabeceraChange('helice1Sn', e.target.value)} style={styles.input} placeholder="S/N" /></div>
                                <div style={styles.field}>
                                    <label style={styles.label}>TG Hélice 1 (TSN)</label>
                                    <input type="number" value={cabecera.helice1Tsn} onChange={e => handleCabeceraChange('helice1Tsn', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>CSN/CSO Hélice 1</label>
                                    <input type="number" value={cabecera.helice1CsnCso} onChange={e => handleCabeceraChange('helice1CsnCso', e.target.value)} style={estiloCampoTotal} placeholder="0" />
                                </div>
                                <div style={styles.field}>
                                    <label style={styles.label}>DUR Hélice 1</label>
                                    <input type="number" value={cabecera.helice1Dur} onChange={e => handleCabeceraChange('helice1Dur', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                </div>
                            </div>
                        </div>

                        {esBimotor && (
                            <div style={{ borderTop: '1px dashed #ccc', paddingTop: '6px' }}>
                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#c0392b' }}>
                                    ⚙️ MOTOR Nº 2 & 🌀 HÉLICE Nº 2
                                </span>
                                <div style={styles.formGridEngine}>
                                    <div style={styles.field}><label style={styles.label}>Motor 2 S/N</label><input type="text" value={cabecera.motor2Sn} onChange={e => handleCabeceraChange('motor2Sn', e.target.value)} style={styles.input} placeholder="S/N" /></div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>TG Motor 2 (TSN)</label>
                                        <input type="number" value={cabecera.motor2Tsn} onChange={e => handleCabeceraChange('motor2Tsn', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>CSN/CSO M2</label>
                                        <input type="number" value={cabecera.motor2CsnCso} onChange={e => handleCabeceraChange('motor2CsnCso', e.target.value)} style={estiloCampoTotal} placeholder="0" />
                                    </div>
                                    <div style={styles.field}><label style={styles.label}>Hélice 2 S/N</label><input type="text" value={cabecera.helice2Sn} onChange={e => handleCabeceraChange('helice2Sn', e.target.value)} style={styles.input} placeholder="S/N" /></div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>TG Hélice 2 (TSN)</label>
                                        <input type="number" value={cabecera.helice2Tsn} onChange={e => handleCabeceraChange('helice2Tsn', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>CSN/CSO Hélice 2</label>
                                        <input type="number" value={cabecera.helice2CsnCso} onChange={e => handleCabeceraChange('helice2CsnCso', e.target.value)} style={estiloCampoTotal} placeholder="0" />
                                    </div>
                                    <div style={styles.field}>
                                        <label style={styles.label}>DUR Hélice 2</label>
                                        <input type="number" value={cabecera.helice2Dur} onChange={e => handleCabeceraChange('helice2Dur', e.target.value)} style={estiloCampoTotal} placeholder="0.0" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #ddd', margin: '12px 0' }} />

                <div style={styles.headerGrid}>
                    <div style={{...styles.block, flex: '2 1 400px'}}>
                        <div style={styles.blockTitle}>REQUISITOS LEGALES & VENCIMIENTOS HABILITACIONES</div>
                        <div style={styles.formGridLegal}>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.207 (ELT)</label><input type="date" value={cabecera.vencimientoElt} onChange={e => handleCabeceraChange('vencimientoElt', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.411 (Pitot)</label><input type="date" value={cabecera.vencimientoPitot} onChange={e => handleCabeceraChange('vencimientoPitot', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>RAAC 91.413 (Transponder)</label><input type="date" value={cabecera.vencimientoTransponder} onChange={e => handleCabeceraChange('vencimientoTransponder', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Seguro</label><input type="date" value={cabecera.vencimientoSeguro} onChange={e => handleCabeceraChange('vencimientoSeguro', e.target.value)} style={styles.inputUniform} /></div>
                            <div style={styles.field}><label style={styles.label}>Venc. Aviónica</label><input type="date" value={cabecera.vencimientoAvionica} onChange={e => handleCabeceraChange('vencimientoAvionica', e.target.value)} style={styles.inputUniform} /></div>
                        </div>
                    </div>
                    <div style={{...styles.block, flex: '1 1 250px'}}>
                        <div style={styles.blockTitle}>OBSERVACIONES / NOVEDADES</div>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end', height: '100%' }}>
                            <div style={{...styles.field, flex: 1}}>
                                <label style={styles.label}>Detalle</label>
                                <input type="text" value={cabecera.observacionesPopup} onChange={e => handleCabeceraChange('observacionesPopup', e.target.value)} style={styles.inputUniform} placeholder="Escribir novedad..." />
                            </div>
                            <button type="button" onClick={() => alert(cabecera.observacionesPopup || "Sin novedades.")} style={styles.btnUniformPopup}>👁️ Ver</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '15px', textAlign: 'right' }}>
                <button type="button" onClick={alternarSegundoMotor} style={motores.length === 1 ? styles.btnBimotorAdd : styles.btnBimotorRem}>
                    {motores.length === 1 ? "➕ Configurar como Aeronave Bimotor" : "🗑️ Quitar Configuración Bimotor"}
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
                    removerSubFilaPlaneador,
                    calcularDisponibilidadRenglon,
                    { horas: cabecera.tgPlaneadorActual, landings: cabecera.tgPlaneadorLandings }
                )}
            </div>

            {/* TABLAS MOTORES */}
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
                        (cIdx, af, sIdx) => removerSubFilaMotor(motIdx, cIdx, af, sIdx),
                        calcularDisponibilidadRenglon,
                        { 
                            horas: motIdx === 0 ? cabecera.motorTsn : cabecera.motor2Tsn, 
                            landings: motIdx === 0 ? cabecera.motorCsnCso : cabecera.motor2CsnCso 
                        }
                    )}
                </div>
            ))}

            {/* TABLAS HÉLICES */}
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
                        (cIdx, af, sIdx) => removerSubFilaHelice(helIdx, cIdx, af, sIdx),
                        calcularDisponibilidadRenglon,
                        { 
                            horas: helIdx === 0 ? cabecera.helice1Tsn : cabecera.helice2Tsn, 
                            landings: 0 
                        }
                    )}
                </div>
            ))}
        </div>
    );
};

// Helper Meses
const calcularFechaLimiteMeses = (mesesNum, comp) => {
    if (!mesesNum || isNaN(mesesNum) || Number(mesesNum) <= 0) return '';

    let fechaBaseStr = comp?.instaladoFecha;
    if (!fechaBaseStr && comp?.tsnCsnRenglones) {
        const renglonFecha = comp.tsnCsnRenglones.find(r => r.unidad === 'C' && r.valor);
        if (renglonFecha) fechaBaseStr = renglonFecha.valor;
    }

    let baseDate = fechaBaseStr ? new Date(fechaBaseStr) : new Date();
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    baseDate.setMonth(baseDate.getMonth() + parseInt(mesesNum, 10));
    return baseDate.toISOString().split('T')[0];
};

const renderSubRenglonValueInput = (item, compIndex, arrayField, subIndex, onSubChange, comp) => {
    const unidad = item.unidad || 'H';

    if (unidad === 'C') {
        return (
            <input 
                type="date" 
                value={item.valor} 
                onChange={e => onSubChange(compIndex, arrayField, subIndex, 'valor', e.target.value)} 
                style={styles.inputStackDate} 
            />
        );
    }

    if (unidad === 'M') {
        const fechaLimiteCalculada = calcularFechaLimiteMeses(item.valor, comp);
        return (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <input 
                    type="number" 
                    value={item.valor} 
                    onChange={e => onSubChange(compIndex, arrayField, subIndex, 'valor', e.target.value)} 
                    style={styles.inputStack} 
                    placeholder="Meses" 
                />
                {fechaLimiteCalculada && (
                    <span style={{ fontSize: '0.6rem', color: '#8e44ad', fontWeight: 'bold', marginTop: '1px' }}>
                        📅 Límite: {fechaLimiteCalculada}
                    </span>
                )}
            </div>
        );
    }

    let placeholderText = "0.0";
    if (unidad === 'LDG') placeholderText = "Aterrizajes";
    if (unidad === 'CC') placeholderText = "Ciclos";
    if (unidad === 'H') placeholderText = "Horas";

    return (
        <input 
            type="number" 
            step="any"
            value={item.valor} 
            onChange={e => onSubChange(compIndex, arrayField, subIndex, 'valor', e.target.value)} 
            style={styles.inputStack} 
            placeholder={placeholderText} 
        />
    );
};

const renderTablaComponentes = (lista, onChange, onSubChange, onRemover, onAgregarSub, onRemoverSub, calcularDispFn, tgActualMatriz) => (
    <div style={styles.tableResponsive}>
        <table style={styles.table}>
            <thead>
                <tr style={styles.thRow}>
                    <th rowSpan="2" style={styles.th}>Nro</th>
                    <th rowSpan="2" style={styles.th}>ATA</th>
                    <th rowSpan="2" style={styles.th}>P/N</th>
                    <th rowSpan="2" style={styles.th}>Componente</th>
                    <th rowSpan="2" style={styles.th}>S/N</th>
                    <th rowSpan="2" style={{...styles.th, minWidth: '180px' }}>Límites</th>
                    <th colSpan="3" style={styles.thGroup}>Instalado con</th>
                    <th colSpan="2" style={styles.thGroup}>TG Planeador</th>
                    <th colSpan="2" style={styles.thGroup}>Estado Componente</th>
                    <th rowSpan="2" style={{...styles.th, minWidth: '180px', backgroundColor: '#16a085', color: '#fff'}}>Disp. Calculada</th>
                    <th rowSpan="2" style={styles.th}>Baja</th>
                </tr>
                <tr style={styles.thRow}>
                    <th style={{...styles.thSub, width: '60px', backgroundColor: '#f2f2f2'}}>Fab/UI</th>
                    <th style={styles.thSub}>Tiempos/Ciclos</th>
                    <th style={{...styles.thSub, minWidth: '180px'}}>TSN/CSN</th>
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
                                                {renderSubRenglonValueInput(lim, compIndex, 'limites', subIndex, onSubChange, comp)}
                                                <select value={lim.unidad} onChange={e => onSubChange(compIndex, 'limites', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                    <option value="H">H (Hs)</option>
                                                    <option value="M">M (Meses)</option>
                                                    <option value="C">C (Fecha)</option>
                                                    <option value="LDG">LDG (Landings)</option>
                                                    <option value="CC">CC (Ciclos)</option>
                                                </select>
                                                {comp.limites.length > 1 && (
                                                    <button type="button" onClick={() => onRemoverSub(compIndex, 'limites', subIndex)} style={styles.btnInlineRem}>-</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </td>
                            
                            <td style={{...styles.td, backgroundColor: '#f9f9f9'}}><input type="date" value={comp.instaladoFecha} onChange={e => onChange(compIndex, 'instaladoFecha', e.target.value)} style={{...styles.inputFlatMin, width: '110px'}} /></td>
                            <td style={styles.td}><input type="number" value={comp.instaladoHoras} onChange={e => onChange(compIndex, 'instaladoHoras', e.target.value)} style={styles.inputFlatNum} placeholder="0.0" /></td>
                            
                            <td style={styles.td}>
                                <div style={styles.cellContainerVertical}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '5px' }}>
                                        <button type="button" onClick={() => onAgregarSub(compIndex, 'tsnCsnRenglones')} style={{...styles.btnInlineAdd, backgroundColor: '#7f8c8d'}}>+ Renglón</button>
                                    </div>
                                    <div style={styles.stackContainer}>
                                        {comp.tsnCsnRenglones.map((tc, subIndex) => (
                                            <div key={subIndex} style={styles.rowStack}>
                                                {renderSubRenglonValueInput(tc, compIndex, 'tsnCsnRenglones', subIndex, onSubChange, comp)}
                                                <select value={tc.unidad} onChange={e => onSubChange(compIndex, 'tsnCsnRenglones', subIndex, 'unidad', e.target.value)} style={styles.selectStackUnit}>
                                                    <option value="H">H (Hs)</option>
                                                    <option value="M">M (Meses)</option>
                                                    <option value="C">C (Fecha)</option>
                                                    <option value="LDG">LDG (Landings)</option>
                                                    <option value="CC">CC (Ciclos)</option>
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

                            <td style={{...styles.td, backgroundColor: '#e8f8f5'}}>
                                <div style={styles.stackContainer}>
                                    {comp.limites.map((lim, subIndex) => {
                                        const dispCalculada = calcularDispFn ? calcularDispFn(comp, lim, tgActualMatriz) : '-';
                                        const esNegativo = typeof dispCalculada === 'string' && (dispCalculada.includes('VENCIDO') || dispCalculada.startsWith('-'));
                                        return (
                                            <div key={subIndex} style={styles.dispBadge}>
                                                <span style={{ fontWeight: 'bold', color: esNegativo ? '#e74c3c' : '#27ae60' }}>
                                                    {dispCalculada}
                                                </span>
                                                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#7f8c8d' }}>
                                                    {lim.unidad}
                                                </span>
                                            </div>
                                        );
                                    })}
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

// 🎨 ESTILOS
const styles = {
    container: { padding: '10px', backgroundColor: '#fafafa', minHeight: '100vh', fontFamily: 'monospace' },
    mainHeaderFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c3e50', color: 'white', padding: '10px', borderRadius: '4px', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' },
    btnFormAlta: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },
    btnFormGuardar: { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },
    btnFormEliminar: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '3px' },
    cardAdminPanel: { backgroundColor: '#e9ecef', padding: '10px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ced4da' },
    adminGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' },
    fieldAdmin: { display: 'flex', flexDirection: 'column', minWidth: 0 },
    labelAdmin: { fontSize: '0.7rem', fontWeight: 'bold', color: '#495057', marginBottom: '4px' },
    inputAdmin: { padding: '5px', border: '1px solid #adb5bd', fontSize: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box' },
    btnTransfer: { backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '0 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
    cardCabecera: { backgroundColor: 'white', padding: '12px', borderRadius: '4px', marginBottom: '10px', border: '1px solid #ccc' },
    headerGrid: { display: 'flex', flexWrap: 'wrap', gap: '12px', width: '100%' },
    block: { flex: '1 1 280px', minWidth: 0, padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#fafafa' },
    blockTitle: { fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '8px', color: '#555' },
    blockTitleFlex: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', fontSize: '0.75rem', marginBottom: '8px', color: '#555' },
    inputCondicionSelector: { padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', textAlign: 'center', outline: 'none' },
    formGridCompact: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(85px, 1fr))', gap: '6px', width: '100%' },
    formGridEngine: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '6px', width: '100%' },
    formGridLegal: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '6px', width: '100%' },
    field: { display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' },
    label: { fontSize: '0.65rem', color: '#666', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    input: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', outline: 'none', width: '100%', boxSizing: 'border-box', minWidth: 0 },
    inputUniform: { padding: '4px', border: '1px solid #999', fontSize: '0.75rem', height: '28px', boxSizing: 'border-box', outline: 'none', width: '100%', minWidth: 0 },
    btnUniformPopup: { height: '28px', padding: '0 10px', fontSize: '0.7rem', backgroundColor: '#6c757d', color: 'white', border: 'none', cursor: 'pointer', boxSizing: 'border-box' },
    inputNombreMotor: { fontSize: '0.8rem', fontWeight: 'bold', color: '#d35400', border: 'none', borderBottom: '1px dashed #d35400', outline: 'none', padding: '2px', backgroundColor: 'transparent', width: '180px' },
    cardTable: { backgroundColor: 'white', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' },
    tableHeaderFlex: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap', gap: '6px' },
    tableTitle: { fontWeight: 'bold', color: '#1b3a57' },
    tableResponsive: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' },
    thRow: { backgroundColor: '#eaeaea' },
    th: { border: '1px solid #aaa', padding: '5px', fontWeight: 'bold', textAlign: 'center', color: '#111' },
    thGroup: { border: '1px solid #aaa', padding: '4px', fontSize: '0.7rem', fontWeight: 'bold', textAlign: 'center', backgroundColor: '#ddd' },
    thSub: { border: '1px solid #aaa', padding: '4px', textAlign: 'center', fontSize: '0.65rem', backgroundColor: '#e5e5e5' },
    td: { border: '1px solid #ccc', padding: '4px', verticalAlign: 'middle' },
    tdCalculated: { border: '1px solid #ccc', padding: '4px', textAlign: 'right', fontWeight: 'bold', backgroundColor: '#f0f0f0', verticalAlign: 'middle' },
    inputFlat: { width: '100%', minWidth: '50px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' },
    inputFlatNum: { width: '100%', minWidth: '45px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'right', outline: 'none', boxSizing: 'border-box' },
    inputFlatMin: { width: '100%', minWidth: '95px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box' },
    selectFlat: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', width: '100%' },
    selectFlatType: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#e6f2ff' },
    cellContainerVertical: { display: 'flex', flexDirection: 'column', width: '100%' },
    stackContainer: { display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' },
    rowStack: { display: 'flex', alignItems: 'center', gap: '2px', width: '100%' },
    inputStack: { flex: 1, minWidth: '40px', padding: '3px', border: '1px solid #bbb', fontSize: '0.75rem', outline: 'none', boxSizing: 'border-box' },
    inputStackDate: { flex: 1, minWidth: '90px', padding: '2px 4px', border: '1px solid #3498db', fontSize: '0.7rem', outline: 'none', backgroundColor: '#ebf5fb', boxSizing: 'border-box' },
    selectStackUnit: { padding: '2px', border: '1px solid #bbb', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: '#fff2cc' },
    btnInlineAdd: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '2px 5px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px' },
    btnInlineRem: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '2px 5px', fontSize: '0.6rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '2px', marginLeft: '2px' },
    btnBimotorAdd: { backgroundColor: '#2c3e50', color: '#fff', border: '1px solid #34495e', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' },
    btnBimotorRem: { backgroundColor: '#e74c3c', color: '#fff', border: '1px solid #c0392b', padding: '6px 12px', cursor: 'pointer', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' },
    btnSecundario: { backgroundColor: '#27ae60', color: 'white', border: '1px solid #219653', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' },
    dispBadge: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px', backgroundColor: '#ffffff', borderRadius: '3px', border: '1px solid #a3e4d7' }
};

export default F16Page;