/**
 * Authentication and API Key utilities
 */

// Sentinel: Removed hardcoded 'demo-key-123' secret.
const VALID_API_KEYS = new Set(process.env.API_KEYS ? process.env.API_KEYS.split(',') : []);

/**
 * Validate an API key
 * @param {string} apiKey
 * @returns {boolean}
 */
export function isValidApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') return false;

    return VALID_API_KEYS.has(apiKey);
}

/**
 * Express middleware for API key validation
 */
export function apiKeyMiddleware(req, res, next) {
    const apiKey = req.body.apiKey || req.query.apiKey || req.headers['x-api-key'];

    if (!isValidApiKey(apiKey)) {
        return res.status(401).json({ error: 'Invalid API Key' });
    }

    req.apiKey = apiKey;
    next();
}
