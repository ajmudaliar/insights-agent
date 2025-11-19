import { adk, Workflow, z } from "@botpress/runtime";
import { fetchConversationById } from "../utils/conversations/base";
import { fetchLastNMessages } from "../utils/conversations/fetching";
import { generateTranscript } from "../utils/transcript";
import { generateEmbedding } from "../utils/embedding";
import { ConversationFeaturesTable } from "../tables/conversation-features";

export const ExtractSemanticFeatures = new Workflow({
  name: "extract_semantic_features",
  description: "Extract semantic features from conversations based on the provided configuration",
  timeout: "60m",
  input: z.object({
    configId: z.string().describe("Config ID for tracking which config was used"),
    config: z.object({
      summary_prompt: z.string(),
      extract_features: z.array(z.string()),
      attributes: z.array(z.any()),
      clustering_focus: z.string(),
      domain_context: z.string().optional(),
      categorization_guidance: z.string().optional(),
    }),
    conversationIds: z.array(z.string()).describe("List of conversation IDs to process"),
  }),
  output: z.object({
    total_processed: z.number().describe("Total conversations processed"),
    total_included: z.number().describe("Conversations included in results"),
    total_excluded: z.number().describe("Conversations excluded by filter_by attributes"),
    save_to_table_result: z.any(),
  }),
  handler: async ({ input, step }) => {
    const allResults = await step.map(
      "extract-and-save-conversation-features",
      input.conversationIds,
      async (conversationId) => {
        const messages = await fetchLastNMessages(conversationId, 100);
        const transcript = generateTranscript(messages);

        // Build the extraction schema with all required fields
        const extractionSchema = z.object({
          primary_user_intent: z
            .string()
            .describe("The primary intent or goal the user is trying to accomplish in this conversation"),
          specific_features: z
            .object(
              input.config.extract_features.reduce((schema: any, feature: string) => {
                schema[feature] = z.array(z.string()).describe(`List of ${feature} mentioned in the conversation`);
                return schema;
              }, {})
            )
            .describe(`Specific features mentioned: ${input.config.extract_features.join(", ")}`),
          conversation_outcome: z
            .enum(["satisfied", "unsatisfied", "unclear"])
            .describe("Overall outcome of the conversation based on user satisfaction"),
          key_topics: z.array(z.string()).describe("List of key topics discussed in the conversation"),
          attributes: z
            .object(
              input.config.attributes.reduce((schema: any, attr: any) => {
                if (attr.type === "categorical") {
                  schema[attr.name] = z.string().describe(attr.description);
                } else if (attr.type === "numerical") {
                  schema[attr.name] = z.number().describe(attr.description);
                } else if (attr.type === "boolean") {
                  schema[attr.name] = z.boolean().describe(attr.description);
                }
                return schema;
              }, {})
            )
            .describe(
              `User-defined attributes: ${input.config.attributes.map((a: any) => `${a.name} (${a.type})`).join(", ")}`
            ),
        });

        const extractedData = await adk.zai.with({ modelId: "best" }).extract(
          transcript,
          extractionSchema,
          input.config.domain_context ? {
            instructions: `DOMAIN KNOWLEDGE:
${input.config.domain_context}

Use this domain knowledge to better understand the conversation and extract features and attributes accurately. This will help you:
- Recognize domain-specific entities (competitors, products, technical terms, user segments)
- Understand context-specific meanings and terminology
- Accurately categorize and extract information based on domain norms

Now extract the requested features and attributes from the conversation transcript.`
          } : undefined
        );

        // Apply filter attributes - exclude conversation if any filter_by boolean attribute is false
        const shouldExclude = input.config.attributes.some((attr: any) => {
          return attr.type === "boolean" && attr.filter_by === true && extractedData.attributes[attr.name] === false;
        });

        if (shouldExclude) {
          return { excluded: true }; // Mark as excluded
        }

        // Generate semantic string for LLM-based category generation
        // Format: structured and readable for pattern discovery
        const featuresParts: string[] = [];

        // 1. Primary intent - what user is trying to accomplish
        featuresParts.push(`Intent: ${extractedData.primary_user_intent}`);

        // 2. Specific features - with clear labels
        const featuresEntries = Object.entries(extractedData.specific_features)
          .filter(([_, mentions]) => mentions.length > 0)
          .map(([featureType, mentions]) => `${featureType}: [${mentions.join(", ")}]`);
        if (featuresEntries.length > 0) {
          featuresParts.push(`Features: {${featuresEntries.join("; ")}}`);
        }

        // 3. Key topics discussed
        if (extractedData.key_topics.length > 0) {
          featuresParts.push(`Topics: ${extractedData.key_topics.join(", ")}`);
        }

        // 4. Conversation outcome - satisfaction level
        featuresParts.push(`Outcome: ${extractedData.conversation_outcome}`);

        // 5. User-defined attributes - provide full context
        const attributesEntries = Object.entries(extractedData.attributes).map(
          ([attrName, attrValue]) => `${attrName}: ${attrValue}`
        );
        if (attributesEntries.length > 0) {
          featuresParts.push(`Attributes: {${attributesEntries.join(", ")}}`);
        }

        const semanticString = featuresParts.join(" | ");

        // Save to table immediately after extraction
        const saveResult = await ConversationFeaturesTable.upsertRows({
          rows: [
            {
              key: conversationId,
              config_id: input.configId,
              primary_user_intent: extractedData.primary_user_intent,
              specific_features: extractedData.specific_features,
              conversation_outcome: extractedData.conversation_outcome,
              key_topics: extractedData.key_topics,
              attributes: extractedData.attributes,
              semantic_string: semanticString,
              transcript: transcript,
            },
          ],
          keyColumn: "key",
        });

        return {
          excluded: false,
          conversationId,
          errors: saveResult.errors,
          warnings: saveResult.warnings,
        };
      },
      { concurrency: 10, maxAttempts: 2 }
    );

    // Calculate statistics and aggregate save results
    const total_processed = input.conversationIds.length;
    const total_excluded = allResults.filter((r) => r.excluded).length;
    const total_included = total_processed - total_excluded;

    // Aggregate errors and warnings from all saves
    const allErrors = allResults.filter((r) => !r.excluded && r.errors).flatMap((r) => r.errors!);

    const allWarnings = allResults.filter((r) => !r.excluded && r.warnings).flatMap((r) => r.warnings!);

    return {
      total_processed,
      total_included,
      total_excluded,
      save_to_table_result: {
        errors: allErrors.length > 0 ? allErrors : undefined,
        warnings: allWarnings.length > 0 ? allWarnings : undefined,
      },
    };
  },
});
