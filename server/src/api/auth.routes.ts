import { Elysia, t } from "elysia";
import {
  handleRegister,
  handleLogin,
  handleGetProfile,
  handleGetLeaderboard,
  handleMe,
  handleGenerateApiKey,
} from "./handlers";
import { authMiddleware } from "../middleware/auth.middleware";

export const authRoutes = new Elysia({ prefix: "/api/auth" })
  .post("/register", handleRegister, {
    body: t.Object({
      username: t.String(),
      email: t.String(),
      password: t.String(),
    }),
  })
  .post("/login", handleLogin, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
  })
  .use(authMiddleware)
  .get("/profile", handleGetProfile, {
    query: t.Object({
      activePage: t.Optional(t.String()),
      resolvedPage: t.Optional(t.String()),
    }),
  })
  .get("/me", handleMe)
  .post("/api-key", handleGenerateApiKey)
  .get("/leaderboard", handleGetLeaderboard);
