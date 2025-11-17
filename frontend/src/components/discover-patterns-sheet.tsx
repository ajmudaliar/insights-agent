import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle } from "lucide-react";
import { step3GenerateCategories } from "@/services/insights";

const formSchema = z.object({
  minCategorySize: z
    .number()
    .min(1, "Minimum size must be at least 1")
    .max(10, "Cannot exceed 10"),
  maxTopLevelCategories: z
    .number()
    .min(3, "Must have at least 3 categories")
    .max(10, "Cannot exceed 10 categories"),
  maxSubcategoriesPerCategory: z
    .number()
    .min(2, "Must have at least 2 subcategories")
    .max(8, "Cannot exceed 8 subcategories"),
});

type FormData = z.infer<typeof formSchema>;

interface DiscoverPatternsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (categoryCount: number) => void;
  configId: string;
}

export function DiscoverPatternsSheet({
  open,
  onOpenChange,
  onSuccess,
  configId,
}: DiscoverPatternsSheetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      minCategorySize: 3,
      maxTopLevelCategories: 5,
      maxSubcategoriesPerCategory: 4,
    },
  });

  const handleClose = () => {
    if (!isRunning) {
      form.reset();
      setError(null);
      onOpenChange(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsRunning(true);
    setError(null);

    try {
      const result = await step3GenerateCategories({
        configId,
        minCategorySize: data.minCategorySize,
        maxTopLevelCategories: data.maxTopLevelCategories,
        maxSubcategoriesPerCategory: data.maxSubcategoriesPerCategory,
      });

      console.log("Category generation result:", result);

      // Success!
      setIsRunning(false);
      form.reset();
      onSuccess(result.topLevelCategoryCount);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover patterns");
      setIsRunning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Discover Patterns</SheetTitle>
          <SheetDescription>
            Group conversations into categories and subcategories based on patterns.
          </SheetDescription>
        </SheetHeader>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
            <div className="grid flex-1 auto-rows-min gap-6 px-4 mt-6">
              <FormField
                control={form.control}
                name="minCategorySize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Category Size</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        disabled={isRunning}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum conversations needed to generate subcategories (1-10). Default: 3
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxTopLevelCategories"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Categories</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        disabled={isRunning}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Number of top-level categories to create (3-10). Default: 5
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxSubcategoriesPerCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategories Per Category</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="4"
                        disabled={isRunning}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormDescription>
                      Subcategories to create within each category (2-8). Default: 4
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <SheetFooter className="border-t pt-4 mt-6">
              <Button type="submit" disabled={isRunning}>
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  "Start Discovery"
                )}
              </Button>
              <SheetClose asChild>
                <Button type="button" variant="outline" disabled={isRunning}>
                  Cancel
                </Button>
              </SheetClose>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

