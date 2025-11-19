// src/components/accessibility/KeyboardShortcutsDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { globalShortcuts, KeyboardShortcutManager } from '@/lib/accessibility';

/**
 * Keyboard Shortcuts Help Dialog
 * Displays all available keyboard shortcuts to users
 */
export function KeyboardShortcutsDialog({ 
  isOpen: externalIsOpen, 
  onOpenChange: externalOnOpenChange 
}: { 
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [shortcuts, setShortcuts] = useState<any[]>([]);

  // Use external control if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = externalOnOpenChange || setInternalIsOpen;

  useEffect(() => {
    // Register help shortcut (? key)
    globalShortcuts.register('show-shortcuts', {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      handler: () => setIsOpen(true),
    });

    // Update shortcuts list
    setShortcuts(globalShortcuts.getShortcuts());

    return () => {
      globalShortcuts.unregister('show-shortcuts');
    };
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-2xl max-h-[80vh] overflow-y-auto"
        aria-labelledby="shortcuts-dialog-title"
        aria-describedby="shortcuts-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="shortcuts-dialog-title">
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription id="shortcuts-dialog-description">
            Use these keyboard shortcuts to navigate and interact with the application more efficiently.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {shortcuts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No keyboard shortcuts registered yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/3">Shortcut</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shortcuts.map((shortcut, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {KeyboardShortcutManager.formatShortcut(shortcut)}
                      </Badge>
                    </TableCell>
                    <TableCell>{shortcut.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="mt-4 p-4 bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Press{' '}
            <Badge variant="outline" className="font-mono mx-1">
              Shift + ?
            </Badge>{' '}
            anytime to view this list of shortcuts.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
