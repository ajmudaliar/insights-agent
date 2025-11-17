import { defineConfig, z } from "@botpress/runtime";
import { config } from 'dotenv';

config()

export default defineConfig({
  name: "bot",
  description: "An AI agent built with Botpress ADK",

  bot: {
    state: z.object({}),
  },

  user: {
    state: z.object({}),
  },
});
