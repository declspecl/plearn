import { JapaneseChatbot } from "@/components/learning/vietnamese-chatbot";

export default function JapaneseChatPage() {
    return (
        <div className="flex h-[calc(100dvh-theme(spacing.16))] flex-col md:h-full">
            <JapaneseChatbot />
        </div>
    );
}
