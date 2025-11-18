import { useEffect, useState, Fragment } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, getSubcategories } from "@/services/insights";
import type { Category, Subcategory } from "@/types/insights";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryDetailSheet } from "@/components/category-detail-sheet";

interface CategoriesViewProps {
  configId: string;
}

interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
  colorHue: number;
}

// Generate distinct colors for categories
const generateCategoryColors = (count: number): number[] => {
  const colors: number[] = [];
  const goldenRatio = 0.618033988749895;
  let hue = Math.random();

  for (let i = 0; i < count; i++) {
    colors.push(Math.floor(hue * 360));
    hue += goldenRatio;
    hue %= 1;
  }

  return colors;
};

export function CategoriesView({ configId }: CategoriesViewProps) {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch categories and subcategories in parallel
        const [categoriesData, subcategoriesData] = await Promise.all([
          getCategories(configId),
          getSubcategories(configId),
        ]);

        // Generate colors for categories
        const colors = generateCategoryColors(categoriesData.length);

        // Build category tree
        const categoriesWithSubs: CategoryWithSubcategories[] = categoriesData.map((cat, idx) => ({
          ...cat,
          colorHue: colors[idx],
          subcategories: subcategoriesData
            .filter((sub) => sub.category_id === cat.key)
            .sort((a, b) => b.conversation_count - a.conversation_count),
        }));

        // Sort by conversation count descending
        categoriesWithSubs.sort((a, b) => b.conversation_count - a.conversation_count);

        setCategories(categoriesWithSubs);

        // Default all categories to expanded
        setExpandedCategories(new Set(categoriesWithSubs.map((c) => c.key)));
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [configId]);

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.add(categoryKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="border border-border/50 rounded-lg overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (categories.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">
          No categories found for this insight
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">Categories</h2>
        <span className="text-xs text-muted-foreground">
          {categories.length}
        </span>
      </div>

      <div className="border border-border/50 rounded-lg overflow-hidden bg-white">
        <div className="divide-y divide-border/30">
          {categories.map((category) => (
            <Fragment key={`category-${category.key}`}>
              {/* Category Row */}
              <div
                className="group hover:bg-accent/20 cursor-pointer transition-all duration-150"
                onClick={() => {
                  setSelectedCategory(category);
                  setSelectedSubcategory(null);
                  setSheetOpen(true);
                }}
              >
                <div className="flex items-center gap-6 px-3 py-2.5">
                  {/* Chevron */}
                  <button
                    className="shrink-0 h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(category.key);
                    }}
                  >
                    {expandedCategories.has(category.key) ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {/* Name */}
                  <div className="shrink-0 w-64">
                    <span className="text-sm font-medium text-foreground">
                      {category.name}
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted-foreground/70 line-clamp-2 leading-relaxed">
                      {category.summary}
                    </p>
                  </div>

                  {/* Bar Chart + Stats */}
                  <div className="shrink-0 flex items-center gap-3 w-80">
                    {/* Bar */}
                    <div className="w-40 h-6 bg-muted/50 rounded-sm overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${category.frequency_pct}%`,
                          backgroundColor: `hsl(${category.colorHue}, 70%, 65%)`,
                        }}
                      />
                    </div>

                    {/* Count */}
                    <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                      {category.conversation_count} conv{category.conversation_count !== 1 ? 's' : ''}
                    </span>

                    {/* Percentage */}
                    <span className="text-xs font-medium tabular-nums w-12 text-right">
                      {category.frequency_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Subcategories */}
              {expandedCategories.has(category.key) &&
                category.subcategories.map((subcategory) => {
                  // Calculate relative percentage to total conversations
                  const relativePercentage = (subcategory.frequency_pct * category.frequency_pct) / 100;

                  return (
                    <div
                      key={`subcategory-${subcategory.key}`}
                      className="group bg-muted/20 hover:bg-muted/40 cursor-pointer transition-all duration-150"
                      onClick={() => {
                        setSelectedCategory(category);
                        setSelectedSubcategory(subcategory);
                        setSheetOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-6 px-3 py-2.5 pl-11">
                        {/* Name (indented) */}
                        <div className="shrink-0 w-64">
                          <span className="text-sm text-muted-foreground">
                            └ {subcategory.name}
                          </span>
                        </div>

                        {/* Summary */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground/60 line-clamp-2 leading-relaxed">
                            {subcategory.summary}
                          </p>
                        </div>

                        {/* Bar Chart + Stats */}
                        <div className="shrink-0 flex items-center gap-3 w-80">
                          {/* Bar */}
                          <div className="w-40 h-6 bg-muted/50 rounded-sm overflow-hidden">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${relativePercentage}%`,
                                backgroundColor: `hsl(${category.colorHue}, 60%, 75%)`,
                              }}
                            />
                          </div>

                          {/* Count */}
                          <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">
                            {subcategory.conversation_count} conv{subcategory.conversation_count !== 1 ? 's' : ''}
                          </span>

                          {/* Percentage */}
                          <span className="text-xs font-medium tabular-nums w-12 text-right">
                            {relativePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Detail Sheet */}
      <CategoryDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedCategory}
        subcategory={selectedSubcategory}
      />
    </div>
  );
}
