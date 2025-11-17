/**
 * Botpress bot configuration
 *
 * Update these values to point to your Insights Agent bot.
 * Get these values from your Botpress dashboard.
 */

export const WORKSPACE_ID = import.meta.env.VITE_BOTPRESS_WORKSPACE_ID || "";
export const BOT_ID = import.meta.env.VITE_BOTPRESS_BOT_ID || "";

if (!WORKSPACE_ID || !BOT_ID) {
  console.warn(
    "VITE_BOTPRESS_WORKSPACE_ID and VITE_BOTPRESS_BOT_ID not set. " +
    "Please add them to your .env file."
  );
}
