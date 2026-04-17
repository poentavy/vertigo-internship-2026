import {
  sqliteTable,
  text,
  real,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// -- TABLES --

export const usersTable = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    balance: real("balance").notNull().default(1000),
    role: text("role", { enum: ["user", "admin"] })
      .notNull()
      .default("user"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    apiKey: text("api_key").unique(),
  },
  (table) => ({
    usernameIdx: uniqueIndex("users_username_idx").on(table.username),
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
    apiKeyIdx: uniqueIndex("users_api_key_idx").on(table.apiKey),
  }),
);

export const marketsTable = sqliteTable(
  "markets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    description: text("description"),
    status: text("status", { enum: ["active", "resolved", "archived"] })
      .notNull()
      .default("active"),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    resolvedOutcomeId: integer("resolved_outcome_id").references(
      () => marketOutcomesTable.id,
      { onDelete: "set null" },
    ),
  },
  (table) => ({
    createdByIdx: index("markets_created_by_idx").on(table.createdBy),
    statusIdx: index("markets_status_idx").on(table.status),
  }),
);

export const marketOutcomesTable = sqliteTable(
  "market_outcomes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: integer("position").notNull(),
  },
  (table) => ({
    marketIdIdx: index("market_outcomes_market_id_idx").on(table.marketId),
  }),
);

export const betsTable = sqliteTable(
  "bets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    marketId: integer("market_id")
      .notNull()
      .references(() => marketsTable.id, { onDelete: "cascade" }),
    outcomeId: integer("outcome_id")
      .notNull()
      .references(() => marketOutcomesTable.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("bets_user_id_idx").on(table.userId),
    marketIdIdx: index("bets_market_id_idx").on(table.marketId),
    outcomeIdIdx: index("bets_outcome_id_idx").on(table.outcomeId),
  }),
);

// -- RELATIONS --

export const usersRelations = relations(usersTable, ({ many }) => ({
  // A user can create many markets and place many bets
  createdMarkets: many(marketsTable, { relationName: "creator" }),
  bets: many(betsTable, { relationName: "bettor" }),
}));

export const marketsRelations = relations(marketsTable, ({ one, many }) => ({
  // Each market has one creator
  creator: one(usersTable, {
    fields: [marketsTable.createdBy],
    references: [usersTable.id],
    relationName: "creator",
  }),
  // Each market has many outcomes and many bets
  outcomes: many(marketOutcomesTable, { relationName: "market" }),
  bets: many(betsTable, { relationName: "marketBets" }),
  // Each market can have one resolved outcome
  resolvedOutcome: one(marketOutcomesTable, {
    fields: [marketsTable.resolvedOutcomeId],
    references: [marketOutcomesTable.id],
    relationName: "resolvedMarket",
  }),
}));

export const marketOutcomesRelations = relations(
  marketOutcomesTable,
  ({ one, many }) => ({
    // Each outcome belongs to one market
    market: one(marketsTable, {
      fields: [marketOutcomesTable.marketId],
      references: [marketsTable.id],
      relationName: "market",
    }),
    // An outcome can have many bets placed on it
    bets: many(betsTable, { relationName: "outcomeBets" }),
    // An outcome can be the resolution for one market
    resolvedMarket: one(marketsTable, {
      fields: [marketOutcomesTable.id],
      references: [marketsTable.resolvedOutcomeId],
      relationName: "resolvedMarket",
    }),
  }),
);

export const betsRelations = relations(betsTable, ({ one }) => ({
  // Each bet belongs to one user, one market, and one outcome
  bettor: one(usersTable, {
    fields: [betsTable.userId],
    references: [usersTable.id],
    relationName: "bettor",
  }),
  market: one(marketsTable, {
    fields: [betsTable.marketId],
    references: [marketsTable.id],
    relationName: "marketBets",
  }),
  outcome: one(marketOutcomesTable, {
    fields: [betsTable.outcomeId],
    references: [marketOutcomesTable.id],
    relationName: "outcomeBets",
  }),
}));
