import { useEffect, useState, useCallback } from "react";
import {
  useParams,
  useNavigate,
  createFileRoute,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Info,
  Wallet,
  Gavel,
  Archive,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

function MarketDetailPage() {
  const { id } = useParams({ from: "/markets/$id" });
  const navigate = useNavigate();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [market, setMarket] = useState<Market | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(
    null,
  );
  const [betAmount, setBetAmount] = useState("");
  const [isBetting, setIsBetting] = useState(false);
  const [isAdminAction, setIsAdminAction] = useState(false);

  const marketId = parseInt(id, 10);

  const loadMarket = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const data = await api.getMarket(marketId);
        setMarket(data);
        if (data.outcomes.length > 0 && !selectedOutcomeId) {
          setSelectedOutcomeId(data.outcomes[0].id);
        }
      } catch (err) {
        if (showLoading) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load market details",
          );
        }
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [marketId, selectedOutcomeId],
  );

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  // Polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadMarket(false);
      refreshUser();
    }, 5000);
    return () => clearInterval(interval);
  }, [loadMarket, refreshUser]);

  const handlePlaceBet = async () => {
    const amount = parseFloat(betAmount);
    if (!selectedOutcomeId || isNaN(amount) || amount <= 0) {
      setError("Please select an outcome and enter a positive bet amount");
      return;
    }

    try {
      setIsBetting(true);
      setError(null);
      await api.placeBet(marketId, selectedOutcomeId, amount);
      setBetAmount("");
      await loadMarket();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place bet");
    } finally {
      setIsBetting(false);
    }
  };

  const handleResolve = async (action: "resolve" | "archive") => {
    try {
      setIsAdminAction(true);
      setError(null);
      await api.resolveMarket(marketId, action, selectedOutcomeId || undefined);
      await loadMarket();
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve market");
    } finally {
      setIsAdminAction(false);
    }
  };

  if (!isAuthenticated) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">
            Loading market analysis...
          </p>
        </div>
      </div>
    );
  }

  if (!market) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() => navigate({ to: "/" })}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  ${user?.balance.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">Balance</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    market.status === "active"
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }
                  variant="outline"
                >
                  {market.status.toUpperCase()}
                </Badge>
                <span className="text-xs text-slate-400">
                  Created by {market.creator}
                </span>
              </div>
              <h1 className="text-4xl font-black text-slate-900 leading-tight">
                {market.title}
              </h1>
              {market.description && (
                <p className="text-lg text-slate-600">{market.description}</p>
              )}
            </div>

            {/* Odds Chart Visualizer */}
            <Card className="overflow-hidden border-none shadow-sm">
              <CardHeader className="bg-slate-900 text-white">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                  Market Probability
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-white rounded-xl p-6 shadow-xl border border-slate-100">
                  <div className="h-8 w-full bg-slate-100 rounded-full overflow-hidden flex mb-6">
                    {market.outcomes.map((outcome, idx) => (
                      <div
                        key={outcome.id}
                        style={{ width: `${outcome.odds}%` }}
                        className={`h-full transition-all duration-1000 ${
                          idx === 0
                            ? "bg-indigo-600"
                            : idx === 1
                              ? "bg-rose-500"
                              : "bg-amber-400"
                        }`}
                      ></div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {market.outcomes.map((outcome, idx) => (
                      <div key={outcome.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              idx === 0
                                ? "bg-indigo-600"
                                : idx === 1
                                  ? "bg-rose-500"
                                  : "bg-amber-400"
                            }`}
                          ></div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {outcome.title}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-slate-900">
                          {outcome.odds}%
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Outcomes Grid */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-600" /> Select Outcome
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {market.outcomes.map((outcome) => (
                  <button
                    key={outcome.id}
                    disabled={market.status !== "active"}
                    onClick={() => setSelectedOutcomeId(outcome.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      selectedOutcomeId === outcome.id
                        ? "border-indigo-600 bg-indigo-50 ring-4 ring-indigo-50"
                        : "border-slate-200 bg-white hover:border-indigo-200"
                    } ${market.status !== "active" ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-slate-900">
                        {outcome.title}
                      </span>
                      <span className="text-indigo-600 font-black">
                        {outcome.odds}%
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-400">
                        Total Bets:{" "}
                        <span className="text-slate-600 font-medium">
                          ${outcome.totalBets}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Betting Card */}
            {market.status === "active" && (
              <Card className="border-none shadow-lg bg-indigo-600 text-white overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="w-5 h-5" /> Place Bet
                  </CardTitle>
                  <CardDescription className="text-white">
                    Enter your prediction amount
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {error && (
                    <div className="p-3 bg-rose-500/20 border border-rose-500/30 rounded-lg text-xs font-medium">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-indigo-100">Prediction</Label>
                    <div className="p-3 bg-indigo-700/50 rounded-lg font-bold border border-indigo-400/30">
                      {market.outcomes.find((o) => o.id === selectedOutcomeId)
                        ?.title || "Select one"}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-indigo-100">Amount ($)</Label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="bg-indigo-700 border-indigo-400 text-white placeholder:text-white focus:ring-white"
                      placeholder="0.00"
                    />
                  </div>
                  <Button
                    onClick={handlePlaceBet}
                    disabled={isBetting || !selectedOutcomeId}
                    className="w-full bg-slate-900 text-white hover:bg-black font-black py-6 text-lg rounded-xl border-none shadow-md cursor-pointer"
                  >
                    {isBetting ? "Confirming..." : "SUBMIT BET"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Market Metadata */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Pool</span>
                  <span className="font-bold text-slate-900">
                    ${market.totalMarketBets}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Participants</span>
                  <span className="font-bold text-slate-900">
                    {market.participantCount || 0}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Admin Controls */}
            {user?.role === "admin" && market.status === "active" && (
              <Card className="border-2 border-dashed border-slate-200 bg-slate-50/50">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-600">
                    <Gavel className="w-4 h-4" /> Admin Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-slate-500 mb-2">
                    Resolve this market by selecting the winning outcome first.
                  </p>
                  <Button
                    variant="default"
                    className="w-full bg-slate-900 hover:bg-black cursor-pointer"
                    onClick={() => handleResolve("resolve")}
                    disabled={isAdminAction || !selectedOutcomeId}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Resolve with
                    Winner
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-slate-300 cursor-pointer"
                    onClick={() => handleResolve("archive")}
                    disabled={isAdminAction}
                  >
                    <Archive className="w-4 h-4 mr-2" /> Archive (Refund)
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/markets/$id")({
  component: MarketDetailPage,
});
