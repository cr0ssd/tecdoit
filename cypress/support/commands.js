/// <reference types="cypress" />

/**
 * COMANDOS PERSONALIZADOS — Suite de regresión unificada (tecdoit)
 *
 * Centralizan el login y el aislamiento del backend para que las cuatro áreas
 * (Autenticación, Inventario, Uso de Equipos, Navegación) sean deterministas.
 *
 * Endpoints reales (servicios en src/services/api.js):
 *   Dashboard      GET  /api/dashboard/*        GET /api/preventivo/calendario
 *   Inventario     GET  /api/inventario/equipos GET /api/inventario/laboratorios  POST /api/inventario/equipos
 *   Uso de Equipos GET  /api/uso-equipos        POST /api/uso-equipos/iniciar
 *   Mantenimiento  GET  /api/mantenimientos     GET /api/equipos  GET /api/proveedores
 */

// ── Stubs por módulo ─────────────────────────────────────────────────────────

Cypress.Commands.add('stubDashboard', () => {
  cy.intercept('GET', '**/api/dashboard/**', { statusCode: 200, body: [] }).as('stubDashboard');
  cy.intercept('GET', '**/api/preventivo/**', { statusCode: 200, body: [] }).as('stubPreventivo');
});

/**
 * Aísla el módulo de Inventario. Por defecto: catálogo vacío y un laboratorio
 * disponible para poder seleccionarlo en el alta.
 */
Cypress.Commands.add('stubInventario', (equipos = [], laboratorios = null) => {
  const labs = laboratorios || [
    { id_laboratorio: 1, nombre: 'Laboratorio de Cómputo A' },
    { id_laboratorio: 2, nombre: 'Laboratorio de Redes' },
  ];
  cy.intercept('GET', '**/api/inventario/equipos', { statusCode: 200, body: equipos }).as('getEquipos');
  cy.intercept('GET', '**/api/inventario/laboratorios', { statusCode: 200, body: labs }).as('getLaboratorios');
});

/**
 * Aísla el catálogo que alimenta el EquipoPicker del módulo Uso de Equipos.
 * El componente carga GET /api/equipos en paralelo a la bitácora; sin este stub
 * el dropdown queda vacío y NO se puede seleccionar una clave.
 */
Cypress.Commands.add('stubEquipos', (equipos = []) => {
  cy.intercept('GET', '**/api/equipos', { statusCode: 200, body: equipos }).as('getEquiposPicker');
});

/**
 * Selecciona un equipo en el EquipoPicker (autocompletado). El campo NO es un
 * <input name="clave_activo">: hay que escribir para filtrar y luego hacer clic
 * en el ítem del dropdown, que es lo único que fija clave_activo en el estado.
 */
Cypress.Commands.add('seleccionarEquipo', (clave) => {
  cy.get('input[placeholder*="Buscar por clave"]').clear().type(clave);
  cy.contains('[data-dropdown-item]', clave).click();
});

/**
 * Stub global de TODOS los módulos: útil para la prueba de navegación, que
 * recorre el sistema completo sin depender del backend Express :3001.
 */
Cypress.Commands.add('stubModulos', () => {
  cy.stubDashboard();
  cy.stubInventario();
  cy.intercept('GET', '**/api/uso-equipos', { statusCode: 200, body: [] }).as('getUsoEquipos');
  cy.intercept('GET', '**/api/mantenimientos', { statusCode: 200, body: [] }).as('getMantenimientos');
  cy.intercept('GET', '**/api/equipos', { statusCode: 200, body: [] }).as('getEquiposMant');
  cy.intercept('GET', '**/api/proveedores', { statusCode: 200, body: [] }).as('getProveedores');
});

// ── Autenticación ────────────────────────────────────────────────────────────

/**
 * Login real contra Supabase Auth, cacheado con cy.session. Las credenciales
 * se leen de cypress.env.json (TEST_EMAIL / TEST_PASSWORD). NO se versionan.
 *
 * App.jsx no monta el Router sin sesión: renderiza <Login /> en "/". Tras
 * autenticar aparece el Sidebar con el botón "Cerrar Sesión".
 */
Cypress.Commands.add('loginTecdoit', () => {
  const email = Cypress.env('TEST_EMAIL');
  const password = Cypress.env('TEST_PASSWORD');

  if (!email || !password) {
    throw new Error(
      'Faltan credenciales. Crea cypress.env.json con TEST_EMAIL y TEST_PASSWORD ' +
      '(usa cypress.env.example.json como plantilla).'
    );
  }

  cy.session([email, password], () => {
    cy.visit('/');
    cy.contains('.login-title', 'tecdoit', { timeout: 15000 }).should('be.visible');
    cy.get('input[type="email"]').clear().type(email);
    cy.get('input[type="password"]').clear().type(password, { log: false });
    cy.contains('button', 'Iniciar Sesión').click();
    cy.contains('button', 'Cerrar Sesión', { timeout: 20000 }).should('be.visible');
  });

  cy.visit('/');
});

// ── Navegación ───────────────────────────────────────────────────────────────

Cypress.Commands.add('irAUsoEquipos', () => {
  cy.contains('a', 'Uso de Equipos').click();
  cy.url().should('include', '/uso-equipos');
  cy.contains('h1', 'Registro de Uso de Equipos').should('be.visible');
});
