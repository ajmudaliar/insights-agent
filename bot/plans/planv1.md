Insights Agent Implementation Plan

Overview

Build a Botpress-based Insights Agent that replicates LangSmith's 6-phase pipeline for analyzing conversation patterns from the
target bot. Uses zai for all LLM operations, workflows for orchestration, and tables for storage.

---

Architecture: 6-Phase Pipeline

Phase 1: Configuration Workflow

Generate analysis configuration from natural language inputs (the "3 prompts" approach).

Workflow: generateInsightsConfig

- Input: agent_description, analytical_question, trace_structure
- Process:
  - Use .with({modelId: 'best'})extract() with schema to generate structured config:
    - analysis_mode: 'usage_patterns' | 'failure_modes'
    - feature_weights: { semantic: 0-1, behavioral: 0-1 }
    - attributes: array of categorical/numerical/boolean attributes
    - summary_prompt: mustache-style template
    - clustering_focus: string describing what to cluster on
- Output: Save config to insightsConfigs table
- Duration: ~30 seconds

Phase 2: Sampling & Summary Workflow

Fetch conversations and generate summaries + extract features.

Workflow: generateConversationSummaries

- Input: configId, maxConversations (≤1000)
- Process:
  a. Fetch conversations using fetchLastNConversations() with stratified sampling
  b. For each conversation: - Fetch messages using fetchLastNMessages()
  - Generate transcript using generateTranscript()
  - Use .with({modelId: 'best'})summarize() with config's summary_prompt
  - Use .with({modelId: 'best'})extract() to extract attributes defined in config
  - Calculate behavioral metrics: turn_count, message_length_avg, response_time
    c. Store in conversationSummaries table
- Output: Array of summaries with features
- Duration: ~5-10 minutes for 1000 conversations

Phase 3: Categorization Workflow

Cluster conversations into hierarchical categories.

Workflow: generateCategories

- Input: configId, summaryIds
- Process:
  a. Load all summaries and config
  b. Apply feature weighting based on analysis_mode
  c. Use .with({modelId: 'best'})label() to generate top-level categories: - Batch summaries (groups of 50-100)
  - Ask zai to identify 3-7 high-level patterns
  - Merge overlapping categories across batches
    d. For each top-level category: - Use .with({modelId: 'best'})label() again to generate 2-5 subcategories
    e. Assign each conversation to category/subcategory using .with({modelId: 'best'})label()
- Output: Save to categories and subcategories tables
- Duration: ~5-10 minutes

Phase 4: Metrics Aggregation Workflow

Calculate statistics for each category/subcategory.

Workflow: aggregateMetrics

- Input: configId
- Process:
  a. Group conversations by category/subcategory
  b. Calculate per group: - Frequency (% of total)
  - Avg turn count
  - Avg response time
  - Common attributes
  - Representative example IDs (3-5 conversations)
    c. Update category/subcategory records with metrics
- Output: Enriched categories with metrics
- Duration: ~1-2 minutes

Phase 5: Report Generation Workflow

Assemble final report with narrative.

Workflow: generateInsightsReport

- Input: configId
- Process:
  a. Load categories, subcategories, and metrics
  b. Use .with({modelId: 'best'})text() to generate executive summary
  c. Use .with({modelId: 'best'})text() to generate insights per category
  d. Format hierarchical report structure
  e. Save to insightsReports table
- Output: Complete report object
- Duration: ~2-3 minutes

Phase 6: Orchestration Workflow

Master workflow that runs all phases sequentially.

Workflow: generateFullInsightsReport

- Input: agent_description, analytical_question, trace_structure, maxConversations
- Process:
  a. Call generateInsightsConfig workflow
  b. Call generateConversationSummaries workflow
  c. Call generateCategories workflow
  d. Call aggregateMetrics workflow
  e. Call generateInsightsReport workflow
- Output: Final report with reportId
- Duration: ~15-30 minutes total

---

Database Schema (Botpress Tables)

Table: insightsConfigs

{
id: string
analysis_mode: 'usage_patterns' | 'failure_modes'
summary_prompt: string
attributes: Array<{name, type, filter_by}>
feature_weights: {semantic: number, behavioral: number}
clustering_focus: string
created_at: timestamp
}

Table: conversationSummaries

{
id: string
configId: string
conversationId: string
summary: string
extracted_attributes: object
behavioral_metrics: {turn_count, avg_message_length, ...}
transcript: string
created_at: timestamp
}

Table: categories

{
id: string
configId: string
name: string
description: string
category_type: 'usage_pattern' | 'error_mode'
frequency_pct: number
avg_turn_count: number
representative_conversation_ids: string[]
created_at: timestamp
}

Table: subcategories

{
id: string
categoryId: string
name: string
description: string
frequency_pct: number
avg_turn_count: number
conversation_ids: string[]
created_at: timestamp
}

Table: insightsReports

{
id: string
configId: string
executive_summary: string
total_conversations_analyzed: number
categories: Array<categoryId>
generated_at: timestamp
status: 'pending' | 'completed' | 'failed'
}

---

Implementation Steps

1.  Define table schemas in src/tables/ (5 tables)
2.  Create utility functions for zai operations in src/utils/zai-helpers.ts
3.  Implement Phase 1 workflow (config generation)
4.  Implement Phase 2 workflow (sampling & summaries)
5.  Implement Phase 3 workflow (categorization)
6.  Implement Phase 4 workflow (metrics aggregation)
7.  Implement Phase 5 workflow (report generation)
8.  Implement Phase 6 workflow (orchestrator)
9.  Create test workflow to run end-to-end with sample data

---

Key Technical Decisions

- Zai methods mapped to phases:
  - .with({modelId: 'best'})extract(): Config generation, attribute extraction
  - .with({modelId: 'best'})summarize(): Conversation summarization
  - .with({modelId: 'best'})label(): Categorization (hierarchical)
  - .with({modelId: 'best'})text(): Report narrative generation
- Workflows handle long-running tasks (30min timeout)
- Rate limiting already in place for API calls
- Stratified sampling prioritizes recent, longer conversations
- Hierarchical clustering via multiple .with({modelId: 'best'})label() calls with context
