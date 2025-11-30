/**
 * Event Emitter
 * Simple pub/sub event system
 */

export class EventEmitter {
    private events: Map<string, Function[]> = new Map();

    /**
     * Subscribe to an event
     */
    on(event: string, callback: Function): void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);
    }

    /**
     * Unsubscribe from an event
     */
    off(event: string, callback: Function): void {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event)!;
        const index = callbacks.indexOf(callback);

        if (index > -1) {
            callbacks.splice(index, 1);
        }

        if (callbacks.length === 0) {
            this.events.delete(event);
        }
    }

    /**
     * Emit an event
     */
    emit(event: string, ...args: any[]): void {
        if (!this.events.has(event)) return;

        const callbacks = this.events.get(event)!;
        callbacks.forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event handler for "${event}":`, error);
            }
        });
    }

    /**
     * Subscribe to an event once
     */
    once(event: string, callback: Function): void {
        const onceWrapper = (...args: any[]) => {
            callback(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
    }

    /**
     * Remove all listeners for an event (or all events)
     */
    removeAllListeners(event?: string): void {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
    }

    /**
     * Get listener count for an event
     */
    listenerCount(event: string): number {
        return this.events.get(event)?.length || 0;
    }
}
