const now = new Date();
const months = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
]

const day = String(now.getDate()).padStart(2, '0')
const month = months[now.getMonth()]
const nextmonth = months[now.getMonth() + 1]
const formattedDate = `${day}-${month}`



it('Login', function() {
  cy.visit('http://localhost:5173/')
  cy.url().should('eq', 'http://localhost:5173/')

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

it('Abrir Calendario', function() {
  cy.visit('http://localhost:5173')
  // Page URL changed.
  cy.url()
    .should('eq', 'http://localhost:5173/')
  
  
  cy.get('#root input[placeholder="admin@tecdoit.com"]').type('admin@tec.mx')
  cy.get('#root input[placeholder="••••••••"]').type('admin')
  cy.get('#root button.btn-primary').click()
  cy.url().should('eq', 'http://localhost:5173/dashboard')


  cy.get('#root button[title="Calendario preventivo"] svg').click();
  // The preventive calendar dropdown is now visible.
  cy.get('#root div:nth-child(2) > div:nth-child(1) > div:nth-child(2)')
    .should('be.visible')
  cy.get('#root div:nth-child(2) div:nth-child(1) strong')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text(month)
    })
  // The 26th day of the month is highlighted.
  cy.get('#root div:nth-child(31)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('26')
    })
  // Upcoming maintenance for '06-may' is displayed.
  cy.get('#root div:nth-child(2) > div:nth-child(1) > span:nth-child(1)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('06-may')
    })
  // Upcoming maintenance for '20-may' is displayed.
  cy.get('#root div:nth-child(2) > span:nth-child(2)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('TEC-TEST-003, TEC-COMP-002, TEC-TEST-002')
    })
  // The legend 'Mantenimiento preventivo pendiente' is visible.
  cy.get('#root div:nth-child(4) > span')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Mantenimiento preventivo pendiente')
    })
  
  cy.get('#root div:nth-child(5) > div:nth-child(1)').click();
  cy.get('#root div:nth-child(1) > button:nth-child(3)').click();
  // The calendar now displays 'Junio2026'.
  cy.get('#root div:nth-child(2) div:nth-child(1) strong')
    .should('contain.text', nextmonth)
  // The maintenance event for this day is no longer highlighted.
  cy.get('#root div:nth-child(3) div:nth-child(7)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('6')
    })
  // The maintenance event for this day is no longer highlighted.
  cy.get('#root div:nth-child(21)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('20')
    })
  // The previously highlighted day is no longer highlighted.
  cy.get('#root div:nth-child(27)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('26')
    })
  
});

it('Registrar session', function() {
  cy.visit('http://localhost:5173/')
  
  cy.get('#root input[placeholder="admin@tecdoit.com"]').click();
  cy.get('#root input[placeholder="admin@tecdoit.com"]').type('admin@tec.mx');
  // The email input field now contains the value 'admin@tec.mx'.
  cy.get('#root input[placeholder="admin@tecdoit.com"]')
    .should('have.value', 'admin@tec.mx')
  
  cy.get('#root input[placeholder="••••••••"]').click();
  cy.get('#root input[placeholder="••••••••"]').type('admin');
  cy.get('#root button.btn-primary').click();
  // The 'Iniciar Sesión' button is now disabled and shows 'Verificando...'
  cy.get('#root button.btn-primary')
    .should(($el) => {
      expect($el).to.contain.text('Verificando...')
      expect($el).to.have.attr('disabled')
    })
  
  cy.get('#root a[href="/inventario"]').click();
  // The page heading is now 'Gestión de Inventarios'.
  cy.get('#root h1')
    .should('contain.text', 'Gestión de Inventarios')
  // The subheading is now 'Catálogo centralizado de activos corporativos'.
  cy.get('#root p')
    .should('contain.text', 'Catálogo centralizado de activos corporativos')
  // A button with the text 'Agregar Activo' is now visible.
  cy.get('#root button.btn-primary')
    .should('contain.text', 'Agregar Activo')
  // A search input field with placeholder 'Buscar por clave, marca o modelo...' is now visible.
  cy.get('#root input.input-search')
    .should('have.value', '')
  // A dropdown filter for sectors is now visible.
  cy.get('#root select.select-filter > option')
    .should('have.length', 6)
  // The 'Modificar' button is now visible.
  cy.get('#root tr:nth-child(1) button:nth-child(1)')
    .should('contain.text', 'Modificar')
  // The asset key 'TEC-TEST-002' is now visible.
  cy.get('#root tr:nth-child(1) td:nth-child(2)')
    .should('contain.text', 'TEC-TEST-002')
  // The operational status 'En Mantenimiento' is now visible.
  cy.get('#root tr:nth-child(1) td:nth-child(6)')
    .should('contain.text', 'En Mantenimiento')
  
  cy.get('#root a[href="/uso-equipos"]').click();
  cy.get('#root [name="clave_activo"]').click();
  cy.get('#root [name="clave_activo"]').type('TEC-TEST-005');
  // The 'clave_activo' input field now contains 'TEC-TEST-005'.
  cy.get('#root [name="clave_activo"]')
    .should('have.value', 'TEC-TEST-005')
  
  cy.get('#root [name="usuario_nombre"]').click();
  cy.get('#root [name="usuario_nombre"]').type('John Doe');
  // The 'usuario_nombre' input field now contains the value 'John Doe'.
  cy.get('#root [name="usuario_nombre"]')
    .should('have.value', 'John Doe')
  
  cy.get('#root [name="proposito"]').click();
  cy.get('#root [name="proposito"]').type('Uso de prueba');
  // The 'proposito' input field now contains the value 'Uso de prueba'.
  cy.get('#root [name="proposito"]')
    .should('have.value', 'Uso de prueba')
  
  cy.get('#root button.btn-primary').click();
  cy.get('#root tr:nth-child(1) td:nth-child(5)').click();
  cy.get('#root button.btn-icon').click();
  // The success message changes to 'Sesión finalizada. Equipo liberado.'
  cy.get('#root div.dashboard-container > div:nth-child(2)')
    .should('contain.text', 'Sesión finalizada. Equipo liberado.')
  // The session end time is now displayed.
  cy.get('#root tr:nth-child(1) td:nth-child(4)')
    .should('contain.text', formattedDate)
  // The session status changes to 'Finalizado'.
  cy.get('#root tr:nth-child(1) td:nth-child(5)')
    .should('contain.text', 'Finalizado')
  // The 'Finalizar' button is replaced with 'Completado' text.
  cy.get('#root tr:nth-child(1) td:nth-child(6)')
    .should('contain.text', 'Completado')
  
});

it('Registrar Mantenimiento', function() {
  cy.visit('http://localhost:5173/')
  // Page URL changed.
  cy.url()
    .should('eq', 'http://localhost:5173/')
  // The login page title is 'tecdoit'.
  cy.get('#root h1.login-title')
    .should('contain.text', 'tecdoit')
  // The login page subtitle is 'Sistema Integral de Gestión de Laboratorios'.
  cy.get('#root p.login-subtitle')
    .should('contain.text', 'Sistema Integral de Gestión de Laboratorios')
  // The email input field has a placeholder 'admin@tecdoit.com'.
  cy.get('#root input[placeholder="admin@tecdoit.com"]')
    .should(($el) => {
      expect($el).to.have.attr('required')
      expect($el).to.have.value('')
    })
  // The password input field has a placeholder '••••••••'.
  cy.get('#root input[placeholder="••••••••"]')
    .should('have.attr', 'required')
  // The login button text is 'Iniciar Sesión'.
  cy.get('#root button.btn-primary')
    .should('contain.text', 'Iniciar Sesión')
  // The email input field is labeled 'Correo Electrónico'.
  cy.get('#root form.login-form div:nth-child(1)')
    .should('contain.text', 'Correo Electrónico')
  // The password input field is labeled 'Contraseña'.
  cy.get('#root div:nth-child(2)')
    .should('contain.text', 'Contraseña')
  
  
  cy.get('#root input[placeholder="admin@tecdoit.com"]').click();
  cy.get('#root input[placeholder="admin@tecdoit.com"]').type('admin@tec.mx');
  // The email input field now contains the value 'admin@tec.mx'.
  cy.get('#root input[placeholder="admin@tecdoit.com"]')
    .should('have.value', 'admin@tec.mx')
  
  cy.get('#root input[placeholder="••••••••"]').click();
  cy.get('#root input[placeholder="••••••••"]').type('admin');
  cy.get('#root button.btn-primary').click();
  // The login button text changed to 'Verificando...' and the button was disabled.
  cy.get('#root button.btn-primary')
    .should(($el) => {
      expect($el).to.contain.text('Verificando...')
      expect($el).to.have.attr('disabled')
    })
  
  cy.get('#root a[href="/mantenimiento"]').click();
  cy.get('#root button.btn-primary').click();
  // A modal window titled 'Nuevo Mantenimiento' has appeared.
  cy.get('#root div.modal-overlay')
    .should('be.visible')
  // The modal title is 'Nuevo Mantenimiento'.
  cy.get('#root div.modal-content h2')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Nuevo Mantenimiento')
    })
  // The modal subtitle instructs the user to 'Selecciona el tipo de servicio a registrar'.
  cy.get('#root div.modal-content p')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Selecciona el tipo de servicio a registrar')
    })
  // A button to 'Registrar Preventivo' is displayed.
  cy.get('#root button:nth-child(1) div:nth-child(2)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Registrar Preventivo')
    })
  // A button to 'Registrar Correctivo' is displayed.
  cy.get('#root button:nth-child(2) div:nth-child(2)')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Registrar Correctivo')
    })
  // A 'Cancelar' button is displayed in the modal.
  cy.get('#root button.btn-secondary')
    .should(($el) => {
      expect($el).to.be.visible
      expect($el).to.contain.text('Cancelar')
    })
  
  cy.get('#root button:nth-child(1) div:nth-child(2)').click();
  // The modal title changed to 'Registrar Mantenimiento Preventivo'.
  cy.get('#root div:nth-child(1) > h2')
    .should('contain.text', 'Registrar Mantenimiento Preventivo')
  // The step 'Identificación' is now visible.
  cy.get('#root div:nth-child(1) > span')
    .should('contain.text', 'Identificación')
  // The 'Equipo' label is now visible.
  cy.get('#root form > div:nth-child(1) > label')
    .should('contain.text', 'Equipo')
  // A select input for 'Equipo' is now visible.
  cy.get('#root [name="clave_activo"] > option')
    .should('have.length', 11)
  // A select input for 'Equipo' is now visible.
  cy.get('#root [name="clave_activo"]')
    .should('have.attr', 'required')
  // The 'Tipo de requerimiento' label is now visible.
  cy.get('#root div:nth-child(2) label')
    .should('contain.text', 'Tipo de requerimiento')
  // A select input for 'Tipo de requerimiento' is now visible.
  cy.get('#root [name="tipo_requerimiento"] > option')
    .should('have.length', 8)
  // The 'Siguiente →' button is now visible.
  cy.get('#root button[type="submit"]')
    .should('contain.text', 'Siguiente →')
  
  cy.get('#root button.btn-secondary').click();
  // The modal title is now 'Nuevo Mantenimiento'.
  cy.get('#root div.modal-content h2')
    .should('contain.text', 'Nuevo Mantenimiento')
  // The modal subtitle 'Selecciona el tipo de servicio a registrar' is visible again.
  cy.get('#root div.modal-content p')
    .should('contain.text', 'Selecciona el tipo de servicio a registrar')
  // The 'Cancelar' button is visible.
  cy.get('#root div.modal-actions')
    .should('contain.text', 'Cancelar')
  
  cy.get('#root div:nth-child(3) button:nth-child(2)').click();
  // The 'Equipo' label is now visible.
  cy.get('#root form > div:nth-child(1) > label')
    .should('contain.text', 'Equipo')
  // A select input for 'Equipo' is now visible.
  cy.get('#root div:nth-child(1) > select > option')
    .should('have.length', 11)
  // A select input for 'Equipo' is now visible.
  cy.get('#root div:nth-child(1) > select')
    .should('have.attr', 'required')
  // A textarea for 'Descripción de la falla' is now visible.
  cy.get('#root textarea')
    .should('have.attr', 'required')
  // An input field for 'Causa de la falla' is now visible.
  cy.get('#root input[placeholder="Ej. Sobrecalentamiento, cortocircuito, desgaste..."]')
    .should('have.value', '')
  // The 'Prioridad' label is now visible.
  cy.get('#root div:nth-child(4) > label')
    .should('contain.text', 'Prioridad')
  // The 'Crear Ticket' button is now visible.
  cy.get('#root button[type="submit"]')
    .should('contain.text', 'Crear Ticket')
  // The modal title is now 'Registrar Ticket Correctivo'.
  cy.get('#root div.modal-content > div:nth-child(1)')
    .should('contain.text', 'Registrar Ticket Correctivo')
  
  cy.get('#root button.btn-secondary').click();
  // The modal title is now 'Nuevo Mantenimiento'.
  cy.get('#root div.modal-content h2')
    .should('contain.text', 'Nuevo Mantenimiento')
  // The modal subtitle 'Selecciona el tipo de servicio a registrar' is visible again.
  cy.get('#root div.modal-content p')
    .should('contain.text', 'Selecciona el tipo de servicio a registrar')
  // The 'Cancelar' button is visible.
  cy.get('#root div.modal-actions')
    .should('contain.text', 'Cancelar')
  
  cy.get('#root button.btn-secondary').click();
});