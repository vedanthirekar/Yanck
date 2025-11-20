"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  Check,
  Sparkles,
  Loader2,
  MessageSquare,
  Rocket,
  X,
  Settings,
  Play,
  Send,
  Bot,
  User,
} from "lucide-react";
import { draftApi, systemPromptApi, deployApi, chatbotApi } from "@/lib/api";
import type { Chatbot } from "@/lib/types";

type WizardStep = 1 | 2 | 3;

interface DraftFile {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
}

export default function CreateChatbotPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);

  // Step 1: Data
  const [name, setName] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<DraftFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processingToPlayground, setProcessingToPlayground] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");

  // Step 2: Playground
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [model, setModel] = useState("gemini-2.5-flash");
  const [tempChatbotId, setTempChatbotId] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [testQuestion, setTestQuestion] = useState("");
  const [testing, setTesting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Step 3: Deploy
  const [deploying, setDeploying] = useState(false);
  const [deployedChatbot, setDeployedChatbot] = useState<Chatbot | null>(null);

  const [error, setError] = useState<string | null>(null);

  const stepTitles = {
    1: "Data",
    2: "Playground",
    3: "Deploy",
  };

  // Initialize draft ID - always start fresh when component mounts
  useEffect(() => {
    // Clear any existing draft data to start fresh
    const storedDraftId = localStorage.getItem("draftId");
    if (storedDraftId) {
      // Clear old draft files from localStorage
      localStorage.removeItem("draftId");
    }
    
    // Clear form state
    setName("");
    setSpecialInstructions("");
    setUploadedFiles([]);
    
    // Generate new draft ID for this session
    const newDraftId = crypto.randomUUID();
    setDraftId(newDraftId);
    localStorage.setItem("draftId", newDraftId);
  }, []); // Only run once on mount

  // Load draft files
  const loadDraftFiles = async (id: string) => {
    try {
      const response = await draftApi.getFiles(id);
      setUploadedFiles(response.files || []);
    } catch (err) {
      console.error("Error loading draft files:", err);
    }
  };

  // Step 1: Handle file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    if (!draftId) return;

    try {
      setUploading(true);
      setError(null);
      const response = await draftApi.uploadFiles(files, draftId);
      setDraftId(response.draft_id);
      localStorage.setItem("draftId", response.draft_id);
      await loadDraftFiles(response.draft_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  // Step 1: Delete file
  const handleDeleteFile = async (fileId: string) => {
    if (!draftId) return;
    try {
      await draftApi.deleteFile(draftId, fileId);
      await loadDraftFiles(draftId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  // Step 1: Continue to Playground
  const handleContinueToPlayground = async () => {
    if (!name.trim()) {
      setError("Please enter a chatbot name");
      return;
    }
    if (uploadedFiles.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    try {
      setProcessingToPlayground(true);
      setError(null);
      
      // Save to localStorage
      localStorage.setItem("chatbotName", name);
      localStorage.setItem("specialInstructions", specialInstructions);
      localStorage.setItem("draftId", draftId || "");

      // Step 1: Processing documents
      setProcessingMessage("Processing documents and preparing for embedding generation...");
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX

      // Step 2: Generating system prompt
      setProcessingMessage("Generating optimized system prompt...");
      await generateSystemPrompt();

      // Step 3: Finalizing
      setProcessingMessage("Finalizing setup...");
      await new Promise(resolve => setTimeout(resolve, 300)); // Small delay for UX

      setCurrentStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to proceed to playground");
    } finally {
      setProcessingToPlayground(false);
      setProcessingMessage("");
    }
  };

  // Step 2: Generate system prompt
  const generateSystemPrompt = async () => {
    try {
      setGeneratingPrompt(true);
      setError(null);
      const response = await systemPromptApi.generate({
        special_instructions: specialInstructions,
        draft_id: draftId || undefined,
      });
      setSystemPrompt(response.system_prompt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate prompt");
    } finally {
      setGeneratingPrompt(false);
    }
  };

  // Step 2: Create temp chatbot for testing
  const createTempChatbot = async () => {
    if (!systemPrompt.trim() || !draftId) return null;

    try {
      const chatbot = await chatbotApi.create({
        name: `${name} (Test)`,
        system_prompt: systemPrompt,
        model: model,
      });

      // Copy files from draft to chatbot and generate embeddings
      try {
        setProcessingMessage("Copying documents and generating embeddings...");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api"}/chatbot/${chatbot.id}/copy-draft-files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ draft_id: draftId }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to copy files and generate embeddings");
        }
      } catch (err) {
        console.warn("Failed to copy files to temp chatbot:", err);
        throw err;
      }

      return chatbot.id;
    } catch (err) {
      console.error("Error creating temp chatbot:", err);
      return null;
    }
  };

  // Step 2: Test chatbot
  const handleTest = async () => {
    if (!testQuestion.trim()) {
      setError("Please enter a question");
      return;
    }

    // Store the question and immediately add it to chat history
    const userQuestion = testQuestion.trim();
    setChatHistory((prev) => [...prev, { role: "user", content: userQuestion }]);
    setTestQuestion("");
    setError(null);

    try {
      setTesting(true);

      // Create temp chatbot if needed
      let chatbotIdToUse = tempChatbotId;
      let justCreated = false;
      if (!chatbotIdToUse) {
        setProcessingToPlayground(true);
        setProcessingMessage("Initializing chatbot and generating embeddings...");
        try {
          const newTempId = await createTempChatbot();
          if (!newTempId) {
            setError("Failed to initialize chatbot for testing");
            setProcessingToPlayground(false);
            setProcessingMessage("");
            // Remove the user message since we failed
            setChatHistory((prev) => prev.slice(0, -1));
            return;
          }
          chatbotIdToUse = newTempId;
          setTempChatbotId(newTempId);
          justCreated = true;
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to initialize chatbot");
          setProcessingToPlayground(false);
          setProcessingMessage("");
          // Remove the user message since we failed
          setChatHistory((prev) => prev.slice(0, -1));
          return;
        } finally {
          setProcessingToPlayground(false);
          setProcessingMessage("");
        }
      } else {
        // Update existing temp chatbot with current system prompt and model
        // This ensures the chatbot uses the latest prompt if it was edited
        try {
          await chatbotApi.update(chatbotIdToUse, {
            system_prompt: systemPrompt.trim(),
            model: model,
          });
        } catch (err) {
          console.warn("Failed to update temp chatbot, continuing with existing settings:", err);
          // Continue anyway - the chatbot might still work with old settings
        }
      }

      // Wait for chatbot to be ready if we just created it
      if (justCreated && chatbotIdToUse) {
        // Poll status until chatbot is ready
        setProcessingToPlayground(true);
        setProcessingMessage("Waiting for embeddings to be generated...");
        const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds max
        let attempts = 0;
        let isReady = false;

        while (attempts < maxAttempts && !isReady) {
          try {
            const status = await chatbotApi.getStatus(chatbotIdToUse);
            if (status.chatbot_status === "ready") {
              isReady = true;
              break;
            } else if (status.chatbot_status === "error") {
              throw new Error("Failed to process documents");
            }
          } catch (err) {
            // If status check fails, continue polling (might be transient)
            console.warn("Status check failed, continuing to poll:", err);
          }
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between checks
        }

        setProcessingToPlayground(false);
        setProcessingMessage("");

        if (!isReady) {
          setError("Chatbot is taking longer than expected to process. Please try again in a moment.");
          // Remove the user message since we failed
          setChatHistory((prev) => prev.slice(0, -1));
          return;
        }
      }

      const response = await chatbotApi.query(chatbotIdToUse!, {
        question: userQuestion,
        chat_history: chatHistory, // Use the previous history (before adding the current question)
      });

      // Add the assistant's response
      setChatHistory((prev) => [
        ...prev,
        { role: "assistant", content: response.response },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test chatbot");
      // Remove the user message since we failed
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setTesting(false);
    }
  };

  // Step 2: Continue to Deploy
  const handleContinueToDeploy = () => {
    if (!systemPrompt.trim()) {
      setError("Please save your system prompt before deploying");
      return;
    }
    setCurrentStep(3);
  };

  // Step 3: Deploy chatbot
  const handleDeploy = async () => {
    if (!name.trim() || !systemPrompt.trim() || !draftId) {
      setError("Missing required information");
      return;
    }

    try {
      setDeploying(true);
      setError(null);

      const chatbot = await deployApi.deploy({
        name: name.trim(),
        system_prompt: systemPrompt.trim(),
        model: model,
        draft_id: draftId,
      });

      setDeployedChatbot(chatbot);
      localStorage.removeItem("draftId");
      localStorage.removeItem("chatbotName");
      localStorage.removeItem("specialInstructions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deploy chatbot");
    } finally {
      setDeploying(false);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navbar />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="max-w-3xl mx-auto mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-6">
            Create New Chatbot
          </h1>
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground border-primary"
                      : step < currentStep
                      ? "bg-primary/10 text-primary border-primary"
                      : "bg-muted text-muted-foreground border-muted-foreground/25"
                  }`}
                >
                  <span className="text-sm font-semibold">{step}</span>
                </div>
                {step < 3 && (
                  <div
                    className={`w-16 h-0.5 mx-2 transition-all ${
                      step < currentStep ? "bg-primary" : "bg-muted-foreground/25"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          
          <p className="text-center text-muted-foreground">
            {stepTitles[currentStep]} - Step {currentStep} of 3
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="max-w-3xl mx-auto mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Wizard Content */}
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Data */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Step 1: Data
                </CardTitle>
                <CardDescription>
                  Set your chatbot&apos;s name, upload training documents, and provide special instructions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Chatbot Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Customer Support Bot"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                  <Textarea
                    id="instructions"
                    placeholder="e.g., Focus on customer support, be professional and concise, use friendly tone..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide any specific instructions for your chatbot&apos;s behavior (we&apos;ll generate an optimized system prompt for you)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Upload Training Documents *</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <Label
                      htmlFor="file-upload"
                      className="cursor-pointer text-primary hover:underline"
                    >
                      Click to upload files or drag and drop
                    </Label>
                    <Input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.docx,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <p className="text-sm text-muted-foreground mt-2">
                      Supports PDF, DOCX, and TXT files (Max 50MB per file, up to 10 files)
                    </p>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <Label>Uploaded Files ({uploadedFiles.length})</Label>
                    <div className="space-y-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{file.filename}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {uploading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading files...
                  </div>
                )}

                {/* Processing Indicator */}
                {processingToPlayground && currentStep === 1 && (
                  <div className="border rounded-lg p-4 bg-muted/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">Processing Documents</p>
                        <p className="text-xs text-muted-foreground">
                          {processingMessage || "Preparing your chatbot..."}
                        </p>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse transition-all duration-300" style={{ width: "60%" }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    size="lg"
                    onClick={handleContinueToPlayground}
                    disabled={!name.trim() || uploadedFiles.length === 0 || uploading || processingToPlayground}
                  >
                    {processingToPlayground ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Next: Playground
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Playground */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    Step 2: Playground
                  </CardTitle>
                  <CardDescription>
                    Configure your chatbot&apos;s model and system prompt, then test it before deploying
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="model">LLM Model</Label>
                    <select
                      id="model"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prompt">System Prompt *</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={generateSystemPrompt}
                        disabled={generatingPrompt}
                      >
                        {generatingPrompt ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="prompt"
                      placeholder="System prompt will be auto-generated..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      This prompt defines your chatbot&apos;s behavior. You can edit it as needed.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex flex-col" style={{ height: "600px" }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Test Your Chatbot
                  </CardTitle>
                  <CardDescription>
                    Try asking questions to see how your chatbot responds with the current settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 overflow-hidden p-0">
                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Bot className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-xl font-semibold mb-2">Start Testing</h3>
                        <p className="text-muted-foreground">
                          Ask a question below to test your chatbot
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatHistory.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-3 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Bot className="h-5 w-5 text-primary" />
                                </div>
                              </div>
                            )}

                            <div
                              className={`rounded-lg px-4 py-3 max-w-[80%] ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {msg.role === "user" && (
                              <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                  <User className="h-5 w-5" />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        {testing && (
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

                  {/* Input Area */}
                  <div className="border-t px-6 py-4">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleTest();
                      }}
                      className="flex gap-2"
                    >
                      <Input
                        placeholder="Ask a question to test your chatbot..."
                        value={testQuestion}
                        onChange={(e) => setTestQuestion(e.target.value)}
                        disabled={testing}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!testQuestion.trim() || testing}>
                        {testing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-4">
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Data
                </Button>
                <Button
                  size="lg"
                  onClick={handleContinueToDeploy}
                  disabled={!systemPrompt.trim()}
                >
                  Next: Deploy
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Deploy */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  Step 3: Deploy
                </CardTitle>
                <CardDescription>
                  Deploy your chatbot and get the URL to share with others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!deployedChatbot ? (
                  <>
                    <div className="space-y-4">
                      <h3 className="font-semibold">Deployment Summary</h3>
                      <div className="space-y-2 p-4 bg-muted rounded-lg">
                        <div>
                          <span className="text-sm font-medium">Chatbot Name:</span>
                          <p className="text-sm text-muted-foreground">{name}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Model:</span>
                          <p className="text-sm text-muted-foreground">{model}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Documents:</span>
                          <p className="text-sm text-muted-foreground">
                            {uploadedFiles.length} file(s)
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between gap-4 pt-4">
                      <Button variant="outline" onClick={handleBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Playground
                      </Button>
                      <Button
                        size="lg"
                        onClick={handleDeploy}
                        disabled={deploying}
                      >
                        {deploying ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            <Rocket className="mr-2 h-4 w-4" />
                            Deploy Chatbot
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                        <Check className="h-8 w-8 text-primary" />
                      </div>
                      <CardTitle className="text-2xl mb-2">
                        Your Chatbot is Ready!
                      </CardTitle>
                      <CardDescription>
                        Your chatbot has been successfully deployed and is ready to use
                      </CardDescription>
                    </div>

                    <div className="space-y-4 p-4 bg-muted rounded-lg">
                      <div>
                        <span className="text-sm font-medium">Name:</span>
                        <p className="text-sm text-muted-foreground">{deployedChatbot.name}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Model:</span>
                        <p className="text-sm text-muted-foreground">{deployedChatbot.model || model}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Status:</span>
                        <p className="text-sm text-muted-foreground capitalize">
                          {deployedChatbot.status}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Chatbot URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/chat/${deployedChatbot.id}`}
                          readOnly
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            const url = `${window.location.origin}/chat/${deployedChatbot.id}`;
                            navigator.clipboard.writeText(url);
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pt-4">
                      <Button
                        size="lg"
                        onClick={() => router.push(`/chat/${deployedChatbot.id}`)}
                        className="w-full"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Open Chatbot
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard")}
                        className="w-full"
                      >
                        Go to Dashboard
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
