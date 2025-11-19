// src/components/accessibility/AccessibilityMenu.tsx
'use client';

import { useState } from 'react';
import { Accessibility, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface AccessibilityMenuProps {
  onShowShortcuts?: () => void;
}

export function AccessibilityMenu({ onShowShortcuts }: AccessibilityMenuProps) {
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>('normal');

  const increaseFontSize = () => {
    const root = document.documentElement;
    if (fontSize === 'normal') {
      root.style.fontSize = '110%';
      setFontSize('large');
    } else if (fontSize === 'large') {
      root.style.fontSize = '120%';
      setFontSize('larger');
    }
  };

  const decreaseFontSize = () => {
    const root = document.documentElement;
    if (fontSize === 'larger') {
      root.style.fontSize = '110%';
      setFontSize('large');
    } else if (fontSize === 'large') {
      root.style.fontSize = '100%';
      setFontSize('normal');
    }
  };

  const resetFontSize = () => {
    const root = document.documentElement;
    root.style.fontSize = '100%';
    setFontSize('normal');
  };

  const skipToMainContent = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
      mainContent.addEventListener(
        'blur',
        () => {
          mainContent.removeAttribute('tabindex');
        },
        { once: true }
      );
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Accessibility options"
          title="Accessibility options"
        >
          <Accessibility className="h-5 w-5" />
          <span className="sr-only">Accessibility Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Accessibility className="h-4 w-4" />
          Accessibility
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={skipToMainContent}>
          Skip to Main Content
          <Badge variant="outline" className="ml-auto text-xs">
            Tab
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onShowShortcuts}>
          <Keyboard className="mr-2 h-4 w-4" />
          Keyboard Shortcuts
          <Badge variant="outline" className="ml-auto text-xs">
            Shift + ?
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Text Size: {fontSize === 'normal' ? 'Normal' : fontSize === 'large' ? 'Large' : 'Larger'}
        </DropdownMenuLabel>

        <DropdownMenuItem 
          onClick={increaseFontSize}
          disabled={fontSize === 'larger'}
        >
          Increase Text Size
          <Badge variant="outline" className="ml-auto text-xs">
            A+
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={decreaseFontSize}
          disabled={fontSize === 'normal'}
        >
          Decrease Text Size
          <Badge variant="outline" className="ml-auto text-xs">
            A-
          </Badge>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={resetFontSize}
          disabled={fontSize === 'normal'}
        >
          Reset Text Size
          <Badge variant="outline" className="ml-auto text-xs">
            100%
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
