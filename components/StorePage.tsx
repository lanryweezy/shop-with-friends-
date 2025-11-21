import React, { useRef, useEffect } from 'react';
import { PRODUCTS } from '../constants';
import { Product, ViewState } from '../types';
import { ShoppingCart, ArrowLeft, Star } from 'lucide-react';

interface StorePageProps {
  currentView: ViewState;
  currentProduct: Product | null;
  onNavigate: (view: ViewState, product?: Product) => void;
  userId: string;
  onScroll?: (scrollTop: number) => void;
  scrollTo?: number;
}

const StorePage: React.FC<StorePageProps> = ({ 
  currentView, 
  currentProduct, 
  onNavigate,
  onScroll,
  scrollTo
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  
  // Handle incoming scroll sync from the other device
  useEffect(() => {
    if (typeof scrollTo === 'number' && containerRef.current) {
      const current = containerRef.current.scrollTop;
      // Only scroll if the difference is significant to avoid jitter/loops
      // Tightened threshold from 5 to 1 for smoother "move together" feel
      if (Math.abs(current - scrollTo) > 1) {
        isProgrammaticScroll.current = true;
        containerRef.current.scrollTop = scrollTo;
      }
    }
  }, [scrollTo]);

  // Reset scroll to top when changing views
  useEffect(() => {
    if (containerRef.current) {
      isProgrammaticScroll.current = true;
      containerRef.current.scrollTop = 0;
    }
  }, [currentView]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // If this scroll event was triggered by our code, ignore it to prevent loops
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    onScroll?.(e.currentTarget.scrollTop);
  };

  const renderHeader = () => (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2" onClick={() => onNavigate(ViewState.LIST)}>
        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold rounded-lg cursor-pointer">
          S
        </div>
        <h1 className="font-bold text-lg tracking-tight cursor-pointer text-gray-900">ShopFlow</h1>
      </div>
      <button className="p-2 hover:bg-gray-100 rounded-full relative text-gray-700 transition-colors">
        <ShoppingCart size={20} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
      </button>
    </header>
  );

  const renderProductList = () => (
    <div className="p-4 grid grid-cols-2 gap-4 pb-24">
      {PRODUCTS.map((product) => (
        <div 
          key={product.id} 
          onClick={() => onNavigate(ViewState.PRODUCT, product)}
          className="group bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all duration-300"
        >
          <div className="aspect-[4/5] overflow-hidden bg-gray-100 relative">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-3">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{product.category}</p>
            <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{product.name}</h3>
            <p className="font-bold text-gray-900">{product.currency}{product.price.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderProductDetail = () => {
    if (!currentProduct) return null;
    return (
      <div className="bg-white min-h-full pb-24 animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/80 backdrop-blur-md">
          <button 
            onClick={() => onNavigate(ViewState.LIST)}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <span className="font-medium text-gray-900">Details</span>
          <div className="w-9"></div>
        </div>
        
        <div className="aspect-square w-full bg-gray-100">
           <img 
              src={currentProduct.image} 
              alt={currentProduct.name} 
              className="w-full h-full object-cover"
            />
        </div>

        <div className="p-5 space-y-4">
          <div>
            <div className="flex justify-between items-start">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">{currentProduct.name}</h2>
                <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">{currentProduct.category}</span>
            </div>
            <p className="text-xl font-semibold text-gray-900 mt-2">{currentProduct.currency}{currentProduct.price.toLocaleString()}</p>
          </div>

          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />)}
            <span className="text-xs text-gray-500 ml-2">(128 reviews)</span>
          </div>

          <p className="text-gray-600 leading-relaxed text-sm">
            {currentProduct.description}
          </p>

          <div className="pt-4">
            <button className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98]">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full w-full overflow-y-auto bg-gray-50 no-scrollbar relative"
    >
      {currentView === ViewState.LIST ? (
        <>
          {renderHeader()}
          {renderProductList()}
        </>
      ) : (
        renderProductDetail()
      )}
    </div>
  );
};

export default StorePage;