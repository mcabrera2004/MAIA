"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookOpen } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, userRole } = useAuth();

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
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Asistente Educativo IA
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema de aprendizaje inteligente con RAG
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Soy Alumno</CardTitle>
              <CardDescription>
                Accede a los chats de tus asignaturas y aprende con ayuda de la IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                onClick={() => router.push("/auth?role=alumno")}
              >
                Entrar como Alumno
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <BookOpen className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Soy Profesor</CardTitle>
              <CardDescription>
                Sube materiales para que tus alumnos aprendan mejor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                size="lg"
                variant="secondary"
                onClick={() => router.push("/auth?role=profesor")}
              >
                Entrar como Profesor
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Asignaturas disponibles: Historia y Derecho Informatico
        </p>
      </div>
    </main>
  );
}
