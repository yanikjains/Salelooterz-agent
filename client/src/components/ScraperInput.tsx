import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, Link2 } from "lucide-react";
import { motion } from "framer-motion";

interface ScraperInputProps {
  onScrape: (url: string) => void;
  isLoading: boolean;
}

export function ScraperInput({ onScrape, isLoading }: ScraperInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url) onScrape(url);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto space-y-4"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-lg group-hover:bg-primary/30 transition-all duration-500 opacity-0 group-hover:opacity-100" />
        <div className="relative flex gap-2 p-2 bg-card/80 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl">
          <div className="relative flex-1 flex items-center pl-3">
            <Link2 className="w-5 h-5 text-muted-foreground mr-2" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste Amazon Product URL here..."
              className="border-none bg-transparent shadow-none focus-visible:ring-0 text-lg h-12 placeholder:text-muted-foreground/50"
              disabled={isLoading}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isLoading || !url}
            className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-md rounded-lg shadow-lg shadow-primary/20 transition-all duration-300"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scraping...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generate Magic
              </span>
            )}
          </Button>
        </div>
      </form>
      <div className="text-center text-xs text-muted-foreground font-mono">
        Try: https://amazon.com/dp/B09XS...
      </div>
    </motion.div>
  );
}
