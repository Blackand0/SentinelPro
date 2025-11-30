import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import type { User } from "@shared/schema";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (role: string | string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          localStorage.removeItem("authToken");
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/auth/me", {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const serverUser = await response.json();
        setUser(serverUser);
      } else {
        localStorage.removeItem("authToken");
        setUser(null);
      }
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });
      }
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("authToken");
    setUser(null);
    setLocation("/login");
  };

  const hasRole = (role: string | string[]) => {
    if (!user) return false;
    if (Array.isArray(role)) {
      return role.includes(user.role);
    }
    return user.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
