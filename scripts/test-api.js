import WebSocket from 'ws';

// Configuration
const WS_URL = 'ws://localhost:3001';

console.log('🧪 Starting Shop with Friends API Test...');

// Helper to create a promise-based client
function createClient(name) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(WS_URL);
        const client = {
            ws,
            name,
            sessionId: null,
            messages: []
        };

        ws.on('open', () => {
            console.log(`[${name}] Connected to server`);
            resolve(client);
        });

        ws.on('error', (err) => {
            console.error(`[${name}] Connection error:`, err.message);
            reject(err);
        });

        ws.on('message', (data) => {
            const event = JSON.parse(data.toString());
            console.log(`[${name}] Received: ${event.type}`);

            if (event.type === 'SESSION_CREATED') {
                client.sessionId = event.payload.sessionId;
                console.log(`[${name}] Session Created: ${client.sessionId}`);
            }

            if (event.type === 'SYNC_EVENT') {
                console.log(`[${name}] Sync Event:`, event.payload);
            }
        });
    });
}

async function runTest() {
    try {
        // 1. Create Client A
        const clientA = await createClient('Client A');

        // 2. Client A creates a session
        console.log('\n--- Creating Session ---');
        clientA.ws.send(JSON.stringify({
            type: 'CREATE_SESSION',
            payload: {}
        }));

        // Wait for session ID
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!clientA.sessionId) throw new Error('Failed to create session');

        // 3. Create Client B
        const clientB = await createClient('Client B');

        // 4. Client B joins the session
        console.log(`\n--- Joining Session ${clientA.sessionId} ---`);
        clientB.ws.send(JSON.stringify({
            type: 'JOIN_SESSION',
            payload: { sessionId: clientA.sessionId }
        }));

        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Client A sends a message
        console.log('\n--- Sending Sync Event (A -> B) ---');
        const testEvent = {
            type: 'SYNC_EVENT',
            payload: {
                type: 'NAVIGATE',
                payload: { view: 'PRODUCT', productId: '123' },
                sourceId: 'client-a',
                timestamp: Date.now()
            }
        };
        clientA.ws.send(JSON.stringify(testEvent));

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n✅ Test Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    }
}

runTest();
