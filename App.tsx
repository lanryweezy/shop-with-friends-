
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
  const [reactionsA, setReactionsA] = useState<{ id: number, type: ReactionType, spreadX: number, rotate: number }[]>([]);
  const [scrollForA, setScrollForA] = useState<number | undefined>(undefined);
  const [cartA, setCartA] = useState<Product[]>([]);

  // --- STATE FOR DEVICE B (User B: Chidi) ---
  const [viewB, setViewB] = useState<ViewState>(ViewState.LIST);
  const [productB, setProductB] = useState<Product | null>(null);
  const [isConnectedB, setIsConnectedB] = useState(false);
  const [isInvitingB, setIsInvitingB] = useState(false);
  const [reactionsB, setReactionsB] = useState<{ id: number, type: ReactionType, spreadX: number, rotate: number }[]>([]);
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
              Step 1:<br /> Click the Orb
            </div>
          )}
          {isInvitingA && !isConnectedA && (
            <div className="absolute -right-2 md:-right-32 top-1/2 text-white text-sm font-mono w-24 text-right md:text-left opacity-50 pointer-events-none">
              Step 2:<br /> Wait for friend
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
              Step 3:<br /> Friend joins <br /> (Click Orb)
            </div>
          )}
        </div>

      </div>

      <style>{`
        @keyframes float-up {
          0% { 
            transform: translate(-50%, 20px) scale(0.5) rotate(0deg); 
            opacity: 0; 
          }
          15% { 
            opacity: 1;
            transform: translate(-50%, -60px) scale(1.3) rotate(calc(var(--rotate) * 0.5));
          }
          100% { 
            transform: translate(calc(-50% + var(--spread-x)), -600px) scale(0.8) rotate(var(--rotate)); 
            opacity: 0; 
          }
        }
        .animate-float-up {
          animation: float-up 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          will-change: transform, opacity;
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

  const scrollToManifesto = () => {
    const element = document.getElementById('manifesto');
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
            Shop with Friends
          </div>
          <a
            href="/docs.html"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Documentation
          </a>
        </div>
      </nav>

      {/* Hero */}
      {/* Hero */}
      <section className="relative pt-20 pb-20 md:pt-32 md:pb-32 px-4 md:px-6 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero-split.png"
            className="w-full h-full object-cover opacity-60"
            alt="Friends connecting digitally across locations"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/70 to-[#0a0a0a]"></div>
        </div>

        <div className="relative z-10 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-purple-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            Now available for public preview
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 md:mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-6 duration-1000 drop-shadow-2xl">
            The Social Spine of <br /> Commerce.
          </h1>
          <p className="text-lg sm:text-xl text-gray-200 max-w-2xl mx-auto mb-8 md:mb-10 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100 drop-shadow-lg font-medium px-4">
            Simple API that lets two people shop together inside any platform. Oceans apart, but scrolling as one.
          </p>
          <div className="flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200 px-4">
            <button
              onClick={scrollToDemo}
              className="w-full sm:w-auto bg-white text-black px-8 py-4 rounded-full font-semibold hover:bg-gray-200 transition-all flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,255,255,0.3)] touch-manipulation"
            >
              Experience Live Demo <ArrowDown size={18} className="group-hover:translate-y-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section id="live-demo" className="border-y border-white/5 bg-[#050505] relative overflow-hidden scroll-mt-16">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:40px_40px] pointer-events-none"></div>
        <div className="relative z-10 pt-10 text-center px-4">
          <h2 className="text-2xl font-bold text-white mb-2">See It In Action</h2>
          <p className="text-gray-400">Watch Tola and Chidi shop together. Start a session on the left. Join on the right. Try it yourself!</p>
        </div>
        <DemoEnvironment />
      </section>

      {/* Benefits for Store Owners - RIGHT AFTER DEMO */}
      <section className="py-16 md:py-24 px-4 md:px-6 bg-white/5 border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-12 md:mb-20">
            <div className="text-left">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 md:mb-6 leading-tight">
                Let Your Customers Bring<br />Their Friends to Your Shop
              </h2>
              <p className="text-base md:text-lg text-gray-400 leading-relaxed mb-6 md:mb-8">
                Turn browsing into conversation. Turn hesitation into confidence. Turn solo shopping into social experiences that drive sales.
              </p>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-30 blur-lg group-hover:opacity-50 transition-opacity duration-500"></div>
              <img
                src="/images/shopping-friends.png"
                alt="Friends shopping together"
                className="relative rounded-2xl shadow-2xl w-full object-cover transform rotate-2 group-hover:rotate-0 transition-all duration-500 border border-white/10"
              />
            </div>
          </div>

          {/* Bento Grid - Benefits with Stats */}
          <div className="grid md:grid-cols-2 gap-6 relative">
            {/* Animated Background Mesh */}
            <div className="absolute inset-0 -z-10 overflow-hidden rounded-3xl">
              <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
              <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
            </div>

            {/* Card 1 - Higher Conversion (Large) */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 hover:border-purple-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-20 h-20 mb-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl p-4 flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>

                {/* Stat */}
                <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 md:mb-4 tracking-tight">
                  2.5x
                </div>

                {/* Title */}
                <h3 className="text-xl md:text-2xl font-bold mb-2 md:mb-3 text-white">Higher Conversion</h3>

                {/* Description */}
                <p className="text-gray-400 text-sm md:text-base leading-relaxed">
                  Friends convince friends. When customers shop together via voice, they validate each other's purchases. Decision made faster.
                </p>

                {/* Stat Label */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <p className="text-sm text-gray-500 uppercase tracking-wider">vs. solo browsing</p>
                </div>
              </div>
            </div>

            {/* Card 2 - Bigger Carts */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 hover:border-pink-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl p-3 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>

                {/* Stat */}
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2 md:mb-3 tracking-tight">
                  +45%
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2 text-white">Bigger Carts</h3>

                {/* Description */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  "You should get this too!" Shared recommendations drive average order values up.
                </p>
              </div>
            </div>

            {/* Card 3 - Brand Loyalty */}
            <div className="bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-8 hover:border-emerald-500/30 transition-all duration-500 group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-16 h-16 mb-4 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-3 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  </div>
                </div>

                {/* Stat */}
                <div className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent mb-2 md:mb-3 tracking-tight">
                  3x
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-2 text-white">Brand Loyalty</h3>

                {/* Description */}
                <p className="text-gray-400 text-sm leading-relaxed">
                  Longer sessions. Customers remember experiences, not just checkouts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Simple */}
      <section className="py-16 md:py-24 px-4 md:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-8 md:mb-12">
            Simple for Your Customers
          </h2>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            <div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl mx-auto mb-4">1</div>
              <h3 className="font-semibold text-lg mb-2">Click "Shop Together"</h3>
              <p className="text-gray-400 text-sm">One button on your product page. That's it.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl mx-auto mb-4">2</div>
              <h3 className="font-semibold text-lg mb-2">Share the Link</h3>
              <p className="text-gray-400 text-sm">Send to a friend via WhatsApp, text, anywhere.</p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xl mx-auto mb-4">3</div>
              <h3 className="font-semibold text-lg mb-2">Shop & Talk Together</h3>
              <p className="text-gray-400 text-sm">Voice starts automatically. Browse, react, decide together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Integration - Technical stuff comes AFTER benefits */}
      <section className="py-16 md:py-20 px-4 md:px-6 bg-white/5 border-y border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 md:mb-4">Install in 5 Minutes</h2>
            <p className="text-gray-400 text-base md:text-lg">Works with Shopify, WooCommerce, or any platform. No complicated setup.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Shopify */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0">
                  <svg role="img" viewBox="0 0 24 24" className="w-8 h-8 fill-[#95BF47]" xmlns="http://www.w3.org/2000/svg"><title>Shopify</title><path d="M15.337 23.979l7.216-1.561s-2.604-17.613-2.625-17.73c-.018-.116-.114-.192-.211-.192s-1.929-.136-1.929-.136-1.275-1.274-1.439-1.411c-.045-.037-.075-.057-.121-.074l-.914 21.104h.023zM11.71 11.305s-.81-.424-1.774-.424c-1.447 0-1.504.906-1.504 1.141 0 1.232 3.24 1.715 3.24 4.629 0 2.295-1.44 3.76-3.406 3.76-2.354 0-3.54-1.465-3.54-1.465l.646-2.086s1.245 1.066 2.28 1.066c.675 0 .975-.545.975-.932 0-1.619-2.654-1.694-2.654-4.359-.034-2.237 1.571-4.416 4.827-4.416 1.257 0 1.875.361 1.875.361l-.945 2.715-.02.01zM11.17.83c.136 0 .271.038.405.135-.984.465-2.064 1.639-2.508 3.992-.656.213-1.293.405-1.889.578C7.697 3.75 8.951.84 11.17.84V.83zm1.235 2.949v.135c-.754.232-1.583.484-2.394.736.466-1.777 1.333-2.645 2.085-2.971.193.501.309 1.176.309 2.1zm.539-2.234c.694.074 1.141.867 1.429 1.755-.349.114-.735.231-1.158.366v-.252c0-.752-.096-1.371-.271-1.871v.002zm2.992 1.289c-.02 0-.06.021-.078.021s-.289.075-.714.21c-.423-1.233-1.176-2.37-2.508-2.37h-.115C12.135.209 11.669 0 11.265 0 8.159 0 6.675 3.877 6.21 5.846c-1.194.365-2.063.636-2.16.674-.675.213-.694.232-.772.87-.075.462-1.83 14.063-1.83 14.063L15.009 24l.927-21.166z" /></svg>
                </div>
                <h3 className="text-xl md:text-2xl font-bold">Shopify</h3>
              </div>
              <p className="text-gray-400 mb-6">Drop in our Liquid snippet. Configure your API key. Done.</p>
              <ul className="space-y-2 text-sm text-gray-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> 5-minute setup
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Works with any theme
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Auto voice chat enabled
                </li>
              </ul>
            </div>

            {/* WooCommerce */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0">
                  <svg role="img" viewBox="0 0 24 24" className="w-8 h-8 fill-[#720EEC]" xmlns="http://www.w3.org/2000/svg"><title>WooCommerce</title><path d="M.754 9.58a.754.754 0 00-.754.758v2.525c0 .42.339.758.758.758h3.135l1.431.799-.326-.799h2.373a.757.757 0 00.758-.758v-2.525a.757.757 0 00-.758-.758H.754zm2.709.445h.03c.065.001.124.023.179.067a.26.26 0 01.103.19.29.29 0 01-.033.16c-.13.239-.236.64-.322 1.199-.083.541-.114.965-.094 1.267a.392.392 0 01-.039.219.213.213 0 01-.176.12c-.086.006-.177-.034-.263-.124-.31-.316-.555-.788-.735-1.416-.216.425-.375.744-.478.957-.196.376-.363.568-.502.578-.09.007-.166-.069-.233-.228-.17-.436-.352-1.277-.548-2.524a.297.297 0 01.054-.222c.047-.064.116-.095.21-.102.169-.013.265.065.288.238.103.695.217 1.284.336 1.766l.727-1.387c.066-.126.15-.192.25-.199.146-.01.237.083.273.28.083.441.188.817.315 1.136.086-.844.233-1.453.44-1.828a.255.255 0 01.218-.147zm1.293.36c.056 0 .116.006.18.02.232.05.411.177.53.386.107.18.161.395.161.654 0 .343-.087.654-.26.94-.2.332-.459.5-.781.5a.88.88 0 01-.18-.022.763.763 0 01-.531-.384 1.287 1.287 0 01-.158-.659c0-.342.085-.655.258-.937.202-.333.462-.498.78-.498zm2.084 0c.056 0 .116.006.18.02.236.05.411.177.53.386.107.18.16.395.16.654 0 .343-.086.654-.259.94-.2.332-.459.5-.781.5a.88.88 0 01-.18-.022.763.763 0 01-.531-.384 1.287 1.287 0 01-.16-.659c0-.342.087-.655.26-.937.202-.333.462-.498.78-.498zm4.437.047c-.305 0-.546.102-.718.304-.173.203-.256.49-.256.856 0 .395.086.697.256.906.17.21.418.316.744.316.315 0 .559-.107.728-.316.17-.21.256-.504.256-.883s-.087-.673-.26-.879c-.176-.202-.424-.304-.75-.304zm-1.466.002a1.13 1.13 0 00-.84.326c-.223.22-.332.499-.332.838 0 .362.108.658.328.88.22.223.505.336.861.336.103 0 .22-.016.346-.052v-.54c-.117.034-.216.051-.303.051a.545.545 0 01-.422-.177c-.106-.12-.16-.278-.16-.48 0-.19.053-.348.156-.468a.498.498 0 01.397-.181c.103 0 .212.015.332.049v-.537a1.394 1.394 0 00-.363-.045zm12.414 0a1.135 1.135 0 00-.84.326c-.223.22-.332.499-.332.838 0 .362.108.658.328.88.22.223.506.336.861.336.103 0 .22-.016.346-.052v-.54c-.116.034-.216.051-.303.051a.545.545 0 01-.422-.177c-.106-.12-.16-.278-.16-.48 0-.19.053-.348.156-.468a.498.498 0 01.397-.181c.103 0 .212.015.332.049v-.537a1.394 1.394 0 00-.363-.045zm-9.598.06l-.29 2.264h.579l.156-1.559.395 1.559h.412l.379-1.555.164 1.555h.603l-.304-2.264h-.791l-.12.508c-.03.13-.06.264-.087.4l-.067.352a29.97 29.97 0 00-.258-1.26h-.771zm2.768 0l-.29 2.264h.579l.156-1.559.396 1.559h.412l.375-1.555.165 1.555h.603l-.305-2.264h-.789l-.119.508c-.03.13-.06.264-.086.4l-.066.352c-.063-.352-.15-.771-.26-1.26h-.771zm3.988 0v2.264h.611v-1.031h.012l.494 1.03h.645l-.489-1.019a.61.61 0 00.37-.552.598.598 0 00-.25-.506c-.167-.123-.394-.186-.68-.186h-.713zm3.377 0v2.264H24v-.483h-.63v-.414h.54v-.468h-.54v-.416h.626v-.483H22.76zm-4.793.004v2.264h1.24v-.483h-.627v-.416h.541v-.468h-.54v-.415h.622v-.482h-1.236zm2.025.432c.146.003.25.025.313.072.063.046.091.12.091.227 0 .156-.135.236-.404.24v-.54zm-15.22.011c-.104 0-.205.069-.301.211a1.078 1.078 0 00-.2.639c0 .096.02.2.06.303.049.13.117.198.196.215.083.016.173-.02.27-.106.123-.11.205-.273.252-.492.016-.077.023-.16.023-.246 0-.097-.02-.2-.06-.303-.05-.13-.116-.198-.196-.215a.246.246 0 00-.045-.006zm2.083 0c-.103 0-.204.069-.3.211a1.078 1.078 0 00-.2.639c0 .096.02.2.06.303.049.13.117.198.196.215.083.016.173-.02.27-.106.123-.11.205-.273.252-.492.013-.077.023-.16.023-.246 0-.097-.02-.2-.06-.303-.05-.13-.116-.198-.196-.215a.246.246 0 00-.045-.006zm4.428.006c.233 0 .354.218.354.66-.004.273-.038.46-.098.553a.293.293 0 01-.262.139.266.266 0 01-.242-.139c-.056-.093-.084-.28-.084-.562 0-.436.11-.65.332-.65Z" /></svg>
                </div>
                <h3 className="text-2xl font-bold">WooCommerce</h3>
              </div>
              <p className="text-gray-400 mb-6">Upload WordPress plugin. Activate. Add API key. You're live.</p>
              <ul className="space-y-2 text-sm text-gray-400 mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> 2-minute install
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Admin settings panel
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Full cart synchronization
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* The Architecture (Anatomy) */}
      <section id="manifesto" className="py-24 bg-white/5 border-y border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">It’s not an app.<br />It’s an organ.</h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-8">
                Shop with Friends doesn't take over your platform. It attaches to it like a social spine. It provides the connective tissue that ties two human brains together while they browse your store.
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
                    <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://api.shopwithfriends.io/spine.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span>
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
