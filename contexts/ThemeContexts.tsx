import React, { createContext, ReactNode, useContext, useState } from "react";

// 1. הגדרת המבנה (Type) של ערכת הנושא - כל הצבעים שהאפליקציה צורכת
export type Theme = {
  backgroundColor: string;
  cardBackground: string;
  primaryColor: string;
  secondaryColor: string;
  textPrimary: string;
  textSecondary: string;
  textLight: string;
  successBackground: string;
  successBorder: string;
  successText: string;
  errorBackground: string;
  errorBorder: string;
  errorText: string;
  tipBackground: string;
  tipBorder: string;
  ruleBackground: string;
  ruleBorder: string;
};

// 2. הגדרת המבנה (Type) של מיתוג המוסד (טקסטים, לוגו, קישורים)
export type InstituteBranding = {
  instituteName: string;
  logoUrl: string | null;
  splashVideoUrl: string | null;
  appTitle: string;
  authWelcomeText: string;
  authSubtitleText: string;
  loginWelcomeText: string;
  loginSubtitleText: string;
  contactUrl: string | null;
  policyUrl: string | null;
};

// 3. מיתוג ברירת מחדל (B2C_PUBLIC)
export const defaultBranding: InstituteBranding = {
  instituteName: "PsyMath",
  logoUrl: null,
  splashVideoUrl: null,
  appTitle: "הכנה לפסיכומטרי",
  authWelcomeText: "ברוך הבא לכמותי",
  authSubtitleText: "נתחיל להתכונן?",
  loginWelcomeText: "התחברות",
  loginSubtitleText: "טוב לראות אותך שוב!",
  contactUrl: "https://novo967.github.io/Camuty-landing-page/contact.html",
  policyUrl: "https://novo967.github.io/Camuty-landing-page/",
};

// 4. ערכת נושא ברירת מחדל (העיצוב המקורי שלכם)
export const defaultTheme: Theme = {
  backgroundColor: "#9dbde9",
  cardBackground: "#FFFFFF",
  primaryColor: "#4A90E2",
  secondaryColor: "#3182CE",
  textPrimary: "#2D3748",
  textSecondary: "#4A5568",
  textLight: "#FFFFFF",
  successBackground: "#F0FFF4",
  successBorder: "#48BB78",
  successText: "#276749",
  errorBackground: "#FFF5F5",
  errorBorder: "#F56565",
  errorText: "#9B2C2C",
  tipBackground: "#FEFCBF",
  tipBorder: "#D69E2E",
  ruleBackground: "#FED7D7",
  ruleBorder: "#E53E3E",
};

// 3. תשתית לערכת נושא נוספת - דוגמה למיתוג של "קידום" (אדום)
export const kidumTheme: Theme = {
  backgroundColor: "#F7F7F7",
  cardBackground: "#FFFFFF",
  primaryColor: "#E3000F", // אדום קידום
  secondaryColor: "#1A1A1A", // אפור כהה/שחור
  textPrimary: "#2D3748",
  textSecondary: "#4A5568",
  textLight: "#FFFFFF",
  successBackground: "#F0FFF4",
  successBorder: "#48BB78",
  successText: "#276749",
  errorBackground: "#FFF5F5",
  errorBorder: "#F56565",
  errorText: "#9B2C2C",
  tipBackground: "#FEFCBF",
  tipBorder: "#D69E2E",
  ruleBackground: "#FED7D7",
  ruleBorder: "#E53E3E",
};

// 6. הגדרת הטיפוס של הקונטקסט (מה הוא מספק למסכים)
type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  branding: InstituteBranding;
  setBranding: (branding: InstituteBranding) => void;
};

// 7. יצירת הקונטקסט
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  setTheme: () => {},
  branding: defaultBranding,
  setBranding: () => {},
});

// 8. קומפוננטת ה-Provider שעוטפת את האפליקציה ב-App.tsx
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  // ניהול ה-State של העיצוב הפעיל ומיתוג המוסד
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [branding, setBranding] = useState<InstituteBranding>(defaultBranding);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, branding, setBranding }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 9. Hook מותאם אישית לשימוש קל ומהיר בכל מסך
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
