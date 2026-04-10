import { toast } from "sonner";
import { useAuthStore } from "../store";

export const API_URL = "/api";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface FetchOptions extends RequestInit {
  silent?: boolean;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `HTTP error! status: ${response.status}`;
      
      if (!options.silent) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          useAuthStore.getState().logout();
        } else if (response.status === 403) {
          toast.error(errorMessage || "You do not have permission to perform this action.");
        } else if (response.status >= 500) {
          toast.error("Server error occurred. Please try again later.");
        } else {
          toast.error(errorMessage);
        }
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // Handle application-level errors (code !== 0) if not silent
    if (data.code !== 0 && !options.silent) {
      toast.error(data.message || "An error occurred");
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    return {
      code: -1,
      message: error instanceof Error ? error.message : "Network error occurred",
      data: null as any
    };
  }
}
