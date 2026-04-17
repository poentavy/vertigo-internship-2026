import { Market } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "@tanstack/react-router";
import { Users, TrendingUp } from "lucide-react";

interface MarketCardProps {
  market: Market;
}

export function MarketCard({ market }: MarketCardProps) {
  const navigate = useNavigate();

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-slate-200 overflow-hidden flex flex-col h-full">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Badge
              className={
                market.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-slate-50 text-slate-600 border-slate-100"
              }
              variant="outline"
            >
              {market.status.toUpperCase()}
            </Badge>
            <CardTitle className="text-lg font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
              {market.title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col">
        {/* Outcomes Preview */}
        <div className="space-y-2 flex-1">
          {market.outcomes.slice(0, 2).map((outcome, idx) => (
            <div
              key={outcome.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                idx === 0
                  ? "bg-indigo-50/50 border-indigo-100"
                  : "bg-rose-50/50 border-rose-100"
              }`}
            >
              <span className="text-sm font-bold text-slate-700">
                {outcome.title}
              </span>
              <span
                className={`text-lg font-black ${idx === 0 ? "text-indigo-600" : "text-rose-600"}`}
              >
                {outcome.odds}%
              </span>
            </div>
          ))}
          {market.outcomes.length > 2 && (
            <p className="text-xs text-center text-slate-400 font-medium">
              +{market.outcomes.length - 2} more outcomes
            </p>
          )}
        </div>

        {/* Stats Footer */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-slate-500">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">
                  {market.participantCount || 0}
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-500">
                <TrendingUp className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">
                  ${market.totalMarketBets.toLocaleString()}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              VOL
            </span>
          </div>

          <Button
            className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-5 rounded-xl transition-all cursor-pointer"
            onClick={() => navigate({ to: `/markets/${market.id}` })}
          >
            {market.status === "active" ? "PREDICT NOW" : "VIEW RESULTS"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
