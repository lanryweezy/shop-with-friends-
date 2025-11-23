/**
 * EXAMPLE INTEGRATION
 * ===================
 * 
 * This is an example of how an e-commerce platform can integrate
 * the Shop with Friends API.
 */

import ShopWithFriends from './api-client';

// Initialize the API
const shopWithFriends = new ShopWithFriends({
    onSyncEvent: handleSyncEvent,
    onSessionCreated: handleSessionCreated,
    onError: handleError
});

// Handle incoming sync events
function handleSyncEvent(event) {
    switch (event.type) {
        case 'NAVIGATE':
            // Navigate to the same product/page as the other user
            navigateTo(event.payload.view, event.payload.product);
            break;

        case 'SCROLL_REQUEST':
            // Scroll to the same position as the other user
            scrollToPosition(event.payload.scrollTop);
            break;

        case 'CART_UPDATE':
            // Update the cart to match the other user
            updateCart(event.payload.cart);
            break;

        case 'REACTION':
            // Show the reaction from the other user
            showReaction(event.payload.reaction);
            break;
    }
}

// Handle session creation
function handleSessionCreated(sessionId) {
    // Display the session ID to the user so they can share it
    displayShareLink(sessionId);
}

// Handle errors
function handleError(error) {
    console.error('Shop with Friends error:', error);
    showErrorMessage(error.message);
}

// Example functions that would be part of the e-commerce platform
function navigateTo(view, product) {
    // Implementation would depend on the platform's routing system
    console.log('Navigating to:', view, product);
}

function scrollToPosition(scrollTop) {
    // Implementation would depend on the platform's UI framework
    window.scrollTo(0, scrollTop);
}

function updateCart(cart) {
    // Implementation would depend on the platform's cart system
    console.log('Updating cart:', cart);
}

function showReaction(reaction) {
    // Implementation would depend on the platform's UI framework
    console.log('Showing reaction:', reaction);
}

function displayShareLink(sessionId) {
    const shareLink = `${window.location.origin}/join/${sessionId}`;
    console.log('Share this link:', shareLink);
}

function showErrorMessage(message) {
    console.error('Error:', message);
}

// Example usage:
// Create a new session when user clicks "Shop with Friends" button
const btn = document.getElementById('shopWithFriendsBtn');
if (btn) {
    btn.addEventListener('click', async () => {
        try {
            const sessionId = await shopWithFriends.createSession();
            console.log('Session created:', sessionId);
        } catch (error) {
            console.error('Failed to create session:', error);
        }
    });
}

// Send events when user interacts with the platform
function onUserNavigate(view, product) {
    shopWithFriends.sendEvent({
        type: 'NAVIGATE',
        payload: { view, product }
    });
}

function onUserScroll(scrollTop) {
    shopWithFriends.sendEvent({
        type: 'SCROLL_REQUEST',
        payload: { scrollTop }
    });
}

function onUserAddToCart(product) {
    // This would need to get the current cart state from the platform
    const currentCart = []; // getCurrentCart();
    shopWithFriends.sendEvent({
        type: 'CART_UPDATE',
        payload: { cart: [...currentCart, product] }
    });
}

function onUserReaction(reaction) {
    shopWithFriends.sendEvent({
        type: 'REACTION',
        payload: { reaction }
    });
}
