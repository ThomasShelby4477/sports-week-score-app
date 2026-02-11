import { useEffect, useRef, useCallback } from 'react';

const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

export function useRealTimeUpdates(onUpdate) {
    const eventSourceRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = useCallback(() => {
        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(`${API_BASE}/sse`);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type !== 'connected') {
                    // Add random jitter (0-2000ms) to prevent thundering herd
                    // This spreads out the requests so the first one repopulates the cache
                    const jitter = Math.floor(Math.random() * 2000);
                    setTimeout(() => {
                        onUpdate(data);
                    }, jitter);
                }
            } catch (e) {
                console.error('SSE parse error:', e);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            // Reconnect after 3 seconds
            reconnectTimeoutRef.current = setTimeout(connect, 3000);
        };
    }, [onUpdate]);

    useEffect(() => {
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);
}
