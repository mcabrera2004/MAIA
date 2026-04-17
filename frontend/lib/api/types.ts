// API Types for Educational AI Assistant

export type UserRole = "alumno" | "profesor";

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface RegisterResponse {
  id: number;
  email: string;
  role: UserRole;
  token: TokenResponse;
}

export interface LoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_at: string;
  role: UserRole;
}

export interface Subject {
  name: string;
}

export interface Session {
  session_id: string;
  name: string;
  subject: string;
  token: TokenResponse;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
}

export interface ChatResponse {
  messages: ChatMessage[];
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface IngestTextRequest {
  content: string;
  subject: string;
  title: string;
  source?: string;
}

export interface IngestResponse {
  message: string;
  subject: string;
  title: string;
  chunks_created: number;
}

export interface DeleteDocumentsResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
  components: Record<string, unknown>;
}

export interface PasswordRequirements {
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_characters: boolean;
  special_characters_allowed: string;
}

export interface AuthConfig {
  password_requirements: PasswordRequirements;
  roles: string[];
}
