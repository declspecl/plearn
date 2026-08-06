import { TransitGuide } from "@/components/transit/transit-guide";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Japan Transit Guide · Plearn",
    description: "Read a SmartEX or Google Maps screenshot and build a sourced JR boarding guide.",
};

export default function JapaneseTransitPage() {
    return <TransitGuide />;
}
