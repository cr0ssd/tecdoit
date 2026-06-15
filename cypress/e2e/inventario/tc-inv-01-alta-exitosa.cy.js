/// <reference types="cypress" />

/**
 * TC-INV-01 | Inventario | Alta exitosa de activo (POSITIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: desde "Agregar Activo" se abre el modal "Alta de Nuevo Activo", se
 * capturan los datos, se confirma con "Confirmar Registro", y el nuevo activo
 * aparece en la tabla.
 *
 * Selectores alineados al código real (src/pages/Inventario.jsx):
 *   - Botón de apertura:  "Agregar Activo"
 *   - Título del modal:   "Alta de Nuevo Activo"
 *   - Campos:             name="clave_activo", select name="id_laboratorio",
 *                         name="marca", name="modelo", name="costo"
 *   - Botón de envío:     "Confirmar Registro"
 */

describe('TC-INV-01 | Inventario | Alta exitosa de activo', () => {
  beforeEach(() => {
    cy.stubDashboard();
    cy.stubInventario(); // catálogo vacío + laboratorios disponibles
    cy.loginTecdoit();
    cy.contains('a', 'Inventario').click();
    cy.contains('h1', 'Gestión de Inventarios').should('be.visible');
    cy.wait(['@getEquipos', '@getLaboratorios']);
  });

  it('registra el activo y lo muestra en la tabla', function () {
    cy.fixture('equipo-nuevo').then((equipo) => {
      cy.intercept('POST', '**/api/inventario/equipos', { statusCode: 201, body: equipo }).as('postCrear');
      // Tras el alta, el módulo recarga el catálogo: ahora con el activo nuevo.
      cy.intercept('GET', '**/api/inventario/equipos', { statusCode: 200, body: [equipo] }).as('getActualizado');

      cy.contains('button', 'Agregar Activo').click();
      cy.contains('h2', 'Alta de Nuevo Activo').should('be.visible');

      cy.get('input[name="clave_activo"]').type(equipo.clave_activo);
      cy.get('select[name="id_laboratorio"]').select('Laboratorio de Cómputo A');
      cy.get('input[name="marca"]').type(equipo.marca);
      cy.get('input[name="modelo"]').type(equipo.modelo);
      cy.get('input[name="costo"]').type('15000');

      cy.contains('button', 'Confirmar Registro').click();

      cy.wait('@postCrear');
      cy.wait('@getActualizado');

      // El modal se cierra y el activo aparece en la tabla.
      cy.contains('h2', 'Alta de Nuevo Activo').should('not.exist');
      cy.get('.data-table').within(() => {
        cy.contains(equipo.clave_activo).should('be.visible');
        cy.contains(equipo.marca).should('be.visible');
      });
    });
  });
});
