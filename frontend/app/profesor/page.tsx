import { IngestForm } from "@/components/ingest-form";

export default function ProfesorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Panel de Ingesta de Documentos
        </h2>
        <p className="text-muted-foreground">
          Sube materiales educativos para que tus alumnos puedan aprender con ayuda de la IA.
          Los documentos se procesaran automaticamente y estaran disponibles en los chats de los alumnos.
        </p>
      </div>

      <IngestForm />
    </div>
  );
}
