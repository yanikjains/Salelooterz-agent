import { useState, useEffect } from "react";
import { ProductData, generateViralMessage } from "@/lib/mockScraper";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Send, FileSpreadsheet, RefreshCw, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MessageEditorProps {
  product: ProductData;
}

export function MessageEditor({ product }: MessageEditorProps) {
  const [platform, setPlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setMessage(generateViralMessage(product, platform));
  }, [product, platform]);

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
    // In a real app, this would call AI again. Here we just refresh the same text or could add variations.
    setMessage("🔄 Regenerating viral hooks...\n\n" + generateViralMessage(product, platform));
    setTimeout(() => {
        setMessage(generateViralMessage(product, platform));
        toast({ title: "Message Regenerated", description: "Fresh viral hooks applied." });
    }, 800);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: "Exported to Google Sheets",
        description: "Product row added to 'Affiliate Tracker 2024'",
        variant: "default", // Success style
      });
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="h-full flex flex-col"
    >
      <div className="glass-panel rounded-xl p-1 flex-1 flex flex-col h-full">
        <Tabs defaultValue="whatsapp" className="w-full flex-1 flex flex-col" onValueChange={(v) => setPlatform(v as any)}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <TabsList className="bg-muted/50 border border-white/5">
              <TabsTrigger value="whatsapp" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">WhatsApp</TabsTrigger>
              <TabsTrigger value="telegram" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">Telegram</TabsTrigger>
            </TabsList>
            
            <Button variant="ghost" size="sm" onClick={handleRegenerate} className="text-muted-foreground hover:text-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Remix
            </Button>
          </div>

          <TabsContent value="whatsapp" className="flex-1 p-4 m-0 data-[state=active]:flex flex-col">
            <div className="flex-1 relative">
               <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-full min-h-[300px] resize-none bg-black/20 border-white/10 font-mono text-sm focus-visible:ring-1 focus-visible:ring-primary/50 leading-relaxed"
               />
               <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                 {message.length} chars
               </div>
            </div>
          </TabsContent>
          
          <TabsContent value="telegram" className="flex-1 p-4 m-0 data-[state=active]:flex flex-col">
             <div className="flex-1 relative">
               <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-full min-h-[300px] resize-none bg-black/20 border-white/10 font-mono text-sm focus-visible:ring-1 focus-visible:ring-blue-500/50 leading-relaxed"
               />
               <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                 {message.length} chars
               </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="p-4 border-t border-white/5 grid grid-cols-2 gap-3">
           <Button 
            variant="secondary" 
            className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10"
            onClick={handleExport}
            disabled={isExporting}
           >
             {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin mr-2" />
             ) : (
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-400" />
             )}
             {isExporting ? "Pushing..." : "Push to Sheets"}
           </Button>
           
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
