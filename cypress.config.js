import { defineConfig } from 'cypress';

export default defineConfig({
  // projectId opcional para Cypress Cloud. Solo se usa con `--record`.
  // Si no vas a grabar, puedes borrar esta línea.
  projectId: 'xhs2sz',

  e2e: {
    baseUrl: 'http://localhost:5173',
    defaultCommandTimeout: 10000,
    viewportWidth: 1280,
    viewportHeight: 800,
    setupNodeEvents(on, config) {
      return config;
    },
  },
});
