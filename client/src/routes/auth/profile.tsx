import { useEffect, useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { api, ProfileResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  History,
  User,
  Key,
  Copy,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

function ProfilePage() {
  const { isAuthenticated, logout, refreshUser, user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [resolvedPage, setResolvedPage] = useState(1);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const loadProfile = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setIsLoading(true);
        const data = await api.getProfile(activePage, resolvedPage);
        setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    [activePage, resolvedPage],
  );

  const handleGenerateApiKey = async () => {
    try {
      setIsGeneratingKey(true);
      await api.generateApiKey();
      await loadProfile(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here if available
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/" });
    } else {
      loadProfile();
    }
  }, [isAuthenticated, loadProfile, navigate]);

  // Polling for real-time updates
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      loadProfile(false);
      refreshUser();
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, loadProfile, refreshUser]);

  if (!profile) {
    // Render a loading state or null while the profile is being fetched
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <h1
                className="text-xl font-bold text-indigo-600 cursor-pointer"
                onClick={() => navigate({ to: "/" })}
              >
                PredictIt
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() => navigate({ to: "/" })}
              >
                Markets
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card className="mb-8 overflow-hidden">
          <div className="h-32 bg-indigo-600"></div>
          <CardContent className="relative pt-16 pb-8">
            <div className="absolute -top-12 left-8 p-1 bg-white rounded-2xl shadow-lg">
              <div className="w-24 h-24 bg-slate-100 rounded-xl flex items-center justify-center">
                <User className="w-12 h-12 text-slate-400" />
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">
                  {profile.user.username}
                </h2>
                <p className="text-slate-500">{profile.user.email}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 min-w-[200px]">
                <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                  Available Balance
                </p>
                <p className="text-3xl font-black text-indigo-700">
                  ${profile.user.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 bg-slate-900 text-white border-none overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-500/20 rounded-xl">
                  <Key className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Developer API</h3>
                  <p className="text-slate-400 text-sm mt-1 max-w-md">
                    Use your API key to place bets programmatically. Keep this
                    key secret!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 min-w-[300px]">
                {profile.user.apiKey ? (
                  <div className="group relative">
                    <div className="bg-slate-800 p-3 rounded-lg font-mono text-sm text-indigo-300 border border-slate-700 flex justify-between items-center">
                      <span className="truncate mr-4">
                        {profile.user.apiKey}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(profile.user.apiKey || "")
                        }
                        className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-slate-400 hover:text-indigo-400 p-0 h-auto mt-2 cursor-pointer"
                      onClick={handleGenerateApiKey}
                      disabled={isGeneratingKey}
                    >
                      <RefreshCw
                        className={`w-3 h-3 mr-1 ${isGeneratingKey ? "animate-spin" : ""}`}
                      />
                      Regenerate Key
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleGenerateApiKey}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                    disabled={isGeneratingKey}
                  >
                    {isGeneratingKey ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4 mr-2" />
                    )}
                    Generate API Key
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xl font-bold text-slate-900">Active Bets</h3>
            </div>
            <div className="space-y-4">
              {profile.activeBets.length === 0 ? (
                <Card className="border-dashed bg-transparent">
                  <CardContent className="py-12 text-center text-slate-500">
                    No active bets yet
                  </CardContent>
                </Card>
              ) : (
                profile.activeBets.map((bet) => (
                  <Card
                    key={bet.id}
                    className="hover:border-indigo-200 transition-colors cursor-pointer group"
                    onClick={() =>
                      navigate({ to: `/markets/${bet.market.id}` })
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {bet.market.title}
                        </h4>
                        <Badge variant="secondary">${bet.amount}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-slate-500">
                          Prediction:{" "}
                          <span className="text-indigo-600 font-medium">
                            {bet.outcome.title}
                          </span>
                          <span className="ml-2 text-xs font-bold text-indigo-400">
                            (
                            {bet.market.outcomes.find(
                              (o) => o.id === bet.outcomeId,
                            )?.odds || 0}
                            %)
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(bet.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-medium text-slate-400">
                  Page {activePage}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setActivePage((p) => p + 1)}
                  disabled={profile.activeBets.length < 20}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1 cursor-pointer" />
                </Button>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <History className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xl font-bold text-slate-900">Bet History</h3>
            </div>
            <div className="space-y-4">
              {profile.resolvedBets.length === 0 ? (
                <Card className="border-dashed bg-transparent">
                  <CardContent className="py-12 text-center text-slate-500">
                    No betting history
                  </CardContent>
                </Card>
              ) : (
                profile.resolvedBets.map((bet) => (
                  <Card
                    key={bet.id}
                    className="overflow-hidden cursor-pointer hover:shadow-sm transition-shadow group"
                    onClick={() =>
                      navigate({ to: `/markets/${bet.market.id}` })
                    }
                  >
                    <div
                      className={`h-1 ${bet.won ? "bg-emerald-500" : "bg-red-500"}`}
                    ></div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {bet.market.title}
                        </h4>
                        <Badge variant={bet.won ? "default" : "destructive"}>
                          {bet.won ? "WON" : "LOST"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <div className="text-slate-500">
                          Outcome:{" "}
                          <span className="font-medium">
                            {bet.outcome.title}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900">
                          {bet.won
                            ? `+${(bet.amount * (bet.market.totalMarketBets / bet.market.outcomes.find((o) => o.id === bet.outcomeId)!.totalBets)).toFixed(2)}`
                            : `-$${bet.amount}`}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setResolvedPage((p) => Math.max(1, p - 1))}
                  disabled={resolvedPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                </Button>
                <span className="text-xs font-medium text-slate-400">
                  Page {resolvedPage}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setResolvedPage((p) => p + 1)}
                  disabled={profile.resolvedBets.length < 20}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1 cursor-pointer" />
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/profile" as any)({
  component: ProfilePage,
});
