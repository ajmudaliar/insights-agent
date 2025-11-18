# Frontend Rebuild TODO

After refactoring the backend to use LLM-based hierarchical categorization (Phase 3.1-3.4), the frontend needs to be rebuilt to work with the new table structure.

## New Backend Table Structure

### Tables Created:
1. **CategoriesTable** - Top-level categories discovered from conversations
   - Fields: `key`, `config_id`, `name`, `summary`, `representative_indices`, `conversation_count`, `frequency_pct`

2. **SubcategoriesTable** - Subcategories within each category
   - Fields: `key`, `config_id`, `category_id`, `name`, `summary`, `representative_indices`, `conversation_count`, `frequency_pct`

3. **ConversationCategoriesTable** - Maps conversations to categories/subcategories with confidence
   - Fields: `key`, `config_id`, `conversation_id`, `category_id`, `category_index`, `category_confidence`, `category_reasoning`, `subcategory_id`, `subcategory_index`, `subcategory_confidence`, `subcategory_reasoning`

4. **ConversationFeaturesTable** - Extracted features and transcripts
   - Fields: `key`, `config_id`, `primary_user_intent`, `specific_features`, `conversation_outcome`, `key_topics`, `attributes`, `semantic_string`, `transcript`

### Tables Removed:
- **ClusteringResultsTable** - Old scikit-learn clustering results (replaced by above)

---

## Components Deleted (Need Rebuild)

### 1. `categories-table.tsx`
**What it did:**
- Displayed top-level categories/topics from old ClusteringResultsTable
- Showed category name, description, conversation count, percentage
- Clickable to open detail sheet

**Needs rebuild:**
- Query CategoriesTable instead
- Display category stats (conversation_count, frequency_pct)
- Click to open new detail view

---

### 2. `category-detail-sheet.tsx`
**What it did:**
- Side sheet showing category details
- Listed subcategories within the category
- Showed conversations in each subcategory
- Used old taxonomy structure from ClusteringResultsTable

**Needs rebuild:**
- Query SubcategoriesTable for the selected category
- Query ConversationCategoriesTable to get conversations
- Show both category_confidence and subcategory_confidence
- Display category_reasoning and subcategory_reasoning
- Show conversation features (intent, outcome, topics)

---

### 3. `insight-detail.tsx` (Page)
**What it did:**
- Main detail view for an insight
- Displayed overall stats from cluster_stats
- Rendered categories table
- Opened category detail sheets

**Needs rebuild:**
- Calculate stats from CategoriesTable + ConversationCategoriesTable
- Show total categories, subcategories, conversations
- Render new categories table component
- Show confidence distribution/quality metrics

---

## Services to Add (`services/insights.ts`)

Add the following query functions:

```typescript
// Get all categories for a config
getCategories(configId: string): Promise<Category[]>

// Get subcategories (optionally filtered by category)
getSubcategories(configId: string, categoryId?: string): Promise<Subcategory[]>

// Get conversation assignments with confidence/reasoning
getConversationCategories(configId: string): Promise<ConversationCategory[]>

// Get extracted features for conversations
getConversationFeatures(configId: string): Promise<ConversationFeatures[]>

// Get category with nested subcategories
getCategoryWithSubcategories(configId: string, categoryId: string): Promise<CategoryWithSubcategories>

// Get conversations for a category
getConversationsForCategory(configId: string, categoryId: string): Promise<string[]>

// Get conversations for a subcategory
getConversationsForSubcategory(configId: string, subcategoryId: string): Promise<string[]>
```

---

## Types to Add (`types/insights.ts`)

```typescript
// Category from CategoriesTable
type Category = {
  id: number;
  key: string;
  config_id: string;
  name: string;
  summary: string;
  representative_indices: number[];
  conversation_count: number;
  frequency_pct: number;
  createdAt: string;
  updatedAt: string;
}

// Subcategory from SubcategoriesTable
type Subcategory = {
  id: number;
  key: string;
  config_id: string;
  category_id: string;
  name: string;
  summary: string;
  representative_indices: number[];
  conversation_count: number;
  frequency_pct: number;
  createdAt: string;
  updatedAt: string;
}

// Conversation assignment from ConversationCategoriesTable
type ConversationCategory = {
  id: number;
  key: string;
  config_id: string;
  conversation_id: string;
  category_id: string;
  category_index: number;
  category_confidence: number;
  category_reasoning: string;
  subcategory_id?: string;
  subcategory_index?: number;
  subcategory_confidence?: number;
  subcategory_reasoning?: string;
  createdAt: string;
  updatedAt: string;
}

// Conversation features from ConversationFeaturesTable
type ConversationFeatures = {
  id: number;
  key: string;
  config_id: string;
  primary_user_intent: string;
  specific_features: Record<string, string[]>;
  conversation_outcome: "satisfied" | "unsatisfied" | "unclear";
  key_topics: string[];
  attributes: Record<string, any>;
  semantic_string: string;
  transcript: string;
  createdAt: string;
  updatedAt: string;
}

// Composed type for detail views
type CategoryWithSubcategories = {
  category: Category;
  subcategories: Subcategory[];
  conversations: {
    assignment: ConversationCategory;
    features: ConversationFeatures;
  }[];
}
```

---

## Components That Likely Still Work

These components probably don't need changes:
- ✅ `dashboard.tsx` - List view (just needs updated queries)
- ✅ `create-insight-sheet.tsx` - Create new insights
- ✅ `insight-card.tsx` - Card display
- ✅ `conversation-detail.tsx` - Shows individual conversation
- ✅ `insight-detail-header.tsx` - Header component
- ✅ All UI components in `components/ui/`

---

## Rebuild Priority

1. **Types** - Define new TypeScript types first
2. **Services** - Add query functions to fetch new data
3. **Dashboard** - Update to show insights with new structure
4. **Insight Detail Page** - Main view with categories
5. **Categories Table** - List of categories
6. **Category Detail Sheet** - Drill-down view with subcategories

---

## Key Improvements in New Structure

1. **Two-level confidence tracking** - Both category and subcategory confidence/reasoning
2. **Richer features** - Full transcripts + extracted features stored
3. **Better queryability** - Separate tables for categories, subcategories, assignments
4. **Quality metrics** - Can analyze confidence distributions, low-confidence assignments
5. **Hierarchical** - Clear parent-child relationships

---

## Notes

- Old clustering service (Python FastAPI) is still in codebase but not used by new workflows
- Can be removed or kept for experiments
- New workflows (Phase 3.1-3.4) use pure LLM-based categorization
- Master workflow now runs complete pipeline: Phase 0 → 1 → 2 → 3
