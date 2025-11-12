'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<'theme-light' | 'dark' | 'system'>('dark');

  React.useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setThemeState(isDarkMode ? 'dark' : 'theme-light');
  }, []);

  React.useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList[isDark ? 'add' : 'remove']('dark');
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prevTheme => (prevTheme === 'dark' ? 'theme-light' : 'dark'));
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export function ThemeToggleMenuItem() {
    const [isClient, setIsClient] = React.useState(false)
    const [isDarkMode, setIsDarkMode] = React.useState(false)

    React.useEffect(() => {
        setIsClient(true)
        setIsDarkMode(document.documentElement.classList.contains('dark'))
    }, [])

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark')
        setIsDarkMode(!isDarkMode)
    }

    if (!isClient) {
        return null
    }

    return (
        <DropdownMenuItem onClick={toggleTheme}>
            {isDarkMode ? <Sun className="mr-2" /> : <Moon className="mr-2" />}
            <span>{isDarkMode ? 'Light' : 'Dark'} Mode</span>
        </DropdownMenuItem>
    )
}
