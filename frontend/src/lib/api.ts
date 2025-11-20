const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
    throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// Draft API - for managing draft files before deployment
export const draftApi = {
  async uploadFiles(files: File[], draftId: string) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("draft_id", draftId);

    const response = await fetch(`${API_URL}/draft/files`, {
      method: "POST",
      body: formData,
    });

    return handleResponse<{ draft_id: string; files: Array<{ id: string; filename: string; file_type: string; file_size: number }> }>(response);
  },

  async getFiles(draftId: string) {
    const response = await fetch(`${API_URL}/draft/${draftId}/files`, {
      method: "GET",
    });

    return handleResponse<{ files: Array<{ id: string; filename: string; file_type: string; file_size: number }> }>(response);
  },

  async deleteFile(draftId: string, fileId: string) {
    const response = await fetch(`${API_URL}/draft/${draftId}/files/${fileId}`, {
      method: "DELETE",
    });

    return handleResponse<{ success: boolean }>(response);
  },
};

// System Prompt API
export const systemPromptApi = {
  async generate(data: { special_instructions?: string; draft_id?: string }) {
    const response = await fetch(`${API_URL}/generate-system-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; system_prompt: string }>(response);
  },
};

// Deploy API - for deploying chatbots from drafts
export const deployApi = {
  async deploy(data: { name: string; system_prompt: string; model: string; draft_id: string }) {
    const response = await fetch(`${API_URL}/deploy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<{ id: string; name: string; system_prompt: string; model: string; status: string; created_at: string; updated_at: string; document_count?: number }>(response);
  },
};

// Chatbot API
export const chatbotApi = {
  async create(data: { name: string; system_prompt: string; model?: string }) {
    const response = await fetch(`${API_URL}/chatbot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<{ id: string; name: string; system_prompt: string; model: string; status: string; created_at: string; updated_at: string }>(response);
  },

  async list() {
    const response = await fetch(`${API_URL}/chatbots`, {
      method: "GET",
    });

    return handleResponse<{ chatbots: Array<{ id: string; name: string; system_prompt: string; model: string; status: string; created_at: string; updated_at: string; document_count?: number }> }>(response);
  },

  async get(chatbotId: string) {
    const response = await fetch(`${API_URL}/chatbot/${chatbotId}`, {
      method: "GET",
    });

    return handleResponse<{ id: string; name: string; system_prompt: string; model: string; status: string; created_at: string; updated_at: string; document_count?: number }>(response);
  },

  async update(chatbotId: string, data: { system_prompt?: string; model?: string }) {
    const response = await fetch(`${API_URL}/chatbot/${chatbotId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<{ success: boolean; message: string }>(response);
  },

  async delete(chatbotId: string) {
    const response = await fetch(`${API_URL}/chatbot/${chatbotId}`, {
      method: "DELETE",
    });

    return handleResponse<{ success: boolean; message: string }>(response);
  },

  async query(chatbotId: string, data: { question: string; chat_history?: Array<{ role: "user" | "assistant"; content: string }> }) {
    const response = await fetch(`${API_URL}/chatbot/${chatbotId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    return handleResponse<{ response: string; sources?: Array<{ document: string; page?: number }> }>(response);
  },

  async getStatus(chatbotId: string) {
    const response = await fetch(`${API_URL}/chatbot/${chatbotId}/status`, {
      method: "GET",
    });

    return handleResponse<{ chatbot_status: string; document_count?: number }>(response);
  },
};

