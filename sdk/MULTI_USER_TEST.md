# Multi-User Testing Guide

## 🎯 Test Real-Time Collaboration

Let's see two people shopping together in real-time!

---

## Setup (2 minutes)

### Requirements
- ✅ API server running: `npm run dev:api` (already running)
- ✅ Frontend server running: `npm run dev` (already running)
- Two browser windows (or use incognito mode)

---

## Test Scenario: Tola & Chidi Shop Together

### Step 1: Tola Creates the Session

**Browser Window 1:**
1. Open: `http://localhost:3000/sdk/test.html`
2. Wait for the purple "Shop Together" button to appear
3. Click the "Shop Together" button
4. Copy the invite link from the modal (something like: `http://localhost:3000/sdk/test.html?join=sess_abc123`)

**Expected:**
- Modal appears with invite link
- Event log shows: "Session created!"
- Button changes to "In Session"

---

### Step 2: Chidi Joins via Invite Link

**Browser Window 2 (or Incognito):**
1. Paste the invite link from Step 1
2. Watch the page load

**Expected:**

**In Window 2 (Chidi):**
- Page loads
- "Shop Together" button appears
- Event log shows: "Auto-joining session from URL: sess_..."
- Alert: "Anonymous joined the session!" (or similar)

**In Window 1 (Tola):**
- Alert pops up: "Anonymous joined the session!"
- Event log shows: "Participant joined!"

---

### Step 3: Test Cart Sync (Tola → Chidi)

**In Window 1 (Tola's browser):**
1. Click "Add to Cart" button
2. Click OK on the alert

**Expected:**

**In Window 1 (Tola):**
- Event log: "Adding to cart..."
- Event log: "Sync event received { type: CART_UPDATE }"

**In Window 2 (Chidi) - MAGIC! ✨:**
- Event log automatically shows: "Sync event received { type: CART_UPDATE }"
- Event log shows: "Friend updated cart: [...]"
- **This happened WITHOUT Chidi clicking anything!**

---

### Step 4: Test Cart Sync (Chidi → Tola)

**In Window 2 (Chidi's browser):**
1. Click "Add to Cart" button

**Expected:**

**In Window 2 (Chidi):**
- Event log: "Adding to cart..."

**In Window 1 (Tola) - MAGIC AGAIN! ✨:**
- Event log automatically shows: "Friend updated cart: [...]"
- **Tola sees Chidi's cart update in real-time!**

---

### Step 5: Test Navigation Sync

**In Window 1 (Tola's browser):**
1. Click "View Details" button

**Expected:**

**In Both Windows:**
- Event logs show: "Sync event received { type: NAVIGATE }"
- This simulates both users viewing the same product page

---

### Step 6: Open Browser Console for Advanced View

**In both windows, press F12 and click Console tab**

You'll see:
```
SDK instance available as window.swf
✅ Connected to Shop with Friends server
✅ SDK initialized successfully!
Client ID: <unique_id>
```

**Try in console:**
```javascript
// Get session info
window.swf.getSessionId()
window.swf.getClientId()
window.swf.isInSession()

// Send a custom reaction
window.swf.sendReaction('fire')

// Check the other window's event log - it received it!
```

---

## What You Should See

### Timeline View

```
[Time] Window 1 (Tola)              Window 2 (Chidi)
────────────────────────────────────────────────────
00:00  Page loads                   
00:05  Clicks "Shop Together"       
00:06  Session created!             
00:07  Modal shows invite link      
00:10                                Joins via link
00:11  Alert: "User joined!" ←─────── Auto-joins session
00:15  Clicks "Add to Cart" ────────→ Sees cart update!
00:20                                Clicks "Add to Cart"
00:21  Sees cart update! ←────────── Sends cart event
00:25  Clicks "View Details" ──────→ Sees navigation event!
```

---

## Expected Console Output

### Window 1 (Session Host - Tola)

```
[timestamp] Initializing Shop with Friends SDK...
[timestamp] ✅ SDK initialized successfully!
[timestamp] Client ID: abc123...
[timestamp] Session created! {sessionId: "sess_xyz789"}
[timestamp] Participant joined! {userId: "def456", userName: "Anonymous"}
[timestamp] Adding to cart...
[timestamp] Sync event received {type: "CART_UPDATE"}
[timestamp] Friend updated cart: {...}
```

### Window 2 (Joiner - Chidi)

```
[timestamp] Initializing Shop with Friends SDK...
[timestamp] Auto-joining session from URL: sess_xyz789
[timestamp] ✅ SDK initialized successfully!
[timestamp] Client ID: def456...
[timestamp] Sync event received {type: "CART_UPDATE"}
[timestamp] Friend updated cart: {...}
[timestamp] Adding to cart...
```

---

## Troubleshooting

### Issue: Second window doesn't auto-join

**Solution:**
- Make sure you copied the FULL invite link including `?join=sess_...`
- Try manually: In window 2 console, run:
  ```javascript
  window.swf.joinSession('sess_<paste_session_id_here>')
  ```

### Issue: No sync events appearing

**Check:**
1. API server is running (`npm run dev:api`)
2. Both windows show "SDK initialized successfully"
3. Both windows show the same session ID:
   ```javascript
   window.swf.getSessionId()
   ```

### Issue: Can't see event log

**Solution:**
- Scroll down on the page
- Event log is at the bottom with black background and green text

---

## Advanced Testing

### Test Reactions

**Window 1:**
```javascript
window.swf.sendReaction('fire')
window.swf.sendReaction('heart')
window.swf.sendReaction('shock')
```

**Window 2:**
Check event log - you'll see:
```
Friend reacted: {reaction: "fire"}
Friend reacted: {reaction: "heart"}
...
```

### Test Custom Sync

**Window 1:**
```javascript
window.swf.syncNavigation({
  productId: '999',
  productName: 'Standing Desk',
  url: '/products/standing-desk'
})
```

**Window 2:**
Event log shows the navigation event!

---

## Success Criteria

✅ **PASS** if:
1. Second window auto-joins when using invite link
2. Cart updates from Window 1 appear in Window 2
3. Cart updates from Window 2 appear in Window 1
4. No errors in console
5. Session IDs match in both windows

---

## Video Recording

If you want to record this yourself:
1. Use OBS Studio or similar
2. Show both browser windows side-by-side
3. Click "Add to Cart" in one, show it updating in the other
4. Perfect for demo videos!

---

## What This Proves

This test demonstrates:
- ✅ **Real-time WebSocket communication**
- ✅ **Multi-user session management**
- ✅ **Event broadcasting to all participants**
- ✅ **Invite link system works**
- ✅ **SDK handles multiple connections**
- ✅ **Session state synchronization**

**This is the core value of Shop with Friends!** Friends shopping together from different locations, seeing each other's actions in real-time.

---

## Next Steps After Success

Once this works, you have proven:
1. The SDK works for real collaborative shopping
2. Backend can handle multiple users
3. Ready for beta testing with real customers
4. Can record demo videos
5. Ready to integrate into real e-commerce sites

---

## Quick Start Commands

```bash
# Terminal 1: API Server (already running)
npm run dev:api

# Terminal 2: Frontend Server (already running)
npm run dev

# Browser 1:
http://localhost:3000/sdk/test.html

# Browser 2 (after getting invite link from Browser 1):
http://localhost:3000/sdk/test.html?join=sess_<session_id>
```

Now go try it! Open two browsers and watch the magic happen! ✨
