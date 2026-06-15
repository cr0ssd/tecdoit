/// <reference types="cypress" />

/**
 * TC-QR-02 | Uso de Equipos | Clave de activo inexistente (NEGATIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: cuando el backend responde 404 porque la clave no existe, el módulo
 * debe propagar y mostrar el mensaje de error traducido y NO confirmar el alta.
 *
 * El servicio (api.js) lanza new Error(json.error), por lo que el texto del
 * backend se renderiza tal cual en la franja de error de la UI.
 */

describe('TC-QR-02 | Uso de Equipos | Clave de activo inexistente', () => {
  beforeEach(() => {
    cy.stubDashboard();
    // El catálogo del picker incluye la clave (puede estar desincronizado del
    // backend): así es seleccionable y el backend stubeado responde 404.
    cy.stubEquipos([
      { clave_activo: 'TEC-NO-EXISTE', marca: 'Generico', modelo: 'Sin registro' },
    ]);
    cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getInicial');
    cy.loginTecdoit();
    cy.irAUsoEquipos();
    cy.wait('@getInicial');
  });

  it('muestra el error traducido y no confirma el alta', () => {
    cy.intercept('POST', '**/api/uso-equipos/iniciar', {
      statusCode: 404,
      body: { error: 'Equipo no encontrado. Verifica la clave.' },
    }).as('postInexistente');

    cy.seleccionarEquipo('TEC-NO-EXISTE');
    cy.get('input[name="usuario_nombre"]').type('Maria Lopez');
    cy.contains('button', 'PREPA').click();
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postInexistente');

    cy.contains('Equipo no encontrado. Verifica la clave.').should('be.visible');
    cy.contains('Sesión de uso iniciada correctamente.').should('not.exist');
  });
});
