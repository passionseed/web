"use client";

import { useLanguage } from "@/lib/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function LanguagePicker() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLanguage("en")}
        className={cn(
          "w-24 relative",
          language === "en" && "border-primary bg-primary/5 text-primary"
        )}
      >
        English
        {language === "en" && <Check className="w-3 h-3 ml-2 absolute right-2" />}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLanguage("th")}
        className={cn(
          "w-24 relative",
          language === "th" && "border-primary bg-primary/5 text-primary"
        )}
      >
        ไทย
        {language === "th" && <Check className="w-3 h-3 ml-2 absolute right-2" />}
      </Button>
    </div>
  );
}
