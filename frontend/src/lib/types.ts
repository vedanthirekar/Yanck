export type ChatbotStatus = "creating" | "processing" | "ready" | "error";

export interface Chatbot {
  id: string;
  name: string;
  system_prompt: string;
  status: ChatbotStatus;
  created_at: string;
  document_count?: number;
  model?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  status: string;
  uploaded_at: string;
}

export interface QueryResponse {
  response: string;
  sources?: Array<{
    document_id: string;
    filename: string;
    page?: number;
  }>;
  chatbot_id: string;
}

export interface SystemPromptResponse {
  success: boolean;
  system_prompt: string;
}

