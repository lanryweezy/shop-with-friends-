/**
 * Authentication and API Key utilities
 */

const VALID_API_KEYS = new Set(process.env.API_KEYS?.split(',') || ['demo-key-123']);

/**
 * Validate an API key
 * @param {string} apiKey
 * @returns {boolean}
 */
export function isValidApiKey(apiKey) {
    return apiKey && VALID_API_KEYS.has(apiKey);
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
