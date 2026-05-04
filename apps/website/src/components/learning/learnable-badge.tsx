import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

const typeColors: Record<string, string> = {
    vocabulary: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    grammar_pattern: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    phrase: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    utility_word: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
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
