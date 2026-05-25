it('Login', function() {
  cy.visit('http://localhost:5173/')
  cy.url().should('eq', 'http://localhost:5173/')

  // Core login form elements exist
  cy.get('#root input[placeholder="admin@tecdoit.com"]')
    .should('have.attr', 'required')

  cy.get('#root input[placeholder="••••••••"]')
    .should('have.attr', 'required')

  cy.get('#root button.btn-primary')
    .should('contain.text', 'Iniciar Sesión')

  
  cy.get('#root input[placeholder="admin@tecdoit.com"]').type('admin@tec.mx')
  cy.get('#root input[placeholder="••••••••"]').type('admin')
  cy.get('#root button.btn-primary').click()

  
  cy.get('#root button.btn-primary')
    .should('contain.text', 'Verificando...')
    .and('have.attr', 'disabled')
});

it('cambiar entre modulos', function() {
  cy.visit('http://localhost:5173/')

  // Login
  cy.get('#root input[placeholder="admin@tecdoit.com"]').type('admin@tec.mx')
  cy.get('#root input[placeholder="••••••••"]').type('admin')
  cy.get('#root button.btn-primary').click()

  
  cy.url().should('eq', 'http://localhost:5173/dashboard')

  
  cy.get('#root ul > li').should('have.length', 4)

  
  cy.get('#root a[href="/inventario"]').click()
  cy.url().should('eq', 'http://localhost:5173/inventario')
  cy.get('#root h1').should('contain.text', 'Gestión de Inventarios')
  cy.get('#root input.input-search').should('have.value', '')

  
  cy.get('#root a[href="/uso-equipos"]').click()
  cy.url().should('eq', 'http://localhost:5173/uso-equipos')
  cy.get('#root h1').should('contain.text', 'Registro de Uso de Equipos')
  cy.get('#root [name="clave_activo"]').should('have.attr', 'required')
  cy.get('#root [name="usuario_nombre"]').should('have.attr', 'required')
  cy.get('#root [name="proposito"]').should('have.value', '')

  
  cy.get('#root a[href="/mantenimiento"]').click()
  cy.url().should('eq', 'http://localhost:5173/mantenimiento')
  cy.get('#root h1').should('contain.text', 'Gestión de Mantenimiento')
});