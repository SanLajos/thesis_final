const API_BASE = "http://127.0.0.1:5000";

class ApiService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.refreshToken = localStorage.getItem('refresh_token');
    }

    /**
     * Internal method to handle headers and token injection
     */
    _getHeaders(contentType = 'application/json') {
        const headers = {};
        if (contentType) headers['Content-Type'] = contentType;
        if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
        return headers;
    }

    /**
     * Saves session to storage and memory
     */
    _setSession(data) {
        this.token = data.token;
        this.refreshToken = data.refresh_token;
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('refresh_token', data.refresh_token);
    }

    clearSession() {
        this.token = null;
        this.refreshToken = null;
        localStorage.clear();
    }

    /**
     * Core Request Method with Automatic Token Refresh Strategy
     */
    async request(endpoint, method = 'GET', body = null, isFile = false) {
        const url = `${API_BASE}${endpoint}`;
        const options = {
            method,
            headers: isFile ? this._getHeaders(null) : this._getHeaders()
        };

        if (body) {
            options.body = isFile ? body : JSON.stringify(body);
        }

        let response = await fetch(url, options);

        // Handle Token Expiration (401)
        if (response.status === 401 && this.refreshToken) {
            const refreshSuccess = await this._tryRefreshToken();
            if (refreshSuccess) {
                // Retry original request with new token
                options.headers['Authorization'] = `Bearer ${this.token}`;
                response = await fetch(url, options);
            } else {
                this.clearSession();
                window.location.reload();
                throw new Error("Session expired");
            }
        }

        // Return standardized response object
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }

    async _tryRefreshToken() {
        try {
            const res = await fetch(`${API_BASE}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: this.refreshToken })
            });
            
            if (res.ok) {
                const data = await res.json();
                this._setSession(data);
                return true;
            }
        } catch (e) {
            console.error("Refresh failed", e);
        }
        return false;
    }

    // --- Public Methods ---

    async login(identifier, password) {
        const res = await this.request('/auth/login', 'POST', { identifier, password });
        if (res.ok) this._setSession(res.data);
        return res;
    }

    async register(userData) {
        const res = await this.request('/auth/register', 'POST', userData);
        if (res.ok) this._setSession(res.data);
        return res;
    }

    async getMe() {
        return this.request('/auth/me');
    }

    async chat(message, history) {
        return this.request('/chat', 'POST', { message, history });
    }
    
    async uploadSubmission(assignmentId, formData) {
        // isFile = true
        return this.request(`/submit/${assignmentId}`, 'POST', formData, true);
    }
}

// Export as a Singleton
export const api = new ApiService();