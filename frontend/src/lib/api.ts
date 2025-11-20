import type {
  Chatbot,
  ChatMessage,
  Document,
  QueryResponse,
  SystemPromptResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

/**
 * Handle API errors and extract error messages
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage =
      errorData?.error?.message ||
      errorData?.message ||
      `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }
  return response.json();
}

/**
 * Chatbot API client
 */
export const chatbotApi = {
  /**
   * Create a new chatbot
   */
  async create(data: {
    name: string;
    system_prompt: string;
    model?: string;
  }): Promise<Chatbot> {
    const response = await fetch(`${API_BASE_URL}/chatbot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Chatbot>(response);
  },

  /**
   * Get all chatbots
   */
  async list(): Promise<{ chatbots: Chatbot[]; count: number }> {
    const response = await fetch(`${API_BASE_URL}/chatbots`);
    return handleResponse<{ chatbots: Chatbot[]; count: number }>(response);
  },

  /**
   * Get a single chatbot by ID
   */
  async get(chatbotId: string): Promise<{ chatbot: Chatbot }> {
    const response = await fetch(`${API_BASE_URL}/chatbot/${chatbotId}`);
    return handleResponse<{ chatbot: Chatbot }>(response);
  },

  /**
   * Update chatbot (system prompt and/or model)
   */
  async update(
    chatbotId: string,
    data: {
      system_prompt?: string;
      model?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/chatbot/${chatbotId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },

  /**
   * Query a chatbot
   */
  async query(
    chatbotId: string,
    data: {
      question: string;
      chat_history?: ChatMessage[];
    }
  ): Promise<QueryResponse> {
    const response = await fetch(`${API_BASE_URL}/chatbot/${chatbotId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<QueryResponse>(response);
  },

  /**
   * Delete a chatbot
   */
  async delete(chatbotId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/chatbot/${chatbotId}`, {
      method: "DELETE",
    });
    return handleResponse<{ success: boolean; message: string }>(response);
  },

  /**
   * Get chatbot status
   */
  async getStatus(chatbotId: string): Promise<{
    chatbot_id: string;
    chatbot_status: string;
    total_documents: number;
    documents: Array<{
      id: string;
      filename: string;
      file_type: string;
      file_size: number;
      status: string;
      uploaded_at: string;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/chatbot/${chatbotId}/status`);
    return handleResponse<{
      chatbot_id: string;
      chatbot_status: string;
      total_documents: number;
      documents: Array<{
        id: string;
        filename: string;
        file_type: string;
        file_size: number;
        status: string;
        uploaded_at: string;
      }>;
    }>(response);
  },
};

/**
 * Document API client
 */
export const documentApi = {
  /**
   * Upload documents for a chatbot
   */
  async upload(chatbotId: string, files: File[]): Promise<{
    success: boolean;
    uploaded_files: string[];
    errors?: string[];
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const response = await fetch(
      `${API_BASE_URL}/chatbot/${chatbotId}/documents`,
      {
        method: "POST",
        body: formData,
      }
    );
    return handleResponse<{
      success: boolean;
      uploaded_files: string[];
      errors?: string[];
    }>(response);
  },

  /**
   * Get all documents for a chatbot
   */
  async list(chatbotId: string): Promise<{
    documents: Document[];
    count: number;
  }> {
    const response = await fetch(
      `${API_BASE_URL}/chatbot/${chatbotId}/documents`
    );
    return handleResponse<{ documents: Document[]; count: number }>(response);
  },
};

/**
 * Draft API client (for temporary file storage before chatbot creation)
 */
export const draftApi = {
  /**
   * Upload files to draft
   */
  async uploadFiles(
    files: File[],
    draftId?: string
  ): Promise<{
    success: boolean;
    draft_id: string;
    uploaded_files: Array<{
      id: string;
      filename: string;
      file_type: string;
      file_size: number;
    }>;
    errors?: Array<{ filename: string; error: string }>;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    if (draftId) {
      formData.append("draft_id", draftId);
    }

    const response = await fetch(`${API_BASE_URL}/draft/files`, {
      method: "POST",
      body: formData,
    });
    return handleResponse<{
      success: boolean;
      draft_id: string;
      uploaded_files: Array<{
        id: string;
        filename: string;
        file_type: string;
        file_size: number;
      }>;
      errors?: Array<{ filename: string; error: string }>;
    }>(response);
  },

  /**
   * Get all files in a draft
   */
  async getFiles(draftId: string): Promise<{
    success: boolean;
    files: Array<{
      id: string;
      filename: string;
      file_type: string;
      file_size: number;
    }>;
    count: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/draft/${draftId}/files`);
    return handleResponse<{
      success: boolean;
      files: Array<{
        id: string;
        filename: string;
        file_type: string;
        file_size: number;
      }>;
      count: number;
    }>(response);
  },

  /**
   * Delete a file from draft
   */
  async deleteFile(
    draftId: string,
    fileId: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/draft/${draftId}/files/${fileId}`,
      {
        method: "DELETE",
      }
    );
    return handleResponse<{ success: boolean; message: string }>(response);
  },
};

/**
 * System Prompt API client
 */
export const systemPromptApi = {
  /**
   * Generate a system prompt using AI
   */
  async generate(data: {
    special_instructions?: string;
    draft_id?: string;
  }): Promise<SystemPromptResponse> {
    const response = await fetch(`${API_BASE_URL}/generate-system-prompt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<SystemPromptResponse>(response);
  },
};

/**
 * Deploy API client
 */
export const deployApi = {
  /**
   * Deploy a chatbot with all collected data
   */
  async deploy(data: {
    name: string;
    system_prompt: string;
    model: string;
    draft_id: string;
  }): Promise<Chatbot> {
    const response = await fetch(`${API_BASE_URL}/deploy-chatbot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return handleResponse<Chatbot>(response);
  },
};
