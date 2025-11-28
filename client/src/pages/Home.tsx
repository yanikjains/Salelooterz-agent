import { useState } from "react";
import { ScraperInput } from "@/components/ScraperInput";
import { ProductCard } from "@/components/ProductCard";
import { MessageEditor } from "@/components/MessageEditor";
import { ProductData, mockScrape } from "@/lib/mockScraper";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import bgImage from "@assets/generated_images/abstract_dark_cyber_grid_background_with_neon_orange_and_green_accents.png";

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [product, setProduct] = useState<ProductData | null>(null);

  const handleScrape = async (url: string) => {
    setIsLoading(true);
    setProduct(null);
    try {
      const data = await mockScrape(url);
      setProduct(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-x-hidden flex flex-col">
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img 
          src={bgImage} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30" 
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 flex-1 flex flex-col">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-12"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg shadow-lg shadow-primary/20 flex items-center justify-center font-bold text-white text-xl">
              A
            </div>
            <span className="text-2xl font-heading font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              AmzViral
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                System Online
             </span>
          </div>
        </motion.header>

        {/* Main Input Section - Moves up when product is loaded */}
        <motion.div 
          layout
          className={`flex flex-col transition-all duration-500 ${product ? 'mb-8' : 'min-h-[60vh] justify-center mb-0'}`}
        >
          {!product && !isLoading && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="text-center mb-8 space-y-2"
             >
               <h1 className="text-5xl md:text-6xl font-heading font-bold text-white mb-4">
                 Automate Your <span className="text-primary neon-glow">Affiliate Empire</span>
               </h1>
               <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                 Turn any Amazon link into a viral, formatted post for WhatsApp & Telegram in seconds. AI-powered hooks included.
               </p>
             </motion.div>
          )}

          <ScraperInput onScrape={handleScrape} isLoading={isLoading} />
        </motion.div>

        {/* Dashboard View */}
        <AnimatePresence>
          {product && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-[500px]"
            >
              {/* Left Column: Product Analysis */}
              <div className="flex flex-col gap-6">
                 <div className="flex items-center justify-between px-1">
                   <h3 className="text-lg font-medium text-muted-foreground">Product Analysis</h3>
                   <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
                     CONFIDENCE: 98%
                   </span>
                 </div>
                 <ProductCard product={product} />
              </div>

              {/* Right Column: Content Generation */}
              <div className="flex flex-col gap-6">
                 <div className="flex items-center justify-between px-1">
                   <h3 className="text-lg font-medium text-muted-foreground">Viral Content Engine</h3>
                   <span className="text-xs font-mono text-secondary bg-secondary/10 px-2 py-1 rounded border border-secondary/20">
                     AI MODEL: ACTIVE
                   </span>
                 </div>
                 <MessageEditor product={product} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
