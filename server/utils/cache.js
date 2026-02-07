class Cache {
    constructor(ttlSeconds = 60) {
        this.cache = new Map();
        this.ttl = ttlSeconds * 1000;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value) {
        this.cache.set(key, {
            value,
            expiry: Date.now() + this.ttl
        });
    }

    del(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }
}

// Global cache instance with 5 minute default TTL
// We use a long TTL because we manually invalidate on updates
export const cache = new Cache(300); 
