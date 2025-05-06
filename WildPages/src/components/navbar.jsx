// src/components/Navbar.jsx
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logout } from "../firebase/auth";
import hlogo from "../assets/HomeLogo.png";

// Define navigation items
const navItems = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/#features" },
  { label: "Workflow", href: "/#workflow" },
  { label: "Accommodations", href: "/#accommodations" }
];

const Navbar = () => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  // Add state for logout modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { currentUser, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();

  const toggleNavbar = () => {
    setMobileDrawerOpen(!mobileDrawerOpen);
  };
  
  const handleLogin = () => {
    navigate('/login');
  };
  
  // Updated logout handling to show modal first
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  // Handle logout after confirmation
  const handleLogoutConfirm = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setShowLogoutModal(false);
    }
  };

  // Cancel logout
  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Separate the logout modal from the nav structure */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-auto">
            <div className="text-center mb-4">
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-xl font-bold mb-2">Are you sure you want to logout?</h2>
              <p className="text-gray-600">Are you done using me?</p>
            </div>
            <div className="flex justify-center space-x-4 mt-6">
              <button
                onClick={handleLogoutCancel}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Stay
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 py-3 backdrop-blur-lg border-b border-neutral-700/80">
        <div className="container px-4 mx-auto relative lg:text-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center flex-shrink-0">
              <Link to="/" className="flex items-center">
                <img className="h-15 w-15 mr-2" src={hlogo} alt="Logo" />
                <span className="text-3xl tracking-tight">HomeWildHunt</span>
              </Link>
            </div>
            <ul className="hidden lg:flex ml-14 space-x-12">
              {navItems.map((item, index) => (
                <li key={index} className="hover:text-gray-400">
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
            <div className="hidden lg:flex justify-center space-x-4 items-center">
              <Link to="/properties" className="py-2 px-3 rounded-md hover:text-gray-400">
                List Property
              </Link> 

              {isAdmin && (
                <Link to="/admin/dashboard" className="py-2 px-3 bg-green-600 rounded-md text-white hover:bg-green-700">
                  Admin Dashboard
                </Link>
              )}

              {isAuthenticated ? (
                <>
                  <div className="bg-blue-700 py-2 px-3 rounded-md text-white">
                    Welcome {currentUser?.displayName || 'User'}
                  </div>
                  <button 
                    onClick={handleLogoutClick} 
                    className="bg-red-600 py-2 px-3 rounded-md hover:text-gray-200 text-white"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <button 
                  onClick={handleLogin} 
                  className="bg-blue-700 py-2 px-3 rounded-md hover:text-gray-200 text-white"
                >
                  Log in
                </button>
              )}        
            </div>
            <div className="lg:hidden md:flex flex-col justify-end">
              <button onClick={toggleNavbar}>
                {mobileDrawerOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
          {mobileDrawerOpen && (
            <div className="fixed right-0 z-20 bg-white w-full p-12 flex flex-col justify-center items-center lg:hidden">
              <ul>
                {navItems.map((item, index) => (
                  <li key={index} className="py-4">
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
                <li className="py-4">
                  <Link to="/properties" onClick={() => setMobileDrawerOpen(false)}>
                    List Property
                  </Link>
                </li>
                {isAdmin && (
                  <li className="py-4">
                    <Link 
                      to="/admin/dashboard" 
                      className="text-green-600 font-medium"
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      Admin Dashboard
                    </Link>
                  </li>
                )}
              </ul>
              <div className="flex flex-col space-y-4 mt-4">
                {isAuthenticated ? (
                  <>
                    <div className="py-2 px-3 bg-blue-700 rounded-md text-white text-center">
                      Welcome {currentUser?.displayName || 'User'}
                    </div>
                    <button
                      onClick={() => {
                        handleLogoutClick();
                        setMobileDrawerOpen(false);
                      }}
                      className="py-2 px-3 rounded-md bg-red-600 text-white"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        handleLogin();
                        setMobileDrawerOpen(false);
                      }}
                      className="py-2 px-3 border rounded-md text-gray-700 border-gray-300"
                    >
                      Log in
                    </button>
                    <Link
                      to="/signup"
                      className="py-2 px-3 rounded-md bg-blue-700 text-white text-center"
                      onClick={() => setMobileDrawerOpen(false)}
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
};

export default Navbar;