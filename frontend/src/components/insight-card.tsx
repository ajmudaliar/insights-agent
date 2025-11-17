import { Card } from "@/components/ui/card";
import type { InsightsConfig } from "@/types/insights";
import { useNavigate } from "react-router-dom";

interface InsightCardProps {
  config: InsightsConfig;
  style?: React.CSSProperties;
}

export function InsightCard({ config, style }: InsightCardProps) {
  const navigate = useNavigate();
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (hours < 1) return "Just now";
    if (hours < 24) return `Today at ${timeStr}`;
    if (days === 1) return `Yesterday at ${timeStr}`;
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    }) + ` at ${timeStr}`;
  };

  return (
    <Card
      className="group relative p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
      style={style}
      onClick={() => {
        navigate(`/insights/${config.key}`);
      }}
    >
      <div className="space-y-4">
        {/* Question - Most prominent */}
        <div>
          <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {config.analytical_question}
          </h3>
        </div>

        {/* Agent Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {config.agent_description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDate(config.created_at)}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {config.key.split("_")[1]}
          </span>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </Card>
  );
}

