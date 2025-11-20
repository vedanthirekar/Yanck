export interface Chatbot {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  status: "creating" | "processing" | "ready" | "error";
  created_at: string;
  updated_at: string;
  document_count?: number;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  uploaded_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  sources?: Array<{ document: string; page?: number }>;
}

