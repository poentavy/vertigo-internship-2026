import { eq, and, desc, asc, sql, count, sum } from "drizzle-orm";
import db from "../db";
import {
  usersTable,
  marketsTable,
  marketOutcomesTable,
  betsTable,
} from "../db/schema";
import {
  hashPassword,
  verifyPassword,
  type AuthTokenPayload,
} from "../lib/auth";
import {
  validateRegistration,
  validateLogin,
  validateMarketCreation,
  validateBet,
} from "../lib/validation";

type JwtSigner = {
  sign: (payload: AuthTokenPayload) => Promise<string>;
};

export async function handleRegister({
  body,
  jwt,
  set,
}: {
  body: { username: string; email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { username, email, password } = body;
  const errors = validateRegistration(username, email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const existingUser = await db.query.usersTable.findFirst({
    where: (users, { or, eq }) =>
      or(eq(users.email, email), eq(users.username, username)),
  });

  if (existingUser) {
    set.status = 409;
    return { errors: [{ field: "email", message: "User already exists" }] };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await db
    .insert(usersTable)
    .values({ username, email, passwordHash })
    .returning();

  const token = await jwt.sign({ userId: newUser[0].id });

  set.status = 201;
  return {
    id: newUser[0].id,
    username: newUser[0].username,
    email: newUser[0].email,
    balance: newUser[0].balance,
    role: newUser[0].role,
    token,
  };
}

export async function handleLogin({
  body,
  jwt,
  set,
}: {
  body: { email: string; password: string };
  jwt: JwtSigner;
  set: { status: number };
}) {
  const { email, password } = body;
  const errors = validateLogin(email, password);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email),
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    set.status = 401;
    return { error: "Invalid email or password" };
  }

  const token = await jwt.sign({ userId: user.id });

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    role: user.role,
    token,
  };
}

export async function handleMe({
  user,
}: {
  user: typeof usersTable.$inferSelect;
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    balance: user.balance,
    role: user.role,
    apiKey: user.apiKey,
  };
}

export async function handleGenerateApiKey({
  user,
}: {
  user: typeof usersTable.$inferSelect;
}) {
  const newApiKey = crypto.randomUUID();

  await db
    .update(usersTable)
    .set({ apiKey: newApiKey })
    .where(eq(usersTable.id, user.id));

  return { apiKey: newApiKey };
}

export async function handleCreateMarket({
  body,
  set,
  user,
}: {
  body: { title: string; description?: string; outcomes: string[] };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const { title, description, outcomes } = body;
  const errors = validateMarketCreation(title, description || "", outcomes);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  const market = await db
    .insert(marketsTable)
    .values({
      title,
      description: description || null,
      createdBy: user.id,
    })
    .returning();

  const outcomeIds = await db
    .insert(marketOutcomesTable)
    .values(
      outcomes.map((title: string, index: number) => ({
        marketId: market[0].id,
        title,
        position: index,
      })),
    )
    .returning();

  set.status = 201;
  return {
    id: market[0].id,
    title: market[0].title,
    description: market[0].description,
    status: market[0].status,
    outcomes: outcomeIds,
  };
}

export async function handleListMarkets({
  query,
}: {
  query: { status?: string; sort?: string; page?: string; limit?: string };
}) {
  const statusFilter = (query.status as any) || "active";
  const sortBy = query.sort || "createdAt";
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const offset = (page - 1) * limit;

  const statsSubquery = db
    .select({
      marketId: betsTable.marketId,
      totalAmount: sum(betsTable.amount).as("total_amount"),
      participantCount: count(sql`DISTINCT ${betsTable.userId}`).as(
        "participant_count",
      ),
    })
    .from(betsTable)
    .groupBy(betsTable.marketId)
    .as("stats");

  let orderBySql;
  switch (sortBy) {
    case "totalBets":
      orderBySql = desc(sql`total_amount`);
      break;
    case "participants":
      orderBySql = desc(sql`participant_count`);
      break;
    case "createdAt":
    default:
      orderBySql = desc(marketsTable.createdAt);
      break;
  }

  const markets = await db
    .select({
      id: marketsTable.id,
      title: marketsTable.title,
      description: marketsTable.description,
      status: marketsTable.status,
      createdAt: marketsTable.createdAt,
      creatorUsername: usersTable.username,
      totalMarketBets: statsSubquery.totalAmount,
      participantCount: statsSubquery.participantCount,
    })
    .from(marketsTable)
    .leftJoin(usersTable, eq(marketsTable.createdBy, usersTable.id))
    .leftJoin(statsSubquery, eq(marketsTable.id, statsSubquery.marketId))
    .where(eq(marketsTable.status, statusFilter))
    .orderBy(orderBySql)
    .limit(limit)
    .offset(offset);

  const enrichedMarkets = await Promise.all(
    markets.map(async (market) => {
      const outcomes = await db.query.marketOutcomesTable.findMany({
        where: eq(marketOutcomesTable.marketId, market.id),
        orderBy: asc(marketOutcomesTable.position),
      });

      const totalMarketBets = Number(market.totalMarketBets || 0);

      const outcomesWithOdds = await Promise.all(
        outcomes.map(async (outcome) => {
          const outcomeBetsResult = await db
            .select({ total: sum(betsTable.amount) })
            .from(betsTable)
            .where(eq(betsTable.outcomeId, outcome.id));

          const outcomeBets = Number(outcomeBetsResult[0]?.total || 0);
          const odds =
            totalMarketBets > 0
              ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2))
              : 0;

          return {
            id: outcome.id,
            title: outcome.title,
            odds,
            totalBets: outcomeBets,
          };
        }),
      );

      return {
        id: market.id,
        title: market.title,
        description: market.description,
        status: market.status,
        creator: market.creatorUsername,
        createdAt: market.createdAt,
        outcomes: outcomesWithOdds,
        totalMarketBets,
        participantCount: Number(market.participantCount || 0),
      };
    }),
  );

  return enrichedMarkets;
}

export async function handleGetMarket({
  params,
  set,
}: {
  params: { id: number };
  set: { status: number };
}) {
  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, params.id),
    with: {
      creator: {
        columns: { username: true },
      },
      outcomes: {
        orderBy: (outcomes, { asc }) => asc(outcomes.position),
      },
    },
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  const betsPerOutcome = await Promise.all(
    market.outcomes.map(async (outcome) => {
      const totalBets = await db
        .select({ total: sum(betsTable.amount) })
        .from(betsTable)
        .where(eq(betsTable.outcomeId, outcome.id));

      const totalAmount = Number(totalBets[0]?.total || 0);
      return { outcomeId: outcome.id, totalBets: totalAmount };
    }),
  );

  const totalMarketBets = betsPerOutcome.reduce(
    (sum, b) => sum + b.totalBets,
    0,
  );

  const participantCountResult = await db
    .select({ count: count(sql`DISTINCT ${betsTable.userId}`) })
    .from(betsTable)
    .where(eq(betsTable.marketId, market.id));

  return {
    id: market.id,
    title: market.title,
    description: market.description,
    status: market.status,
    creator: market.creator?.username,
    outcomes: market.outcomes.map((outcome) => {
      const outcomeBets =
        betsPerOutcome.find((b) => b.outcomeId === outcome.id)?.totalBets || 0;
      const odds =
        totalMarketBets > 0
          ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2))
          : 0;

      return {
        id: outcome.id,
        title: outcome.title,
        odds,
        totalBets: outcomeBets,
      };
    }),
    totalMarketBets,
    participantCount: Number(participantCountResult[0]?.count || 0),
  };
}

export async function handlePlaceBet({
  params,
  body,
  set,
  user,
}: {
  params: { id: number };
  body: { outcomeId: number; amount: number };
  set: { status: number };
  user: typeof usersTable.$inferSelect;
}) {
  const marketId = params.id;
  const { outcomeId, amount } = body;
  const errors = validateBet(amount);

  if (errors.length > 0) {
    set.status = 400;
    return { errors };
  }

  if (user.balance < amount) {
    set.status = 400;
    return { error: "Insufficient balance" };
  }

  const market = await db.query.marketsTable.findFirst({
    where: eq(marketsTable.id, marketId),
  });

  if (!market) {
    set.status = 404;
    return { error: "Market not found" };
  }

  if (market.status !== "active") {
    set.status = 400;
    return { error: "Market is not active" };
  }

  const outcome = await db.query.marketOutcomesTable.findFirst({
    where: and(
      eq(marketOutcomesTable.id, outcomeId),
      eq(marketOutcomesTable.marketId, marketId),
    ),
  });

  if (!outcome) {
    set.status = 404;
    return { error: "Outcome not found" };
  }

  const betResult = await db.transaction(async (tx) => {
    const bet = await tx
      .insert(betsTable)
      .values({
        userId: user.id,
        marketId,
        outcomeId,
        amount: Number(amount),
      })
      .returning();

    await tx
      .update(usersTable)
      .set({ balance: user.balance - amount })
      .where(eq(usersTable.id, user.id));

    return bet[0];
  });

  set.status = 201;
  return {
    id: betResult.id,
    userId: betResult.userId,
    marketId: betResult.marketId,
    outcomeId: betResult.outcomeId,
    amount: betResult.amount,
  };
}

export async function handleGetProfile({
  user,
  query,
  set,
}: {
  user: typeof usersTable.$inferSelect;
  query: { activePage?: string; resolvedPage?: string };
  set: { status: number };
}) {
  try {
    const activePage = Number(query.activePage) || 1;
    const resolvedPage = Number(query.resolvedPage) || 1;
    const limit = 20;

    const activeBetsQuery = db
      .select({ bet: betsTable, market: marketsTable })
      .from(betsTable)
      .innerJoin(marketsTable, eq(betsTable.marketId, marketsTable.id))
      .where(
        and(eq(betsTable.userId, user.id), eq(marketsTable.status, "active")),
      )
      .limit(limit)
      .offset((activePage - 1) * limit)
      .orderBy(desc(betsTable.createdAt));

    const resolvedBetsQuery = db
      .select({ bet: betsTable, market: marketsTable })
      .from(betsTable)
      .innerJoin(marketsTable, eq(betsTable.marketId, marketsTable.id))
      .where(
        and(eq(betsTable.userId, user.id), eq(marketsTable.status, "resolved")),
      )
      .limit(limit)
      .offset((resolvedPage - 1) * limit)
      .orderBy(desc(betsTable.createdAt));

    const [activeBetsRaw, resolvedBetsRaw] = await Promise.all([
      activeBetsQuery,
      resolvedBetsQuery,
    ]);

    const marketIds = [
      ...new Set([
        ...activeBetsRaw.map((r) => r.market.id),
        ...resolvedBetsRaw.map((r) => r.market.id),
      ]),
    ];

    if (marketIds.length === 0) {
      return { user, activeBets: [], resolvedBets: [] };
    }

    const allOutcomes = await db.query.marketOutcomesTable.findMany({
      where: (t, { inArray }) => inArray(t.marketId, marketIds),
    });
    const allBetsForMarkets = await db.query.betsTable.findMany({
      where: (t, { inArray }) => inArray(t.marketId, marketIds),
    });

    const marketDataMap = new Map();
    for (const marketId of marketIds) {
      const outcomes = allOutcomes.filter((o) => o.marketId === marketId);
      const bets = allBetsForMarkets.filter((b) => b.marketId === marketId);
      const totalMarketBets = bets.reduce((sum, b) => sum + b.amount, 0);

      const outcomesWithOdds = outcomes.map((outcome) => {
        const outcomeBets = bets
          .filter((b) => b.outcomeId === outcome.id)
          .reduce((sum, b) => sum + b.amount, 0);
        const odds =
          totalMarketBets > 0
            ? Number(((outcomeBets / totalMarketBets) * 100).toFixed(2))
            : 0;
        return { ...outcome, odds, totalBets: outcomeBets };
      });
      marketDataMap.set(marketId, {
        outcomes: outcomesWithOdds,
        totalMarketBets,
      });
    }

    const activeBets = activeBetsRaw.map(({ bet, market }) => {
      const enrichedData = marketDataMap.get(market.id) || { outcomes: [] };
      return {
        ...bet,
        market: { ...market, ...enrichedData },
        outcome:
          enrichedData.outcomes.find((o: any) => o.id === bet.outcomeId) || {},
      };
    });

    const resolvedBets = resolvedBetsRaw.map(({ bet, market }) => {
      const enrichedData = marketDataMap.get(market.id) || { outcomes: [] };
      const won = market.resolvedOutcomeId === bet.outcomeId;
      return {
        ...bet,
        market: { ...market, ...enrichedData },
        outcome:
          enrichedData.outcomes.find((o: any) => o.id === bet.outcomeId) || {},
        won,
      };
    });

    return { user, activeBets, resolvedBets };
  } catch (err) {
    console.error("Error in handleGetProfile:", err);
    set.status = 500;
    return { error: "Failed to retrieve user profile." };
  }
}

export async function handleGetLeaderboard() {
  const users = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      balance: usersTable.balance,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.balance))
    .limit(50);

  return users.map((u) => ({
    ...u,
    totalWinnings: Math.max(0, u.balance - 1000),
  }));
}

export async function handleResolveMarket({
  params,
  body,
  user,
  set,
}: {
  params: { id: number };
  body: { outcomeId?: number; action: "resolve" | "archive" };
  user: typeof usersTable.$inferSelect;
  set: { status: number };
}) {
  if (user.role !== "admin") {
    set.status = 403;
    return { error: "Admin only" };
  }

  const marketId = params.id;

  try {
    await db.transaction(async (tx) => {
      const market = await tx.query.marketsTable.findFirst({
        where: eq(marketsTable.id, marketId),
        with: { bets: true },
      });

      if (!market) {
        set.status = 404;
        throw new Error("Market not found");
      }

      if (market.status !== "active") {
        set.status = 400;
        throw new Error("Market already resolved or archived");
      }

      if (body.action === "resolve") {
        if (!body.outcomeId) {
          set.status = 400;
          throw new Error("Outcome ID is required for resolution");
        }

        const totalPool = market.bets.reduce((sum, b) => sum + b.amount, 0);
        const winningBets = market.bets.filter(
          (b) => b.outcomeId === body.outcomeId,
        );
        const totalWinningAmount = winningBets.reduce(
          (sum, b) => sum + b.amount,
          0,
        );

        await tx
          .update(marketsTable)
          .set({ status: "resolved", resolvedOutcomeId: body.outcomeId })
          .where(eq(marketsTable.id, marketId));

        if (totalWinningAmount > 0) {
          const payouts = new Map<number, number>();
          for (const bet of winningBets) {
            const share = bet.amount / totalWinningAmount;
            const payout = share * totalPool;
            payouts.set(bet.userId, (payouts.get(bet.userId) || 0) + payout);
          }

          for (const [userId, totalPayout] of payouts.entries()) {
            await tx
              .update(usersTable)
              .set({ balance: sql`${usersTable.balance} + ${totalPayout}` })
              .where(eq(usersTable.id, userId));
          }
        }
      } else if (body.action === "archive") {
        await tx
          .update(marketsTable)
          .set({ status: "archived" })
          .where(eq(marketsTable.id, marketId));

        const refunds = new Map<number, number>();
        for (const bet of market.bets) {
          refunds.set(bet.userId, (refunds.get(bet.userId) || 0) + bet.amount);
        }

        for (const [userId, totalRefund] of refunds.entries()) {
          await tx
            .update(usersTable)
            .set({ balance: sql`${usersTable.balance} + ${totalRefund}` })
            .where(eq(usersTable.id, userId));
        }
      }
    });

    return { message: "Market action completed successfully" };
  } catch (err: any) {
    console.error("Resolution/Archive error:", err);
    if (set.status === 404 || set.status === 400) {
      return { error: err.message };
    }
    set.status = 500;
    return { error: "Internal server error during market action" };
  }
}
