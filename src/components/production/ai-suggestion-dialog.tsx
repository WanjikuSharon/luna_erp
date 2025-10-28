'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { suggestInventoryUpdate, SuggestInventoryUpdateInput, SuggestInventoryUpdateOutput } from '@/ai/flows/suggest-inventory-update';

interface AiSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancyData: SuggestInventoryUpdateInput | null;
}

export function AiSuggestionDialog({
  open,
  onOpenChange,
  discrepancyData,
}: AiSuggestionDialogProps) {
  const [suggestion, setSuggestion] = useState<SuggestInventoryUpdateOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && discrepancyData) {
      const getSuggestion = async () => {
        setIsLoading(true);
        setError(null);
        setSuggestion(null);
        try {
          const result = await suggestInventoryUpdate(discrepancyData);
          setSuggestion(result);
        } catch (e) {
          setError('Failed to get AI suggestion. Please try again.');
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      getSuggestion();
    }
  }, [open, discrepancyData]);

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-primary" />
            AI Inventory Analysis
          </DialogTitle>
          <DialogDescription>
            A discrepancy was detected. Our AI has analyzed the data and provided a suggestion.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Analyzing historical data...</p>
            </div>
          )}
          {error && <p className="text-destructive text-center">{error}</p>}
          {suggestion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold">Discrepancy Details</h4>
                <p className="text-sm text-muted-foreground">
                  {discrepancyData?.rawMaterial}: Expected{' '}
                  <span className="font-bold">{discrepancyData?.expectedQuantityUsed}</span>, Reported{' '}
                  <span className="font-bold">{discrepancyData?.reportedQuantityUsed}</span>
                </p>
              </div>
              <div>
                <h4 className="font-semibold">AI Explanation</h4>
                <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md border">
                  {suggestion.explanation}
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Suggested Update</h4>
                <p className="text-sm text-muted-foreground">
                  The AI recommends updating the inventory quantity to{' '}
                  <span className="font-bold text-primary">{suggestion.suggestedUpdatedQuantity}</span>.
                </p>
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Manual Adjustment
          </Button>
          <Button onClick={handleClose} disabled={isLoading || !!error}>
            Accept Suggestion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
