export const API_BASE = "http://127.0.0.1:5000";

export const formatValidationError = (data) => {
  if (data.details && Array.isArray(data.details)) {
    return data.details.map(err => {
      const field = err.loc ? err.loc[0] : 'Field';
      return `• ${field}: ${err.msg}`;
    }).join('\n');
  }
  return data.error || "An unknown error occurred.";
};

// Centralized Auth Fetcher
export const authFetch = async (url, options = {}) => {
    const token = localStorage.getItem('auth_token');
    const headers = {
        ...options.headers,
        'Authorization': token ? `Bearer ${token}` : ''
    };
    
    let res = await fetch(url, { ...options, headers });
    
    // Token Refresh Logic
    if (res.status === 401) {
        const refresh_token = localStorage.getItem('refresh_token');
        if (refresh_token) {
            try {
                const refreshRes = await fetch(`${API_BASE}/auth/refresh`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refresh_token })
                });
                
                if (refreshRes.ok) {
                    const data = await refreshRes.json();
                    localStorage.setItem('auth_token', data.token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    
                    headers['Authorization'] = `Bearer ${data.token}`;
                    res = await fetch(url, { ...options, headers });
                } else {
                    localStorage.clear();
                    window.location.reload();
                }
            } catch (e) { console.error("Refresh failed", e); }
        }
    }
    return res;
};