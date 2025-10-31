import '@testing-library/jest-dom';

// Mock window.db for tests
global.window = {
  ...global.window,
  db: {
    loadSetting: jest.fn(),
    saveSetting: jest.fn(),
    loadProjects: jest.fn(),
    saveProject: jest.fn(),
    clearProjects: jest.fn(),
    deleteSetting: jest.fn()
  }
};

// Mock window.plugins for tests
global.window.plugins = {
  getAll: jest.fn(),
  getHTML: jest.fn()
};