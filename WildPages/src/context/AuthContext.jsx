import { createContext, useContext, useState, useEffect } from 'react';
import { subscribeToAuthChanges } from '../firebase/auth';
import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if the user is an admin
  const checkAdminStatus = async (user) => {
    if (!user) {
      setIsAdmin(false);
      return;
    }

    try {
      // Special case for the admin user
      if (user.email === 'admin12345@yahoo.com') {
        setIsAdmin(true);
        return;
      }

      // Check against database records (optional for future admins)
      const adminRef = ref(db, `admins/${user.uid}`);
      const snapshot = await get(adminRef);
      setIsAdmin(snapshot.exists());
    } catch (error) {
      console.error("Error checking admin status:", error);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = subscribeToAuthChanges(async (user) => {
      setCurrentUser(user);
      if (user) {
        await checkAdminStatus(user);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}