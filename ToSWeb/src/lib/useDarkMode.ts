import { useEffect, useState } from 'react';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    console.log('Setting dark mode:', isDarkMode); // Debug log
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark');
      console.log('Added data-theme=dark to:', root); // Debug log
    } else {
      root.removeAttribute('data-theme');
      console.log('Removed data-theme from:', root); // Debug log
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    console.log('Toggle clicked, current isDarkMode:', isDarkMode); // Debug log
    setIsDarkMode(!isDarkMode);
  };

  return { isDarkMode, toggleDarkMode };
};