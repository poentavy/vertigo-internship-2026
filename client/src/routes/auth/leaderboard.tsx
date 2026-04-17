import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { api, LeaderboardUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, User } from "lucide-react";

function LeaderboardPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const data = await api.getLeaderboard();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
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
                onClick={() => navigate({ to: "/" })}
              >
                Markets
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
            <Trophy className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900">Leaderboard</h2>
          <p className="text-slate-500 mt-2">
            Top predictors by total winnings
          </p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            users.map((user, index) => (
              <Card
                key={user.id}
                className={`overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow cursor-pointer ${
                  index === 0 ? "ring-2 ring-amber-400" : ""
                }`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center p-4 gap-4">
                    <div className="w-12 flex justify-center items-center">
                      {index === 0 ? (
                        <Medal className="w-8 h-8 text-amber-400" />
                      ) : index === 1 ? (
                        <Medal className="w-8 h-8 text-slate-400" />
                      ) : index === 2 ? (
                        <Medal className="w-8 h-8 text-amber-700" />
                      ) : (
                        <span className="text-xl font-bold text-slate-300">
                          #{index + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">
                          {user.username}
                        </p>
                        <p className="text-xs text-slate-400">
                          Master Predictor
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-indigo-600">
                        ${user.totalWinnings.toFixed(0)}
                      </p>
                      <p className="text-xs text-slate-400 uppercase tracking-tighter">
                        Total Winnings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/auth/leaderboard" as any)({
  component: LeaderboardPage,
});
