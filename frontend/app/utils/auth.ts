// Authentication utilities

// Define the user interface
export interface AuthUser {
  userId: string;
  role?: string;
  email?: string;
}

// Set token in session storage
export const setToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('token', token);
  }
};

// Get token from session storage
export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return sessionStorage.getItem('token');
  }
  return null;
};

// Remove token from session storage
export const removeToken = (): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token');
    return !!token;
  }
  return false;
};

// Set user data in session storage
export const setUser = (user: AuthUser): void => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('user', JSON.stringify(user));
  }
};

// Get user data from session storage
export const getUser = (): AuthUser | null => {
  if (typeof window !== 'undefined') {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) as AuthUser : null;
  }
  return null;
};
