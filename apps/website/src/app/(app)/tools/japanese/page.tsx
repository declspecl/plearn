import { LanguageHub } from "@/components/learning/language-hub";
import { languageBySlug } from "@/lib/languages";

export default function JapaneseToolPage() {
    return <LanguageHub language={languageBySlug("japanese")!} />;
}
