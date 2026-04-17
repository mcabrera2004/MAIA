"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, GraduationCap } from "lucide-react";

export default function AlumnoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, userRole, userEmail, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth?role=alumno");
    } else if (userRole !== "alumno") {
      router.push("/profesor");
    }
  }, [isAuthenticated, userRole, router]);

  if (!isAuthenticated || userRole !== "alumno") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold text-foreground">Mis Asignaturas</h1>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              logout();
              router.push("/");
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesion
          </Button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
