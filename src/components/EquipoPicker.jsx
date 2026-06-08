import React, { useState, useEffect, useRef } from 'react';

function EquipoPicker({ equipos, value, onChange, disabled }) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  // Sync display text when value changes from outside (QR scan, edit mode)
  useEffect(() => {
    if (value) {
      const eq = equipos.find(e => e.clave_activo === value);
      if (eq) setQuery(`${eq.clave_activo} — ${eq.marca} ${eq.modelo}`);
      else    setQuery(value);
    } else {
      setQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter logic:
  // - confirmed selection → show full list (so user can change)
  // - typing              → filter by query
  // - empty query         → show full list
  const isConfirmed = Boolean(value);
  const filtrados = equipos.filter(eq => {
    if (isConfirmed || !query) return true;
    const q = query.toLowerCase();
    return (
      eq.clave_activo.toLowerCase().includes(q) ||
      (eq.marca  || '').toLowerCase().includes(q) ||
      (eq.modelo || '').toLowerCase().includes(q)
    );
  });

  const equipoValido = value ? equipos.find(e => e.clave_activo === value) : null;

  function seleccionar(eq) {
    onChange(eq.clave_activo);
    setQuery(`${eq.clave_activo} — ${eq.marca} ${eq.modelo}`);
    setOpen(false);
  }

  function handleChange(e) {
    setQuery(e.target.value);
    onChange('');
    setOpen(true);
  }

  // Use onMouseDown on the wrapper instead of onFocus on the input —
  // avoids the onBlur-kills-dropdown race condition
  function handleWrapperMouseDown(e) {
    if (disabled) return;
    // Only toggle if clicking the input or chevron (not a dropdown item)
    if (e.target.closest('[data-dropdown-item]')) return;
    setOpen(prev => !prev);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Input row */}
      <div
        onMouseDown={handleWrapperMouseDown}
        style={{ position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Buscar por clave, marca o modelo..."
          disabled={disabled}
          required
          style={{
            width: '100%',
            padding: '10px',
            paddingRight: '34px',
            border: `1px solid ${open ? '#3498db' : '#bdc3c7'}`,
            borderRadius: open ? '6px 6px 0 0' : '6px',
            fontSize: '14px',
            outline: 'none',
            backgroundColor: disabled ? '#f4f7f6' : 'white',
            cursor: disabled ? 'not-allowed' : 'text',
            transition: 'border-color 0.15s ease',
          }}
        />

        {/* Chevron / checkmark icon */}
        <span style={{
          position: 'absolute', right: '10px', top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          fontSize: equipoValido ? '16px' : '11px',
          color: equipoValido ? '#27ae60' : '#7f8c8d',
          transition: 'transform 0.2s ease',
        }}>
          {equipoValido ? '✓' : (open ? '▲' : '▼')}
        </span>
      </div>

      {/* Confirmed-equipo description */}
      {equipoValido && (
        <small style={{ display: 'block', color: '#27ae60', fontSize: '12px', marginTop: '4px' }}>
          {equipoValido.marca} {equipoValido.modelo}
        </small>
      )}

      {/* Dropdown */}
      {open && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          backgroundColor: 'white',
          border: '1px solid #3498db', borderTop: 'none',
          borderRadius: '0 0 6px 6px',
          maxHeight: '220px', overflowY: 'auto',
          boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
        }}>
          {filtrados.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: '#7f8c8d' }}>
              Sin resultados para "{query}"
            </div>
          ) : (
            filtrados.map(eq => (
              <div
                key={eq.clave_activo}
                data-dropdown-item="true"
                onMouseDown={() => seleccionar(eq)}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  borderBottom: '1px solid #f0f0f0',
                  backgroundColor: eq.clave_activo === value ? '#e8f4fd' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f4f7f6'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = eq.clave_activo === value ? '#e8f4fd' : 'white'; }}
              >
                <strong style={{ color: '#2c3e50', minWidth: '90px' }}>{eq.clave_activo}</strong>
                <span style={{ color: '#7f8c8d' }}>{eq.marca} {eq.modelo}</span>
                {eq.clave_activo === value && (
                  <span style={{ marginLeft: 'auto', color: '#27ae60', fontSize: '14px' }}>✓</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EquipoPicker;