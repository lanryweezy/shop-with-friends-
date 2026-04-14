import type { ShopWithFriends } from '../index.js';
import type { ShopWithFriendsConfig } from '../index.js';

export class UIManager {
  private sdk: ShopWithFriends;
  private config: ShopWithFriendsConfig;
  private container: HTMLDivElement | null = null;
  private dock: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private cursorsContainer: HTMLDivElement | null = null;
  private videoContainer: HTMLDivElement | null = null;
  private chatContainer: HTMLDivElement | null = null;
  private cartContainer: HTMLDivElement | null = null;
  private toastContainer: HTMLDivElement | null = null;
  private isFollowing: boolean = false;
  private isHandlingRemoteScroll: boolean = false;
  private participants: Map<string, string> = new Map(); // userId -> userName
  private remoteCursors: Map<string, HTMLDivElement> = new Map(); // userId -> cursor element
  private remoteVideos: Map<string, HTMLVideoElement> = new Map(); // userId -> video element
  private labels: any;

  constructor(sdk: ShopWithFriends, config: ShopWithFriendsConfig) {
    this.sdk = sdk;
    this.config = config;
    this.initLabels();
  }

  private initLabels(): void {
      this.labels = {
          shopTogether: 'Shop Together',
          inviteFriends: 'Share this link to invite friends to your session:',
          copyLink: 'Copy Link',
          joinFriend: 'Join Friend',
          enterName: 'Your friend invited you to shop together! Enter your name to join:',
          joinSession: 'Join Session',
          sharedCart: 'Shared Cart',
          cartEmpty: "Your friend's cart is empty",
          chat: 'Chat',
          typeMessage: 'Type a message...',
          videoChat: 'Video Chat',
          voiceChat: 'Voice Chat',
          followFriend: 'Follow Friend',
          nowFollowing: "👀 Now following friend's view",
          stoppedFollowing: 'Stopped following',
          friendJoined: 'Friend joined',
          friendLeft: 'Friend left',
          jumpToThem: 'Jump to them',
          ...this.config.labels
      };
  }

  /**
   * Render UI components
   */
  render(): void {
    this.createContainer();
    this.createCursorsContainer();
    this.createVideoContainer();
    this.createChatContainer();
    this.createCartContainer();
    this.createToastContainer();
    this.renderDock();
    this.setupEventListeners();
    this.injectStyles();
    this.setupMouseTracking();
    this.setupScrollTracking();
  }

  /**
   * Show invite modal
   */
  showInviteModal(inviteLink: string): void {
    if (this.modal) this.modal.remove();

    this.modal = document.createElement('div');
    this.modal.className = 'swf-modal';
    this.modal.innerHTML = `
      <div class="swf-modal-overlay"></div>
      <div class="swf-modal-content">
        <button class="swf-modal-close">&times;</button>
        <div class="swf-modal-header">
          <div class="swf-modal-icon">🛍️</div>
          <h3>${this.labels.shopTogether}</h3>
        </div>
        <p>${this.labels.inviteFriends}</p>
        
        <div class="swf-invite-link-container">
          <input type="text" readonly value="${inviteLink}" class="swf-invite-link" id="swf-invite-link-input" />
          <button class="swf-copy-btn" id="swf-copy-btn">${this.labels.copyLink}</button>
        </div>

        <div class="swf-share-label">Or share via:</div>
        <div class="swf-share-buttons">
          <button class="swf-share-btn swf-whatsapp" data-platform="whatsapp">WhatsApp</button>
          <button class="swf-share-btn swf-telegram" data-platform="telegram">Telegram</button>
          <button class="swf-share-btn swf-email" data-platform="email">Email</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Event listeners
    const closeBtn = this.modal.querySelector('.swf-modal-close');
    const overlay = this.modal.querySelector('.swf-modal-overlay');
    const copyBtn = this.modal.querySelector('#swf-copy-btn') as HTMLButtonElement;
    const shareButtons = this.modal.querySelectorAll('.swf-share-btn');

    const close = () => {
      this.modal?.classList.add('swf-closing');
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
      }, 300);
    };

    closeBtn?.addEventListener('click', close);
    overlay?.addEventListener('click', close);
    copyBtn?.addEventListener('click', () => this.copyInviteLink(inviteLink, copyBtn));

    shareButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const platform = (e.target as HTMLElement).getAttribute('data-platform');
        if (platform) this.shareLink(inviteLink, platform);
      });
    });
  }

  /**
   * Show join session modal
   */
  showJoinModal(sessionId: string): void {
    if (this.modal) this.modal.remove();

    this.modal = document.createElement('div');
    this.modal.className = 'swf-modal';
    this.modal.innerHTML = `
      <div class="swf-modal-overlay"></div>
      <div class="swf-modal-content">
        <div class="swf-modal-header">
          <div class="swf-modal-icon">👋</div>
          <h3>${this.labels.joinFriend}</h3>
        </div>
        <p>${this.labels.enterName}</p>

        <div class="swf-join-container">
          <input type="text" placeholder="Your Name" class="swf-name-input" id="swf-name-input" />
          <button class="swf-join-btn" id="swf-join-btn">${this.labels.joinSession}</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    const joinBtn = this.modal.querySelector('#swf-join-btn') as HTMLButtonElement;
    const nameInput = this.modal.querySelector('#swf-name-input') as HTMLInputElement;

    const handleJoin = async () => {
        const name = nameInput.value.trim() || 'Friend';
        joinBtn.disabled = true;
        joinBtn.innerHTML = '<span class="swf-spinner"></span> Joining...';

        try {
            await this.sdk.joinSession(sessionId, name);
            this.modal?.remove();
            this.modal = null;
            this.updateDockContent();
        } catch (error) {
            alert('Failed to join session');
            joinBtn.disabled = false;
            joinBtn.textContent = 'Join Session';
        }
    };

    joinBtn.addEventListener('click', handleJoin);
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoin();
    });

    nameInput.focus();
  }

  destroy(): void {
    this.container?.remove();
    this.modal?.remove();
  }

  // --- Private Methods ---

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = `swf-container swf-${this.config.position} swf-theme-${this.config.theme || 'dark'}`;
    document.body.appendChild(this.container);
  }

  private createCursorsContainer(): void {
    this.cursorsContainer = document.createElement('div');
    this.cursorsContainer.className = 'swf-cursors-container';
    this.cursorsContainer.style.position = 'fixed';
    this.cursorsContainer.style.inset = '0';
    this.cursorsContainer.style.pointerEvents = 'none';
    this.cursorsContainer.style.zIndex = '999998';
    document.body.appendChild(this.cursorsContainer);
  }

  private createToastContainer(): void {
      this.toastContainer = document.createElement('div');
      this.toastContainer.className = 'swf-toast-container';
      document.body.appendChild(this.toastContainer);
  }

  private createCartContainer(): void {
      this.cartContainer = document.createElement('div');
      this.cartContainer.className = 'swf-cart-container swf-hidden';
      this.cartContainer.innerHTML = `
          <div class="swf-cart-header">
              <span>${this.labels.sharedCart}</span>
              <button class="swf-cart-close" id="swf-cart-close-btn">&times;</button>
          </div>
          <div class="swf-cart-items" id="swf-cart-items">
              <div class="swf-cart-empty">${this.labels.cartEmpty}</div>
          </div>
      `;
      this.container?.appendChild(this.cartContainer);

      this.cartContainer.querySelector('#swf-cart-close-btn')?.addEventListener('click', () => {
          this.cartContainer?.classList.add('swf-hidden');
      });
  }

  private createChatContainer(): void {
    this.chatContainer = document.createElement('div');
    this.chatContainer.className = 'swf-chat-container swf-hidden';
    this.chatContainer.innerHTML = `
        <div class="swf-chat-header">
            <span>${this.labels.chat}</span>
            <button class="swf-chat-close" id="swf-chat-close-btn">&times;</button>
        </div>
        <div class="swf-chat-messages" id="swf-chat-messages"></div>
        <div class="swf-chat-input-container">
            <input type="text" placeholder="${this.labels.typeMessage}" class="swf-chat-input" id="swf-chat-input" />
        </div>
    `;
    this.container?.appendChild(this.chatContainer);

    const input = this.chatContainer.querySelector('#swf-chat-input') as HTMLInputElement;
    const sendMsg = () => {
        const text = input.value.trim();
        if (text) {
            this.sdk.sendChatMessage(text);
            this.addChatMessage('Me', text, true);
            input.value = '';
        }
    };

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMsg();
    });

    this.chatContainer.querySelector('#swf-chat-close-btn')?.addEventListener('click', () => {
        this.chatContainer?.classList.add('swf-hidden');
    });
  }

  private createVideoContainer(): void {
    this.videoContainer = document.createElement('div');
    this.videoContainer.className = 'swf-video-container swf-hidden';
    this.videoContainer.innerHTML = `
        <div class="swf-video-header">
            <span>${this.labels.videoChat}</span>
            <button class="swf-video-minimize" id="swf-video-min-btn">&minus;</button>
        </div>
        <div class="swf-video-grid"></div>
    `;
    this.container?.appendChild(this.videoContainer);

    this.videoContainer.querySelector('#swf-video-min-btn')?.addEventListener('click', () => {
        this.videoContainer?.classList.toggle('swf-minimized');
    });
  }

  private renderDock(): void {
    if (!this.container) return;

    this.dock = document.createElement('div');
    this.dock.className = 'swf-dock';

    // Initial State: Just the main button
    this.updateDockContent();

    this.container.appendChild(this.dock);
  }

  private updateDockContent(): void {
    if (!this.dock) return;

    const isInSession = this.sdk.isInSession();
    const participantCount = this.participants.size + 1; // +1 for self

    if (!isInSession) {
      // IDLE STATE
      this.dock.innerHTML = `
        <button class="swf-main-btn" id="swf-start-btn">
          <div class="swf-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <span class="swf-btn-text">${this.labels.shopTogether}</span>
        </button>
      `;
      this.dock.querySelector('#swf-start-btn')?.addEventListener('click', () => this.handleInviteClick());
      this.dock.classList.remove('swf-dock-expanded');
    } else {
      // ACTIVE SESSION STATE
      this.dock.classList.add('swf-dock-expanded');
      this.dock.innerHTML = `
        <div class="swf-dock-content">
          <div class="swf-avatars">
            ${this.renderAvatars()}
          </div>
          
          <div class="swf-divider"></div>
          
          <div class="swf-controls">
            <button class="swf-control-btn ${this.config.enableVoice ? '' : 'swf-hidden'}" id="swf-voice-btn" title="${this.labels.voiceChat}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
              </svg>
            </button>

            <button class="swf-control-btn ${this.config.enableVideo ? '' : 'swf-hidden'}" id="swf-video-btn" title="${this.labels.videoChat}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2z"></path>
                <path d="m23 7-7 5 7 5"></path>
              </svg>
            </button>
            
            <button class="swf-control-btn" id="swf-chat-btn" title="Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </button>

            <button class="swf-control-btn" id="swf-cart-btn" title="${this.labels.sharedCart}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </button>

            <button class="swf-control-btn" id="swf-follow-btn" title="${this.labels.followFriend}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>

            <button class="swf-control-btn" id="swf-invite-more-btn" title="Invite More">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            
            <button class="swf-control-btn swf-danger" id="swf-leave-btn" title="Leave Session">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Re-attach listeners
      this.dock.querySelector('#swf-voice-btn')?.addEventListener('click', (e) => this.handleVoiceToggle(e.currentTarget as HTMLButtonElement));
      this.dock.querySelector('#swf-video-btn')?.addEventListener('click', (e) => this.handleVideoToggle(e.currentTarget as HTMLButtonElement));
      this.dock.querySelector('#swf-cart-btn')?.addEventListener('click', () => {
          this.cartContainer?.classList.toggle('swf-hidden');
      });
      this.dock.querySelector('#swf-chat-btn')?.addEventListener('click', () => {
          this.chatContainer?.classList.toggle('swf-hidden');
          if (!this.chatContainer?.classList.contains('swf-hidden')) {
              (this.chatContainer?.querySelector('#swf-chat-input') as HTMLInputElement)?.focus();
          }
      });
      this.dock.querySelector('#swf-follow-btn')?.addEventListener('click', (e) => {
          this.isFollowing = !this.isFollowing;
          const btn = e.currentTarget as HTMLButtonElement;
          if (this.isFollowing) {
              btn.classList.add('swf-active');
              this.showToast(this.labels.nowFollowing);
          } else {
              btn.classList.remove('swf-active');
              this.showToast(this.labels.stoppedFollowing);
          }
      });
      this.dock.querySelector('#swf-invite-more-btn')?.addEventListener('click', () => this.handleInviteClick());
      this.dock.querySelector('#swf-leave-btn')?.addEventListener('click', () => this.handleLeave());
    }
  }

  private renderAvatars(): string {
    // Generate avatars for participants
    // For now, we just show circles with initials
    let html = `<div class="swf-avatar swf-avatar-self" title="You">Me</div>`;

    this.participants.forEach((name, id) => {
      const initial = name.charAt(0).toUpperCase();
      html += `<div class="swf-avatar" title="${name}">${initial}</div>`;
    });

    return html;
  }

  private async handleInviteClick(): Promise<void> {
    try {
      if (!this.sdk.isInSession()) {
        const btn = this.dock?.querySelector('#swf-start-btn');
        if (btn) btn.innerHTML = '<span class="swf-spinner"></span> Creating...';

        const session = await this.sdk.createSession();
        this.showInviteModal(session.inviteLink);
        this.updateDockContent();
      } else {
        const sessionId = this.sdk.getSessionId();
        const inviteLink = `${window.location.origin}${window.location.pathname}?join=${sessionId}`;
        this.showInviteModal(inviteLink);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Could not create session. Please try again.');
      this.updateDockContent(); // Reset UI
    }
  }

  private async handleVoiceToggle(btn: HTMLButtonElement): Promise<void> {
    if (btn.classList.contains('swf-active')) {
      this.sdk.stopVoice();
      btn.classList.remove('swf-active');
    } else {
      try {
        await this.sdk.startVoice();
        btn.classList.add('swf-active');
      } catch (e) {
        alert('Could not access microphone');
      }
    }
  }

  private async handleVideoToggle(btn: HTMLButtonElement): Promise<void> {
    if (btn.classList.contains('swf-active')) {
      await this.sdk.setVideo(false);
      btn.classList.remove('swf-active');
    } else {
      try {
        await this.sdk.setVideo(true);
        btn.classList.add('swf-active');
      } catch (e) {
        alert('Could not access camera');
      }
    }
  }

  private async handleLeave(): Promise<void> {
    if (confirm('Are you sure you want to leave the shopping session?')) {
      await this.sdk.leaveSession();
      this.participants.clear();
      this.remoteCursors.forEach(c => c.remove());
      this.remoteCursors.clear();
      this.remoteVideos.forEach(v => v.remove());
      this.remoteVideos.clear();
      if (this.videoContainer) this.videoContainer.classList.add('swf-hidden');
      this.updateDockContent();
    }
  }

  private copyInviteLink(link: string, button: HTMLButtonElement): void {
    navigator.clipboard.writeText(link).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copied!';
      button.classList.add('swf-copied');
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('swf-copied');
      }, 2000);
    });
  }

  private shareLink(link: string, platform: string): void {
    const text = 'Shop with me! Join my session:';
    let url = '';
    switch (platform) {
      case 'whatsapp': url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`; break;
      case 'telegram': url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`; break;
      case 'email': url = `mailto:?subject=Shop with me&body=${encodeURIComponent(text + ' ' + link)}`; break;
    }
    if (url) window.open(url, '_blank');
  }

  private setupEventListeners(): void {
    this.sdk.on('ws:sessionJoined', () => this.updateDockContent());

    this.sdk.on('ws:participantJoined', (user: any) => {
      const name = user.userName || 'Friend';
      this.participants.set(user.userId, name);
      this.addChatMessage('System', `${name} ${this.labels.friendJoined}`, false, true);
      this.updateDockContent();
    });

    this.sdk.on('ws:participantLeft', (user: any) => {
      const name = this.participants.get(user.userId) || 'Friend';
      this.participants.delete(user.userId);
      this.addChatMessage('System', `${name} ${this.labels.friendLeft}`, false, true);
      this.removeRemoteCursor(user.userId);
      this.updateDockContent();
    });

    this.sdk.on('sync:cursor_move', (data: any) => {
      this.updateRemoteCursor(data.sourceId, data.x, data.y, data.pageX, data.pageY, data.width, data.height);
    });

    this.sdk.on('webrtc:remoteStream', (data: any) => {
      this.addRemoteVideo(data.peerId, data.stream);
    });

    this.sdk.on('webrtc:peerDisconnected', (peerId: string) => {
      this.removeRemoteVideo(peerId);
    });

    this.sdk.on('webrtc:videoToggled', (data: any) => {
        if (data.enabled) {
            this.videoContainer?.classList.remove('swf-hidden');
        } else if (this.remoteVideos.size === 0) {
            this.videoContainer?.classList.add('swf-hidden');
        }
    });

    this.sdk.on('sync:chat_message', (data: any) => {
        const name = this.participants.get(data.sourceId) || 'Friend';
        this.addChatMessage(name, data.message, false);
        this.chatContainer?.classList.remove('swf-hidden');
    });

    this.sdk.on('sync:scroll_request', (data: any) => {
        if (this.isFollowing) {
            this.handleRemoteScroll(data);
        }
    });

    this.sdk.on('sync:navigate', (data: any) => {
        const name = this.participants.get(data.sourceId) || 'Friend';
        if (this.isFollowing && data.url && data.url !== window.location.href) {
            window.location.href = data.url;
        } else {
            this.showJumpToast(name, data);
        }
    });

    this.sdk.on('sync:cart_update', (data: any) => {
        this.showToast('🛒 Friend updated their cart');
        this.updateCartUI(data.cart);
    });

    this.sdk.on('sync:reaction', (data: any) => {
        this.showFloatingReaction(data.reaction);
    });
  }

  private showToast(message: string): void {
      if (!this.toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'swf-toast';
      toast.textContent = message;
      this.toastContainer.appendChild(toast);
      setTimeout(() => {
          toast.classList.add('swf-toast-out');
          setTimeout(() => toast.remove(), 500);
      }, 3000);
  }

  private showJumpToast(sender: string, data: any): void {
      if (!this.toastContainer) return;
      const toast = document.createElement('div');
      toast.className = 'swf-toast swf-toast-jump';

      const text = document.createElement('span');
      text.textContent = `${sender} is viewing `;
      const strong = document.createElement('strong');
      strong.textContent = data.productName || 'another product';
      text.appendChild(strong);

      const btn = document.createElement('button');
      btn.className = 'swf-jump-btn';
      btn.textContent = this.labels.jumpToThem;
      btn.addEventListener('click', () => {
          if (data.url) window.location.href = data.url;
      });

      toast.appendChild(text);
      toast.appendChild(btn);
      this.toastContainer.appendChild(toast);

      setTimeout(() => {
          toast.classList.add('swf-toast-out');
          setTimeout(() => toast.remove(), 500);
      }, 8000);
  }

  private showFloatingReaction(type: string): void {
      const emojiMap: Record<string, string> = {
          heart: '❤️',
          fire: '🔥',
          laugh: '😂',
          shock: '😱'
      };

      const emoji = emojiMap[type] || '❤️';
      const container = document.createElement('div');
      container.className = 'swf-floating-reaction';
      container.textContent = emoji;

      // Randomize animation properties
      const spreadX = Math.floor(Math.random() * 200) - 100;
      const rotate = Math.floor(Math.random() * 60) - 30;

      container.style.setProperty('--spread-x', `${spreadX}px`);
      container.style.setProperty('--rotate', `${rotate}deg`);

      // Mount to container and animate
      this.container?.appendChild(container);

      setTimeout(() => container.remove(), 2500);
  }

  private handleRemoteScroll(data: any): void {
      // Logic to sync scroll position
      // We use a flag to prevent feedback loops
      this.isHandlingRemoteScroll = true;

      // Proportional scroll if document heights differ
      const myHeight = document.documentElement.scrollHeight - window.innerHeight;
      const peerHeight = data.docHeight - data.viewHeight;

      const ratio = (peerHeight > 0 && myHeight > 0) ? myHeight / peerHeight : 1;
      const targetY = data.scrollTop * ratio;

      window.scrollTo({
          top: targetY,
          left: data.scrollLeft,
          behavior: 'auto'
      });

      setTimeout(() => {
          this.isHandlingRemoteScroll = false;
      }, 150);
  }

  private updateCartUI(cart: any[]): void {
      const itemsContainer = this.cartContainer?.querySelector('#swf-cart-items');
      if (!itemsContainer) return;

      if (!cart || cart.length === 0) {
          itemsContainer.innerHTML = '';
          const empty = document.createElement('div');
          empty.className = 'swf-cart-empty';
          empty.textContent = this.labels.cartEmpty;
          itemsContainer.appendChild(empty);
          return;
      }

      itemsContainer.innerHTML = '';
      cart.forEach(item => {
          const div = document.createElement('div');
          div.className = 'swf-cart-item';

          const name = document.createElement('div');
          name.className = 'swf-item-name';
          name.textContent = item.name || 'Product';

          const meta = document.createElement('div');
          meta.className = 'swf-item-meta';
          meta.textContent = `${item.quantity || 1} x ${item.price || 'Price'}`;

          div.appendChild(name);
          div.appendChild(meta);
          itemsContainer.appendChild(div);
      });
  }

  private addChatMessage(sender: string, text: string, isSelf: boolean, isSystem: boolean = false): void {
    const messages = this.chatContainer?.querySelector('#swf-chat-messages');
    if (messages) {
        const div = document.createElement('div');
        div.className = `swf-chat-message ${isSelf ? 'swf-chat-self' : ''} ${isSystem ? 'swf-chat-system' : ''}`;

        const senderDiv = document.createElement('div');
        senderDiv.className = 'swf-chat-sender';
        senderDiv.textContent = sender;

        const textDiv = document.createElement('div');
        textDiv.className = 'swf-chat-text';
        textDiv.textContent = text;

        div.appendChild(senderDiv);
        div.appendChild(textDiv);
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }
  }

  private addRemoteVideo(peerId: string, stream: MediaStream): void {
    if (!this.videoContainer) return;
    this.videoContainer.classList.remove('swf-hidden');
    const grid = this.videoContainer.querySelector('.swf-video-grid');
    if (!grid) return;

    let video = this.remoteVideos.get(peerId);
    if (!video) {
        video = document.createElement('video');
        video.className = 'swf-remote-video';
        video.autoplay = true;
        video.playsInline = true;

        // Add name label to video
        const container = document.createElement('div');
        container.className = 'swf-remote-video-container';
        const label = document.createElement('div');
        label.className = 'swf-video-label';
        label.textContent = this.participants.get(peerId) || 'Friend';

        container.appendChild(video);
        container.appendChild(label);
        grid.appendChild(container);
        this.remoteVideos.set(peerId, video);
    }
    video.srcObject = stream;
  }

  private removeRemoteVideo(peerId: string): void {
    const video = this.remoteVideos.get(peerId);
    if (video) {
        video.remove();
        this.remoteVideos.delete(peerId);
    }
    if (this.remoteVideos.size === 0) {
        this.videoContainer?.classList.add('swf-hidden');
    }
  }

  private setupMouseTracking(): void {
    let lastSend = 0;
    const throttle = 50; // ms

    window.addEventListener('mousemove', (e) => {
      if (!this.sdk.isInSession()) return;

      const now = Date.now();
      if (now - lastSend > throttle) {
        this.sdk.syncCursor(e.clientX, e.clientY);
        lastSend = now;
      }
    });
  }

  private setupScrollTracking(): void {
      let lastSend = 0;
      const throttle = 100; // ms

      window.addEventListener('scroll', () => {
          if (!this.sdk.isInSession()) return;

          // Don't sync if we are currently handling a remote scroll
          if (this.isHandlingRemoteScroll) return;

          const now = Date.now();
          if (now - lastSend > throttle) {
              this.sdk.syncScroll(window.scrollY, window.scrollX);
              lastSend = now;
          }
      }, { passive: true });
  }

  private updateRemoteCursor(userId: string, x: number, y: number, pageX: number, pageY: number, width: number, height: number): void {
    if (!this.cursorsContainer) return;

    let cursor = this.remoteCursors.get(userId);
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'swf-remote-cursor';

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '20');
      svg.setAttribute('height', '20');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('fill', 'currentColor');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5.653 3.123l15.911 8.132a1.146 1.146 0 01.015 2.049l-5.451 2.73-2.73 5.451a1.146 1.146 0 01-2.049-.015L3.123 5.653a1.146 1.146 0 011.53-1.53z');
      svg.appendChild(path);

      const label = document.createElement('div');
      label.className = 'swf-cursor-label';
      label.textContent = this.participants.get(userId) || 'Friend';

      cursor.appendChild(svg);
      cursor.appendChild(label);

      this.cursorsContainer.appendChild(cursor);
      this.remoteCursors.set(userId, cursor);
    }

    // Adjust position based on viewport differences
    const scaleX = window.innerWidth / width;
    const scaleY = window.innerHeight / height;

    // Since cursorsContainer is fixed and inset: 0, x and y (clientX/Y)
    // are relative to the viewport. Scaling handles different screen sizes.
    cursor.style.transform = `translate(${x * scaleX}px, ${y * scaleY}px)`;

    // Check if we should update label if it changed
    const label = cursor.querySelector('.swf-cursor-label');
    if (label) {
      const currentName = this.participants.get(userId) || 'Friend';
      if (label.textContent !== currentName) {
        label.textContent = currentName;
      }
    }
  }

  private removeRemoteCursor(userId: string): void {
    const cursor = this.remoteCursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.remoteCursors.delete(userId);
    }
  }

  private injectStyles(): void {
    if (document.getElementById('swf-styles')) return;

    const style = document.createElement('style');
    style.id = 'swf-styles';
    style.textContent = `
      .swf-container {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .swf-bottom-right { bottom: 24px; right: 24px; }
      .swf-bottom-left { bottom: 24px; left: 24px; }

      /* --- DOCK UI --- */
      .swf-dock {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border-radius: 24px;
        padding: 6px;
        transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        align-items: center;
      }

      .swf-dock:hover {
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        transform: translateY(-2px);
      }

      .swf-main-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        background: linear-gradient(135deg, #111 0%, #333 100%);
        color: white;
        border: none;
        padding: 8px 16px 8px 8px;
        border-radius: 20px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .swf-icon-wrapper {
        width: 32px;
        height: 32px;
        background: rgba(255,255,255,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .swf-dock-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 6px;
      }

      .swf-avatars {
        display: flex;
        align-items: center;
        margin-left: 4px;
      }

      .swf-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #e5e7eb;
        border: 2px solid white;
        margin-left: -10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        color: #4b5563;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .swf-avatar:first-child { margin-left: 0; }
      .swf-avatar-self { background: #7c3aed; color: white; border-color: #7c3aed; z-index: 2; }

      .swf-divider {
        width: 1px;
        height: 24px;
        background: rgba(0,0,0,0.1);
      }

      .swf-controls {
        display: flex;
        gap: 4px;
      }

      .swf-control-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: transparent;
        color: #4b5563;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }

      .swf-control-btn:hover { background: rgba(0,0,0,0.05); color: #111; }
      .swf-control-btn.swf-active { background: #ef4444; color: white; animation: swf-pulse 2s infinite; }
      .swf-control-btn.swf-danger:hover { background: #fee2e2; color: #ef4444; }

      /* --- MODAL --- */
      .swf-modal {
        position: fixed;
        inset: 0;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        animation: swf-fade-in 0.3s forwards;
      }

      .swf-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(8px);
      }

      .swf-modal-content {
        position: relative;
        background: white;
        width: 90%;
        max-width: 420px;
        border-radius: 24px;
        padding: 32px;
        box-shadow: 0 24px 48px rgba(0,0,0,0.2);
        transform: scale(0.95);
        animation: swf-scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .swf-modal-header {
        text-align: center;
        margin-bottom: 24px;
      }

      .swf-modal-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .swf-modal-content h3 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #111;
      }

      .swf-modal-content p {
        text-align: center;
        color: #6b7280;
        margin-bottom: 24px;
        line-height: 1.5;
      }

      .swf-invite-link-container {
        display: flex;
        gap: 8px;
        margin-bottom: 24px;
      }

      .swf-invite-link {
        flex: 1;
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        font-family: monospace;
        font-size: 14px;
        color: #374151;
      }

      .swf-join-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .swf-name-input {
        background: #f3f4f6;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 12px;
        font-size: 16px;
        color: #111;
        outline: none;
        transition: border-color 0.2s;
      }
      .swf-name-input:focus { border-color: #7c3aed; }

      .swf-join-btn {
        background: #7c3aed;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 12px;
        font-weight: 600;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .swf-join-btn:hover { background: #6d28d9; transform: translateY(-1px); }
      .swf-join-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

      .swf-copy-btn {
        background: #111;
        color: white;
        border: none;
        border-radius: 12px;
        padding: 0 20px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .swf-copy-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
      .swf-copy-btn.swf-copied { background: #10b981; }

      .swf-share-label {
        text-align: center;
        font-size: 12px;
        color: #9ca3af;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
      }

      .swf-share-buttons {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      }

      .swf-share-btn {
        padding: 10px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        color: #4b5563;
        cursor: pointer;
        transition: all 0.2s;
      }

      .swf-share-btn:hover { background: #f9fafb; border-color: #d1d5db; }

      .swf-modal-close {
        position: absolute;
        top: 20px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        color: #9ca3af;
        cursor: pointer;
        transition: color 0.2s;
      }
      .swf-modal-close:hover { color: #111; }

      /* Animations */
      @keyframes swf-fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes swf-scale-in { from { transform: scale(0.95); } to { transform: scale(1); } }
      @keyframes swf-pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
      
      .swf-spinner {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: swf-spin 1s linear infinite;
        margin-right: 8px;
      }
      @keyframes swf-spin { to { transform: rotate(360deg); } }
      
      .swf-hidden { display: none !important; }

      .swf-remote-cursor {
        position: absolute;
        top: 0;
        left: 0;
        color: #7c3aed;
        transition: transform 0.1s linear;
        z-index: 1000;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }

      .swf-cursor-label {
        position: absolute;
        left: 12px;
        top: 12px;
        background: #7c3aed;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: 600;
        white-space: nowrap;
      }

      .swf-video-container {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 180px;
        background: rgba(15, 15, 15, 0.9);
        backdrop-filter: blur(12px);
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .swf-video-container.swf-minimized {
        height: 40px;
        width: 120px;
      }

      .swf-video-container.swf-minimized .swf-video-grid {
        display: none;
      }

      .swf-video-header {
        padding: 8px 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: rgba(255,255,255,0.6);
        border-bottom: 1px solid rgba(255,255,255,0.05);
      }

      .swf-video-minimize {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 16px;
        padding: 0 4px;
      }

      .swf-video-grid {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 8px;
        max-height: 400px;
        overflow-y: auto;
      }

      .swf-remote-video {
        width: 100%;
        height: 110px;
        background: #000;
        border-radius: 10px;
        object-fit: cover;
        border: 1px solid rgba(255,255,255,0.1);
      }

      /* --- THEME SUPPORT --- */
      .swf-theme-light .swf-chat-container,
      .swf-theme-light .swf-cart-container {
          background: white;
          color: #111;
          border-color: #e5e7eb;
      }
      .swf-theme-dark .swf-chat-container,
      .swf-theme-dark .swf-cart-container {
          background: #1a1a1a;
          color: white;
          border-color: rgba(255,255,255,0.1);
      }

      .swf-theme-dark .swf-chat-header,
      .swf-theme-dark .swf-cart-header {
          background: #242424;
          border-color: rgba(255,255,255,0.1);
          color: white;
      }

      .swf-theme-dark .swf-chat-text {
          background: #333;
          color: white;
      }
      .swf-theme-dark .swf-cart-item {
          background: #242424;
          border-color: rgba(255,255,255,0.05);
      }
      .swf-theme-dark .swf-item-name { color: white; }
      .swf-theme-dark .swf-item-meta { color: rgba(255,255,255,0.5); }
      .swf-theme-dark .swf-chat-input,
      .swf-theme-dark .swf-name-input {
          background: #242424;
          border-color: rgba(255,255,255,0.1);
          color: white;
      }

      /* --- CHAT --- */
      .swf-chat-container {
        position: absolute;
        bottom: 80px;
        right: 200px;
        width: 280px;
        height: 350px;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 12px 48px rgba(0,0,0,0.2);
        overflow: hidden;
        border: 1px solid #e5e7eb;
      }

      .swf-chat-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
      }

      .swf-chat-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
      }

      .swf-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .swf-chat-message {
        align-self: flex-start;
        max-width: 80%;
      }
      .swf-chat-self { align-self: flex-end; }

      .swf-chat-sender {
        font-size: 10px;
        font-weight: 700;
        color: #6b7280;
        margin-bottom: 2px;
        margin-left: 4px;
      }
      .swf-chat-self .swf-chat-sender { text-align: right; margin-right: 4px; }

      .swf-chat-text {
        background: #f3f4f6;
        padding: 8px 12px;
        border-radius: 14px;
        font-size: 13px;
        color: #111;
        line-height: 1.4;
      }
      .swf-chat-self .swf-chat-text { background: #7c3aed; color: white; }

      .swf-chat-system {
          align-self: center;
          max-width: 90%;
      }
      .swf-chat-system .swf-chat-sender { display: none; }
      .swf-chat-system .swf-chat-text {
          background: transparent;
          color: #9ca3af;
          font-style: italic;
          font-size: 11px;
          text-align: center;
          padding: 4px;
      }

      .swf-chat-input-container {
        padding: 12px;
        border-top: 1px solid #e5e7eb;
      }

      .swf-chat-input {
        width: 100%;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 13px;
        outline: none;
      }
      .swf-chat-input:focus { border-color: #7c3aed; }

      /* --- TOASTS --- */
      .swf-toast-container {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 1000002;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      }

      .swf-toast {
        background: #111;
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        animation: swf-toast-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        pointer-events: auto;
        border: 1px solid rgba(255,255,255,0.1);
      }

      .swf-toast-jump {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #7c3aed;
      }

      .swf-jump-btn {
          background: white;
          color: #7c3aed;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
      }

      .swf-toast-out {
          animation: swf-toast-out 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes swf-toast-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
      }
      /* --- CART --- */
      .swf-cart-container {
        position: absolute;
        bottom: 80px;
        right: 0;
        width: 300px;
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 12px 48px rgba(0,0,0,0.2);
        overflow: hidden;
        border: 1px solid #e5e7eb;
        max-height: 400px;
      }

      .swf-cart-header {
        padding: 12px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-weight: 700;
      }

      .swf-cart-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
      }

      .swf-cart-items {
        overflow-y: auto;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .swf-cart-empty {
          padding: 32px;
          text-align: center;
          color: #9ca3af;
          font-size: 13px;
      }

      .swf-cart-item {
          padding: 10px 12px;
          border-radius: 8px;
          background: #f9fafb;
          border: 1px solid #f3f4f6;
      }

      .swf-item-name {
          font-size: 13px;
          font-weight: 600;
          color: #111;
          margin-bottom: 2px;
      }

      .swf-item-meta {
          font-size: 11px;
          color: #6b7280;
      }

      @keyframes swf-toast-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
      }

      /* --- MOBILE RESPONSIVENESS --- */
      @media (max-width: 600px) {
          .swf-chat-container, .swf-cart-container {
              width: calc(100vw - 32px);
              right: 16px;
              left: 16px;
              bottom: 100px;
              height: 50vh;
          }
          .swf-video-container {
              width: 140px;
              bottom: 90px;
          }
          .swf-toast-container {
              left: 16px;
              right: 16px;
              top: 16px;
          }
          .swf-floating-reaction {
              font-size: 24px;
          }
      }

      /* --- REACTIONS --- */
      .swf-floating-reaction {
          position: absolute;
          bottom: 40px;
          left: 50%;
          font-size: 32px;
          pointer-events: none;
          z-index: 1000003;
          animation: swf-float-up 2.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          will-change: transform, opacity;
      }

      @keyframes swf-float-up {
          0% {
            transform: translate(-50%, 0) scale(0.5) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translate(-50%, -40px) scale(1.2) rotate(calc(var(--rotate) * 0.5));
          }
          100% {
            transform: translate(calc(-50% + var(--spread-x)), -400px) scale(0.8) rotate(var(--rotate));
            opacity: 0;
          }
      }
    `;
    document.head.appendChild(style);
  }
}
