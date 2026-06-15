/// <reference types="cypress" />

/**
 * TC-INV-02 | Inventario | Campos obligatorios vacíos (NEGATIVO / validación)
 * ---------------------------------------------------------------------------
 * Objetivo: al intentar confirmar el alta con la clave de activo vacía, la
 * validación HTML5 (`required` en name="clave_activo") impide el envío; el
 * modal permanece abierto y no se registra nada.
 */

describe('TC-INV-02 | Inventario | Campos obligatorios vacíos', () => {
  beforeEach(() => {
    cy.stubDashboard();
    cy.stubInventario();
    cy.loginTecdoit();
    cy.contains('a', 'Inventario').click();
    cy.contains('h1', 'Gestión de Inventarios').should('be.visible');
    cy.wait(['@getEquipos', '@getLaboratorios']);
  });

  it('no permite registrar sin la clave de activo', () => {
    cy.contains('button', 'Agregar Activo').click();
    cy.contains('h2', 'Alta de Nuevo Activo').should('be.visible');

    // Confirmamos sin llenar los campos requeridos.
    cy.contains('button', 'Confirmar Registro').click();

    // El campo requerido queda marcado como faltante por el navegador...
    cy.get('input[name="clave_activo"]').then(($el) => {
      expect($el[0].validity.valueMissing).to.be.true;
    });

    // ...y el modal sigue abierto (no hubo alta).
    cy.contains('h2', 'Alta de Nuevo Activo').should('be.visible');
  });
});
