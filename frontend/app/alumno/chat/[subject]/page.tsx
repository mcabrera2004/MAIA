"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createSession } from "@/lib/api/client";
import { ChatInterface } from "@/components/chat-interface";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ChatPageProps {
  params: Promise<{ subject: string }>;
}

export default function ChatPage({ params }: ChatPageProps) {
  const { subject: encodedSubject } = use(params);
  const subject = decodeURIComponent(encodedSubject);
  const router = useRouter();
  const { userToken, sessions, setSession } = useAuth();
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    // Check if we already have a session for this subject
    const existingSession = sessions[subject];
    if (existingSession) {
      setSessionToken(existingSession.sessionToken);
      return;
    }

    // Create a new session
    async function initSession() {
      if (!userToken) return;

      setIsCreatingSession(true);
      try {
        const session = await createSession(userToken, subject);
        setSession(subject, session.session_id, session.token.access_token);
        setSessionToken(session.token.access_token);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al crear la sesion";
        toast.error(message);
        router.push("/alumno");
      } finally {
        setIsCreatingSession(false);
      }
    }

    initSession();
  }, [userToken, subject, sessions, setSession, router]);

  if (isCreatingSession || !sessionToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] gap-4">
        <Spinner className="h-8 w-8" />
        <p className="text-muted-foreground">Iniciando sesion de chat...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b px-4 py-2 bg-card">
        <Button variant="ghost" size="sm" onClick={() => router.push("/alumno")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Asignaturas
        </Button>
      </div>
      <ChatInterface sessionToken={sessionToken} subject={subject} />
    </div>
  );
}
