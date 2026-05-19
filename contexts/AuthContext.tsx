import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import React, {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, db } from "../firebaseConfig";
import { UserProfile, UserRole } from "../types";
import { defaultBranding, useTheme } from "./ThemeContexts";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextType {
  /** The raw Firebase Auth user (null if not authenticated). */
  user: User | null;
  /** The Firestore user profile document (null while loading or logged out). */
  userProfile: UserProfile | null;
  /** True while auth state or user profile is still being resolved. */
  isLoading: boolean;
  /** Convenience flag: user is logged in AND email-verified (or social login). */
  isAuthenticated: boolean;
  /** Check whether the current user has a specific role. */
  hasRole: (role: UserRole) => boolean;
  /** Refresh the user profile from Firestore (e.g. after profile edits). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  isAuthenticated: false,
  hasRole: () => false,
  refreshProfile: async () => {},
});

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme, setBranding } = useTheme();

  /**
   * Fetch the Firestore profile and institute theme for the given Firebase user.
   */
  const loadUserProfile = async (firebaseUser: User) => {
    try {
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const defaultStats = { totalPracticed: 0, totalCorrect: 0 };
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: data.email ?? firebaseUser.email ?? "",
          name: data.name ?? firebaseUser.displayName ?? "",
          role: (data.role as UserRole) ?? "student",
          instituteId: data.instituteId ?? "B2C_PUBLIC",
          isPremium: data.isPremium ?? false,
          questionsSolvedToday: data.questionsSolvedToday ?? 0,
          dailyLimit: data.dailyLimit ?? 10,
          lastQuestionDate: data.lastQuestionDate ?? "",
          totalQuestionsPracticed: data.totalQuestionsPracticed ?? 0,
          totalCorrectAnswers: data.totalCorrectAnswers ?? 0,
          practicedQuestions: data.practicedQuestions ?? [],
          subjectStats: {
            quantitative: data.subjectStats?.quantitative ?? defaultStats,
            verbal: data.subjectStats?.verbal ?? defaultStats,
            english: data.subjectStats?.english ?? defaultStats,
          },
          createdAt: data.createdAt ?? "",
        };
        setUserProfile(profile);

        // Load the institute theme and branding
        const instId = profile.instituteId || "B2C_PUBLIC";
        try {
          const instDoc = await getDoc(doc(db, "institutes", instId));
          if (instDoc.exists()) {
            const instData = instDoc.data();
            if (instData.theme) {
              setTheme(instData.theme);
            }
            if (instData.branding) {
              setBranding({ ...defaultBranding, ...instData.branding });
            } else {
              setBranding(defaultBranding);
            }
          }
        } catch (e) {
          console.log("Theme/Branding load error:", e);
        }
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
  };


  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (
        currentUser &&
        (currentUser.providerData.some((p) => p.providerId !== "password") ||
          currentUser.emailVerified)
      ) {
        setUser(currentUser);
        await loadUserProfile(currentUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const isAuthenticated = user !== null && userProfile !== null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isLoading,
        isAuthenticated,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
