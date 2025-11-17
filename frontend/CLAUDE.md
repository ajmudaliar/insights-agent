# Insights Agent Frontend

## Project Overview

This is the frontend interface for the Insights Agent - a LangSmith-inspired conversation insights system built with Botpress ADK. The frontend provides an interface to:

- Configure and run analysis workflows (4-phase pipeline)
- View conversation insights, categories, and reports
- Interact with the Botpress bot for conversation data
- Visualize hierarchical categorization and metrics

**Backend:** Botpress ADK agent (see `/bot` directory)
**Frontend Stack:** React + Vite + TypeScript + shadcn/ui

---

## Frontend Design Philosophy

### Use the Frontend Design Plugin

**IMPORTANT:** This project uses the **Frontend Design Plugin** for all UI development. When creating components, pages, or interfaces:

1. The plugin will guide you to create distinctive, production-grade frontends
2. Follow the aesthetic guidelines below to avoid generic AI design patterns

### Aesthetic Guidelines

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design, this creates what users call the "AI slop" aesthetic. Avoid this: make creative, distinctive frontends that surprise and delight. Focus on:

**Typography:** Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.

**Color & Theme:** Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.

**Motion:** Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.

**Backgrounds:** Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

**Avoid generic AI-generated aesthetics:**

- Overused font families (Inter, Roboto, Arial, system fonts)
- Clich�d color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

**Source:** [Claude Cookbooks - Prompting for Frontend Aesthetics](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb)

---

## Technical Stack

### Core Technologies

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **shadcn/ui** - Component library (Radix UI + Tailwind CSS)
- **Botpress Client** - For interacting with the Insights Agent bot

### Component Library: shadcn/ui

Use **shadcn components** as the foundation for UI elements. shadcn provides:

- Accessible components built on Radix UI
- Customizable with Tailwind CSS
- Copy-paste components (not an npm package)
- Full control over component code

**Installed components:** A comprehensive set of shadcn/ui components are already installed in `src/components/ui/`, including forms, data display, navigation, overlays, and more. Additional components can be installed as needed with `npx shadcn@latest add [component-name]`.

**Customization:** Feel free to modify shadcn components to match the unique aesthetic. Don't just use them as-is - make them distinctive!

---

## Botpress Client Integration

### Setup

Create a `.env` file with your Personal Access Token (PAT):

```bash
# .env
VITE_BOTPRESS_PAT=bp_pat_...
```

Get your PAT from: https://app.botpress.cloud/settings/access-tokens

### Client Configuration

Create a client setup file in `src/lib/botpress-client.ts`:

```typescript
import { Client } from "@botpress/client";

const API_BASE_URL = "https://api.botpress.cloud";

/**
 * Get the Botpress API client
 *
 * The PAT (Personal Access Token) is read from VITE_BOTPRESS_PAT environment variable.
 */
export function getBotpressClient({
  botId,
  workspaceId
}: {
  botId?: string;
  workspaceId?: string
}) {
  const pat = import.meta.env.VITE_BOTPRESS_PAT;

  if (!pat) {
    throw new Error("VITE_BOTPRESS_PAT not set. Please add it to your .env file.");
  }

  return new Client({
    apiUrl: API_BASE_URL,
    token: pat,
    workspaceId,
    botId,
  });
}
```

### Working with Tables (Reading Data)

Use `client.findTableRows()` to query tables:

```typescript
// Example: Get all configs
const result = await client.findTableRows({
  table: "InsightsConfigsTable",
  limit: 100,
});

const configs = result.rows;
```

**With filters:**

```typescript
// Example: Get summaries for a specific config
const result = await client.findTableRows({
  table: "ConversationSummariesTable",
  filter: {
    configId: "cfg_123",
  },
  limit: 1000,
});
```

**With date range filters:**

```typescript
// Example: Get conversations within a time range
const result = await client.findTableRows({
  table: "ConversationSummariesTable",
  filter: {
    conversationLastActiveAt: {
      $gte: startDate,
      $lte: endDate
    },
  },
  limit: 1000,
});
```

**Type the results:**

```typescript
type ConversationSummary = {
  conversationId: string;
  configId: string;
  summary: string;
  // ... other fields
};

const result = await client.findTableRows({
  table: "ConversationSummariesTable",
  filter: { configId },
  limit: 1000,
});

const summaries = result.rows as unknown as ConversationSummary[];
```

### Working with Tables (Deleting Data)

Use `client.deleteTableRows()` to delete table rows:

```typescript
// Delete all rows matching a filter
await client.deleteTableRows({
  table: "InsightsConfigsTable",
  filter: { configId: "cfg_123" },
});
```

### Triggering Workflows

Use `client.getOrCreateWorkflow()` to trigger workflows and poll for completion:

```typescript
export async function generateConfig(input: {
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
}): Promise<{ configId: string }> {
  // Trigger the workflow
  let { workflow } = await client.getOrCreateWorkflow({
    name: "step1_generate_config",
    status: "pending",
    tags: { configType: "insights" },
    input,
  });

  // Poll until completion
  while (
    workflow.status !== "cancelled" &&
    workflow.status !== "completed" &&
    workflow.status !== "failed" &&
    workflow.status !== "timedout"
  ) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const updatedOutput = await client.getWorkflow({ id: workflow.id });
    workflow = updatedOutput.workflow;
  }

  // Handle errors
  if (workflow.status === "failed" || workflow.status === "timedout") {
    const errorMessage =
      "error" in workflow &&
      workflow.error &&
      typeof workflow.error === "object" &&
      "message" in workflow.error
        ? String(workflow.error.message)
        : "Unknown error";
    throw new Error(`Workflow ${workflow.status}: ${errorMessage}`);
  }

  // Return the output
  return workflow.output as { configId: string };
}
```

### Service Layer Pattern

Organize your Botpress client calls in service files:

```
src/services/
├── configs.ts       # Phase 1: Config operations
├── summaries.ts     # Phase 2: Summary operations
├── categories.ts    # Phase 3: Category operations
└── reports.ts       # Phase 4: Report operations
```

**Example service file (`src/services/configs.ts`):**

```typescript
import { getBotpressClient } from "@/lib/botpress-client";
import { botId, workspaceId } from "@/config";

const client = getBotpressClient({ botId, workspaceId });

export type InsightsConfig = {
  configId: string;
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
  created_at: string;
};

export async function listConfigs(): Promise<InsightsConfig[]> {
  const result = await client.findTableRows({
    table: "InsightsConfigsTable",
    limit: 1000,
  });

  return result.rows as unknown as InsightsConfig[];
}

export async function generateConfig(input: {
  agent_description: string;
  analytical_question: string;
  trace_structure: string;
}): Promise<{ configId: string }> {
  let { workflow } = await client.getOrCreateWorkflow({
    name: "step1_generate_config",
    status: "pending",
    input,
  });

  // Poll for completion (see workflow pattern above)
  // ...

  return workflow.output as { configId: string };
}
```

### Best Practices

1. **Environment Variables:** Always use env variables for PAT, never hardcode credentials
2. **Type Safety:** Create TypeScript types for all table rows and workflow outputs
3. **Error Handling:** Always handle workflow failures and timeouts
4. **Service Layer:** Keep Botpress client calls in service files, not components
5. **Polling:** When polling workflows, add reasonable timeouts (e.g., max 5 minutes)
6. **Loading States:** Show loading indicators during workflow execution

---

## Resources

- [Botpress Documentation](https://botpress.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [React 19 Documentation](https://react.dev/)
- [Vite Documentation](https://vite.dev/)
- [Claude Cookbooks - Frontend Aesthetics](https://github.com/anthropics/claude-cookbooks/blob/main/coding/prompting_for_frontend_aesthetics.ipynb)
- [Backend README](../README.md) - Insights Agent backend details

---

## Notes for Claude Code

- **Always use the Frontend Design Plugin** (`frontend-design:frontend-design`) when building UI
- **Prioritize distinctive aesthetics** - avoid generic patterns
- **Use shadcn components** as the base, but customize heavily
- **Think about data visualization** - this app is data-heavy
- **Maintain type safety** - use TypeScript throughout
- **Consider performance** - virtualize lists, lazy load, memoize
- **Test as you go** - write tests alongside features
