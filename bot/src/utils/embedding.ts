import OpenAI from "openai";
import { RateLimiterMemory } from "rate-limiter-flexible";

const openai = new OpenAI();

// Rate limiter: 3000 requests per minute (OpenAI's tier 1 limit for text-embedding-3-small)
// Conservative setting: 50 requests per second = 3000 per minute
const rateLimiter = new RateLimiterMemory({
  points: 50, // Number of requests
  duration: 1, // Per second
});

export const generateEmbedding = async (text: string) => {
  // Apply rate limiting before making the request
  await rateLimiter.consume(1);

  const result = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  const embedding = result.data[0].embedding;
  return embedding;
};
