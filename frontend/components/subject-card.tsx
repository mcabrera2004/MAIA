"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, BookOpen, Scale } from "lucide-react";
import Link from "next/link";

interface SubjectCardProps {
  subject: string;
  hasActiveSession: boolean;
}

const subjectIcons: Record<string, React.ReactNode> = {
  historia: <BookOpen className="h-8 w-8" />,
  "derecho informatico": <Scale className="h-8 w-8" />,
};

const subjectDescriptions: Record<string, string> = {
  historia: "Aprende sobre eventos historicos, revoluciones, y mas con ayuda de la IA",
  "derecho informatico": "Explora conceptos de derecho digital, privacidad, y legislacion tecnologica",
};

export function SubjectCard({ subject, hasActiveSession }: SubjectCardProps) {
  const displayName = subject.charAt(0).toUpperCase() + subject.slice(1);
  const icon = subjectIcons[subject] || <MessageSquare className="h-8 w-8" />;
  const description = subjectDescriptions[subject] || "Chatea con la IA sobre esta asignatura";

  return (
    <Card className="hover:border-primary/50 transition-colors group">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors text-primary">
          {icon}
        </div>
        <CardTitle className="text-xl">{displayName}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <Button asChild className="w-full">
          <Link href={`/alumno/chat/${encodeURIComponent(subject)}`}>
            <MessageSquare className="h-4 w-4 mr-2" />
            {hasActiveSession ? "Continuar Chat" : "Iniciar Chat"}
          </Link>
        </Button>
        {hasActiveSession && (
          <p className="text-xs text-muted-foreground">Tienes una sesion activa</p>
        )}
      </CardContent>
    </Card>
  );
}
