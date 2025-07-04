'use client';

import { useState, useEffect } from 'react';

function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userType, setUserType] = useState(null);

  let checkAuth = async () => {
    try {
      const response = await fetch('/api/users/session');
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
      setUserType(data.type)
    } catch (error) {
      console.error('Error al verificar la autenticación:', error);
      setIsAuthenticated(false);
      setUserType(null);
    } finally {
      setIsLoading(false);
    }
  };;

  useEffect(() => {
    checkAuth();
  }, []);

  return { isAuthenticated, isLoading , checkAuth, userType};
}

export default useAuth;