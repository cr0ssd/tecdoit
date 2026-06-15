/// <reference types="cypress" />

/**
 * TC-AUTH-01 | Autenticación | Inicio de sesión con credenciales válidas (POSITIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: con credenciales válidas, el usuario accede al sistema; tras el
 * login App.jsx monta el Router y aparece el Sidebar (botón "Cerrar Sesión")
 * y el Dashboard (h1 "Inicio").
 *
 * Requiere TEST_EMAIL / TEST_PASSWORD en cypress.env.json (login real Supabase).
 * No se usa cy.session aquí: este caso ES la prueba del propio login.
 */

describe('TC-AUTH-01 | Autenticación | Login con credenciales válidas', () => {
  it('permite acceder al sistema con credenciales válidas', () => {
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    if (!email || !password) {
      throw new Error('Faltan TEST_EMAIL / TEST_PASSWORD en cypress.env.json.');
    }

    cy.stubDashboard(); // el Dashboard de destino no depende del backend
    cy.visit('/');

    cy.contains('.login-title', 'tecdoit').should('be.visible');
    cy.get('input[type="email"]').type(email);
    cy.get('input[type="password"]').type(password, { log: false });
    cy.contains('button', 'Iniciar Sesión').click();

    cy.contains('button', 'Cerrar Sesión', { timeout: 20000 }).should('be.visible');
    cy.contains('h1', 'Inicio').should('be.visible');
  });
});
