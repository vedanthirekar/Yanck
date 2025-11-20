"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Send, Bot, User, Loader2, FileText, Info } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { chatbotApi, documentApi } from "@/lib/api";
import type { Chatbot, ChatMessage, Document } from "@/lib/types";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const chatbotId = params.id as string;

  const [chatbot, setChatbot] = useState<Chatbot | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fetchChatbotData = useCallback(async () => {
    if (!chatbotId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch chatbot first, then documents
      const chatbotResponse = await chatbotApi.get(chatbotId);
      setChatbot(chatbotResponse.chatbot);

      // Try to fetch documents, but don't fail if it errors
      try {
        const documentsResponse = await documentApi.list(chatbotId);
        setDocuments(documentsResponse.documents);
      } catch (docErr) {
        console.warn("Failed to load documents:", docErr);
        // Set empty documents array if fetch fails
        setDocuments([]);
      }
    } catch (err) {
      console.error("Failed to load chatbot:", err);
      setError(err instanceof Error ? err.message : "Failed to load chatbot");
      setChatbot(null);
    } finally {
      setLoading(false);
    }
  }, [chatbotId]);

  // Fetch chatbot and documents
  useEffect(() => {
    if (chatbotId) {
      fetchChatbotData();
    }
  }, [chatbotId, fetchChatbotData]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || sending || !chatbot) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const response = await chatbotApi.query(chatbotId, {
        question: userMessage.content,
        chat_history: messages,
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the user message if sending failed
      setMessages((prev) => prev.slice(0, -1));
      setInput(userMessage.content); // Restore input
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              {error || "Chatbot not found"}
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/dashboard")} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Chat Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg">{chatbot.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? "s" : ""} loaded
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
            >
              <Info className="h-4 w-4 mr-2" />
              Info
            </Button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="border-b bg-muted/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-sm mb-2">System Prompt</h3>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {chatbot.system_prompt}
                </p>
              </div>
              <div>
                <h3 className="font-medium text-sm mb-2">Documents</h3>
                <div className="space-y-1">
                  {documents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No documents uploaded</p>
                  ) : (
                    <>
                      {documents.slice(0, 3).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 text-xs text-muted-foreground"
                        >
                          <FileText className="h-3 w-3" />
                          <span className="truncate">{doc.filename}</span>
                        </div>
                      ))}
                      {documents.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{documents.length - 3} more
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Start a Conversation</h3>
              <p className="text-muted-foreground mb-6">
                Ask me anything about the uploaded documents
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {["What is this about?", "Summarize the main points", "Tell me more"].map(
                  (suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`rounded-lg px-4 py-3 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <form onSubmit={handleSend} className="flex gap-2 max-w-3xl mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
