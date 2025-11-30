# Shop with Friends - WooCommerce Plugin

> Add collaborative shopping to your WooCommerce store in minutes!

## Quick Install

### Method 1: WordPress Admin (Recommended)

1. Download `shop-with-friends.zip` from [Releases](https://github.com/shopwithfriends/woocommerce-plugin/releases)
2. In WordPress admin, go to **Plugins > Add New**
3. Click **Upload Plugin**
4. Choose the downloaded ZIP file
5. Click **Install Now**
6. Click **Activate**
7. Go to **Settings > Shop with Friends**
8. Enter your API key
9. Done! 🎉

### Method 2: Manual Install

1. Download `shop-with-friends.php`
2. Upload to `/wp-content/plugins/shop-with-friends/`
3. Activate via **Plugins** menu in WordPress
4. Configure in **Settings > Shop with Friends**

---

## Configuration

### Get API Key

1. Sign up at [shopwithfriends.io](https://shopwithfriends.io)
2. Create a new project
3. Copy your API key
4. Paste in **WordPress Admin > Settings > Shop with Friends > API Key**

### Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Enable Plugin** | Turn on/off the feature | ✅ On |
| **API Key** | Your Shop with Friends API key | - |
| **Show Button** | Display "Shop Together" button | ✅ On |
| **Enable Voice Chat** | WebRTC voice while shopping | ❌ Off |
| **Theme** | Widget color scheme | Dark |
| **Button Position** | Where to show the button | Bottom Right |
| **Show Reactions** | Emoji reaction buttons | ✅ On |

---

## Features

✅ **Automatic Integration** - Works on all product pages  
✅ **Cart Synchronization** - Share cart with friends  
✅ **Real-time Navigation** - Browse together  
✅ **Voice Chat** - Talk while shopping (Pro)  
✅ **Emoji Reactions** - React to products  
✅ **Mobile Responsive** - Works everywhere  

---

## How It Works

1. **Customer Clicks "Shop Together"**
   - Creates a session
   - Gets an invite link

2. **Friend Joins via Link**
   - Opens link on their device
   - Joins the session automatically

3. **Shop Together!**
   - See what each other is viewing
   - Share cart items
   - React with emojis
   - Talk via voice chat (if enabled)

---

## Customization

### Custom CSS

Add to your theme's `style.css`:

```css
/* Customize Shop Together button */
.swf-invite-btn {
  background: #your-color !important;
}

/* Customize reactions */
.swf-reaction-buttons {
  margin: 30px 0;
  justify-content: center;
}
```

### Programmatic Access

Access SDK via JavaScript:

```javascript
// In your theme's JS file
jQuery(document).ready(function($) {
  // Get SDK instance
  const swf = window.swf;
  
  // Create session
  swf.createSession().then(session => {
    console.log('Session created:', session.inviteLink);
  });
  
  // Listen for events
  swf.on('participant:joined', (user) => {
    alert(user.userName + ' joined!');
  });
});
```

---

## Hooks & Filters

### Actions

```php
// Before SDK initialization
do_action('swf_before_init', $product_id);

// After SDK initialization
do_action('swf_after_init', $product_id, $config);

// When session created
do_action('swf_session_created', $session_id);
```

### Filters

```php
// Modify SDK config
add_filter('swf_config', function($config, $product) {
  $config['customField'] = 'your-value';
  return $config;
}, 10, 2);

// Disable on specific products
add_filter('swf_should_load', function($should_load, $product_id) {
  if ($product_id == 123) {
    return false; // Disable for product 123
  }
  return $should_load;
}, 10, 2);
```

---

## Compatibility

✅ **WooCommerce**: 6.0+  
✅ **WordPress**: 5.8+  
✅ **PHP**: 7.4+  
✅ **Themes**: All (tested with Storefront, Astra, OceanWP)  
✅ **Page Builders**: Elementor, Divi, Beaver Builder  

---

## Troubleshooting

### Plugin not appearing

- Ensure WooCommerce is installed and active
- Check **Settings > Shop with Friends > Enable Plugin** is checked
- Verify PHP version is 7.4 or higher

### Button doesn't show

- Check API key is correct
- Look in browser console for errors
- Try clearing cache (if using cache plugin)

### Voice chat not working

- Enable in **Settings > Shop with Friends > Enable Voice Chat**
- Ensure HTTPS is enabled on your site
- Allow microphone permissions in browser

### Sessions not connecting

- Verify WebSocket port isn't blocked
- Check firewall settings
- Contact support if issue persists

---

## Support

- 📧 **Email**: support@shopwithfriends.io
- 💬 **Live Chat**: [shopwithfriends.io](https://shopwithfriends.io)
- 📚 **Documentation**: [shopwithfriends.io/docs](https://shopwithfriends.io/docs)
- 🐛 **Report Bug**: [GitHub Issues](https://github.com/shopwithfriends/woocommerce-plugin/issues)

---

## Pricing

- **Free**: Up to 100 sessions/month
- **Pro**: Unlimited + voice chat ($49/month)
- **Enterprise**: Custom for high-volume stores

[View Pricing →](https://shopwithfriends.io/pricing)

---

## Changelog

### Version 1.0.0 (2025-01-30)
- ✨ Initial release
- ✅ Real-time navigation sync
- ✅ Cart synchronization
- ✅ Emoji reactions
- ✅ Settings page
- ✅ WebRTC voice chat support

---

**Made with ❤️ in Nigeria by Street Heart Technologies**
