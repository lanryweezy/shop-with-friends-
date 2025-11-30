# Shop with Friends - Shopify Plugin

> Enable collaborative shopping on your Shopify store in under 5 minutes!

## Quick Install

### Step 1: Add Theme Settings

Add this to your theme's `config/settings_schema.json`:

```json
{
  "name": "Shop with Friends",
  "settings": [
    {
      "type": "checkbox",
      "id": "swf_enabled",
      "label": "Enable Shop with Friends",
      "default": true
    },
    {
      "type": "text",
      "id": "swf_api_key",
      "label": "API Key",
      "info": "Get your API key from shopwithfriends.io/dashboard"
    },
    {
      "type": "checkbox",
      "id": "swf_show_button",
      "label": "Show 'Shop Together' button",
      "default": true
    },
    {
      "type": "checkbox",
      "id": "swf_enable_voice",
      "label": "Enable voice chat",
      "default": false,
      "info": "Allows customers to talk while shopping together"
    },
    {
      "type": "select",
      "id": "swf_theme",
      "label": "Widget theme",
      "options": [
        { "value": "dark", "label": "Dark" },
        { "value": "light", "label": "Light" }
      ],
      "default": "dark"
    },
    {
      "type": "select",
      "id": "swf_position",
      "label": "Button position",
      "options": [
        { "value": "bottom-right", "label": "Bottom Right" },
        { "value": "bottom-left", "label": "Bottom Left" },
        { "value": "top-right", "label": "Top Right" },
        { "value": "top-left", "label": "Top Left" }
      ],
      "default": "bottom-right"
    },
    {
      "type": "checkbox",
      "id": "swf_show_reaction_buttons",
      "label": "Show reaction buttons",
      "default": true,
      "info": "Adds emoji reaction buttons to product pages"
    },
    {
      "type": "checkbox",
      "id": "swf_analytics_enabled",
      "label": "Track in Shopify Analytics",
      "default": true
    }
  ]
}
```

### Step 2: Add Snippet

1. In your Shopify admin, go to **Online Store > Themes**
2. Click **Actions > Edit code**
3. Under **Snippets**, click **Add a new snippet**
4. Name it: `shop-with-friends`
5. Paste the contents of [`shop-with-friends.liquid`](./shop-with-friends.liquid)
6. Save

### Step 3: Include in Product Template

Add this line to your `sections/product-template.liquid` or `sections/main-product.liquid`:

```liquid
{% render 'shop-with-friends' %}
```

**Recommended placement:** Right after the product form, before the closing `</div>`

### Step 4: Get Your API Key

1. Sign up at [shopwithfriends.io](https://shopwithfriends.io)
2. Create a new project
3. Copy your API key
4. Paste it in **Shopify Admin > Themes > Customize > Theme Settings > Shop with Friends**

### Step 5: Test It!

1. Go to any product page on your store
2. Look for the "Shop Together" button (bottom-right by default)
3. Click it to create a session
4. Open the invite link in another browser/device
5. Browse together in real-time! 🎉

---

## Features

✅ **Real-time Navigation Sync** - See what your friend is viewing  
✅ **Shared Cart** - Add items together  
✅ **Voice Chat** - Talk while shopping (optional)  
✅ **Emoji Reactions** - React to products with ❤️🔥😂  
✅ **Mobile Responsive** - Works on all devices  
✅ **Zero Config** - Works out of the box  

---

## Configuration Options

### Basic Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `swf_enabled` | Enable/disable the feature | `true` |
| `swf_api_key` | Your Shop with Friends API key | - |
| `swf_show_button` | Show floating "Shop Together" button | `true` |

### Advanced Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `swf_enable_voice` | Enable WebRTC voice chat | `false` |
| `swf_theme` | Widget color theme (`dark`/`light`) | `dark` |
| `swf_position` | Button position on screen | `bottom-right` |
| `swf_show_reaction_buttons` | Show emoji reaction buttons | `true` |
| `swf_analytics_enabled` | Track sessions in Shopify Analytics | `true` |

---

## Customization

### Custom Styling

Add this to your theme's CSS to customize the look:

```css
/* Customize Shop Together button */
.swf-invite-btn {
  background: your-brand-color !important;
}

/* Customize reaction buttons */
.swf-reaction-buttons {
  margin: 20px 0;
}

.swf-reaction-btn {
  border-color: your-brand-color !important;
}
```

### Advanced: Programmatic Control

Access the SDK directly via JavaScript:

```javascript
// Get the SDK instance
const swf = window.swf;

// Create a session manually
const session = await swf.createSession();
console.log(session.inviteLink);

// Sync custom data
swf.syncNavigation({
  url: window.location.href,
  productId: '12345',
  customData: { ... }
});

// Listen for events
swf.on('sync:cart', (data) => {
  console.log('Friend updated cart:', data.cart);
});
```

---

## Troubleshooting

### Button doesn't appear
- Check that `swf_enabled` is `true` in theme settings
- Verify your API key is correct
- Check browser console for errors

### Session not connecting
- Ensure WebSocket port 3001 isn't blocked by firewall
- Try refreshing both browser windows
- Check your Shop with Friends dashboard for API status

### Voice chat not working
- Enable `swf_enable_voice` in theme settings
- Allow microphone permissions in browser
- Ensure you're on a secure connection (HTTPS)

---

## Support

- 📧 Email: support@shopwithfriends.io
- 💬 Discord: [Join our community](https://discord.gg/shopwithfriends)
- 📚 Docs: [shopwithfriends.io/docs](https://shopwithfriends.io/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/shopwithfriends/shopify-plugin/issues)

---

## Pricing

- **Free Plan**: Up to 100 sessions/month
- **Pro Plan**: Unlimited sessions + voice chat ($49/month)
- **Enterprise**: Custom pricing for high-volume stores

[View Pricing →](https://shopwithfriends.io/pricing)

---

## What's Next?

- ✅ Shopify installation complete
- → Test with real customers
- → Monitor analytics in your dashboard
- → Upgrade to Pro for voice chat
- → Share on social media!

---

**Made with ❤️ by Street Heart Technologies**
