export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/TEST/setupTests.js'],
  testMatch: [
    '<rootDir>/TEST/**/*.test.(js|jsx|ts|tsx)',
    '<rootDir>/TEST/**/*.spec.(js|jsx|ts|tsx)'
  ],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/TEST/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['js', 'jsx', 'json'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/main.jsx',
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}'
  ]
};