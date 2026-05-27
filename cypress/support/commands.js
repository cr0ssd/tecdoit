/// <reference types="cypress" />

Cypress.Commands.add('stubDashboardRequests', () => {
  cy.intercept('GET', '**/api/dashboard/equipos', { statusCode: 200, body: [] }).as('getDashboardEquipos');
  cy.intercept('GET', '**/api/dashboard/costos-mantenimientos', { statusCode: 200, body: [] }).as('getDashboardCostos');
  cy.intercept('GET', '**/api/dashboard/prestamos-activos', { statusCode: 200, body: [] }).as('getDashboardPrestamos');
  cy.intercept('GET', '**/api/dashboard/notificaciones', { statusCode: 200, body: [] }).as('getDashboardNotificaciones');
  cy.intercept('GET', '**/preventivo/calendario', { statusCode: 200, body: [] }).as('getCalendarioPreventivo');
});

Cypress.Commands.add('loginTecdoit', () => {
  const email = Cypress.env('TEST_EMAIL');
  const password = Cypress.env('TEST_PASSWORD');

  if (!email || !password) {
    throw new Error('Configura TEST_EMAIL y TEST_PASSWORD en cypress.env.json antes de ejecutar las pruebas.');
  }

  cy.session([email, password], () => {
    cy.visit('/');
    cy.contains('tecdoit').should('be.visible');
    cy.get('input[type="email"]').clear().type(email);
    cy.get('input[type="password"]').clear().type(password, { log: false });
    cy.contains('button', 'Iniciar Sesión').click();
    cy.contains('Cerrar Sesión', { timeout: 20000 }).should('be.visible');
  });

  cy.visit('/');
});
