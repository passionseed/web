"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Language } from "./direction-finder";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string; // Basic translation helper
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

import { createClient } from "@/utils/supabase/client";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");
  const [isLoaded, setIsLoaded] = useState(false);
  const supabase = createClient();

  // Load language from localStorage AND Supabase on mount
  useEffect(() => {
    const initializeLanguage = async () => {
      // 1. Try LocalStorage first (fastest)
      const savedLang = localStorage.getItem("app-language") as Language;
      if (savedLang && (savedLang === "en" || savedLang === "th")) {
        setLanguage(savedLang);
      }

      // 2. Try Supabase user_metadata (truth)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.user_metadata?.language) {
        const dbLang = user.user_metadata.language as Language;
        if (dbLang === "en" || dbLang === "th") {
          setLanguage(dbLang);
          // Sync local storage if different
          if (dbLang !== savedLang) {
            localStorage.setItem("app-language", dbLang);
          }
        }
      }
      setIsLoaded(true);
    };

    initializeLanguage();
  }, []);

  // Save language to localStorage AND Supabase on change
  const handleSetLanguage = async (lang: Language) => {
    // Optimistic update
    setLanguage(lang);
    localStorage.setItem("app-language", lang);

    // Persist to DB
    const { error } = await supabase.auth.updateUser({
      data: { language: lang },
    });

    if (error) {
      console.error("Failed to save language preference:", error);
    }
  };

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t: (key: string) => key, // Placeholder for now, can be expanded
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
