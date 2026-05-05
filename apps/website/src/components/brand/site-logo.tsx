import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-11 w-11",
    lg: "h-16 w-16 md:h-[5.25rem] md:w-[5.25rem]",
} as const;

export interface SiteLogoProps {
    readonly variant?: keyof typeof sizeClasses;
    readonly className?: string;
    readonly priority?: boolean;
}

export function SiteLogo({ variant = "md", className, priority }: SiteLogoProps) {
    return (
        <Link
            href="/"
            className={cn(
                "focus-visible:ring-ring inline-flex shrink-0 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                className,
            )}
            aria-label="Plearn home"
        >
            <Image
                src="/plearn-logo.png"
                alt=""
                width={1254}
                height={1254}
                priority={priority}
                className={cn("rounded-xl shadow-sm ring-1 ring-black/10 dark:ring-white/15", sizeClasses[variant])}
            />
        </Link>
    );
}
