# Shop with Friends SDK

Add real-time collaborative shopping, voice chat, and synchronized browsing to any e-commerce site with a single line of code.

## Features

- 🛍️ **Real-time Cart Sync**: Synchronize cart actions between users instantly.
- 🎤 **Voice Chat**: Built-in high-quality voice chat for users to talk while they shop.
- 🖱️ **Cursor Tracking**: See where your friends are looking and clicking.
- 🔗 **Easy Integration**: Works with Shopify, WooCommerce, or any custom stack.

## Installation

```bash
npm install shop-with-friends
```

## Quick Start

### 1. Import and Initialize

```javascript
import { ShopWithFriends } from 'shop-with-friends';

const swf = new ShopWithFriends({
  elementId: 'swf-container', // ID of the element to mount the UI
  apiKey: 'YOUR_API_KEY',     // Optional
  voiceEnabled: true          // Enable voice chat by default
});
```

### 2. Start a Session

```javascript
// Create a new session
const session = await swf.createSession({
  userId: 'user-123',
  userName: 'Alice'
});

console.log('Invite Link:', session.inviteLink);
```

### 3. Join a Session

If a user visits with `?join=SESSION_ID` in the URL, the SDK automatically handles joining.

## API Reference

### `createSession(options)`
Creates a new collaborative session.

### `joinSession(sessionId)`
Joins an existing session.

### `enableVoice()` / `disableVoice()`
Control voice chat functionality.

## License

MIT
