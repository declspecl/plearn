import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const typeColors: Record<string, string> = {
    vocabulary: "border-slate-400/25 bg-slate-400/10 text-slate-200",
    grammar_pattern: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
    phrase: "border-indigo-400/20 bg-indigo-400/10 text-indigo-200",
    utility_word: "border-amber-500/20 bg-amber-500/10 text-amber-200",
};

export function LearnableBadge({ type, className }: { readonly type: string; readonly className?: string }) {
    const colorClass = typeColors[type] ?? "bg-accent text-foreground border-border";
    const label = type
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    return (
        <Badge className={cn(colorClass, "font-medium hover:bg-transparent", className)} variant="outline">
            {label}
        </Badge>
    );
}
