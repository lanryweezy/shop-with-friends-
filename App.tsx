
import React, { useState, useEffect, useCallback } from 'react';
import StorePage from './components/StorePage';
import CoShopWidget from './components/CoShopWidget';
import DeviceFrame from './components/DeviceFrame';
import { syncEngine } from './services/syncService';
import { Product, SyncEvent, ViewState, ReactionType } from './types';
import { ArrowDown, Code2, Zap, Globe } from 'lucide-react';

const REACTION_EMOJIS: Record<string, string> = {
  heart: '❤️',
  laugh: '😂',
  fire: '🔥',
  cash: '💸',
  trash: '🗑️',
  shock: '😱'
};

/**
 * DEMO ENVIRONMENT COMPONENT (The Split Brain)
 * ==========================================
 * 
 * In a real world implementation:
 * 1. User A opens the site on their phone.
 * 2. User B opens the site on their laptop.
 * 3. They communicate via a WebSocket server.
 * 
 * In this Demo Component:
 * 1. We simulate BOTH phones in a single browser window.
 * 2. We maintain two completely independent state trees:
 *    - State A (Tola's Phone)
 *    - State B (Chidi's Phone)
 * 3. We use `syncService` (BroadcastChannel) to bridge them.
 * 
 * This architecture allows us to demonstrate the real-time sync capability
 * without needing a backend server for this preview.
 */
const DemoEnvironment = () => {
  // --- STATE FOR DEVICE A (User A: Tola) ---
  const [viewA, setViewA] = useState<ViewState>(ViewState.LIST);
  const [productA, setProductA] = useState<Product | null>(null);
  const [isConnectedA, setIsConnectedA] = useState(false);
  const [isInvitingA, setIsInvitingA] = useState(false);
  const [reactionsA, setReactionsA] = useState<{id: number, type: ReactionType, spreadX: number, rotate: number}[]>([]);
  const [scrollForA, setScrollForA] = useState<number | undefined>(undefined);
  const [cartA, setCartA] = useState<Product[]>([]);

  // --- STATE FOR DEVICE B (User B: Chidi) ---
  const [viewB, setViewB] = useState<ViewState>(ViewState.LIST);
  const [productB, setProductB] = useState<Product | null>(null);
  const [isConnectedB, setIsConnectedB] = useState(false);
  const [isInvitingB, setIsInvitingB] = useState(false);
  const [reactionsB, setReactionsB] = useState<{id: number, type: ReactionType, spreadX: number, rotate: number}[]>([]);
  const [scrollForB, setScrollForB] = useState<number | undefined>(undefined);
  const [cartB, setCartB] = useState<Product[]>([]);

  // --- SYNC LOGIC (The Nervous System) ---
  // This effect listens for signals from the other "device" and updates the local state.
  
  useEffect(() => {
    // Subscribe to the "Nervous System"
    const unsubscribe = syncEngine.subscribe((event: SyncEvent) => {
      
      // CASE 1: User A performed an action. Update User B.
      if (event.sourceId === 'user-a') {
        if (!isConnectedB) return; // Only sync if connected
        
        if (event.type === 'NAVIGATE') {
           setViewB(event.payload.view);
           setProductB(event.payload.product);
        } else if (event.type === 'REACTION') {
           addReaction('B', event.payload.reaction);
        } else if (event.type === 'SCROLL_REQUEST') {
           setScrollForB(event.payload.scrollTop);
        } else if (event.type === 'CART_UPDATE') {
           setCartB(event.payload.cart);
        }
      }

      // CASE 2: User B performed an action. Update User A.
      if (event.sourceId === 'user-b') {
        
        // CONNECTION HANDSHAKE:
        if (event.type === 'JOINED') {
           setIsConnectedA(true);
           setIsInvitingA(false);
           
           // Sync B's cart to A upon join (or vice versa), effectively merging or overwriting
           // For this demo, we assume they start fresh or sync to whoever acted last.
           // But in the join event, we can sync initial state if needed.
           return;
        }

        if (!isConnectedA) return;

        if (event.type === 'NAVIGATE') {
           setViewA(event.payload.view);
           setProductA(event.payload.product);
        } else if (event.type === 'REACTION') {
           addReaction('A', event.payload.reaction);
        } else if (event.type === 'SCROLL_REQUEST') {
           setScrollForA(event.payload.scrollTop);
        } else if (event.type === 'CART_UPDATE') {
           setCartA(event.payload.cart);
        }
      }
    });

    return unsubscribe;
  }, [isConnectedA, isConnectedB]);


  // --- HANDLERS ---

  const handleNavigateA = (view: ViewState, product?: Product) => {
    setViewA(view);
    setProductA(product || null);
    if (isConnectedA) {
      syncEngine.send({ type: 'NAVIGATE', payload: { view, product }, sourceId: 'user-a', timestamp: Date.now() });
    }
  };

  const handleNavigateB = (view: ViewState, product?: Product) => {
    setViewB(view);
    setProductB(product || null);
    if (isConnectedB) {
      syncEngine.send({ type: 'NAVIGATE', payload: { view, product }, sourceId: 'user-b', timestamp: Date.now() });
    }
  };

  const handleScrollA = (scrollTop: number) => {
    if (isConnectedA) {
      syncEngine.send({ type: 'SCROLL_REQUEST', payload: { scrollTop }, sourceId: 'user-a', timestamp: Date.now() });
    }
  };

  const handleScrollB = (scrollTop: number) => {
    if (isConnectedB) {
      syncEngine.send({ type: 'SCROLL_REQUEST', payload: { scrollTop }, sourceId: 'user-b', timestamp: Date.now() });
    }
  };

  // --- CART HANDLERS ---

  const updateCartA = (newCart: Product[]) => {
    setCartA(newCart);
    if (isConnectedA) {
       syncEngine.send({ type: 'CART_UPDATE', payload: { cart: newCart }, sourceId: 'user-a', timestamp: Date.now() });
    }
  }

  const updateCartB = (newCart: Product[]) => {
    setCartB(newCart);
    if (isConnectedB) {
       syncEngine.send({ type: 'CART_UPDATE', payload: { cart: newCart }, sourceId: 'user-b', timestamp: Date.now() });
    }
  }

  const handleAddToCartA = (product: Product) => updateCartA([...cartA, product]);
  const handleRemoveFromCartA = (index: number) => updateCartA(cartA.filter((_, i) => i !== index));
  const handleClearCartA = () => updateCartA([]);

  const handleAddToCartB = (product: Product) => updateCartB([...cartB, product]);
  const handleRemoveFromCartB = (index: number) => updateCartB(cartB.filter((_, i) => i !== index));
  const handleClearCartB = () => updateCartB([]);

  // --- REACTIONS ---

  const addReaction = (targetUser: 'A' | 'B', type: ReactionType) => {
    const id = Date.now() + Math.random();
    const spreadX = Math.floor(Math.random() * 400) - 200;
    const rotate = Math.floor(Math.random() * 90) - 45;

    if (targetUser === 'A') {
      setReactionsA(prev => [...prev, { id, type, spreadX, rotate }]);
      setTimeout(() => setReactionsA(prev => prev.filter(r => r.id !== id)), 2500);
    } else {
      setReactionsB(prev => [...prev, { id, type, spreadX, rotate }]);
      setTimeout(() => setReactionsB(prev => prev.filter(r => r.id !== id)), 2500);
    }
  };

  const handleReactionA = (type: ReactionType) => {
    addReaction('A', type);
    if (isConnectedA) {
      syncEngine.send({ type: 'REACTION', payload: { reaction: type }, sourceId: 'user-a', timestamp: Date.now() });
    }
  };

  const handleReactionB = (type: ReactionType) => {
    addReaction('B', type);
    if (isConnectedB) {
      syncEngine.send({ type: 'REACTION', payload: { reaction: type }, sourceId: 'user-b', timestamp: Date.now() });
    }
  };

  // --- SESSION FLOW ---

  const startSessionA = () => {
    setIsInvitingA(true);
    setIsConnectedA(false);
  };

  const joinSessionB = () => {
    setIsConnectedB(true);
    setViewB(viewA);
    setProductB(productA);
    // Also sync cart state if needed, here we just inherit A's cart for demo simplicity
    setCartB(cartA);
    
    syncEngine.send({ type: 'JOINED', payload: {}, sourceId: 'user-b', timestamp: Date.now() });
  };

  const disconnect = () => {
    setIsConnectedA(false);
    setIsConnectedB(false);
    setIsInvitingA(false);
    setIsInvitingB(false);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-12 md:py-20 relative">
      {/* Tightened gap and width to make screens move together visually */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-center max-w-[900px] w-full px-4">
        
        {/* DEVICE A FRAME (Tola) */}
        <div className="relative scale-[0.85] md:scale-100 origin-top">
          <DeviceFrame name="Tola" isOnline={true}>
             <StorePage 
                currentView={viewA} 
                currentProduct={productA} 
                onNavigate={handleNavigateA}
                onScroll={handleScrollA}
                scrollTo={scrollForA}
                userId="user-a"
                cart={cartA}
                onAddToCart={handleAddToCartA}
                onRemoveFromCart={handleRemoveFromCartA}
                onClearCart={handleClearCartA}
             />
             <CoShopWidget 
                connected={isConnectedA}
                isInviting={isInvitingA}
                onConnect={startSessionA}
                onDisconnect={disconnect}
                onReaction={handleReactionA}
                peerName="Chidi"
                localName="Tola"
                isOtherUserOnProduct={isConnectedA && productB?.id === productA?.id && !!productA}
             />
             {/* Floating Reactions Layer */}
             <div className="absolute bottom-24 left-0 w-full pointer-events-none overflow-visible h-0 z-[60]">
                {reactionsA.map(r => (
                  <div 
                    key={r.id} 
                    className="absolute bottom-0 left-1/2 animate-float-up text-4xl"
                    style={{ 
                      '--spread-x': `${r.spreadX}px`,
                      '--rotate': `${r.rotate}deg`
                    } as React.CSSProperties}
                  >
                    {REACTION_EMOJIS[r.type] || '❤️'}
                  </div>
                ))}
             </div>
          </DeviceFrame>
          {/* Action Hint */}
          {!isConnectedA && !isInvitingA && (
            <div className="absolute -left-2 md:-left-32 top-1/2 text-white text-sm font-mono w-24 text-left md:text-right opacity-50 pointer-events-none">
              Step 1:<br/> Click the Orb
            </div>
          )}
          {isInvitingA && !isConnectedA && (
            <div className="absolute -right-2 md:-right-32 top-1/2 text-white text-sm font-mono w-24 text-right md:text-left opacity-50 pointer-events-none">
              Step 2:<br/> Wait for friend
            </div>
          )}
        </div>

        {/* DEVICE B FRAME (Chidi) */}
        <div className="relative scale-[0.85] md:scale-100 origin-top md:mt-0 -mt-20">
           <DeviceFrame name="Chidi" isOnline={true}>
             <StorePage 
                currentView={viewB} 
                currentProduct={productB} 
                onNavigate={handleNavigateB}
                onScroll={handleScrollB}
                scrollTo={scrollForB}
                userId="user-b"
                cart={cartB}
                onAddToCart={handleAddToCartB}
                onRemoveFromCart={handleRemoveFromCartB}
                onClearCart={handleClearCartB}
             />
             <CoShopWidget 
                connected={isConnectedB}
                onConnect={joinSessionB} // Device B connects immediately in this demo logic
                onDisconnect={disconnect}
                onReaction={handleReactionB}
                peerName="Tola"
                localName="Chidi"
                isOtherUserOnProduct={isConnectedB && productA?.id === productB?.id && !!productB}
             />
             {/* Floating Reactions Layer */}
             <div className="absolute bottom-24 left-0 w-full pointer-events-none overflow-visible h-0 z-[60]">
                {reactionsB.map(r => (
                  <div 
                    key={r.id} 
                    className="absolute bottom-0 left-1/2 animate-float-up text-4xl"
                    style={{ 
                      '--spread-x': `${r.spreadX}px`,
                      '--rotate': `${r.rotate}deg`
                    } as React.CSSProperties}
                  >
                     {REACTION_EMOJIS[r.type] || '❤️'}
                  </div>
                ))}
             </div>
           </DeviceFrame>
           {isInvitingA && !isConnectedB && (
             <div className="absolute -right-40 top-1/2 text-white text-sm font-mono w-32 text-left opacity-50 animate-pulse hidden md:block">
               Step 3:<br/> Friend joins <br/> (Click Orb)
             </div>
           )}
        </div>

      </div>

      <style>{`
        @keyframes float-up {
          0% { 
            transform: translate(-50%, 0) scale(0.2) rotate(0deg); 
            opacity: 0; 
          }
          10% { 
            opacity: 1;
            transform: translate(-50%, -20px) scale(1);
          }
          100% { 
            transform: translate(calc(-50% + var(--spread-x)), -300px) scale(1.2) rotate(var(--rotate)); 
            opacity: 0; 
          }
        }
        .animate-float-up {
          animation: float-up 2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

// --- LANDING PAGE COMPONENT ---

const App = () => {
  const scrollToDemo = () => {
    const element = document.getElementById('live-demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600"></div>
            SyncShop
          </div>
          <button className="text-sm text-gray-400 hover:text-white transition-colors">Documentation</button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
          Now available for public preview
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000">
          The Social Spine of <br/> Commerce.
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
          Not a feature. An organ. A tiny, deceptively simple API that lets two people shop together inside any platform. Oceans apart, but scrolling as one.
        </p>
        <div className="flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
          <button 
            onClick={scrollToDemo}
            className="bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center gap-2 group"
          >
            Experience Live Demo <ArrowDown size={18} className="group-hover:translate-y-1 transition-transform"/>
          </button>
          <button className="px-8 py-4 rounded-full font-medium text-white hover:bg-white/5 transition-all border border-white/10">
            Read the Manifesto
          </button>
        </div>
      </section>

      {/* Demo Section */}
      <section id="live-demo" className="border-y border-white/5 bg-[#050505] relative overflow-hidden scroll-mt-16">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:40px_40px] pointer-events-none"></div>
        <div className="relative z-10 pt-10 text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-2">Interactive Playground</h2>
          <p className="text-gray-400">Start a session on the left device. Join on the right. Try adding to cart!</p>
        </div>
        <DemoEnvironment />
      </section>

      {/* The Architecture (Anatomy) */}
      <section className="py-24 bg-white/5 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">It’s not an app.<br/>It’s an organ.</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                SyncShop doesn't take over your platform. It attaches to it like a social spine. It provides the connective tissue that ties two human brains together while they browse your store.
              </p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0 border border-blue-500/20">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">A Shared Brain</h3>
                    <p className="text-gray-500 text-sm mt-1">One session ID. Two devices. Zero friction. No signups required.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0 border border-purple-500/20">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">The Nervous System</h3>
                    <p className="text-gray-500 text-sm mt-1">Real-time WebRTC & Websockets sync scrolling, reactions, and voice in milliseconds.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 shrink-0 border border-green-500/20">
                    <Code2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">Drop-in Parasite</h3>
                    <p className="text-gray-500 text-sm mt-1">Snap it into any e-commerce site like a Lego brick. It adapts to the host.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Snippet Visual */}
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl opacity-20 blur-lg"></div>
              <div className="relative bg-[#111] rounded-xl border border-white/10 p-6 shadow-2xl font-mono text-sm">
                <div className="flex gap-2 mb-4 opacity-50">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-gray-400 space-y-2">
                  <p><span className="text-purple-400">const</span> <span className="text-blue-400">session</span> = <span className="text-purple-400">await</span> spine.<span className="text-yellow-300">connect</span>();</p>
                  <p className="text-gray-500">// That's it. You are now synced.</p>
                  <div className="h-4"></div>
                  <p className="text-gray-500">&lt;!-- Or just drop this in --&gt;</p>
                  <p>
                    <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://api.syncshop.io/spine.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-gray-600 text-sm border-t border-white/5">
        <p>Built for the future of African Commerce.</p>
      </footer>
    </div>
  );
};

export default App;
