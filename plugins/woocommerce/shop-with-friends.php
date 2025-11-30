<?php
/**
 * Plugin Name: Shop with Friends
 * Plugin URI: https://shopwithfriends.io
 * Description: Enable collaborative shopping with real-time sync and voice chat
 * Version: 1.0.0
 * Author: Street Heart Technologies
 * Author URI: https://shopwithfriends.io
 * License: GPL v2 or later
 * Text Domain: shop-with-friends
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

class ShopWithFriends_Plugin {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (self::$instance == null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Plugin initialization
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        
        // Frontend hooks
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('woocommerce_after_single_product', array($this, 'render_widget'));
    }
    
    public function init() {
        // Plugin initialization logic
        load_plugin_textdomain('shop-with-friends', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    /**
     * Add admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'Shop with Friends Settings',
            'Shop with Friends',
            'manage_options',
            'shop-with-friends',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('swf_settings', 'swf_api_key');
        register_setting('swf_settings', 'swf_enabled');
        register_setting('swf_settings', 'swf_show_button');
        register_setting('swf_settings', 'swf_enable_voice');
        register_setting('swf_settings', 'swf_theme');
        register_setting('swf_settings', 'swf_position');
        register_setting('swf_settings', 'swf_show_reactions');
    }
    
    /**
     * Render settings page
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1><?php echo esc_html(get_admin_page_title()); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields('swf_settings');
                do_settings_sections('swf_settings');
                ?>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Enable Plugin</th>
                        <td>
                            <label>
                                <input type="checkbox" name="swf_enabled" value="1" <?php checked(get_option('swf_enabled'), 1); ?>>
                                Enable Shop with Friends
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">API Key</th>
                        <td>
                            <input type="text" name="swf_api_key" value="<?php echo esc_attr(get_option('swf_api_key')); ?>" class="regular-text">
                            <p class="description">Get your API key from <a href="https://shopwithfriends.io/dashboard" target="_blank">shopwithfriends.io/dashboard</a></p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Show Button</th>
                        <td>
                            <label>
                                <input type="checkbox" name="swf_show_button" value="1" <?php checked(get_option('swf_show_button', 1), 1); ?>>
                                Show "Shop Together" button
                            </label>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Enable Voice Chat</th>
                        <td>
                            <label>
                                <input type="checkbox" name="swf_enable_voice" value="1" <?php checked(get_option('swf_enable_voice'), 1); ?>>
                                Enable WebRTC voice chat
                            </label>
                            <p class="description">Allows customers to talk while shopping together</p>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Theme</th>
                        <td>
                            <select name="swf_theme">
                                <option value="dark" <?php selected(get_option('swf_theme', 'dark'), 'dark'); ?>>Dark</option>
                                <option value="light" <?php selected(get_option('swf_theme', 'dark'), 'light'); ?>>Light</option>
                            </select>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Button Position</th>
                        <td>
                            <select name="swf_position">
                                <option value="bottom-right" <?php selected(get_option('swf_position', 'bottom-right'), 'bottom-right'); ?>>Bottom Right</option>
                                <option value="bottom-left" <?php selected(get_option('swf_position', 'bottom-right'), 'bottom-left'); ?>>Bottom Left</option>
                                <option value="top-right" <?php selected(get_option('swf_position', 'bottom-right'), 'top-right'); ?>>Top Right</option>
                                <option value="top-left" <?php selected(get_option('swf_position', 'bottom-right'), 'top-left'); ?>>Top Left</option>
                            </select>
                        </td>
                    </tr>
                    
                    <tr>
                        <th scope="row">Show Reactions</th>
                        <td>
                            <label>
                                <input type="checkbox" name="swf_show_reactions" value="1" <?php checked(get_option('swf_show_reactions', 1), 1); ?>>
                                Show emoji reaction buttons on product pages
                            </label>
                        </td>
                    </tr>
                </table>
                
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
    
    /**
     * Enqueue frontend scripts
     */
    public function enqueue_scripts() {
        // Only load on product pages
        if (!is_product() || !get_option('swf_enabled')) {
            return;
        }
        
        $api_key = get_option('swf_api_key');
        if (empty($api_key)) {
            return;
        }
        
        // Enqueue SDK
        wp_enqueue_script(
            'shop-with-friends-sdk',
            'https://cdn.shopwithfriends.io/v1/swf.esm.js',
            array(),
            '1.0.0',
            true
        );
        
        // Initialize SDK
        $product = wc_get_product();
        if (!$product) {
            return;
        }
        
        $config = array(
            'apiKey' => $api_key,
            'apiUrl' => 'wss://api.shopwithfriends.io',
            'showInviteButton' => (bool)get_option('swf_show_button', true),
            'enableVoice' => (bool)get_option('swf_enable_voice', true), // VOICE IS CORE!
            'theme' => get_option('swf_theme', 'dark'),
            'position' => get_option('swf_position', 'bottom-right'),
            'productId' => (string)$product->get_id(),
            'productName' => $product->get_name(),
            'productUrl' => get_permalink($product->get_id()),
            'productPrice' => $product->get_price(),
        );
        
        wp_add_inline_script(
            'shop-with-friends-sdk',
            $this->get_inline_script($config),
            'after'
        );
    }
    
    /**
     * Get inline JavaScript for SDK initialization
     */
    private function get_inline_script($config) {
        $config_json = wp_json_encode($config);
        
        return <<<JS
(async function() {
    const { ShopWithFriends } = await import('https://cdn.shopwithfriends.io/v1/swf.esm.js');
    
    const config = {$config_json};
    
    const swf = new ShopWithFriends({
        ...config,
        onSessionCreated: (session) => {
            console.log('✅ Shopping session created:', session.sessionId);
        },
        onParticipantJoined: (user) => {
            console.log('👋 Friend joined:', user.userName);
            
            // Sync current cart
            if (typeof wc_cart_fragments_params !== 'undefined') {
                jQuery.ajax({
                    url: wc_cart_fragments_params.wc_ajax_url.toString().replace('%%endpoint%%', 'get_cart'),
                    type: 'POST',
                    success: function(data) {
                        if (data && data.cart_hash) {
                            const cart = jQuery.parseJSON(jQuery('body').find('.widget_shopping_cart_content').html());
                            swf.syncCart(cart);
                        }
                    }
                });
            }
        },
        onSync: (event) => {
            console.log('🔄 Sync event:', event.eventType);
            
            if (event.eventType === 'NAVIGATE' && event.url) {
                if (confirm('Your friend is looking at "' + event.productName + '". View it together?')) {
                    window.location.href = event.url;
                }
            }
        },
        onError: (error) => {
            console.error('Shop with Friends error:', error);
        }
    });
    
    // Initialize
    await swf.init();
    console.log('✅ Shop with Friends initialized');
    
    // Auto-join from URL
    const params = new URLSearchParams(window.location.search);
    const joinSessionId = params.get('swf_join');
    if (joinSessionId) {
        await swf.joinSession(joinSessionId);
    }
    
    // Listen for cart updates
    jQuery(document.body).on('added_to_cart removed_from_cart', function() {
        if (swf.isInSession()) {
            // Sync cart after updates
            setTimeout(() => {
                jQuery.ajax({
                    url: wc_cart_fragments_params.wc_ajax_url.toString().replace('%%endpoint%%', 'get_cart'),
                    type: 'POST',
                    success: function(data) {
                        swf.syncCart(data.cart);
                    }
                });
            }, 500);
        }
    });
    
    // Expose globally
    window.swf = swf;
})();
JS;
    }
    
    /**
     * Render reaction buttons widget
     */
    public function render_widget() {
        if (!get_option('swf_enabled') || !get_option('swf_show_reactions', true)) {
            return;
        }
        
        ?>
        <div class="swf-reaction-buttons" style="display: flex; gap: 8px; margin: 20px 0;">
            <style>
                .swf-reaction-btn {
                    padding: 8px 16px;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: white;
                    cursor: pointer;
                    font-size: 1.2rem;
                    transition: all 0.2s;
                }
                .swf-reaction-btn:hover {
                    transform: scale(1.1);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
            </style>
            <button class="swf-reaction-btn" onclick="window.swf && window.swf.sendReaction('heart')">❤️</button>
            <button class="swf-reaction-btn" onclick="window.swf && window.swf.sendReaction('fire')">🔥</button>
            <button class="swf-reaction-btn" onclick="window.swf && window.swf.sendReaction('laugh')">😂</button>
            <button class="swf-reaction-btn" onclick="window.swf && window.swf.sendReaction('shock')">😱</button>
        </div>
        <?php
    }
}

// Initialize plugin
ShopWithFriends_Plugin::get_instance();
