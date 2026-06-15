/// <reference types="cypress" />

/**
 * TC-AUTH-03 | Autenticación | Campos obligatorios (NEGATIVO / validación)
 * ---------------------------------------------------------------------------
 * Objetivo: al intentar enviar el formulario vacío, la validación HTML5
 * (atributo `required`) impide el envío y el sistema permanece en el login.
 * No requiere red.
 */

describe('TC-AUTH-03 | Autenticación | Campos obligatorios vacíos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.contains('.login-title', 'tecdoit').should('be.visible');
  });

  it('no envía el formulario con los campos vacíos', () => {
    cy.contains('button', 'Iniciar Sesión').click();

    // El navegador marca el campo requerido como "faltante".
    cy.get('input[type="email"]').then(($el) => {
      expect($el[0].validity.valueMissing).to.be.true;
    });

    // Seguimos en la pantalla de login (no hubo navegación).
    cy.contains('.login-title', 'tecdoit').should('be.visible');
  });

  it('valida también la contraseña cuando solo se llena el correo', () => {
    cy.get('input[type="email"]').type('admin@tecdoit.com');
    cy.contains('button', 'Iniciar Sesión').click();

    cy.get('input[type="password"]').then(($el) => {
      expect($el[0].validity.valueMissing).to.be.true;
    });
    cy.contains('.login-title', 'tecdoit').should('be.visible');
  });
});
