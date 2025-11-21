
import React, { useRef, useEffect, useState } from 'react';
import { PRODUCTS } from '../constants';
import { Product, ViewState, Order } from '../types';
import { ShoppingCart, ArrowLeft, Star, X, Trash2, Plus, User, Package, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../services/mockDatabase';

interface StorePageProps {
  currentView: ViewState;
  currentProduct: Product | null;
  onNavigate: (view: ViewState, product?: Product) => void;
  userId: string;
  onScroll?: (scrollTop: number) => void;
  scrollTo?: number;
  cart: Product[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (index: number) => void;
  onClearCart: () => void;
}

const StorePage: React.FC<StorePageProps> = ({ 
  currentView, 
  currentProduct, 
  onNavigate,
  onScroll,
  scrollTo,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onClearCart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);
  
  // Async States
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // Handle incoming scroll sync from the other device
  useEffect(() => {
    if (typeof scrollTo === 'number' && containerRef.current) {
      const current = containerRef.current.scrollTop;
      // Only scroll if the difference is significant to avoid jitter/loops
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

  // Fetch orders when the orders drawer opens
  useEffect(() => {
    if (isOrdersOpen) {
      setIsLoadingOrders(true);
      api.getOrders().then(data => {
        setOrders(data);
        setIsLoadingOrders(false);
      });
    }
  }, [isOrdersOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isProgrammaticScroll.current) {
      isProgrammaticScroll.current = false;
      return;
    }
    onScroll?.(e.currentTarget.scrollTop);
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      await api.createOrder(cart);
      setCheckoutSuccess(true);
      setTimeout(() => {
        onClearCart();
        setCheckoutSuccess(false);
        setIsCartOpen(false);
        setIsOrdersOpen(true); // Open orders to show the new order
      }, 2000);
    } catch (e) {
      console.error("Checkout failed", e);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

  const renderHeader = () => (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2" onClick={() => onNavigate(ViewState.LIST)}>
        <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-bold rounded-lg cursor-pointer">
          S
        </div>
        <h1 className="font-bold text-lg tracking-tight cursor-pointer text-gray-900">ShopFlow</h1>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={() => setIsOrdersOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
        >
          <User size={20} />
        </button>
        <button 
          onClick={() => setIsCartOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-full relative text-gray-700 transition-colors"
        >
          <ShoppingCart size={20} />
          {cart.length > 0 && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
              {cart.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );

  const renderOrdersDrawer = () => (
    <>
       {isOrdersOpen && (
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsOrdersOpen(false)}
        />
      )}
      <div className={`absolute top-0 right-0 h-full w-3/4 max-w-[300px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isOrdersOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            Order History
          </h2>
          <button onClick={() => setIsOrdersOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
          {isLoadingOrders ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
              <Package size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">No orders yet.</p>
            </div>
          ) : (
            orders.map(order => (
              <div key={order.id} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-xs font-bold text-gray-900">Order #{order.id}</p>
                    <p className="text-[10px] text-gray-500">{new Date(order.date).toLocaleDateString()}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-wide">
                    {order.status}
                  </span>
                </div>
                <div className="flex -space-x-2 mb-3 overflow-hidden py-1">
                  {order.items.slice(0, 4).map((item, i) => (
                    <img key={i} src={item.image} className="w-6 h-6 rounded-full border border-white object-cover" />
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-6 h-6 rounded-full border border-white bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-500">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-50 pt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-500">{order.items.length} items</span>
                  <span className="text-sm font-bold text-gray-900">₦{order.total.toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  const renderCartDrawer = () => (
    <>
      {/* Backdrop */}
      {isCartOpen && (
        <div 
          className="absolute inset-0 bg-black/20 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsCartOpen(false)}
        />
      )}
      
      {/* Drawer */}
      <div className={`absolute top-0 right-0 h-full w-3/4 max-w-[300px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            Your Cart <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">{cart.length}</span>
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {checkoutSuccess ? (
            <div className="h-full flex flex-col items-center justify-center text-green-500 text-center animate-in zoom-in duration-300">
              <CheckCircle size={64} className="mb-4" />
              <h3 className="text-xl font-bold text-gray-900">Order Placed!</h3>
              <p className="text-gray-500 text-sm mt-2">Syncing with inventory...</p>
            </div>
          ) : cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-4">
              <ShoppingCart size={48} className="mb-3 opacity-20" />
              <p className="text-sm font-medium">Your cart is empty.</p>
              <p className="text-xs mt-1">Start adding items to sync with your friend!</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="flex gap-3 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.currency}{item.price.toLocaleString()}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onRemoveFromCart(idx)}
                  className="text-gray-400 hover:text-red-500 p-1 self-center transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {!checkoutSuccess && (
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-500 text-sm">Subtotal</span>
              <span className="font-bold text-lg text-gray-900">₦{cartTotal.toLocaleString()}</span>
            </div>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0 || isCheckingOut}
              className="w-full bg-black text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCheckingOut ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing...
                </>
              ) : (
                'Checkout'
              )}
            </button>
          </div>
        )}
      </div>
    </>
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
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddToCart(product);
                setIsCartOpen(true);
              }}
              className="absolute bottom-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:bg-black hover:text-white"
            >
              <Plus size={16} />
            </button>
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
          <div className="flex items-center gap-2">
             <button 
              onClick={() => setIsOrdersOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full text-gray-700 transition-colors"
            >
              <User size={20} />
            </button>
            <button 
              onClick={() => setIsCartOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full relative text-gray-700 transition-colors"
            >
              <ShoppingCart size={20} />
              {cart.length > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
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
            <button 
              onClick={() => {
                onAddToCart(currentProduct);
                setIsCartOpen(true);
              }}
              className="w-full bg-black text-white py-4 rounded-2xl font-semibold hover:bg-gray-900 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} /> Add to Cart
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
      className="h-full w-full overflow-y-auto bg-gray-50 no-scrollbar relative overflow-x-hidden"
    >
      {renderCartDrawer()}
      {renderOrdersDrawer()}
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
