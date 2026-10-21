import { AxiosError } from 'axios';

/**
 * Extracts a user-friendly error message from an API error
 * @param error The error object from an API call
 * @returns A user-friendly error message
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    // Handle Axios specific errors
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      const serverError = error.response.data?.error || error.response.statusText;
      return `Server error: ${serverError}`;
    } else if (error.request) {
      // The request was made but no response was received
      return 'No response from server. Please check your connection.';
    } else {
      // Something happened in setting up the request
      return `Error: ${error.message}`;
    }
  }
  
  // For non-Axios errors
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

/**
 * Global error handler for API calls
 * @param error The error object from an API call
 * @throws The original error after logging
 */
export const handleApiError = (error: unknown): never => {
  const message = getErrorMessage(error);
  console.error('API Error:', message, error);
  
  // You could add additional error reporting here (e.g., to a monitoring service)
  
  throw error;
};
