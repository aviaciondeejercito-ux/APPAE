import React, { useState, useEffect } from 'react';
import { login } from '../services/api';
import { APP_VERSION } from '../version';

// Importación de escudos/logos de las unidades y elementos
import logoBAvApyComb601 from '../assets/B AV APY COMB 601.png';
import logoBHelicAsal601 from '../assets/B HELIC ASAL 601.png';
import logoDirAE from '../assets/DIR AE.png';
import logoECAE from '../assets/EC AE.png';
import logoEscAvExplAtq602 from '../assets/ESC AV EXPL ATQ 602.png';
import logoSecAE9 from '../assets/SEC AE 9.png';
import logoSecAE11 from '../assets/SEC AE 11.png';
import logoSecAEDR from '../assets/SEC AE DR.png';
import logoSecAEM5 from '../assets/SEC AE M 5.png';
import logoSecAEM6 from '../assets/SEC AE M 6.png';
import logoSecAEM8 from '../assets/SEC AE M 8.png';
import logoSecAEMTE3 from '../assets/SEC AE MTE 3.png';
import logoSecAEMTE12 from '../assets/SEC AE MTE 12.png';

const mapaLogos = {
  "DIR AE": logoDirAE,
  "B AV APY COMB 601": logoBAvApyComb601,
  "B HELIC ASAL 601": logoBHelicAsal601,
  "ESC AV EXPL ATQ 602": logoEscAvExplAtq602,
  "EC AE": logoECAE,
  "SEC AE 9": logoSecAE9,
  "SEC AE 11": logoSecAE11,
  "SEC AE DR": logoSecAEDR,
  "SEC AE M 5": logoSecAEM5,
  "SEC AE M 6": logoSecAEM6,
  "SEC AE M 8": logoSecAEM8,
  "SEC AE MTE 3": logoSecAEMTE3,
  "SEC AE MTE 12": logoSecAEMTE12
};

const listaLogos = Object.entries(mapaLogos).map(([name, src]) => ({ name, src }));

const Login = ({ setAuth }) => {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para el control de versión
  const [serverVersion, setServerVersion] = useState(null);
  const [isOutdated, setIsOutdated] = useState(false);

  // Estado para la animación de ingreso del escudo de la Unidad
  const [detectedLogo, setDetectedLogo] = useState(null);
  const [unidadNombre, setUnidadNombre] = useState('');
  const [animateLogo, setAnimateLogo] = useState(false);

  useEffect(() => {
    verificarVersion();
  }, []);

  const verificarVersion = async () => {
    try {
      const res = await fetch('/api/system/version');
      if (res.ok) {
        const data = await res.json();
        const latestVer = data?.version;
        if (latestVer) {
          setServerVersion(latestVer);
          if (latestVer !== APP_VERSION) {
            setIsOutdated(true);
          }
        }
      }
    } catch (err) {
      console.warn("No se pudo verificar la versión del servidor:", err);
    }
  };

  const handleForceReload = () => {
    window.location.reload(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(form);
      const userData = response.data;

      const token = userData.token;
      const userRole = userData.role;
      const userElemento = userData.elemento ? userData.elemento.toUpperCase().trim() : '';
      const displayName = userData.nombreReal || userData.username;

      if (!token || !userRole) {
        throw new Error('Respuesta del servidor incompleta (Falta Token o Rol)');
      }

      localStorage.setItem('token', token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('username', displayName); 
      localStorage.setItem('app_version', APP_VERSION);
      
      if (userElemento) {
        localStorage.setItem('elemento', userElemento);
      } else if (userRole === 'admin') {
        localStorage.setItem('elemento', 'SECCIÓN AVIACIÓN EJÉRCITO');
      }

      // Animación de entrada de la unidad
      const logoEncontrado = mapaLogos[userElemento] || logoDirAE;
      setDetectedLogo(logoEncontrado);
      setUnidadNombre(userElemento || 'AVIACIÓN DE EJÉRCITO');
      
      setTimeout(() => {
        setAnimateLogo(true);
      }, 50);

      // Duración del despliegue de animación (1.6s)
      setTimeout(() => {
        setAuth(true);
      }, 1600);

    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error de conexión con el servidor';
      setError(message);
      console.error("Fallo en inicio de sesión AE:", err);
      setLoading(false);
    }
  };

  return (
    <div style={styles.loginPage}>
      <style>
        {`
          /* Animación 3D cinematográfica con iluminación */
          @keyframes cinematicEntrance {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) scale(0.2) rotateX(45deg);
              filter: drop-shadow(0 0 0px rgba(255, 215, 0, 0));
            }
            65% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1.15) rotateX(0deg);
              filter: drop-shadow(0 20px 40px rgba(255, 215, 0, 0.5));
            }
            100% {
              opacity: 1;
              transform: translate(-50%, -50%) scale(1) rotateX(0deg);
              filter: drop-shadow(0 15px 30px rgba(0, 0, 0, 0.6));
            }
          }

          .logo-animated-active {
            animation: cinematicEntrance 1.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }

          .top-logo-badge {
            transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .top-logo-badge:hover {
            transform: translateY(-4px) scale(1.12);
            box-shadow: 0 8px 20px rgba(27, 58, 87, 0.18);
            border-color: #1b3a57;
          }
        `}
      </style>

      {/* OVERLAY Y ANIMACIÓN DEL ESCUDO */}
      {detectedLogo && (
        <div style={{
          ...styles.animOverlay,
          opacity: animateLogo ? 1 : 0,
          pointerEvents: 'none'
        }}>
          <div 
            className={animateLogo ? 'logo-animated-active' : ''} 
            style={styles.centerLogoWrapper}
          >
            <div style={styles.glowRing}>
              <img src={detectedLogo} alt="Unidad Detectada" style={styles.centerLogoImg} />
            </div>
            <div style={styles.unitBadge}>
              <span style={styles.unitText}>{unidadNombre}</span>
            </div>
            <span style={styles.welcomeText}>ACCESO AUTORIZADO</span>
          </div>
        </div>
      )}

      {/* FAJA SUPERIOR DE LOGOS MÁS VISIBLES */}
      <div style={styles.topHeaderLogos}>
        {listaLogos.map((item, index) => (
          <div key={index} className="top-logo-badge" style={styles.topLogoBadge} title={item.name}>
            <img src={item.src} alt={item.name} style={styles.topLogoImg} />
          </div>
        ))}
      </div>

      {/* TARJETA DE LOGIN */}
      <div style={styles.loginCard}>
        <div style={{ marginBottom: '20px' }}>
            <h2 style={{ margin: '0', color: '#1b3a57', fontSize: '1.8rem', letterSpacing: '1px' }}>Sistema AE</h2>
            <p style={{ color: '#6c757d', fontSize: '0.9rem', marginTop: '8px' }}>Gestión de Operaciones de Vuelo</p>
        </div>

        {/* --- INDICADOR Y ALERTA DE VERSIÓN (OPCIÓN 2) --- */}
        {isOutdated ? (
          <div style={styles.outdatedAlert}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              ⚠️ ¡Nueva versión disponible ({serverVersion || 'Actualización requerida'})!
            </div>
            <div>Por favor, <strong>presione F5</strong> o haga clic aquí para recargar el sistema:</div>
            <button onClick={handleForceReload} style={styles.btnReload}>
              🔄 Recargar Aplicación
            </button>
          </div>
        ) : (
          <div style={styles.latestVersionBadge}>
            <span style={{ color: '#27ae60', fontWeight: 'bold' }}>✓ Sistema Actualizado</span>
          </div>
        )}
        
        {error && (
          <div style={styles.errorAlert}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ textAlign: 'left', marginBottom: '18px' }}>
            <label style={styles.fieldLabel}>Usuario</label>
            <input 
                type="text" 
                placeholder="Nombre y Apellido" 
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                style={styles.input}
                disabled={loading}
            />
          </div>

          <div style={{ textAlign: 'left', marginBottom: '28px' }}>
            <label style={styles.fieldLabel}>Contraseña</label>
            <input 
                type="password" 
                placeholder="••••••••" 
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} 
                style={styles.input}
                disabled={loading}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              ...styles.button,
              backgroundColor: loading ? '#adb5bd' : '#1b3a57', 
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Identificando Unidad...' : 'Ingresar al Sistema'}
          </button>
        </form>
      </div>
      
      {/* Footer */}
      <p style={styles.footerText}>
        © 2026 Aviación de Ejército | <span style={{ fontWeight: 'bold' }}>v{APP_VERSION}</span><br/>
        <span style={{ fontWeight: '600' }}>Acceso restringido - Uso Profesional</span>
      </p>
    </div>
  );
};

const styles = {
    loginPage: { 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f7f6',
      padding: '20px 0',
      boxSizing: 'border-box',
      position: 'relative',
      overflow: 'hidden'
    },
    topHeaderLogos: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '14px',
      maxWidth: '92vw',
      overflowX: 'auto',
      marginBottom: '25px',
      padding: '14px 22px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 8px 25px rgba(0,0,0,0.06)',
      border: '1px solid #eef2f5'
    },
    topLogoBadge: {
      width: '56px',
      height: '56px',
      borderRadius: '12px',
      backgroundColor: '#f8fafc',
      border: '1.5px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px',
      boxSizing: 'border-box',
      flexShrink: 0,
      cursor: 'pointer'
    },
    topLogoImg: {
      maxWidth: '100%',
      maxHeight: '100%',
      objectFit: 'contain'
    },
    loginCard: { 
      width: '360px',
      padding: '35px 30px', 
      borderRadius: '15px',
      boxShadow: '0 10px 35px rgba(0,0,0,0.12)',
      backgroundColor: '#fff',
      textAlign: 'center',
      zIndex: 1
    },
    fieldLabel: { fontSize: '0.8rem', fontWeight: 'bold', color: '#495057', marginLeft: '5px' },
    input: {
        display: 'block', 
        marginTop: '6px',
        width: '100%', 
        padding: '14px',
        boxSizing: 'border-box',
        borderRadius: '10px',
        border: '1px solid #dee2e6',
        fontSize: '1rem',
        outline: 'none',
        backgroundColor: '#fcfcfc',
        transition: 'all 0.2s ease-in-out'
    },
    button: {
        width: '100%', 
        padding: '16px', 
        color: 'white', 
        border: 'none',
        borderRadius: '10px',
        fontWeight: 'bold',
        fontSize: '1rem',
        boxShadow: '0 4px 12px rgba(27, 58, 87, 0.2)',
        transition: 'background-color 0.3s'
    },
    
    // --- ESTILOS DE VERSIÓN ---
    latestVersionBadge: {
      backgroundColor: '#e8f8f5',
      border: '1px solid #a3e4d7',
      borderRadius: '8px',
      padding: '6px 14px',
      fontSize: '0.75rem',
      marginBottom: '18px',
      display: 'inline-block'
    },
    outdatedAlert: { 
      color: '#721c24', 
      backgroundColor: '#f8d7da', 
      padding: '12px', 
      borderRadius: '10px',
      marginBottom: '20px',
      fontSize: '12px',
      border: '1px solid #f5c6cb',
      textAlign: 'center'
    },
    btnReload: {
      marginTop: '8px',
      backgroundColor: '#721c24',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '6px',
      fontWeight: 'bold',
      cursor: 'pointer',
      fontSize: '11px'
    },
    errorAlert: { 
      color: '#721c24', 
      backgroundColor: '#f8d7da', 
      padding: '12px', 
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '13px',
      border: '1px solid #f5c6cb',
      textAlign: 'left'
    },
    footerText: { marginTop: '20px', color: '#adb5bd', fontSize: '12px', textAlign: 'center', lineHeight: '1.6', zIndex: 1 },

    // Overlay y Animación
    animOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(15, 32, 48, 0.92)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.4s ease'
    },
    centerLogoWrapper: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '18px',
      perspective: '1000px'
    },
    glowRing: {
      position: 'relative',
      padding: '20px',
      borderRadius: '50%',
      background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)'
    },
    centerLogoImg: {
      width: '220px',
      height: '220px',
      objectFit: 'contain'
    },
    unitBadge: {
      backgroundColor: 'rgba(255, 215, 0, 0.15)',
      border: '1px solid rgba(255, 215, 0, 0.5)',
      padding: '6px 18px',
      borderRadius: '20px'
    },
    unitText: {
      color: '#f1c40f',
      fontWeight: 'bold',
      fontSize: '1.1rem',
      letterSpacing: '1.5px'
    },
    welcomeText: {
      color: '#ffffff',
      fontSize: '0.85rem',
      fontWeight: 'bold',
      letterSpacing: '3px',
      opacity: 0.8
    }
};

export default Login;