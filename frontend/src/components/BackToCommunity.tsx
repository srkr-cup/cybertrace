import { Link } from "react-router-dom";

export default function BackToCommunity({ language }: { language: "en" | "te" }) {
  const label = language === "te" ? "సమాజ భద్రతా కేంద్రానికి తిరిగి వెళ్లండి" : "Back to Community Safety";
  return (
    <Link to="/community" className="mb-4 inline-flex min-h-10 items-center text-sm font-medium text-brand-700 hover:underline">
      <span aria-hidden="true" className="mr-2">←</span>{label}
    </Link>
  );
}
