import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategories, getSubcategories } from "@/services/insights";
import type { Category, Subcategory } from "@/types/insights";
import { ChevronDown, ChevronRight } from "lucide-react";
import { CategoryDetailSheet } from "@/components/category-detail-sheet";

interface CategoriesTableProps {
  configId: string;
}

interface CategoryWithSubcategories extends Category {
  subcategories: Subcategory[];
}

export function CategoriesTable({ configId }: CategoriesTableProps) {
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
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

        // Fetch both categories and subcategories
        const [categoriesData, subcategoriesData] = await Promise.all([
          getCategories(configId),
          getSubcategories(configId),
        ]);

        // Group subcategories by categoryIndex
        const subcategoriesMap = new Map<number, Subcategory[]>();
        subcategoriesData.forEach((sub) => {
          if (!subcategoriesMap.has(sub.categoryIndex)) {
            subcategoriesMap.set(sub.categoryIndex, []);
          }
          subcategoriesMap.get(sub.categoryIndex)?.push(sub);
        });

        // Sort subcategories by subcategoryIndex within each category
        subcategoriesMap.forEach((subs) => {
          subs.sort((a, b) => a.subcategoryIndex - b.subcategoryIndex);
        });

        // Combine categories with their subcategories
        const combined: CategoryWithSubcategories[] = categoriesData
          .sort((a, b) => a.categoryIndex - b.categoryIndex)
          .map((category) => ({
            ...category,
            subcategories: subcategoriesMap.get(category.categoryIndex) || [],
          }));
        
        setCategories(combined);
        
        // Default all categories to expanded
        setExpandedCategories(new Set(combined.map(c => c.categoryIndex)));
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError("Failed to load categories");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [configId]);

  const toggleCategory = (categoryIndex: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryIndex)) {
        next.delete(categoryIndex);
      } else {
        next.add(categoryIndex);
      }
      return next;
    });
  };

  const handleCategoryClick = (category: CategoryWithSubcategories, e: React.MouseEvent) => {
    // Don't open sheet if clicking on the expand button area
    const target = e.target as HTMLElement;
    if (target.closest('button')) {
      return;
    }
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSheetOpen(true);
  };

  const handleSubcategoryClick = (category: CategoryWithSubcategories, subcategory: Subcategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <div className="border rounded-md overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-none" />
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

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/20">
              <th className="h-8 w-8"></th>
              <th className="h-8 px-3 text-left text-xs font-medium text-muted-foreground">
                Name
              </th>
              <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground w-24">
                Convs
              </th>
              <th className="h-8 px-3 text-right text-xs font-medium text-muted-foreground w-20">
                %
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <>
                <tr
                  key={`cat-${category.id}`}
                  className="border-b last:border-0 hover:bg-accent/50 cursor-pointer"
                  onClick={(e) => handleCategoryClick(category, e)}
                >
                  <td className="h-10 px-2">
                    <button
                      className="h-5 w-5 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category.categoryIndex);
                      }}
                    >
                      {expandedCategories.has(category.categoryIndex) ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="h-10 px-3 font-medium truncate">
                    {category.name}
                  </td>
                  <td className="h-10 px-3 text-right tabular-nums text-muted-foreground">
                    {category.conversationCount}
                  </td>
                  <td className="h-10 px-3 text-right tabular-nums text-muted-foreground text-xs">
                    {category.percentage?.toFixed(0)}%
                  </td>
                </tr>

                {expandedCategories.has(category.categoryIndex) &&
                  category.subcategories.map((subcategory) => (
                    <tr
                      key={`sub-${subcategory.id}`}
                      className="border-b last:border-0 bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleSubcategoryClick(category, subcategory)}
                    >
                      <td className="h-9"></td>
                      <td className="h-9 px-3 pl-10 text-muted-foreground truncate">
                        └ {subcategory.name}
                      </td>
                      <td className="h-9 px-3 text-right tabular-nums text-muted-foreground">
                        {subcategory.conversationCount}
                      </td>
                      <td className="h-9 px-3 text-right tabular-nums text-muted-foreground text-xs">
                        {subcategory.percentage?.toFixed(0)}%
                      </td>
                    </tr>
                  ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryDetailSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        category={selectedCategory}
        subcategory={selectedSubcategory}
      />
    </div>
  );
}

