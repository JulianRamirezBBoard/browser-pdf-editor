module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss)$': '<rootDir>/tests/mocks/fileMock.cjs',
    '\\.(png|jpg|jpeg|gif|svg)$': '<rootDir>/tests/mocks/fileMock.cjs',
    // Vite's `?url` asset imports (e.g. the pdf.js worker) resolve to a string.
    '\\?url$': '<rootDir>/tests/mocks/fileMock.cjs',
  },
  transformIgnorePatterns: ['/node_modules/(?!(pdfjs-dist)/)'],
}
