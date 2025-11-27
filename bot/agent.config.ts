import { defineConfig, z } from "@botpress/runtime";
import { config } from "dotenv";

config();

export default defineConfig({
  name: "bot",
  description: "An AI agent built with Botpress ADK",

  bot: {
    state: z.object({}),
  },

  user: {
    state: z.object({}),
  },
  dependencies: {
    integrations: {
      chat: { version: "chat@0.7.3", enabled: true },
      webchat: { version: "webchat@0.3.0", enabled: true },
    },
  },
});
