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
      <div className="min-h-screen mesh-bg">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  if (!chatbot) {
    return (
      <div className="min-h-screen mesh-bg">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive" className="border-2">
            <AlertDescription className="font-medium">
              {error || "Chatbot not found"}
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push("/dashboard")} className="mt-6 font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg flex flex-col">
      <Navbar />

      {/* Chat Header */}
      <div className="border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/dashboard")}
                className="hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="font-display font-bold text-2xl tracking-tight">{chatbot.name}</h1>
                <p className="text-sm text-foreground/60 font-medium">
                  {documents.length} document{documents.length !== 1 ? "s" : ""} loaded
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInfo(!showInfo)}
              className="font-semibold border-2"
            >
              <Info className="h-4 w-4 mr-2" />
              Info
            </Button>
          </div>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="border-b border-border/50 bg-muted/30 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-base mb-3">System Prompt</h3>
                <p className="text-sm text-foreground/70 line-clamp-3 font-medium">
                  {chatbot.system_prompt}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-base mb-3">Documents</h3>
                <div className="space-y-2">
                  {documents.length === 0 ? (
                    <p className="text-sm text-foreground/70 font-medium">No documents uploaded</p>
                  ) : (
                    <>
                      {documents.slice(0, 3).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center gap-2 text-sm text-foreground/70 font-medium"
                        >
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="truncate">{doc.filename}</span>
                        </div>
                      ))}
                      {documents.length > 3 && (
                        <p className="text-sm text-foreground/70 font-medium">
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Alert variant="destructive" className="border-2">
            <AlertDescription className="font-medium">{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <Bot className="h-20 w-20 mx-auto text-primary relative" strokeWidth={2} />
              </div>
              <h3 className="text-heading text-3xl mb-3">Start a Conversation</h3>
              <p className="text-foreground/70 mb-8 text-lg">
                Ask me anything about the uploaded documents
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {["What is this about?", "Summarize the main points", "Tell me more"].map(
                  (suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setInput(suggestion)}
                      className="font-semibold border-2 hover:bg-primary/5 hover:border-primary/40 transition-all"
                    >
                      {suggestion}
                    </Button>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-4 fade-in-up ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                        <Bot className="h-6 w-6 text-primary relative" strokeWidth={2.5} />
                      </div>
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-5 py-4 max-w-[80%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-card/80 backdrop-blur-sm border border-border/50"
                    }`}
                  >
                    <p className="text-base whitespace-pre-wrap font-medium leading-relaxed">{message.content}</p>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center border border-border/50">
                        <User className="h-6 w-6" strokeWidth={2.5} />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative">
                      <div className="absolute inset-0 bg-primary/20 blur-md rounded-full" />
                      <Bot className="h-6 w-6 text-primary relative" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-5 py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" strokeWidth={2.5} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={sending}
              className="flex-1 h-14 text-base border-2 focus:border-primary/40 px-5"
            />
            <Button type="submit" disabled={!input.trim() || sending} size="lg" className="btn-primary font-bold px-8 shadow-lg shadow-primary/30">
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
