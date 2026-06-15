/// <reference types="cypress" />

/**
 * TC-AUTH-02 | Autenticación | Credenciales inválidas (NEGATIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: con credenciales incorrectas, el sistema no permite el acceso y
 * notifica el error. Login.jsx captura el error de Supabase y muestra:
 *   alert('Error de acceso: Verifica tu correo y contraseña.')
 *
 * Aislamiento: se intercepta el endpoint de token de Supabase y se fuerza un
 * 400, de modo que la prueba es determinista y no intenta logins reales.
 */

describe('TC-AUTH-02 | Autenticación | Credenciales inválidas', () => {
  it('notifica el error y no concede acceso', () => {
    cy.intercept('POST', '**/auth/v1/token**', {
      statusCode: 400,
      body: {
        error: 'invalid_grant',
        error_description: 'Invalid login credentials',
        msg: 'Invalid login credentials',
      },
    }).as('authToken');

    // Capturamos el alert nativo que dispara Login.jsx ante el error.
    cy.on('window:alert', cy.stub().as('alerta'));

    cy.visit('/');
    cy.get('input[type="email"]').type('usuario.inexistente@tecdoit.com');
    cy.get('input[type="password"]').type('passwordIncorrecta', { log: false });
    cy.contains('button', 'Iniciar Sesión').click();

    cy.wait('@authToken');
    cy.get('@alerta').should('have.been.calledWith', 'Error de acceso: Verifica tu correo y contraseña.');

    // No hubo navegación: seguimos en la pantalla de login.
    cy.contains('.login-title', 'tecdoit').should('be.visible');
  });
});
