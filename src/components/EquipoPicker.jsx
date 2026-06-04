import React, { useState, useEffect, useRef } from 'react';

// Buscador de equipo: input de texto que filtra una lista desplegable.
// Al seleccionar, llena la clave y muestra una palomita verde con la
// descripción (marca y modelo) del equipo como confirmación.
function EquipoPicker({ equipos, value, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  // Sincroniza el texto cuando el valor cambia desde afuera
  // (modo edición, o cuando se escanea un QR en UsoEquipos)
  useEffect(() => {
    if (value) {
      const eq = equipos.find(e => e.clave_activo === value);
      if (eq) setQuery(`${eq.clave_activo} — ${eq.marca} ${eq.modelo}`);
      else setQuery(value); // valor no encontrado (ej. QR): muestra el texto tal cual
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Cierra el desplegable al hacer clic fuera
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtrados = equipos.filter(eq => {
    const q = query.toLowerCase();
    return (
      eq.clave_activo.toLowerCase().includes(q) ||
      (eq.marca  || '').toLowerCase().includes(q) ||
      (eq.modelo || '').toLowerCase().includes(q)
    );
  });

  // Equipo válido seleccionado → dispara la palomita + descripción
  const equipoValido = value ? equipos.find(e => e.clave_activo === value) : null;

  function seleccionar(eq) {
    onChange(eq.clave_activo);
    setQuery(`${eq.clave_activo} — ${eq.marca} ${eq.modelo}`);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
          onFocus={e => { if (!disabled) { e.target.style.borderColor = '#3498db'; setOpen(true); } }}
          onBlur={e => e.target.style.borderColor = '#bdc3c7'}
          placeholder="Buscar por clave, marca o modelo..."
          disabled={disabled}
          required
          style={{
            width: '100%', padding: '10px',
            paddingRight: equipoValido ? '34px' : '10px',
            border: '1px solid #bdc3c7', borderRadius: '6px',
            fontSize: '14px', outline: 'none',
            backgroundColor: disabled ? '#f4f7f6' : 'white',
            cursor: disabled ? 'not-allowed' : 'text',
          }}
        />
        {/* Palomita verde dentro del input cuando la clave es válida */}
        {equipoValido && (
          <span style={{
            position: 'absolute', right: '10px', top: '50%',
            transform: 'translateY(-50%)', color: '#27ae60',
            fontSize: '16px', fontWeight: 'bold', pointerEvents: 'none',
          }}>✓</span>
        )}
      </div>

      {/* Descripción del equipo como confirmación */}
      {equipoValido && (
        <small style={{ display: 'block', color: '#27ae60', fontSize: '12px', marginTop: '4px' }}>
          {equipoValido.marca} {equipoValido.modelo}
        </small>
      )}

      {/* Desplegable de coincidencias */}
      {open && !disabled && filtrados.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          backgroundColor: 'white', border: '1px solid #bdc3c7', borderTop: 'none',
          borderRadius: '0 0 6px 6px', maxHeight: '200px', overflowY: 'auto',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        }}>
          {filtrados.map(eq => (
            <div
              key={eq.clave_activo}
              onMouseDown={() => seleccionar(eq)}
              style={{
                padding: '9px 12px', cursor: 'pointer', fontSize: '13px',
                borderBottom: '1px solid #f0f0f0',
                backgroundColor: eq.clave_activo === value ? '#e8f4fd' : 'white',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f4f7f6'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = eq.clave_activo === value ? '#e8f4fd' : 'white'}
            >
              <strong>{eq.clave_activo}</strong>
              <span style={{ color: '#7f8c8d', marginLeft: '8px' }}>{eq.marca} {eq.modelo}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sin resultados */}
      {open && !disabled && filtrados.length === 0 && query.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          backgroundColor: 'white', border: '1px solid #bdc3c7', borderTop: 'none',
          borderRadius: '0 0 6px 6px', padding: '10px 12px',
          fontSize: '13px', color: '#7f8c8d',
        }}>
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
}

export default EquipoPicker;