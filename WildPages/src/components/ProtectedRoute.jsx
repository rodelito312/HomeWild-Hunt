import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Enhanced ProtectedRoute component that supports role-based access control
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if access is granted
 * @param {boolean} props.adminOnly - Set to true if the route should only be accessible by admins
 * @param {string} props.redirectPath - Custom redirect path (defaults to /login for unauthenticated, /profile for non-admins)
 * @returns {React.ReactNode} Either the children or a redirect
 */
const ProtectedRoute = ({ children, adminOnly = false, redirectPath }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Or your loading spinner component
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectPath || "/login"} />;
  }
  
  // Redirect non-admins if route requires admin access
  if (adminOnly && !isAdmin) {
    return <Navigate to={redirectPath || "/profile"} />;
  }
  
  // Redirect admins to dashboard if they try to access user profile
  if (!adminOnly && isAdmin && window.location.pathname === '/profile') {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

export default ProtectedRoute;