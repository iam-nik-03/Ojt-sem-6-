
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const status = response.status;
  
  if (!response.ok) {
    let errorMessage = `Error: ${status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
        if (errorData.details) {
          errorMessage += ` ${errorData.details}`;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      // Fallback to status text if JSON parsing fails
    }
    return { data: null, error: errorMessage, status };
  }

  try {
    const data = await response.json();
    return { data, error: null, status };
  } catch (e) {
    return { data: null, error: 'Failed to parse response', status };
  }
}

export const api = {
  get: async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        ...options,
      });
      return handleResponse<T>(response);
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error', status: 0 };
    }
  },

  post: async <T>(url: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });
      return handleResponse<T>(response);
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error', status: 0 };
    }
  },

  put: async <T>(url: string, body?: any, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        ...options,
      });
      return handleResponse<T>(response);
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error', status: 0 };
    }
  },

  delete: async <T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
        ...options,
      });
      return handleResponse<T>(response);
    } catch (error: any) {
      return { data: null, error: error.message || 'Network error', status: 0 };
    }
  },
};
