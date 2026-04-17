const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4001";

// Types
export interface Market {
  id: number;
  title: string;
  description?: string;
  status: "active" | "resolved" | "archived";
  creator?: string;
  outcomes: MarketOutcome[];
  totalMarketBets: number;
  participantCount?: number;
}

export interface MarketOutcome {
  id: number;
  title: string;
  odds: number;
  totalBets: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  balance: number;
  role: "user" | "admin";
  token: string;
}

export interface Bet {
  id: number;
  userId: number;
  marketId: number;
  outcomeId: number;
  amount: number;
  createdAt: string;
  market: Market;
  outcome: MarketOutcome;
  won?: boolean;
}

export interface ProfileResponse {
  user: {
    id: number;
    username: string;
    email: string;
    balance: number;
    role: "user" | "admin";
    apiKey?: string;
  };
  activeBets: Bet[];
  resolvedBets: Bet[];
}

export interface LeaderboardUser {
  id: number;
  username: string;
  balance: number;
  totalWinnings: number;
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeader() {
    const token = localStorage.getItem("auth_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  private async request(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // If there are validation errors, throw them
      if (data.errors && Array.isArray(data.errors)) {
        const errorMessage = data.errors
          .map((e: any) => `${e.field}: ${e.message}`)
          .join(", ");
        throw new Error(errorMessage);
      }
      throw new Error(data.error || `API Error: ${response.status}`);
    }

    return data ?? {};
  }

  // Auth endpoints
  async register(
    username: string,
    email: string,
    password: string,
  ): Promise<User> {
    return this.request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
  }

  async login(email: string, password: string): Promise<User> {
    return this.request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async me(): Promise<User> {
    return this.request("/api/auth/me");
  }

  async getProfile(activePage = 1, resolvedPage = 1): Promise<ProfileResponse> {
    return this.request(
      `/api/auth/profile?activePage=${activePage}&resolvedPage=${resolvedPage}`,
    );
  }

  async getLeaderboard(): Promise<LeaderboardUser[]> {
    return this.request("/api/auth/leaderboard");
  }

  async generateApiKey(): Promise<{ apiKey: string }> {
    return this.request("/api/auth/api-key", {
      method: "POST",
    });
  }

  // Markets endpoints
  async listMarkets(
    status: "active" | "resolved" | "archived" = "active",
    sort = "createdAt",
    page = 1,
  ): Promise<Market[]> {
    return this.request(
      `/api/markets?status=${status}&sort=${sort}&page=${page}`,
    );
  }

  async getMarket(id: number): Promise<Market> {
    return this.request(`/api/markets/${id}`);
  }

  async createMarket(
    title: string,
    description: string,
    outcomes: string[],
  ): Promise<Market> {
    return this.request("/api/markets", {
      method: "POST",
      body: JSON.stringify({ title, description, outcomes }),
    });
  }

  async resolveMarket(
    id: number,
    action: "resolve" | "archive",
    outcomeId?: number,
  ): Promise<{ message: string }> {
    return this.request(`/api/markets/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ action, outcomeId }),
    });
  }

  // Bets endpoints
  async placeBet(
    marketId: number,
    outcomeId: number,
    amount: number,
  ): Promise<Bet> {
    return this.request(`/api/markets/${marketId}/bets`, {
      method: "POST",
      body: JSON.stringify({ outcomeId, amount }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
