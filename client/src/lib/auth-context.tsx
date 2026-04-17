import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { User, api } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    try {
      const updatedUser = await api.me();
      const currentUserData = JSON.parse(
        localStorage.getItem("auth_user") || "{}",
      );
      const newUser = { ...currentUserData, ...updatedUser, token };
      setUser(newUser);
      localStorage.setItem("auth_user", JSON.stringify(newUser));
    } catch (err) {
      console.error("Failed to refresh user, logging out.", err);
      logout();
    }
  }, []);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem("auth_token");
      const userData = localStorage.getItem("auth_user");
      if (token && userData) {
        try {
          setUser({ ...JSON.parse(userData), token });
          // Immediately refresh user data on load
          await refreshUser();
        } catch {
          logout();
        }
      }
      setIsLoading(false);
    };
    bootstrapAuth();
  }, [refreshUser]);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("auth_token", newUser.token);
    localStorage.setItem("auth_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        refreshUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
