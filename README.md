# Insights Agent

[![Botpress ADK](https://img.shields.io/badge/Botpress-ADK-blue)](https://botpress.com/docs/adk)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)

An AI-powered conversation analytics platform that discovers patterns, categorizes user intents, and extracts actionable insights from bot conversations using LLM-based hierarchical analysis.

![Dashboard](./assets/dashboard.png)

## The Problem

You have thousands of bot conversations. Somewhere in there are the answers to critical questions:

- *"What are users frustrated about?"*
- *"What topics are we missing content for?"*
- *"What features are users requesting?"*

Traditional approaches require manually reading transcripts, building keyword rules, or training ML models on labeled data. **Insights Agent takes a different approach**: describe what you're looking for in plain English, and let an LLM discover the patterns for you.

## How It Works

The system operates through a sophisticated **multi-phase pipeline** that transforms raw conversations into structured, hierarchical insights:

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    Phase 0   │    │   Phase 1    │    │   Phase 2    │    │   Phase 3a   │    │   Phase 3b   │
│    Config    │ →  │   Sample     │ →  │   Extract    │ →  │   Discover   │ →  │    Assign    │
│  Translation │    │ Conversations│    │   Features   │    │  Categories  │    │ Hierarchies  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
      NL→JSON          Stratified         10 parallel         Pattern           Confidence +
                       weighting          LLM calls           recognition       reasoning
```

### Phase 0: Natural Language → Structured Config

Describe your analysis in plain English:
- *"I have a documentation bot for a developer platform"*
- *"I want to know what topics users struggle with most"*

The LLM translates this into a structured extraction schema: which features to look for, what attributes to track, and how to focus the categorization.

### Phase 1: Intelligent Sampling

Not all conversations are equally informative. The stratified sampler:

1. **Oversamples** conversations (5× the target)
2. **Buckets by length**: single-turn, short (2-5), medium (6-10), long (11+)
3. **Applies weights**: longer conversations get 2× weight, single-turn gets 0.5×
4. **Samples proportionally** from each bucket

This prevents the analysis from being dominated by "hi/bye" conversations while ensuring diverse coverage.

### Phase 2: Parallel Feature Extraction

For each conversation, the LLM extracts:
- **Primary user intent** - What was the user trying to accomplish?
- **Specific features** - Product mentions, error types, sentiment signals
- **Conversation outcome** - Satisfied, unsatisfied, or unclear
- **Key topics** - What subjects were discussed?
- **Custom attributes** - Domain-specific dimensions you define

Runs **10 concurrent extractions** for throughput. Each conversation gets a **semantic string**—a structured summary optimized for pattern matching:

```
Intent: [configure webhooks] | Features: {errors: [timeout], products: [API]} | Topics: [integration, debugging] | Outcome: unsatisfied
```

### Phase 3: Hierarchical Categorization

This is where it gets interesting. The LLM analyzes all semantic strings to **discover natural categories**—not predefined buckets, but patterns that actually exist in your data.

<img src="./assets/subcategory-detail.png" width="400" align="right" />

**Category Discovery:**
- Analyzes patterns across all conversations
- Generates 2-10 top-level categories
- Each category includes a name (2-4 words) and summary explaining what it represents

**Subcategory Discovery:**
- For each category with sufficient conversations
- Discovers more specific patterns within
- Creates a two-level hierarchy for drill-down analysis

**Assignment with Confidence:**
- Every conversation is assigned with a **confidence score** (0-1)
- LLM provides **reasoning** for each assignment
- Enables filtering low-confidence assignments for review

<br clear="right"/>

### The Dashboard

Explore your insights through an interactive hierarchy:

- **Expandable categories** with conversation counts and frequency percentages
- **Color-coded confidence bars** showing assignment quality
- **Drill-down to subcategories** for granular patterns
- **Full conversation view** with extracted features and LLM reasoning

<img src="./assets/conversation-detail.png" width="350" />

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Dashboard                         │
│            (Radix UI + Tailwind CSS v4 + React 19)              │
└────────────────────────────────┬────────────────────────────────┘
                                 │ Botpress Client SDK
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Insights Agent (Botpress ADK)                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Workflow Engine                       │    │
│  │  master_workflow → phase orchestration (4hr timeout)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │
│  │  Tables  │ │ Sampling │ │ Feature  │ │  Categorization  │    │
│  │  (5 schemas)│ │  Utils   │ │Extraction│ │   (parallel)     │    │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌──────────────┐          ┌──────────────┐
            │  Target Bot  │          │  Claude LLM  │
            │ Conversations│          │   Analysis   │
            └──────────────┘          └──────────────┘
```

### Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, Radix UI, shadcn/ui, Tailwind CSS v4, React Router v7 |
| **Backend** | Botpress ADK, Node.js, TypeScript |
| **AI** | Claude (via Botpress ADK) |
| **Database** | Botpress Tables (5 table schemas) |
| **Processing** | Parallel workflows, stratified sampling, semantic string generation |

## Key Design Decisions

### Why LLM-Based Instead of Traditional ML?

| Aspect | Traditional (k-means, DBSCAN) | LLM-Based (This System) |
|--------|------------------------------|------------------------|
| **Setup** | Feature engineering, embeddings, tuning | Natural language description |
| **Output** | Cluster IDs (Cluster 0, 1, 2...) | Human-readable names + summaries |
| **Explainability** | Centroid distances | Confidence scores + reasoning |
| **Domain adaptation** | Retrain on new data | Inject context via prompt |
| **Cold start** | Needs labeled data | Works immediately |

### Why Semantic Strings?

Instead of running LLM categorization on raw transcripts (expensive, noisy), we:
1. **Extract** structured features first (Phase 2)
2. **Compress** into semantic strings for pattern discovery
3. **Use full transcripts** only for final assignment (accuracy matters there)

This gives us the best of both worlds: efficient pattern discovery + accurate assignment.

### Why Hierarchical (Categories → Subcategories)?

- **Progressive detail**: Start broad ("Integration Issues"), drill into specifics ("OAuth Token Expiration")
- **Manageable scale**: 5-10 top categories, each with 3-5 subcategories
- **Actionable granularity**: Subcategories are specific enough to act on

## Project Structure

```
insights-agent/
├── bot/                          # Botpress ADK backend
│   ├── src/
│   │   ├── tables/              # 5 database schemas
│   │   │   ├── configs.ts       # Analysis configurations
│   │   │   ├── categories.ts    # Discovered categories
│   │   │   ├── subcategories.ts # Nested subcategories
│   │   │   ├── features.ts      # Extracted conversation features
│   │   │   └── assignments.ts   # Category assignments + confidence
│   │   ├── workflows/           # Multi-phase pipeline
│   │   │   ├── master-workflow.ts
│   │   │   ├── phase0-config-translation.ts
│   │   │   ├── phase1-sample-*.ts
│   │   │   ├── phase2-extract-semantic-features.ts
│   │   │   └── phase3-*.ts      # Discovery + assignment
│   │   └── utils/
│   │       ├── sampling.ts      # Stratified sampling algorithm
│   │       ├── transcripts.ts   # Conversation formatting
│   │       └── api-client.ts    # Target bot API
│   └── .env.example
│
├── frontend/                    # React dashboard
│   ├── src/
│   │   ├── components/         # Hierarchical UI components
│   │   ├── pages/              # Dashboard, insight detail, conversation view
│   │   └── services/           # Botpress client integration
│   └── .env.example
│
└── docs/                        # Sequence diagrams, API docs
```

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- Botpress account with Personal Access Token

### Backend

```bash
cd bot
pnpm install
cp .env.example .env  # Add your PAT and target bot credentials
pnpm dev              # Development mode with hot reload
```

### Frontend

```bash
cd frontend
pnpm install
cp .env.example .env  # Add your credentials
pnpm dev              # http://localhost:5173
```

## Usage

1. **Create an Insight** - Describe your bot and what you want to learn
2. **Run Analysis** - The pipeline samples, extracts, discovers, and assigns
3. **Explore Results** - Navigate the category hierarchy, drill into conversations
4. **Iterate** - Adjust domain context or guidance, re-run for refined insights

---

Built with [Botpress ADK](https://botpress.com/docs/adk)
