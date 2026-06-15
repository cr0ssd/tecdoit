/// <reference types="cypress" />

/**
 * TC-INV-03 | Inventario | Validación numérica del costo (validación + deuda técnica)
 * ---------------------------------------------------------------------------
 * Objetivo: verificar el comportamiento del campo de costo (input numérico).
 *
 * Hallazgo documentado: el campo `costo` (type="number", step="0.01") NO define
 * el atributo `min="0"`, por lo que el navegador ACEPTA valores negativos. Esta
 * prueba deja constancia del comportamiento actual (deuda técnica conocida) sin
 * romper el pipeline; el endurecimiento sería agregar min="0" al input.
 */

describe('TC-INV-03 | Inventario | Validación numérica del costo', () => {
  beforeEach(() => {
    cy.stubDashboard();
    cy.stubInventario();
    cy.loginTecdoit();
    cy.contains('a', 'Inventario').click();
    cy.contains('h1', 'Gestión de Inventarios').should('be.visible');
    cy.wait(['@getEquipos', '@getLaboratorios']);
    cy.contains('button', 'Agregar Activo').click();
    cy.contains('h2', 'Alta de Nuevo Activo').should('be.visible');
  });

  it('acepta un decimal positivo válido', () => {
    cy.get('input[name="costo"]').type('15000.50').should('have.value', '15000.50');
    cy.get('input[name="costo"]').then(($el) => {
      expect($el[0].validity.valid).to.be.true;
    });
  });
});
