function normalizeApiUrl(raw?: string): string {
  let url = (raw || 'http://localhost:5000').trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export const API_URL = normalizeApiUrl(process.env.NEXT_PUBLIC_API_URL);

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('kanso_token', token);
      localStorage.setItem('lifeos_token', token);
    } else {
      localStorage.removeItem('kanso_token');
      localStorage.removeItem('lifeos_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('kanso_token') || localStorage.getItem('lifeos_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const res = await fetch(`${API_URL}${cleanEndpoint}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const text = await res.text();
      let error;
      try {
        error = JSON.parse(text);
      } catch {
        error = { error: text || `HTTP ${res.status}` };
      }
      throw new Error(error.error || error.message || `Error ${res.status}`);
    }

    return res.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint);
  }

  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
