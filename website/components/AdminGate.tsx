"use client";

import { useAuth } from "@/contexts/AuthContext";
import GoogleSignIn from "@/components/GoogleSignIn";

/* Client gate for /admin pages. Real enforcement is backend (requireAdmin); this is UX. */
export default function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-border border-t-accent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-bold">Admin area</p>
        <p className="text-sm text-muted">Sign in with an admin account to continue.</p>
        <GoogleSignIn />
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-bold">No admin access</p>
        <p className="text-sm text-muted">
          You&apos;re signed in as <span className="text-fg">{user.email}</span>, which isn&apos;t an
          admin account.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
