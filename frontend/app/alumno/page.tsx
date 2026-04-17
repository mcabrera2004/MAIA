"use client";

import { useAuth } from "@/lib/auth-context";
import { getSubjects } from "@/lib/api/client";
import { SubjectCard } from "@/components/subject-card";
import { Skeleton } from "@/components/ui/skeleton";
import useSWR from "swr";

export default function AlumnoPage() {
  const { sessions } = useAuth();
  const { data: subjects, isLoading } = useSWR("subjects", getSubjects, {
    fallbackData: [{ name: "historia" }, { name: "derecho informatico" }],
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Selecciona una Asignatura
        </h2>
        <p className="text-muted-foreground">
          Elige la asignatura sobre la que quieres aprender. El asistente IA te ayudara
          usando el material que tus profesores han subido.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {subjects?.map((subject) => (
            <SubjectCard
              key={subject.name}
              subject={subject.name}
              hasActiveSession={!!sessions[subject.name]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
