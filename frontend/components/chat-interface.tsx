"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { streamMessage, getChatHistory, clearChatHistory } from "@/lib/api/client";
import type { ChatMessage } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Send, Trash2, User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  sessionToken: string;
  subject: string;
}

export function ChatInterface({ sessionToken, subject }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await getChatHistory(sessionToken);
        setMessages(history);
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }
    loadHistory();
  }, [sessionToken]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    // Add user message immediately
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);

    // Add placeholder for assistant response
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      let fullResponse = "";

      for await (const chunk of streamMessage(sessionToken, userMessage)) {
        fullResponse += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullResponse };
          return updated;
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al enviar el mensaje";
      toast.error(errorMessage);
      // Remove the empty assistant message
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }

  async function handleClear() {
    const confirmed = window.confirm("¿Estas seguro de borrar todo el historial del chat?");
    if (!confirmed) return;

    try {
      await clearChatHistory(sessionToken);
      setMessages([]);
      toast.success("Historial borrado");
    } catch (err) {
      toast.error("Error al borrar el historial");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const displayName = subject.charAt(0).toUpperCase() + subject.slice(1);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Chat header */}
      <div className="border-b px-4 py-3 flex items-center justify-between bg-card">
        <div>
          <h2 className="font-semibold text-foreground">{displayName}</h2>
          <p className="text-xs text-muted-foreground">
            El asistente usara el material de esta asignatura para ayudarte
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={isLoading || messages.length === 0}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Borrar Chat
        </Button>
      </div>

      {/* Messages area */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="max-w-3xl mx-auto py-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-6 w-6" />
              <span className="ml-2 text-muted-foreground">Cargando historial...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Bienvenido a {displayName}</p>
              <p className="text-sm">
                Hazme cualquier pregunta sobre esta asignatura y te ayudare usando el material disponible.
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble key={index} message={message} />
            ))
          )}

          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span className="text-sm">Pensando...</span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="border-t p-4 bg-card">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta... (Enter para enviar, Shift+Enter para nueva linea)"
              className="min-h-[60px] max-h-[200px] resize-none"
              disabled={isLoading}
              rows={2}
            />
            <Button
              type="submit"
              size="icon"
              className="h-[60px] w-[60px]"
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <Spinner className="h-5 w-5" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Max 3,000 caracteres. Las respuestas pueden incluir referencias a documentos.
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "rounded-lg px-4 py-2 max-w-[80%]",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-secondary">
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
