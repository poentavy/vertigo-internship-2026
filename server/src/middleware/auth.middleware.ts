import { Elysia } from "elysia";
import { getUserById, getUserByApiKey } from "../lib/auth";

export const authMiddleware = new Elysia({ name: "auth-middleware" })
  .derive(async ({ headers, jwt }) => {
    // 1. Try Bearer token
    const authHeader = headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await jwt.verify(token);
      if (payload) {
        const user = await getUserById(payload.userId);
        if (user) return { user };
      }
    }

    // 2. Try API key
    const apiKey = headers["x-api-key"];
    if (apiKey) {
      const user = await getUserByApiKey(apiKey);
      if (user) return { user };
    }

    return { user: null };
  })
  .as("plugin");
