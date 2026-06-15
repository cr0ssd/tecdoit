/// <reference types="cypress" />

/**
 * TC-QR-01 | Uso de Equipos | Registro exitoso de sesión por QR (POSITIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: verificar que, con un equipo válido, el flujo de registro de uso
 * envía el cuerpo correcto al backend, muestra la confirmación no bloqueante y
 * refleja el nuevo préstamo en la bitácora con estatus "En uso".
 *
 * Aislamiento: el POST de inicio y la lectura de la bitácora se interceptan con
 * cy.intercept, de modo que la prueba es determinista y NO modifica datos reales.
 *
 * Nota: el módulo exige el campo "carrera" antes de llamar al API; por eso se
 * selecciona la carrera rápida "PREPA".
 */

describe('TC-QR-01 | Uso de Equipos | Registro exitoso de sesión por QR', () => {
  beforeEach(() => {
    cy.fixture('registro-uso').as('registro');
    cy.stubDashboard();
    cy.stubEquipos([
      { clave_activo: 'TEC-COMP-001', marca: 'Dell', modelo: 'OptiPlex 7090' },
    ]);
    cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getInicial');
    cy.loginTecdoit();
    cy.irAUsoEquipos();
    cy.wait('@getInicial');
  });

  it('inicia la sesión, valida el cuerpo de la petición y la muestra en la bitácora', function () {
    // Verificamos el cuerpo del POST y respondemos 201 (éxito).
    cy.intercept('POST', '**/api/uso-equipos/iniciar', (req) => {
      expect(req.body).to.deep.equal({
        clave_activo: 'TEC-COMP-001',
        usuario_nombre: 'Juan Perez',
        proposito: 'Practica de redes',
        carrera: 'PREPA',
      });
      req.reply({ statusCode: 201, body: { mensaje: 'ok' } });
    }).as('postIniciar');

    // Tras el alta, el módulo recarga la bitácora: ahora con el registro nuevo.
    cy.intercept('GET', '**/api/uso-equipos', {
      statusCode: 200,
      body: [this.registro],
    }).as('getActualizado');

    cy.seleccionarEquipo('TEC-COMP-001');
    cy.get('input[name="usuario_nombre"]').type('Juan Perez');
    cy.get('input[name="proposito"]').type('Practica de redes');
    cy.contains('button', 'PREPA').click(); // carrera obligatoria
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postIniciar');
    cy.wait('@getActualizado');

    cy.contains('Sesión de uso iniciada correctamente.').should('be.visible');

    cy.get('.data-table').within(() => {
      cy.contains('TEC-COMP-001').should('be.visible');
      cy.contains('Juan Perez').should('be.visible');
      cy.contains('En uso').should('be.visible');
    });
  });
});
