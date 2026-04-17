"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect, Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { UserRole } from "@/lib/api/types";

function AuthContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, userRole } = useAuth();

  const role = (searchParams.get("role") as UserRole) || "alumno";

  useEffect(() => {
    if (isAuthenticated) {
      if (userRole === "profesor") {
        router.push("/profesor");
      } else {
        router.push("/alumno");
      }
    }
  }, [isAuthenticated, userRole, router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>

        <AuthForm role={role} />
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
      <AuthContent />
    </Suspense>
  );
}
