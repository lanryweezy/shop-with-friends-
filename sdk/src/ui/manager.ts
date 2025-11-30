/**
 * UI Manager
 * Manages all UI components
 */

import type { ShopWithFriends } from '../index.js';
import type { ShopWithFriendsConfig } from '../index.js';

export class UIManager {
  private sdk: ShopWithFriends;
  private config: ShopWithFriendsConfig;
  private container: HTMLDivElement | null = null;
  private inviteButton: HTMLButtonElement | null = null;
  private voiceButton: HTMLButtonElement | null = null;
  private modal: HTMLDivElement | null = null;

  constructor(sdk: ShopWithFriends, config: ShopWithFriendsConfig) {
    this.sdk = sdk;
    this.config = config;
  }

  /**
   * Render UI components
   */
  render(): void {
    this.createContainer();

    if (this.config.showInviteButton) {
      this.renderInviteButton();
    }

    if (this.config.enableVoice) {
      this.renderVoiceButton();
    }

    this.setupEventListeners();
    this.injectStyles();
  }

  /**
   * Show invite modal
   */
  showInviteModal(inviteLink: string): void {
    if (this.modal) {
      this.modal.remove();
    }

    this.modal = document.createElement('div');
    this.modal.className = 'swf-modal';
    this.modal.innerHTML = `
      <div class="swf-modal-overlay"></div>
      <div class="swf-modal-content">
        <button class="swf-modal-close">&times;</button>
        <h3>Invite Friends to Shop Together!</h3>
        <p>Share this link with friends to shop together in real-time:</p>
        <div class="swf-invite-link-container">
          <input 
            type="text" 
            readonly 
            value="${inviteLink}" 
            class="swf-invite-link"
            id="swf-invite-link-input"
          />
          <button class="swf-copy-btn" id="swf-copy-btn">Copy</button>
        </div>
        <div class="swf-share-buttons">
          <button class="swf-share-btn swf-share-whatsapp" data-platform="whatsapp">
            WhatsApp
          </button>
          <button class="swf-share-btn swf-share-telegram" data-platform="telegram">
            Telegram
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Event listeners for modal
    const closeBtn = this.modal.querySelector('.swf-modal-close');
    const overlay = this.modal.querySelector('.swf-modal-overlay');
    const copyBtn = this.modal.querySelector('#swf-copy-btn') as HTMLButtonElement;
    const shareButtons = this.modal.querySelectorAll('.swf-share-btn');

    closeBtn?.addEventListener('click', () => this.closeModal());
    overlay?.addEventListener('click', () => this.closeModal());
    copyBtn?.addEventListener('click', () => this.copyInviteLink(inviteLink, copyBtn));

    shareButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const platform = (e.target as HTMLElement).getAttribute('data-platform');
        if (platform) this.shareLink(inviteLink, platform);
      });
    });
  }

  /**
   * Destroy UI
   */
  destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  // Private methods

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = `swf-container swf-${this.config.position}`;
    document.body.appendChild(this.container);
  }

  private renderInviteButton(): void {
    this.inviteButton = document.createElement('button');
    this.inviteButton.className = 'swf-invite-btn';
    this.inviteButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
      <span>Shop Together</span>
    `;

    this.inviteButton.addEventListener('click', () => this.handleInviteClick());
    this.container?.appendChild(this.inviteButton);
  }

  private renderVoiceButton(): void {
    this.voiceButton = document.createElement('button');
    this.voiceButton.className = 'swf-voice-btn';
    this.voiceButton.style.display = 'none'; // Hidden until in session
    this.voiceButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        `;

    this.voiceButton.addEventListener('click', () => this.handleVoiceClick());
    this.container?.appendChild(this.voiceButton);
  }

  private async handleVoiceClick(): Promise<void> {
    if (!this.voiceButton) return;

    if (this.voiceButton.classList.contains('swf-active')) {
      // End call
      this.sdk.stopVoice();
      this.voiceButton.classList.remove('swf-active');
      this.voiceButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
            `;
    } else {
      // Start call
      try {
        await this.sdk.startVoice();
        this.voiceButton.classList.add('swf-active');
        this.voiceButton.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                `;
      } catch (error) {
        console.error('Failed to start voice:', error);
        alert('Could not access microphone');
      }
    }

  }

  private async handleInviteClick(): Promise<void> {
    try {
      if (this.sdk.isInSession()) {
        // Already in session, show modal with existing link
        const sessionId = this.sdk.getSessionId();
        const inviteLink = `${window.location.origin}${window.location.pathname}?join=${sessionId}`;
        this.showInviteModal(inviteLink);
      } else {
        // Create new session
        this.inviteButton!.disabled = true;
        this.inviteButton!.innerHTML = '<span>Creating...</span>';

        const session = await this.sdk.createSession();
        this.showInviteModal(session.inviteLink);

        this.inviteButton!.disabled = false;
        this.inviteButton!.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>In Session</span>
        `;
        this.inviteButton!.classList.add('swf-active');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session. Please try again.');
      this.inviteButton!.disabled = false;
    }
  }

  private closeModal(): void {
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
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
    const text = 'Shop with me! Join my shopping session:';
    let url = '';

    switch (platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text + ' ' + link)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        break;
    }

    if (url) {
      window.open(url, '_blank');
    }
  }

  private setupEventListeners(): void {
    // Update button state when joining/leaving sessions
    this.sdk.on('ws:sessionJoined', () => {
      if (this.inviteButton) {
        this.inviteButton.classList.add('swf-active');
        const span = this.inviteButton.querySelector('span');
        if (span) span.textContent = 'In Session';
      }
      if (this.voiceButton) {
        this.voiceButton.style.display = 'flex';
      }
    });

    this.sdk.on('ws:sessionLeft', () => {
      if (this.inviteButton) {
        this.inviteButton.classList.remove('swf-active');
        const span = this.inviteButton.querySelector('span');
        if (span) span.textContent = 'Shop Together';
      }
      if (this.voiceButton) {
        this.voiceButton.style.display = 'none';
        this.voiceButton.classList.remove('swf-active');
      }
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
        display: flex;
        gap: 12px;
        align-items: center;
      }

      .swf-bottom-right { bottom: 24px; right: 24px; }
      .swf-bottom-left { bottom: 24px; left: 24px; }
      .swf-top-right { top: 24px; right: 24px; }
      .swf-top-left { top: 24px; left: 24px; }

      .swf-invite-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 999px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        transition: all 0.3s;
      }

      .swf-invite-btn:hover {
        transform: translate Y(-2px);
        box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
      }

      .swf-invite-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .swf-invite-btn.swf-active {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .swf-voice-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: white;
        border: 1px solid #e5e7eb;
        color: #4b5563;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
      }

      .swf-voice-btn:hover {
        background: #f3f4f6;
        transform: translateY(-2px);
      }

      .swf-voice-btn.swf-active {
        background: #ef4444;
        color: white;
        border-color: #ef4444;
        animation: pulse 2s infinite;
      }

      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }

      .swf-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1000000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .swf-modal-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
      }

      .swf-modal-content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      }

      .swf-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 32px;
        color: #9ca3af;
        cursor: pointer;
        line-height: 1;
        padding: 0;
        width: 32px;
        height: 32px;
      }

      .swf-modal-content h3 {
        margin: 0 0 12px 0;
        font-size: 24px;
        color: #111;
      }

      .swf-modal-content p {
        margin: 0 0 24px 0;
        color: #6b7280;
        font-size: 15px;
      }

      .swf-invite-link-container {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
      }

      .swf-invite-link {
        flex: 1;
        padding: 12px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        font-family: monospace;
      }

      .swf-copy-btn {
        padding: 12px 24px;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }

      .swf-copy-btn:hover {
        background: #5a67d8;
      }

      .swf-copy-btn.swf-copied {
        background: #10b981;
      }

      .swf-share-buttons {
        display: flex;
        gap: 12px;
      }

      .swf-share-btn {
        flex: 1;
        padding: 12px;
        border: 1px solid #e5e7eb;
        background: white;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .swf-share-btn:hover {
        background: #f3f4f6;
        border-color: #667eea;
      }

      @media (max-width: 640px) {
        .swf-modal-content {
          padding: 24px;
        }

        .swf-invite-btn span {
          display: none;
        }
      }
    `;

    document.head.appendChild(style);
  }
}
