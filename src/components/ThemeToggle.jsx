import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  console.log('🌙 ThemeToggle component loaded');
  const [theme, setTheme] = useState('light');

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  // Apply theme to document root
  const applyTheme = (newTheme) => {
    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  // Toggle theme
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn bg-card text-foreground flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all border-border hover:border-primary"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <>
          <Sun className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">Dark Mode</span>
        </>
      )}
    </button>
  );
}
