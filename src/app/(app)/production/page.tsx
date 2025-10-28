
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { rawMaterials, products } from '@/lib/data';
import { AiSuggestionDialog } from '@/components/production/ai-suggestion-dialog';
import type { SuggestInventoryUpdateInput } from '@/ai/flows/suggest-inventory-update';

const formSchema = z.object({
  rawMaterialId: z.string().min(1, 'Please select a raw material.'),
  quantityUsed: z.coerce.number().min(0.1, 'Quantity must be positive.'),
  productId: z.string().min(1, 'Please select a product.'),
  quantityProduced: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

type ProductionFormValues = z.infer<typeof formSchema>;

export default function ProductionPage() {
  const { toast } = useToast();
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [discrepancyData, setDiscrepancyData] = useState<SuggestInventoryUpdateInput | null>(null);

  const form = useForm<ProductionFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawMaterialId: '',
      quantityUsed: 0,
      productId: '',
      quantityProduced: 0,
    },
  });

  function onSubmit(data: ProductionFormValues) {
    // Dummy logic for expected usage
    const expectedQuantityUsed = data.quantityProduced * 0.5; // e.g., 0.5kg of material per product unit
    const discrepancy = data.quantityUsed - expectedQuantityUsed;
    const selectedMaterial = rawMaterials.find(m => m.id === data.rawMaterialId);

    if (Math.abs(discrepancy) > 0.1 && selectedMaterial) {
      // Discrepancy detected
      setDiscrepancyData({
        rawMaterial: selectedMaterial.name,
        reportedQuantityUsed: data.quantityUsed,
        expectedQuantityUsed: expectedQuantityUsed,
        historicalUsageData: 'Normal usage varies by 5-10% due to material cut-offs and occasional defects. Recent batches have been consistent.',
      });
      setIsAiDialogOpen(true);
    } else {
      // No significant discrepancy
      toast({
        title: 'Production Logged',
        description: `Successfully logged production of ${data.quantityProduced} units.`,
      });
      form.reset();
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Log Production</h1>
          <p className="text-muted-foreground">
            Report raw materials used and finished goods produced.
          </p>
        </div>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Production Entry</CardTitle>
            <CardDescription>
              Fill in the details for the latest production run.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="rawMaterialId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Raw Material Used</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rawMaterials.map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                {material.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantityUsed"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Used (in units/kg/liters)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" placeholder="e.g., 10.5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="productId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Finished Product</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="quantityProduced"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity Produced</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit">Log Production & Update Stock</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <AiSuggestionDialog
        open={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        discrepancyData={discrepancyData}
      />
    </>
  );
}

    