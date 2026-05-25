const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: '.',
    include: ['src/tests/**/*.test.js'],
    setupFiles: [],
    server: {
      deps: {
        interopDefault: false,
      },
    },
  },
  resolve: {
    // Ensure CommonJS resolution works
    conditions: ['node', 'require'],
  },
});
