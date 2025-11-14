// Theme initialization script
// This should be run as early as possible in the app lifecycle
// to prevent flash of unstyled content (FOUC)

export function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  const root = document.documentElement;
  
  if (savedTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  
  return savedTheme;
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  initializeTheme();
}
