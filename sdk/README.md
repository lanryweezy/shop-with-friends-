# Shop with Friends SDK

JavaScript SDK for adding real-time collaborative shopping to any e-commerce platform.

## 🚀 Quick Start

### Installation

**Via NPM:**
```bash
npm install @shopwithfriends/sdk
```

**Via CDN (coming soon):**
```html
<script src="https://cdn.shopwithfriends.io/v1/swf.js"></script>
```

### Usage

```javascript
import ShopWithFriends from '@shopwithfriends/sdk';

const swf = new ShopWithFriends({
  apiKey: 'your_api_key_here',
  productId: 'product-123',
  productName: 'Awesome Product'
});

await swf.init();
```

That's it! A "Shop Together" button will appear in the bottom-right corner.

## 📖 API Reference

### Initialization

```javascript
const swf = new ShopWithFriends({
  // Required
  apiKey: string,
  
  // Optional
  apiUrl?: string,               // Default: 'wss://api.shopwithfriends.io'
  productId?: string,
  productName?: string,
  
  // UI Options
  showInviteButton?: boolean,    // Default: true
  showParticipants?: boolean,    // Default: true
  showNotifications?: boolean,   // Default: true
  theme?: 'dark' | 'light',      // Default: 'dark'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
  
  // Callbacks
  onSessionCreated?: (session) => void,
  onParticipantJoined?: (user) => void,
  onParticipantLeft?: (user) => void,
  onSync?: (event) => void,
  onError?: (error) => void
});
```

### Methods

#### `init()`
Initialize the SDK and connect to the WebSocket server.

```javascript
await swf.init();
```

#### `createSession(metadata?)`
Create a new shopping session.

```javascript
const session = await swf.createSession({
  storeName: 'My Store'
});
console.log(session.inviteLink);
```

#### `joinSession(sessionId, userName?)`
Join an existing session.

```javascript
await swf.joinSession('sess_abc123', 'John Doe');
```

#### `syncNavigation(data)`
Sync navigation to all participants.

```javascript
swf.syncNavigation({
  productId: '123',
  productName: 'Office Chair',
  url: window.location.href
});
```

#### `syncCart(cart)`
Sync cart updates.

```javascript
swf.syncCart([
  { id: '123', name: 'Chair', quantity: 1, price: 299.99 }
]);
```

#### `sendReaction(reaction)`
Send an emoji reaction.

```javascript
swf.sendReaction('fire'); // 🔥
```

### Events

Listen for events using `.on()`:

```javascript
swf.on('sync:navigate', (data) => {
  console.log('Friend viewed product:', data.productName);
});

swf.on('sync:cart_update', (data) => {
  console.log('Friend updated cart:', data.cart);
});

swf.on('sync:reaction', (data) => {
  console.log('Friend reacted:', data.reaction);
});
```

## 🧪 Testing

Open `test.html` in your browser to see the SDK in action:

```bash
# Make sure the API server is running
npm run dev:api

# Open test.html in browser
open sdk/test.html
```

## 📦 Development

### Project Structure

```
sdk/
├── src/
│   ├── index.ts          # Main SDK class
│   ├── websocket.ts      # WebSocket client
│   ├── session.ts        # Session management
│   ├── events.ts         # Event emitter
│   └── ui/
│       └── manager.ts    # UI components
├── package.json
├── test.html             # Test page
└── README.md
```

### Building

Coming soon - build process with bundler (Vite/Rollup).

## 📝 License

MIT

## 🤝 Support

- Email: lanryweezy@gmail.com
- LinkedIn: [Sulaiman Adebayo](https://www.linkedin.com/in/sulaiman-olanrewaju-adebayo-b7b29612a/)
