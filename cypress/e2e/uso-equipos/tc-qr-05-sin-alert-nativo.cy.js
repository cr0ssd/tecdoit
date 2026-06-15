/// <reference types="cypress" />

/**
 * TC-QR-05 | Uso de Equipos | Sin alert() nativo en el flujo crítico (H-01)
 * ---------------------------------------------------------------------------
 * Contexto: la heurística H-01 detectó el uso de diálogos nativos del navegador
 * (window.alert / window.confirm) que bloquean el hilo principal. La corrección
 * los reemplazó por notificaciones en pantalla (Toast / franja inline).
 *
 * Este caso ejecuta el flujo de alta exitoso y FALLA si cualquier alert() nativo
 * se dispara durante el recorrido, confirmando además que la retroalimentación
 * llega por un mensaje no bloqueante.
 */

describe('TC-QR-05 | Uso de Equipos | Sin alert() nativo en el flujo crítico', () => {
  beforeEach(() => {
    cy.stubDashboard();
    cy.stubEquipos([
      { clave_activo: 'TEC-COMP-001', marca: 'Dell', modelo: 'OptiPlex 7090' },
    ]);
    cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getInicial');
    cy.loginTecdoit();
    cy.irAUsoEquipos();
    cy.wait('@getInicial');
  });

  it('completa el registro con notificación no bloqueante, sin disparar alert()', () => {
    // Falla la prueba si CUALQUIER alert() nativo se dispara durante el flujo.
    cy.on('window:alert', (txt) => {
      throw new Error(`Se disparó un alert() nativo ("${txt}"): viola H-01.`);
    });

    cy.intercept('POST', '**/api/uso-equipos/iniciar', {
      statusCode: 201,
      body: { mensaje: 'ok' },
    }).as('postIniciar');
    cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getActualizado');

    cy.seleccionarEquipo('TEC-COMP-001');
    cy.get('input[name="usuario_nombre"]').type('Juan Perez');
    cy.contains('button', 'EXTERNO').click();
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postIniciar');

    // La confirmación se entrega en pantalla, no por un diálogo del navegador.
    cy.contains('Sesión de uso iniciada correctamente.').should('be.visible');
  });
});
