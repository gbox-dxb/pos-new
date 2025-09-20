import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { database } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';

const AccessControlContext = createContext(null);

export const useAccessControl = () => useContext(AccessControlContext);

const defaultPermissions = {
  isAdmin: true,
  viewRevenue: true,
  addStore: true,
  syncOrders: true,
  importExport: true,
  tabs: {
    orders: 'edit',
    trashed: 'edit',
    stock: 'edit',
    stores: 'edit',
    products: 'edit',
    whatsapp: 'edit',
    tracking: 'edit',
    'access-manager': 'edit',
  },
  allowedStores: null, // null means all stores
};

export const AccessControlProvider = ({ children }) => {
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const checkAuthStatus = useCallback(() => {
    const authData = sessionStorage.getItem('auth');
    if (authData) {
      const { type, user } = JSON.parse(authData);
      setIsAuthenticated(true);
      if (type === 'admin') {
        setIsAdmin(true);
        setPermissions(defaultPermissions);
      } else {
        setIsAdmin(false);
        const roleRef = ref(database, `accessManager/roles/${user.roleId}`);
        onValue(roleRef, (roleSnapshot) => {
          const roleData = roleSnapshot.val();
          if (roleData && roleData.permissions) {
            setPermissions({ ...roleData.permissions, isAdmin: false });
          }
        });
      }
    } else {
      setIsAuthenticated(false);
      setIsAdmin(false);
      setPermissions(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkAuthStatus();
    window.addEventListener('storage', checkAuthStatus);
    return () => {
      window.removeEventListener('storage', checkAuthStatus);
    };
  }, [checkAuthStatus]);

  const login = useCallback(async ({ email, password }) => {
    // Try to log in as a user first
    const usersRef = ref(database, 'accessManager/users');
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.val();
    if (usersData) {
      const userEntry = Object.entries(usersData).find(([id, u]) => u.email === email && u.password === password);
      if (userEntry) {
        const [userId, user] = userEntry;
        sessionStorage.setItem('auth', JSON.stringify({ type: 'user', user: { id: userId, ...user } }));
        checkAuthStatus();
        return { success: true };
      }
    }

    // If user login fails, try to log in as admin
    const passwordRef = ref(database, 'admin/password');
    const adminSnapshot = await get(passwordRef);
    const adminPassword = adminSnapshot.val();

    if (!adminPassword) {
      return { success: false, message: 'Admin password not set in database.' };
    }

    if (password === adminPassword) {
      // For simplicity, we're not checking admin email, just the password.
      // In a real app, you'd want a dedicated admin email.
      sessionStorage.setItem('auth', JSON.stringify({ type: 'admin' }));
      checkAuthStatus();
      return { success: true };
    }

    return { success: false };
  }, [checkAuthStatus]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('auth');
    checkAuthStatus();
    navigate('/');
  }, [checkAuthStatus, navigate]);

  const value = { permissions, loading, isAuthenticated, isAdmin, login, logout };

  return (
    <AccessControlContext.Provider value={value}>
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
        </div>
      ) : children}
    </AccessControlContext.Provider>
  );
};