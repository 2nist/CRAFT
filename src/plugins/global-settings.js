const GLOBAL_SETTINGS_PATH = 'config/global-settings.json';
const LOCAL_STORAGE_KEY = 'craft-tools-hub:global-settings';

const getAppApi = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.app || window.api || null;
};

export async function loadGlobalSettings(defaultValue = {}) {
  const api = getAppApi();

  if (api?.readFile) {
    try {
      const raw = await api.readFile(GLOBAL_SETTINGS_PATH);
      if (!raw) {
        return { ...defaultValue };
      }
      return JSON.parse(raw);
    } catch (error) {
      console.warn('Failed to load global settings from file:', error);
    }
  } else if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (error) {
      console.warn('Failed to read global settings from localStorage:', error);
    }
  }

  return { ...defaultValue };
}

export async function writeGlobalSettings(settings = {}, options = {}) {
  const payload = JSON.stringify(settings ?? {}, null, 2);
  const api = getAppApi();

  if (api?.writeFile) {
    if (options?.backup) {
      try {
        const suffix = typeof options.backup === 'string'
          ? options.backup
          : new Date().toISOString().replace(/[:.]/g, '-');
        await api.writeFile(`config/global-settings.${suffix}.bak.json`, payload);
      } catch (error) {
        console.warn('Failed to write global settings backup:', error);
      }
    }

    await api.writeFile(GLOBAL_SETTINGS_PATH, payload);
    return true;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, payload);
      return true;
    } catch (error) {
      console.warn('Failed to persist global settings to localStorage:', error);
    }
  }

  throw new Error('No persistence mechanism available for global settings');
}
