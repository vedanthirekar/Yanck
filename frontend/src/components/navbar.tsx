import Link from "next/link";
import { Bot, LayoutDashboard, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:blur-xl transition-all" />
              <Bot className="h-9 w-9 text-primary relative" strokeWidth={2.5} />
            </div>
            <span className="text-3xl font-display font-bold tracking-tight">Yanck</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="font-semibold">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
            </Link>
            <Link href="/create">
              <Button className="btn-primary font-semibold shadow-lg shadow-primary/20">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Chatbot
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
