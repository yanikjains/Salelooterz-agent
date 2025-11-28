import { ProductData } from "@/lib/mockScraper";
import { motion } from "framer-motion";
import { Star, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ProductCardProps {
  product: ProductData;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Card className="glass-panel overflow-hidden h-full border-white/5 bg-card/40">
        <div className="aspect-square w-full bg-white p-8 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {/* Placeholder for product image - in real app this would be product.image */}
          <div className="w-full h-full bg-muted/20 rounded-lg flex items-center justify-center text-muted-foreground relative z-10">
             <img 
                src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop" 
                alt={product.title}
                className="w-full h-full object-contain mix-blend-multiply"
             />
          </div>
          <Badge className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg">
            -15%
          </Badge>
        </div>
        
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/5">
                Amazon Choice
              </Badge>
              <div className="flex items-center text-yellow-500 text-sm font-medium">
                <Star className="w-4 h-4 fill-yellow-500 mr-1" />
                {product.rating} ({product.reviews.toLocaleString()})
              </div>
            </div>
            <h2 className="text-xl font-heading font-bold leading-tight line-clamp-2" title={product.title}>
              {product.title}
            </h2>
          </div>

          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-white">{product.price}</span>
            <span className="text-lg text-muted-foreground line-through decoration-red-500/50 decoration-2 mb-1">
              $399.00
            </span>
          </div>

          <div className="space-y-2 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-3 h-3 text-secondary" />
              Key Features
            </h3>
            <ul className="text-sm space-y-1.5">
              {product.features.slice(0, 3).map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-gray-300">
                  <span className="block w-1.5 h-1.5 rounded-full bg-secondary mt-1.5" />
                  <span className="line-clamp-1">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
