"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { ingestText, ingestFile, deleteDocuments, getSubjects } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { Upload, FileText, Trash2, CheckCircle2 } from "lucide-react";
import useSWR from "swr";

export function IngestForm() {
  const { userToken } = useAuth();
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const { data: subjects } = useSWR("subjects", getSubjects, {
    fallbackData: [{ name: "historia" }, { name: "derecho informatico" }],
  });

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userToken || !subject || !title || !content) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await ingestText(userToken, {
        content,
        subject,
        title,
        source: `profesor_upload_${Date.now()}`,
      });
      setLastResult({
        type: "success",
        message: `Documento "${result.title}" ingresado correctamente. ${result.chunks_created} fragmentos creados.`,
      });
      toast.success("Documento ingresado correctamente");
      setTitle("");
      setContent("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al ingestar el documento";
      setLastResult({ type: "error", message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userToken || !subject || !title || !file) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await ingestFile(userToken, file, subject, title);
      setLastResult({
        type: "success",
        message: `Archivo "${result.title}" ingresado correctamente. ${result.chunks_created} fragmentos creados.`,
      });
      toast.success("Archivo ingresado correctamente");
      setTitle("");
      setFile(null);
      // Reset file input
      const fileInput = document.getElementById("file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir el archivo";
      setLastResult({ type: "error", message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!userToken || !subject) return;

    const confirmed = window.confirm(
      `¿Estas seguro de eliminar todos los documentos de "${subject}"? Esta accion no se puede deshacer.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const result = await deleteDocuments(userToken, subject);
      setLastResult({ type: "success", message: result.message });
      toast.success("Documentos eliminados");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar documentos";
      setLastResult({ type: "error", message });
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Asignatura</CardTitle>
          <CardDescription>
            Elige la asignatura para la cual deseas subir material
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Selecciona una asignatura" />
            </SelectTrigger>
            <SelectContent>
              {subjects?.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name.charAt(0).toUpperCase() + s.name.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {subject && (
        <Card>
          <CardHeader>
            <CardTitle>Subir Material</CardTitle>
            <CardDescription>
              Sube contenido para {subject.charAt(0).toUpperCase() + subject.slice(1)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="text" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Texto
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-2" />
                  Archivo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4 mt-4">
                <form onSubmit={handleTextSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="text-title">Titulo del documento</Label>
                    <Input
                      id="text-title"
                      placeholder="Ej: Unidad 3 - La Revolucion Francesa"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Contenido</Label>
                    <Textarea
                      id="content"
                      placeholder="Pega aqui el contenido del documento..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      required
                      disabled={isLoading}
                      rows={10}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Max 3,000 caracteres por mensaje de chat
                    </p>
                  </div>
                  <Button type="submit" disabled={isLoading || !title || !content}>
                    {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                    Subir Texto
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="file" className="space-y-4 mt-4">
                <form onSubmit={handleFileSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="file-title">Titulo del documento</Label>
                    <Input
                      id="file-title"
                      placeholder="Ej: Apuntes Derecho Digital"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="file-input">Archivo</Label>
                    <Input
                      id="file-input"
                      type="file"
                      accept=".txt,.md,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      required
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      Formatos soportados: .txt, .md, .pdf
                    </p>
                  </div>
                  <Button type="submit" disabled={isLoading || !title || !file}>
                    {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                    Subir Archivo
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {lastResult && (
              <Alert
                className="mt-4"
                variant={lastResult.type === "error" ? "destructive" : "default"}
              >
                {lastResult.type === "success" && (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
                <AlertDescription>{lastResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {subject && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Zona de Peligro</CardTitle>
            <CardDescription>
              Eliminar todos los documentos de una asignatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar todos los documentos de {subject}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
