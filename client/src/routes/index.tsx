import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MarketCard } from "@/components/market-card";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

function DashboardPage() {
  const { isAuthenticated, user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"active" | "resolved" | "archived">(
    "active",
  );
  const [sortBy, setSortBy] = useState("createdAt");
  const [page, setPage] = useState(1);

  const loadMarkets = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const data = await api.listMarkets(status, sortBy, page);
        setMarkets(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load markets");
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [status, sortBy, page],
  );

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadMarkets(false);
      refreshUser();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMarkets, refreshUser]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">
            Prediction Markets
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Create and participate in prediction markets
          </p>
          <div className="space-x-4">
            <Button onClick={() => navigate({ to: "/auth/login" })}>
              Login
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/auth/register" })}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <h1
                className="text-xl font-bold text-indigo-600 cursor-pointer"
                onClick={() => navigate({ to: "/" })}
              >
                PredictIt
              </h1>
              <div className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
                <button
                  onClick={() => navigate({ to: "/" })}
                  className="hover:text-indigo-600 px-3 py-2 cursor-pointer"
                >
                  Markets
                </button>
                <button
                  onClick={() => navigate({ to: "/auth/leaderboard" as any })}
                  className="hover:text-indigo-600 px-3 py-2 cursor-pointer"
                >
                  Leaderboard
                </button>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900">
                  ${user?.balance?.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">{user?.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => navigate({ to: "/auth/profile" as any })}
                >
                  Profile
                </Button>
                <Button variant="outline" size="sm" onClick={() => logout()} className="cursor-pointer">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">
              Explore Markets
            </h2>
            <p className="text-slate-500 mt-1">
              Predict the future and win rewards
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/markets/new" })}
            className="w-full md:w-auto cursor-pointer"
          >
            Create New Market
          </Button>
        </div>

        {/* Filters & Sorting */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(["active", "resolved", "archived"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={status === s ? "default" : "ghost"}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className="capitalize cursor-pointer"
                >
                {s}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4 flex-1 justify-end">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500 whitespace-nowrap">
                Sort by:
              </span>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Newest</SelectItem>
                  <SelectItem value="totalBets">Total Volume</SelectItem>
                  <SelectItem value="participants">Participants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => loadMarkets()}
              disabled={isLoading}
              className="h-8 w-8"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 mb-6 flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {/* Markets Grid */}
        {isLoading && page === 1 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card
                key={i}
                className="animate-pulse h-[200px] bg-slate-100 border-none"
              ></Card>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-slate-500 text-lg font-medium">
                No markets found
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Try changing your filters or create a new market!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {markets.map((market) => (
                <MarketCard key={market.id} market={market} />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4 mt-12 ">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1 " /> Previous
              </Button>
              <span className="text-sm font-medium text-slate-600">
                Page {page}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={markets.length < 20}
              >
                Next <ChevronRight className="h-4 w-4 ml-1 cursor-pointer" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: DashboardPage,
});
