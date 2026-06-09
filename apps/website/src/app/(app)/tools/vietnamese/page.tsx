import { LanguageHub } from "@/components/learning/language-hub";
import { languageBySlug } from "@/lib/languages";

export default function VietnameseToolPage() {
    return <LanguageHub language={languageBySlug("vietnamese")!} />;
}
