import type { ShopWithFriends } from '../index.js';
import type { ShopWithFriendsConfig } from '../index.js';

export class UIManager {
  private sdk: ShopWithFriends;
  private config: ShopWithFriendsConfig;
  private container: HTMLDivElement | null = null;
  private dock: HTMLDivElement | null = null;
  private modal: HTMLDivElement | null = null;
  private participants: Map<string, string> = new Map(); // userId -> userName

  constructor(sdk: ShopWithFriends, config: ShopWithFriendsConfig) {
    this.sdk = sdk;
    this.config = config;
  }

  /**
   * Render UI components
   */
  render(): void {
    this.createContainer();
    this.renderDock();
    this.setupEventListeners();
    this.injectStyles();
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
          <h3>Shop Together</h3>
        </div>
        <p>Share this link to invite friends to your session:</p>
        
        <div class="swf-invite-link-container">
          <input type="text" readonly value="${inviteLink}" class="swf-invite-link" id="swf-invite-link-input" />
          <button class="swf-copy-btn" id="swf-copy-btn">Copy Link</button>
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

  destroy(): void {
    this.container?.remove();
    this.modal?.remove();
  }

  // --- Private Methods ---

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = `swf-container swf-${this.config.position}`;
    document.body.appendChild(this.container);
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
          <span class="swf-btn-text">Shop Together</span>
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
            <button class="swf-control-btn ${this.config.enableVoice ? '' : 'swf-hidden'}" id="swf-voice-btn" title="Voice Chat">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
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

  private handleLeave(): void {
    if (confirm('Are you sure you want to leave the shopping session?')) {
      // this.sdk.leaveSession(); // Assuming SDK has this method, if not we reload
      window.location.reload();
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
      this.participants.set(user.userId, user.userName || 'Friend');
      this.updateDockContent();
    });

    this.sdk.on('ws:participantLeft', (user: any) => {
      this.participants.delete(user.userId);
      this.updateDockContent();
    });
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
      .swf-avatar-self { background: #111; color: white; border-color: #111; z-index: 2; }

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
    `;
    document.head.appendChild(style);
  }
}
