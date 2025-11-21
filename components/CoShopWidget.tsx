
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Sparkles, X } from 'lucide-react';
import { ReactionType } from '../types';
import { MOCK_SESSION_ID } from '../constants';

/**
 * THE FACE OF THE ORGAN
 * ======================
 * 
 * The CoShopWidget is the UI component that the user interacts with.
 * It is implemented as a Finite State Machine (FSM) with three distinct visual modes:
 * 
 * 1. DORMANT (Collapsed State)
 *    - Visual: A small, pulsating floating orb.
 *    - Behavior: Unobtrusive, waits to be clicked.
 *    - Trigger: Default state when no session is active.
 * 
 * 2. EXTENDING (Inviting State)
 *    - Visual: A modal card displaying the session link and "Waiting..." animation.
 *    - Behavior: Blocks the user from full store interaction to focus on sharing the link.
 *    - Trigger: Clicked the orb -> Starts a session.
 * 
 * 3. SYMBIOSIS (Connected State)
 *    - Visual: Heads-Up Display (HUD) with Peer Avatar and Control Bar (Mic/Video/Reactions).
 *    - Behavior: Active collaboration mode.
 *    - Trigger: Peer joins the session.
 */

interface CoShopWidgetProps {
  connected: boolean;
  isInviting?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onCopyLink?: () => void;
  onReaction: (type: ReactionType) => void;
  peerName: string;
  localName: string;
  isOtherUserOnProduct?: boolean;
}

const CoShopWidget: React.FC<CoShopWidgetProps> = ({
  connected,
  isInviting = false,
  onConnect,
  onDisconnect,
  onCopyLink,
  onReaction,
  peerName,
  localName,
  isOtherUserOnProduct
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [isTalking, setIsTalking] = useState(false);

  // Simulate voice activity visualizer (Green ring pulsation)
  useEffect(() => {
    if (connected && !isMuted) {
      const interval = setInterval(() => {
        setIsTalking(Math.random() > 0.6);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setIsTalking(false);
    }
  }, [connected, isMuted]);

  const handleCopy = () => {
    setHasCopied(true);
    if (onCopyLink) onCopyLink();
    setTimeout(() => setHasCopied(false), 2000);
  };

  // --- STATE 1: DORMANT (The Floating Organ) ---
  if (!connected && !isInviting) {
    return (
      <div className="absolute bottom-8 right-6 z-50">
        <button
          onClick={onConnect}
          className="group relative flex items-center justify-center w-16 h-16 rounded-full cursor-pointer transition-transform duration-500 hover:scale-110 active:scale-95"
        >
          {/* Organic Pulse Aura */}
          <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 opacity-40 blur-lg group-hover:opacity-70 animate-pulse-slow duration-3000"></span>
          
          {/* The Core */}
          <div className="relative w-full h-full rounded-full bg-black/80 backdrop-blur-md border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent"></div>
            <Sparkles className="w-6 h-6 text-white opacity-80 group-hover:rotate-12 transition-transform duration-500" strokeWidth={1.5} />
          </div>
          
          {/* Tooltip */}
          <span className="absolute right-full mr-4 py-1 px-3 bg-black/80 backdrop-blur text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-white/10">
            Shop Together
          </span>
        </button>
      </div>
    );
  }

  // --- STATE 2: EXTENDING (Inviting) ---
  // Only show inviting UI if NOT connected. If connected, we want to show the active call UI.
  if (isInviting && !connected) {
    return (
      <div className="absolute bottom-8 left-4 right-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-500">
        <div className="bg-gray-900/95 backdrop-blur-xl rounded-3xl p-1 shadow-2xl border border-white/10">
          <div className="p-5 relative overflow-hidden rounded-[1.4rem] bg-gradient-to-b from-white/5 to-transparent">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-white font-medium text-base tracking-tight">Summon a friend</h3>
                <p className="text-gray-400 text-xs mt-0.5">Share the link to start syncing.</p>
              </div>
              <button onClick={onDisconnect} className="text-gray-500 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full">
                <X size={16} />
              </button>
            </div>

            {/* Link Box */}
            <div 
              onClick={handleCopy}
              className="group cursor-pointer bg-black/40 border border-white/10 rounded-xl p-3 flex items-center justify-between hover:border-white/20 transition-colors mb-6"
            >
               <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <Sparkles size={14} />
                  </div>
                  <code className="text-sm text-gray-300 font-mono truncate">
                    shopwithfriends.io/j/{MOCK_SESSION_ID}
                  </code>
               </div>
               <div className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${hasCopied ? 'bg-green-500 text-white' : 'bg-white text-black'}`}>
                 {hasCopied ? 'Copied' : 'Copy'}
               </div>
            </div>
            
            {/* Waiting Animation */}
            <div className="flex items-center justify-center gap-2 py-2">
              <span className="text-xs text-gray-500">Waiting for connection</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms'}}></div>
                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms'}}></div>
                <div className="w-1 h-1 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms'}}></div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- STATE 3: SYMBIOSIS (Connected) ---
  // This is the "Heads Up Display" for the active session.
  return (
    <>
      {/* Floating Peer Bubble - The "Head" */}
      <div className="absolute top-24 right-4 z-40 flex flex-col items-end gap-2 animate-in fade-in zoom-in duration-500">
        <div className="relative w-16 h-16 rounded-full p-0.5 ring-1 ring-white/10 shadow-2xl bg-black/50 backdrop-blur-sm">
          <img 
            src={`https://picsum.photos/200/200?random=${peerName === 'Tola' ? 10 : 20}`} 
            alt="Peer" 
            className={`w-full h-full rounded-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-40' : 'opacity-100'}`} 
          />
          
          {/* Voice Activity Ring */}
          <div className={`absolute inset-0 rounded-full border-2 transition-all duration-150 ${isTalking ? 'border-green-400 scale-105' : 'border-transparent scale-100'}`}></div>
          
          {/* Status Badge - Shows if both users are looking at the same product */}
          {isOtherUserOnProduct && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-[9px] font-bold text-white px-2 py-0.5 rounded-full shadow-lg whitespace-nowrap border border-black">
              VIEWING SAME
            </div>
          )}
        </div>
      </div>

      {/* Floating Control Bar - The "Spine" */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 w-auto max-w-[95%]">
        <div className="bg-black/80 backdrop-blur-2xl rounded-full p-2 pl-4 pr-2 shadow-2xl border border-white/10 flex items-center gap-2 sm:gap-4 animate-in slide-in-from-bottom-8 fade-in duration-500 overflow-x-auto no-scrollbar">
          
          {/* Reactions - The "Digital Reflexes" */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onReaction('heart')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">❤️</button>
            <button onClick={() => onReaction('laugh')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">😂</button>
            <button onClick={() => onReaction('fire')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">🔥</button>
            <button onClick={() => onReaction('shock')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">😱</button>
            <button onClick={() => onReaction('cash')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">💸</button>
            <button onClick={() => onReaction('trash')} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-lg hover:scale-110 transition-transform active:scale-90">🗑️</button>
          </div>

          <div className="w-[1px] h-6 bg-white/10 shrink-0"></div>

          {/* Controls - The "Human Pulse" (Voice/Video) */}
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/10 text-white'}`}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500/20 text-red-500' : 'hover:bg-white/10 text-white'}`}
            >
              {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
            </button>

            <button 
              onClick={onDisconnect}
              className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white hover:bg-red-700 transition-colors shadow-lg ml-1"
            >
              <PhoneOff size={16} />
            </button>
          </div>

        </div>
      </div>
    </>
  );
};

export default CoShopWidget;