/// <reference types="cypress" />

/**
 * TC-QR-03 | Uso de Equipos | Equipo no Activo / en mantenimiento (NEGATIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: cuando el backend responde 409 porque el equipo no está Activo
 * (p. ej. está en mantenimiento), el módulo debe bloquear el alta y mostrar el
 * mensaje correspondiente, sin confirmar la sesión.
 */

describe('TC-QR-03 | Uso de Equipos | Equipo no Activo (en mantenimiento)', () => {
  beforeEach(() => {
    cy.stubDashboard();
    cy.stubEquipos([
      { clave_activo: 'TEC-COMP-002', marca: 'HP', modelo: 'EliteDesk 800' },
    ]);
    cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getInicial');
    cy.loginTecdoit();
    cy.irAUsoEquipos();
    cy.wait('@getInicial');
  });

  it('bloquea el alta y muestra el mensaje de equipo no disponible', () => {
    cy.intercept('POST', '**/api/uso-equipos/iniciar', {
      statusCode: 409,
      body: { error: 'El equipo no está Activo (puede estar en mantenimiento).' },
    }).as('postNoActivo');

    cy.seleccionarEquipo('TEC-COMP-002');
    cy.get('input[name="usuario_nombre"]').type('Carlos Ramirez');
    cy.contains('button', 'EXTERNO').click();
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postNoActivo');

    cy.contains('El equipo no está Activo').should('be.visible');
    cy.contains('Sesión de uso iniciada correctamente.').should('not.exist');
  });
});
