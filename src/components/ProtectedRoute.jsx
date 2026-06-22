import React, { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

export default function ProtectedRoute({ children, allowedRoles, currentPath, onNavigate }) {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        onNavigate("/login");
      } else if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
        onNavigate("/login");
      }
    }
  }, [currentUser, loading, allowedRoles, onNavigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Loading Clinic Nodes Security...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Check if role is authorized
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return null;
  }

  return children;
}
