/// <reference types="cypress" />

/**
 * TC-NAV-02 | Navegación | Abrir el calendario preventivo (POSITIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: desde el Dashboard, el botón con title="Calendario preventivo"
 * despliega el panel del calendario, que siempre muestra la leyenda
 * "Mantenimiento preventivo pendiente".
 */

describe('TC-NAV-02 | Navegación | Calendario preventivo', () => {
  beforeEach(() => {
    cy.stubModulos();
    cy.loginTecdoit();
  });

  it('despliega el panel de calendario preventivo', () => {
    cy.contains('h1', 'Inicio').should('be.visible');

    cy.get('button[title="Calendario preventivo"]').click();

    cy.contains('Mantenimiento preventivo pendiente').should('be.visible');
  });
});
