const API_BASE = `${import.meta.env.VITE_API_URL || ''}/api`;

class ApiService {
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include'
        };

        const response = await fetch(url, config);

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || error.message || 'Request failed');
        }

        return response.json();
    }

    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiService();

// SSE connection for live updates
export function connectSSE(onMessage) {
    const eventSource = new EventSource(`${API_BASE}/sse`, { withCredentials: true });

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            onMessage(data);
        } catch (error) {
            console.error('SSE parse error:', error);
        }
    };

    eventSource.onerror = () => {
        console.log('SSE connection error, reconnecting...');
        eventSource.close();
        setTimeout(() => connectSSE(onMessage), 3000);
    };

    return () => eventSource.close();
}
