import type {
  RegisterRequest,
  RegisterResponse,
  LoginResponse,
  Subject,
  Session,
  ChatMessage,
  ChatResponse,
  IngestTextRequest,
  IngestResponse,
  DeleteDocumentsResponse,
  AuthConfig,
} from "./types";

// API Base URL - configurable via environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
    // Ensures the prototype chain is correctly set for built-in class extensions
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new ApiError(response.status, errorMessage);
  }
  return response.json();
}

// Auth endpoints
export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<RegisterResponse>(response);
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      username: email,
      password: password,
      grant_type: "password",
    }),
  });
  return handleResponse<LoginResponse>(response);
}

export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${API_BASE_URL}/auth/config`);
  return handleResponse<AuthConfig>(response);
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  const response = await fetch(`${API_BASE_URL}/knowledge/subjects`);
  return handleResponse<Subject[]>(response);
}

// Sessions
export async function createSession(userToken: string, subject: string): Promise<Session> {
  const response = await fetch(`${API_BASE_URL}/auth/session`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ subject }),
  });
  return handleResponse<Session>(response);
}

export async function getSessions(userToken: string): Promise<Session[]> {
  const response = await fetch(`${API_BASE_URL}/auth/sessions`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  return handleResponse<Session[]>(response);
}

export async function renameSession(sessionToken: string, sessionId: string, name: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/session/${sessionId}/name`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ name }),
  });
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to rename session");
  }
}

export async function deleteSession(sessionToken: string, sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/auth/session/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to delete session");
  }
}

// Chat
export async function sendMessage(sessionToken: string, message: string): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE_URL}/chatbot/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
    }),
  });
  return handleResponse<ChatResponse>(response);
}

export async function* streamMessage(
  sessionToken: string,
  message: string
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE_URL}/chatbot/chat/stream`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{ role: "user", content: message }],
    }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, "Failed to stream message");
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value);
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));

    for (const line of lines) {
      try {
        const chunk = JSON.parse(line.slice(5));
        if (chunk.done) return;
        yield chunk.content;
      } catch {
        // Skip malformed chunks
      }
    }
  }
}

export async function getChatHistory(sessionToken: string): Promise<ChatMessage[]> {
  const response = await fetch(`${API_BASE_URL}/chatbot/messages`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  const data = await handleResponse<{ messages: ChatMessage[] }>(response);
  return data.messages || [];
}

export async function clearChatHistory(sessionToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chatbot/messages`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (!response.ok) {
    throw new ApiError(response.status, "Failed to clear chat history");
  }
}

// Knowledge Base (Professor only)
export async function ingestText(userToken: string, data: IngestTextRequest): Promise<IngestResponse> {
  const response = await fetch(`${API_BASE_URL}/knowledge/ingest/text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  return handleResponse<IngestResponse>(response);
}

export async function ingestFile(
  userToken: string,
  file: File,
  subject: string,
  title: string
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("subject", subject);
  formData.append("title", title);

  const response = await fetch(`${API_BASE_URL}/knowledge/ingest/file`, {
    method: "POST",
    headers: { Authorization: `Bearer ${userToken}` },
    body: formData,
  });
  return handleResponse<IngestResponse>(response);
}

export async function deleteDocuments(userToken: string, subject: string): Promise<DeleteDocumentsResponse> {
  const response = await fetch(`${API_BASE_URL}/knowledge/documents/${encodeURIComponent(subject)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${userToken}` },
  });
  return handleResponse<DeleteDocumentsResponse>(response);
}

// Health check
export async function healthCheck(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL.replace("/api/v1", "")}/health`);
  return handleResponse<{ status: string }>(response);
}

export { ApiError };
