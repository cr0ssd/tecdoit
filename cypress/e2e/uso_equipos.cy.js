/// <reference types="cypress" />

// Actividad 5.6 - Desarrollo de Test Scripts - Enfoque Manual
// Proyecto: tecdoit
// Flujo funcional: Registro de Uso de Equipos
// Requisito: 3 Test Cases automatizados: 1 positivo y 2 negativos / validacion.

const registroActivo = {
  id_uso: 101,
  clave_activo: 'TEC-COMP-001',
  usuario_nombre: 'Juan Perez',
  proposito: 'Practica de redes',
  hora_inicio: '2026-05-11T16:30:00.000Z',
  hora_fin: null,
  estatus: 'En uso',
  equipos: {
    marca: 'Dell',
    modelo: 'OptiPlex 7090',
    laboratorios: { nombre: 'Laboratorio de Redes' }
  }
};

describe('tecdoit - Flujo de Registro de Uso de Equipos', () => {
  beforeEach(() => {
    cy.stubDashboardRequests();

    cy.intercept(
      { method: 'GET', url: '**/api/uso-equipos', times: 1 },
      { statusCode: 200, body: [] }
    ).as('getRegistrosIniciales');

    cy.loginTecdoit();
    cy.contains('a', 'Uso de Equipos').click();
    cy.contains('h1', 'Registro de Uso de Equipos').should('be.visible');
    cy.wait('@getRegistrosIniciales');
  });

  it('TC01 - Inicia una sesion de uso con un equipo activo', () => {
    cy.intercept('POST', '**/api/uso-equipos/iniciar', (req) => {
      expect(req.body).to.deep.equal({
        clave_activo: 'TEC-COMP-001',
        usuario_nombre: 'Juan Perez',
        proposito: 'Practica de redes'
      });

      req.reply({
        statusCode: 201,
        body: { mensaje: 'Sesión de uso iniciada correctamente.' }
      });
    }).as('postIniciarUso');

    cy.intercept('GET', '**/api/uso-equipos', {
      statusCode: 200,
      body: [registroActivo]
    }).as('getRegistrosPosteriores');

    cy.get('input[name="clave_activo"]').type('TEC-COMP-001');
    cy.get('input[name="usuario_nombre"]').type('Juan Perez');
    cy.get('input[name="proposito"]').type('Practica de redes');
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postIniciarUso');
    cy.wait('@getRegistrosPosteriores');

    cy.contains('Sesión de uso iniciada correctamente.').should('be.visible');
    cy.contains('TEC-COMP-001').should('be.visible');
    cy.contains('Juan Perez').should('be.visible');
    cy.contains('En uso').should('be.visible');
  });

  it('TC02 - Muestra error cuando la clave de equipo no existe', () => {
    cy.intercept('POST', '**/api/uso-equipos/iniciar', {
      statusCode: 404,
      body: { error: 'Equipo no encontrado. Verifica la clave.' }
    }).as('postEquipoInexistente');

    cy.get('input[name="clave_activo"]').type('TEC-NO-EXISTE');
    cy.get('input[name="usuario_nombre"]').type('Maria Lopez');
    cy.get('input[name="proposito"]').type('Revision de laboratorio');
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postEquipoInexistente');
    cy.contains('Equipo no encontrado. Verifica la clave.').should('be.visible');
    cy.contains('Sesión de uso iniciada correctamente.').should('not.exist');
  });

  it('TC03 - Muestra error cuando el equipo no esta activo', () => {
    cy.intercept('POST', '**/api/uso-equipos/iniciar', {
      statusCode: 409,
      body: { error: 'El equipo no está Activo (puede estar en mantenimiento).' }
    }).as('postEquipoNoActivo');

    cy.get('input[name="clave_activo"]').type('TEC-COMP-002');
    cy.get('input[name="usuario_nombre"]').type('Carlos Ramirez');
    cy.get('input[name="proposito"]').type('Practica de mantenimiento');
    cy.contains('button', 'Iniciar Uso').click();

    cy.wait('@postEquipoNoActivo');
    cy.contains('El equipo no está Activo').should('be.visible');
    cy.contains('Sesión de uso iniciada correctamente.').should('not.exist');
  });
});
