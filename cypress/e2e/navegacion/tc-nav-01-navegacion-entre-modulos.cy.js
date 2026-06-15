/// <reference types="cypress" />

/**
 * TC-NAV-01 | Navegación | Recorrido entre los cuatro módulos (POSITIVO)
 * ---------------------------------------------------------------------------
 * Objetivo: desde el Sidebar se navega a cada módulo y se confirma su carga
 * mediante la ruta y el encabezado. Versión estabilizada (selectores por texto
 * y rol, sin cadenas nth-child frágiles).
 *
 * Encabezados reales:
 *   Dashboard       -> h1 "Inicio"
 *   Inventario      -> h1 "Gestión de Inventarios"
 *   Uso de Equipos  -> h1 "Registro de Uso de Equipos"
 *   Mantenimiento   -> h1 "Gestión de Mantenimiento"
 */

describe('TC-NAV-01 | Navegación | Recorrido entre módulos', () => {
  beforeEach(() => {
    cy.stubModulos(); // aísla todo el sistema del backend
    cy.loginTecdoit();
  });

  it('navega entre Dashboard, Inventario, Uso de Equipos y Mantenimiento', () => {
    cy.contains('h1', 'Inicio').should('be.visible');

    cy.contains('a', 'Inventario').click();
    cy.url().should('include', '/inventario');
    cy.contains('h1', 'Gestión de Inventarios').should('be.visible');

    cy.contains('a', 'Uso de Equipos').click();
    cy.url().should('include', '/uso-equipos');
    cy.contains('h1', 'Registro de Uso de Equipos').should('be.visible');

    cy.contains('a', 'Mantenimiento').click();
    cy.url().should('include', '/mantenimiento');
    cy.contains('h1', 'Gestión de Mantenimiento').should('be.visible');

    cy.contains('a', 'Dashboard').click();
    cy.url().should('include', '/dashboard');
    cy.contains('h1', 'Inicio').should('be.visible');
  });
});
