import { useState, useEffect } from "react";
import { ProductData, generateViralMessage } from "@/lib/mockScraper";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, RefreshCw, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MessageEditorProps {
  product: ProductData;
}

export function MessageEditor({ product }: MessageEditorProps) {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMessage(generateViralMessage(product));
  }, [product]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast({
      title: "Copied to clipboard!",
      description: "Ready to paste into your channel.",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerate = () => {
    setMessage("🔄 Refreshing Telegram copy...\n\n" + generateViralMessage(product));
    setTimeout(() => {
        setMessage(generateViralMessage(product));
        toast({ title: "Telegram message refreshed" });
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="glass-panel rounded-xl p-1 flex-1 flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <span className="text-sm font-semibold">Telegram message</span>
          <Button variant="ghost" size="sm" onClick={handleRegenerate} className="text-muted-foreground hover:text-primary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex-1 p-4 relative">
          <Textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="h-full min-h-[300px] resize-none bg-black/20 border-white/10 font-mono text-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 leading-relaxed"
          />
          <div className="absolute bottom-8 right-8 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
            {message.length} chars
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
           <Button
            className="w-full bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20"
            onClick={handleCopy}
           >
             {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
             {copied ? "Copied!" : "Copy Message"}
           </Button>
        </div>
      </div>
    </motion.div>
  );
}
