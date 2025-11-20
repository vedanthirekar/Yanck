import Link from "next/link";
import { ArrowRight, Bot, FileText, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen mesh-bg relative overflow-hidden">
      {/* Decorative floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 rounded-full bg-primary/5 blur-3xl float" />
        <div className="absolute top-40 right-20 w-48 h-48 rounded-full bg-secondary/5 blur-3xl float" style={{ animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-1/3 w-40 h-40 rounded-full bg-accent/5 blur-3xl float" style={{ animationDelay: "2s" }} />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                <Bot className="h-9 w-9 text-primary relative" strokeWidth={2.5} />
              </div>
              <span className="text-3xl font-display font-bold tracking-tight">Yanck</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" className="font-semibold">Dashboard</Button>
              </Link>
              <Link href="/create">
                <Button className="btn-primary font-semibold shadow-lg shadow-primary/20">
                  Create Chatbot <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-40 relative z-10">
        <div className="flex flex-col items-center text-center space-y-10 max-w-5xl mx-auto">
          <div className="fade-in-up stagger-1 inline-flex items-center rounded-full border-2 border-primary/20 bg-primary/5 px-5 py-2 text-sm font-semibold text-primary backdrop-blur-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            Powered by Google Gemini AI
          </div>

          <h1 className="fade-in-up stagger-2 text-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl max-w-5xl leading-[0.95]">
            Create Custom AI Chatbots{" "}
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Trained on Your Data
              </span>
              <span className="absolute bottom-2 left-0 w-full h-4 bg-secondary/20 -z-10 transform -skew-y-1" />
            </span>
          </h1>

          <p className="fade-in-up stagger-3 text-xl md:text-2xl text-foreground/70 max-w-3xl font-medium leading-relaxed">
            Build intelligent chatbots powered by RAG technology in minutes.
            Upload your documents, customize the behavior, and deploy instantly.
          </p>

          <div className="fade-in-up stagger-4 flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/create">
              <Button size="lg" className="btn-primary text-lg px-8 py-6 font-bold shadow-2xl shadow-primary/30 hover:shadow-primary/40 transition-all hover:scale-105">
                Get Started <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 font-bold border-2 hover:bg-primary/5 hover:border-primary/40 transition-all hover:scale-105">
                View Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-heading text-4xl sm:text-5xl md:text-6xl mb-6 tracking-tight">
            Everything You Need
          </h2>
          <p className="text-xl text-foreground/70 max-w-2xl mx-auto font-medium">
            Powerful features to build, customize, and deploy your AI chatbots
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="card-elevated hover-lift border-2 group">
            <CardHeader className="pb-6">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:blur-2xl transition-all" />
                <FileText className="h-12 w-12 text-primary relative" strokeWidth={2} />
              </div>
              <CardTitle className="text-heading text-xl mb-2">Document Upload</CardTitle>
              <CardDescription className="text-base">
                Upload PDFs, DOCX, and TXT files to train your chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Support for multiple document formats with intelligent text extraction and processing.
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated hover-lift border-2 group">
            <CardHeader className="pb-6">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full group-hover:blur-2xl transition-all" />
                <Bot className="h-12 w-12 text-accent relative" strokeWidth={2} />
              </div>
              <CardTitle className="text-heading text-xl mb-2">Smart RAG Pipeline</CardTitle>
              <CardDescription className="text-base">
                Advanced retrieval-augmented generation technology
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Powered by FAISS vector search and Google Gemini for accurate, context-aware responses.
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated hover-lift border-2 group">
            <CardHeader className="pb-6">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-secondary/20 blur-xl rounded-full group-hover:blur-2xl transition-all" />
                <Zap className="h-12 w-12 text-secondary relative" strokeWidth={2} />
              </div>
              <CardTitle className="text-heading text-xl mb-2">Quick Setup</CardTitle>
              <CardDescription className="text-base">
                3-step wizard for easy chatbot creation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Simple interface to configure, train, test, and deploy your chatbot in minutes.
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated hover-lift border-2 group">
            <CardHeader className="pb-6">
              <div className="relative inline-block mb-4">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:blur-2xl transition-all" />
                <Shield className="h-12 w-12 text-primary relative" strokeWidth={2} />
              </div>
              <CardTitle className="text-heading text-xl mb-2">Customizable</CardTitle>
              <CardDescription className="text-base">
                Full control over chatbot behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Custom system prompts, model selection, and fine-tuned retrieval parameters.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        <div className="relative overflow-hidden rounded-3xl border-2 border-primary/30 p-12 md:p-16 text-center bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 backdrop-blur-sm">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <h2 className="text-heading text-4xl sm:text-5xl md:text-6xl mb-6 tracking-tight">
              Ready to Build Your Chatbot?
            </h2>
            <p className="text-xl text-foreground/70 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              Start creating intelligent AI assistants trained on your own documents today.
            </p>
            <Link href="/create">
              <Button size="lg" className="btn-primary text-lg px-10 py-7 font-bold shadow-2xl shadow-primary/40 hover:shadow-primary/50 transition-all hover:scale-105">
                Create Your First Chatbot <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-20 relative z-10 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full" />
                <Bot className="h-7 w-7 text-primary relative" strokeWidth={2.5} />
              </div>
              <span className="text-xl font-display font-bold">Yanck</span>
            </div>
            <p className="text-sm text-foreground/60 font-medium">
              © 2025 Yanck. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
