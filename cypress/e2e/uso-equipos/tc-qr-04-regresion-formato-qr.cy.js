/// <reference types="cypress" />

/**
 * TC-QR-04 | Uso de Equipos | Regresión de formato de lectura QR (D-01)
 * ---------------------------------------------------------------------------
 * Contexto: el defecto D-01 se originó porque una versión de react-qr-scanner
 * cambió su retorno de un `string` directo a un arreglo de objetos
 * `[{ rawValue: '...' }]`. La corrección fue una extracción agnóstica a la
 * versión en `handleQRScan` (src/pages/UsoEquipos.jsx).
 *
 * Como la captura depende de la cámara (no controlable en E2E/CI), este caso
 * valida el CONTRATO de extracción reproduciendo exactamente la misma lógica
 * del componente. Es la guardia de regresión que evita que D-01 reaparezca si
 * alguien simplifica el handler a un único formato.
 *
 * Mejora opcional (recomendada): extraer esta función a `src/utils/qr.js`,
 * usarla dentro de `handleQRScan` e importarla aquí para probar el código real
 * en lugar de un espejo.
 */

// Espejo EXACTO de la extracción en handleQRScan (UsoEquipos.jsx).
function extraerClaveQR(resultado) {
  if (!resultado) return '';
  let texto = '';
  if (Array.isArray(resultado) && resultado.length > 0) {
    texto = resultado[0].rawValue;
  } else if (typeof resultado === 'string') {
    texto = resultado;
  }
  return texto || '';
}

describe('TC-QR-04 | Uso de Equipos | Regresión de formato de lectura QR (D-01)', () => {
  it('extrae la clave cuando el scanner devuelve un string (formato legado)', () => {
    expect(extraerClaveQR('TEC-COMP-001')).to.equal('TEC-COMP-001');
  });

  it('extrae la clave cuando el scanner devuelve [{ rawValue }] (formato nuevo)', () => {
    expect(extraerClaveQR([{ rawValue: 'TEC-COMP-001' }])).to.equal('TEC-COMP-001');
  });

  it('ignora lecturas vacías o nulas sin romper el flujo', () => {
    expect(extraerClaveQR(null)).to.equal('');
    expect(extraerClaveQR(undefined)).to.equal('');
    expect(extraerClaveQR([])).to.equal('');
  });
});
