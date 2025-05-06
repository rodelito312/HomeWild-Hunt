// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase/auth';
import Navbar from "../components/navbar2";
import { db } from '../firebase/config';
import { ref, onValue, query, orderByChild, limitToLast, equalTo } from 'firebase/database';
// Import motion component for transitions
import { motion } from 'framer-motion';

const Dashboard = () => {
  const { isAdmin, currentUser } = useAuth();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recentProperties, setRecentProperties] = useState([]);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [userVerificationStatus, setUserVerificationStatus] = useState('unverified');
  const [userType, setUserType] = useState(null);
  const [ownedProperties, setOwnedProperties] = useState([]);
  const [agentProperties, setAgentProperties] = useState([]); // New state for agent properties
  const [stats, setStats] = useState({
    totalProperties: 0,
    availableUnits: 0,
    inquiries: 0,
    appointments: 0
  });

  // Fade transition variant
  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Load user data and recent properties on component mount
  useEffect(() => {
    // Check if user is logged in
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    const loadUserData = async () => {
      try {
        // Get user profile data
        const userRef = ref(db, `users/${currentUser.uid}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserType(userData.userType || 'renter');
            setUserVerificationStatus(userData.verificationStatus || 'unverified');
          }
        });

        // Load recent properties from Firebase for admin
        if (isAdmin) {
          // Get recent approved properties
          const propertiesRef = query(
            ref(db, 'properties'), 
            orderByChild('createdAt'), 
            limitToLast(3)
          );
          
          onValue(propertiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const properties = [];
              snapshot.forEach((childSnapshot) => {
                properties.push({
                  id: childSnapshot.key,
                  ...childSnapshot.val()
                });
              });
              // Reverse to show newest first
              setRecentProperties(properties.reverse());
            }
          });
          
          // Get count of pending properties
          const pendingPropertiesRef = ref(db, 'pendingProperties');
          onValue(pendingPropertiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const properties = [];
              snapshot.forEach((childSnapshot) => {
                properties.push({
                  id: childSnapshot.key,
                  ...childSnapshot.val()
                });
              });
              setPendingProperties(properties);
            } else {
              setPendingProperties([]);
            }
          });
          
          // Get count of pending verifications
          const usersRef = ref(db, 'users');
          onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
              const pendingUsers = [];
              snapshot.forEach((childSnapshot) => {
                const user = childSnapshot.val();
                if (user.verificationStatus === 'pending' && 
                    user.verificationDocuments && 
                    user.verificationDocuments.length > 0) {
                  pendingUsers.push({
                    id: childSnapshot.key,
                    ...user
                  });
                }
              });
              setPendingVerifications(pendingUsers);
            } else {
              setPendingVerifications([]);
            }
          });
          
          // Get stats (in a real app, these would come from Firebase or an API)
          const allPropertiesRef = ref(db, 'properties');
          onValue(allPropertiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const allProperties = [];
              let availableCount = 0;
              
              snapshot.forEach((childSnapshot) => {
                allProperties.push(childSnapshot.val());
                // For simplicity, we'll consider any property available
                availableCount++;
              });
              
              setStats({
                totalProperties: allProperties.length,
                availableUnits: availableCount,
                inquiries: 7, // Static for demo
                appointments: 5 // Static for demo
              });
            } else {
              setStats({
                totalProperties: 0,
                availableUnits: 0,
                inquiries: 0,
                appointments: 0
              });
            }
            setLoading(false);
          });
        } 
        // Load homeowner properties
        else if (userType === 'owner') {
          // Get homeowner's approved properties (directly owned)
          const ownedPropertiesRef = query(
            ref(db, 'properties'), 
            orderByChild('ownerId'), 
            equalTo(currentUser.uid)
          );
          
          // Get properties where user is assigned as agent
          const agentPropertiesRef = ref(db, `users/${currentUser.uid}/properties`);
          
          // Listen for owned properties
          onValue(ownedPropertiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const properties = [];
              snapshot.forEach((childSnapshot) => {
                properties.push({
                  id: childSnapshot.key,
                  ...childSnapshot.val(),
                  isOwner: true
                });
              });
              setOwnedProperties(properties);
            } else {
              setOwnedProperties([]);
            }
            
            updateStats(); // Call after both property types are loaded
          });
          
          // Listen for agent properties
          onValue(agentPropertiesRef, (snapshot) => {
            if (snapshot.exists()) {
              const properties = [];
              snapshot.forEach((childSnapshot) => {
                properties.push({
                  id: childSnapshot.key,
                  ...childSnapshot.val(),
                  isAgent: true
                });
              });
              setAgentProperties(properties);
            } else {
              setAgentProperties([]);
            }
            
            updateStats(); // Call after both property types are loaded
          });
          
          // Get homeowner's pending properties
          const pendingPropsRef = query(
            ref(db, 'pendingProperties'),
            orderByChild('ownerId'),
            equalTo(currentUser.uid)
          );
          
          onValue(pendingPropsRef, (snapshot) => {
            if (snapshot.exists()) {
              const properties = [];
              snapshot.forEach((childSnapshot) => {
                properties.push({
                  id: childSnapshot.key,
                  ...childSnapshot.val()
                });
              });
              setPendingProperties(properties);
            } else {
              setPendingProperties([]);
            }
            setLoading(false);
          });
        }
        // Load renter data
        else {
          // For renters, we'd load wishlist and inquiries
          // For this demo, just set loading to false
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser, isAdmin, navigate, userType]);

  // Update stats based on both owned and agent properties
  const updateStats = () => {
    // Combine both types of properties
    const allProperties = [...ownedProperties, ...agentProperties];
    
    // Filter for available properties (not sold or rented)
    const availableProperties = allProperties.filter(
      prop => prop.status === 'For Sale' || prop.status === 'For Rent'
    );
    
    // Update the stats object
    setStats({
      totalProperties: allProperties.length,
      availableUnits: availableProperties.length,
      inquiries: 0, // These would be real in a complete app
      appointments: 0 // These would be real in a complete app
    });
  };

  // Show logout confirmation modal
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

  // Handle View Properties click
  const handleViewPropertiesClick = () => {
    navigate('/properties');
  };

  // Format price with currency symbol and proper formatting
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Helper function to get full image URL
  const getFullImageUrl = (url) => {
    if (!url) return '/src/assets/placeholder-property.jpg';
    
    // If it's already a full URL, return it as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Otherwise, prepend the server URL
    return `http://localhost:5000${url}`;
  };

  // Render verification status banner for homeowners
  const renderVerificationBanner = () => {
    if (userType !== 'owner') return null;
    
    if (userVerificationStatus === 'verified') {
      return (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your account is verified. You can add property listings.
              </p>
            </div>
          </div>
        </div>
      );
    } else if (userVerificationStatus === 'pending') {
      return (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Your verification is pending admin approval. You can submit property listings, but they won't be public until your account is verified.
              </p>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Your account is not verified yet. Please upload verification documents in your profile before adding properties.
              </p>
              <div className="mt-2">
                <Link
                  to="/profile"
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Go to Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Combine both types of properties for displaying in the dashboard
  const allMyProperties = [...ownedProperties, ...agentProperties];

  return (
    <>
      <Navbar onLogoutClick={handleLogoutClick} />
      
      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">😢</div>
              <h2 className="text-xl font-bold mb-2">Are you sure you want to logout?</h2>
              <p className="text-gray-600">Are you done using me?</p>
            </div>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleLogoutCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                Stay
              </button>
              <button
                onClick={handleLogoutConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}
      
      <motion.div
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        transition={{ duration: 0.5 }}
        className="max-w-7xl mx-auto pt-9 px-4 pb-10"
      >
        {/* Admin Actions Section - Only visible for admin users */}
        {isAdmin && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Admin Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 transition-all hover:shadow-lg">
                <h3 className="text-xl font-bold mb-2">Manage Listings</h3>
                <p className="text-gray-600 mb-4">Edit, delete, or update existing property listings</p>
                <Link 
                  to="/admin/manage-listings"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block"
                >
                  Edit Listings
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 transition-all hover:shadow-lg">
                <h3 className="text-xl font-bold mb-2">Add New Property</h3>
                <p className="text-gray-600 mb-4">Create a new property listing with details and images</p>
                <Link 
                  to="/admin/add-property"
                  className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 inline-block"
                >
                  Add Property
                </Link>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500 transition-all hover:shadow-lg">
                <h3 className="text-xl font-bold mb-2">User Management</h3>
                <p className="text-gray-600 mb-4">View and manage website users and their permissions</p>
                <Link 
                  to="/admin/users"
                  className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 inline-block"
                >
                  Manage Users
                </Link>
              </div>
            </div>
            
            {/* New Admin Section: Approval Management */}
            <div className="mt-6 bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
              <h3 className="text-xl font-bold mb-2">Approvals</h3>
              <p className="text-gray-600 mb-4">Manage pending property listings and user verification requests</p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 mr-3">
                    {pendingProperties.length}
                  </div>
                  <span>Pending Properties</span>
                </div>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-3">
                    {pendingVerifications.length}
                  </div>
                  <span>Pending Verifications</span>
                </div>
                <Link 
                  to="/admin/approval-management"
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 inline-block ml-auto"
                >
                  Manage Approvals
                </Link>
              </div>
            </div>
          </div>
        )}
        
        {/* Homeowner Dashboard - Only visible for homeowner users */}
        {!isAdmin && userType === 'owner' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Homeowner Dashboard</h2>
            
            {/* Verification Status Banner */}
            {renderVerificationBanner()}
            
            {/* Property Management Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-2">My Properties</h3>
                <p className="text-gray-600 mb-4">View and manage your property listings</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 mr-3">
                      {allMyProperties.length}
                    </div>
                    <span>Active Listings</span>
                  </div>
                  <Link 
                    to="/homeowner/my-listings"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block"
                  >
                    View Listings
                  </Link>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg">
                <h3 className="text-xl font-bold mb-2">Add New Property</h3>
                <p className="text-gray-600 mb-4">List a new property for sale or rent</p>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 mr-3">
                      {pendingProperties.length}
                    </div>
                    <span>Pending Approval</span>
                  </div>
                  <Link 
                    to="/homeowner/add-property"
                    className={`px-4 py-2 rounded-md inline-block ${
                      userVerificationStatus === 'unverified' 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    onClick={(e) => {
                      if (userVerificationStatus === 'unverified') {
                        e.preventDefault();
                      }
                    }}
                  >
                    Add Property
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Renter Dashboard Content - Only visible for renter users */}
        {!isAdmin && userType === 'renter' && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">Welcome to Your Dashboard</h2>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <p className="text-gray-700 mb-4">
                Welcome to your property dashboard. Use the quick actions below to find your next home!
              </p>
              
              {/* Verification banner for renters */}
              {userVerificationStatus !== 'verified' && (
                <div className={`p-4 rounded-md mt-4 ${
                  userVerificationStatus === 'pending' 
                    ? 'bg-yellow-50 border border-yellow-200' 
                    : 'bg-blue-50 border border-blue-200'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className={`h-5 w-5 ${
                        userVerificationStatus === 'pending' ? 'text-yellow-500' : 'text-blue-500'
                      }`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium">
                        {userVerificationStatus === 'pending' 
                          ? 'Verification pending approval' 
                          : 'Get verified for priority access'}
                      </h3>
                      <div className="mt-2 text-sm">
                        <p className={userVerificationStatus === 'pending' ? 'text-yellow-700' : 'text-blue-700'}>
                          {userVerificationStatus === 'pending' 
                            ? 'Your verification documents are being reviewed. You will be notified once approved.' 
                            : 'Verified renters get priority access to new listings and faster responses from homeowners.'}
                        </p>
                        {userVerificationStatus !== 'pending' && (
                          <Link 
                            to="/profile" 
                            className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                          >
                            Get Verified
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Analytics Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500"
            >
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Properties</h3>
              <p className="text-3xl font-bold">{stats.totalProperties}</p>
              <p className="text-sm text-gray-500 mt-2">
                {isAdmin 
                  ? 'Across all listings' 
                  : userType === 'owner' 
                    ? 'Your listings (owned + agent)'
                    : 'In your wishlist'
                }
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500"
            >
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Available Units</h3>
              <p className="text-3xl font-bold">{stats.availableUnits}</p>
              <p className="text-sm text-gray-500 mt-2">Ready for rent/sale</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500"
            >
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Inquiries</h3>
              <p className="text-3xl font-bold">{stats.inquiries}</p>
              <p className="text-sm text-gray-500 mt-2">New this week</p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500"
            >
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Appointments</h3>
              <p className="text-3xl font-bold">{stats.appointments}</p>
              <p className="text-sm text-gray-500 mt-2">Scheduled visits</p>
            </motion.div>
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleViewPropertiesClick}
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Browse Properties</span>
            </motion.button>
            
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/wishlist"
                className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-all h-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>Wishlist</span>
              </Link>
            </motion.div>
            
            {/* Profile Link based on user type */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to={isAdmin ? "/admin/profile" : "/profile"}
                className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-all h-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>My Profile</span>
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link 
                to="/contact"
                className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-200 transition-all h-full"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Contact Us</span>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Conditional content based on user type */}
        {isAdmin && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recent Properties</h2>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewPropertiesClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
              >
                View All
              </motion.button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentProperties.length > 0 ? (
                // Display dynamically loaded properties
                recentProperties.map((property, index) => (
                  <motion.div 
                    key={property.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1) }}
                    className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      {property.image && (
                        <img 
                          src={getFullImageUrl(property.image)} 
                          alt={property.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/src/assets/placeholder-property.jpg';
                          }}
                        />
                      )}
                      <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
                        {property.status}
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{property.title}</h3>
                      <p className="text-gray-600 mb-2">{property.location}</p>
                      <p className={`${property.status === 'For Sale' ? 'text-green-600' : 'text-blue-600'} font-bold`}>
                        {formatPrice(property.price)}
                        {property.status === 'For Rent' && ' / month'}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                          </svg>
                          {property.bedrooms} BR
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {property.availableFrom || 'Available Now'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                // Default static examples if no properties found
                <>
                  {/* Property Card 1 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
                        For Rent
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">Modern Studio Apartment</h3>
                      <p className="text-gray-600 mb-2">123 Main St, Cebu City</p>
                      <p className="text-blue-600 font-bold">₱15,000 / month</p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                          </svg>
                          1 BR
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Available Now
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Property Card 2 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <div className="absolute top-2 left-2 bg-green-500 text-white py-1 px-2 rounded text-sm">
                        For Sale
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">Luxury Condo with View</h3>
                      <p className="text-gray-600 mb-2">456 Ocean Ave, Cebu City</p>
                      <p className="text-green-600 font-bold">₱4,500,000</p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                          </svg>
                          2 BR
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Available Now
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {/* Property Card 3 */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
                        For Rent
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">Family Home with Garden</h3>
                      <p className="text-gray-600 mb-2">789 Park Rd, Cebu City</p>
                      <p className="text-blue-600 font-bold">₱25,000 / month</p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                          </svg>
                          3 BR
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          June 1
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Homeowner Properties Section */}
        {!isAdmin && userType === 'owner' && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">My Properties</h2>
              <Link 
                to="/homeowner/my-listings"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
              >
                View All
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {allMyProperties.length > 0 ? (
                // Display dynamically loaded properties
                allMyProperties.slice(0, 3).map((property, index) => (
                  <motion.div 
                    key={property.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * (index + 1) }}
                    className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
                  >
                    <div className="h-48 bg-gray-200 relative">
                      <img 
                        src={getFullImageUrl(property.image)} 
                        alt={property.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/src/assets/placeholder-property.jpg';
                        }}
                      />
                      <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
                        {property.status}
                      </div>
                      {/* Badge to show if owned or agent */}
                      {property.isAgent && (
                        <div className="absolute top-2 right-2 bg-purple-500 text-white py-1 px-2 rounded text-xs">
                          Agent
                        </div>
                      )}
                      {property.isOwner && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white py-1 px-2 rounded text-xs">
                          Owner
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{property.title}</h3>
                      <p className="text-gray-600 mb-2">{property.location}</p>
                      <p className={`${property.status === 'For Sale' ? 'text-green-600' : 'text-blue-600'} font-bold`}>
                        {formatPrice(property.price)}
                        {property.status === 'For Rent' && ' / month'}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                          </svg>
                          {property.bedrooms} BR
                        </div>
                        <Link
                          to={`/properties/${property.id}`}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="md:col-span-3 p-6 bg-gray-50 rounded-lg text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No properties yet</h3>
                  <p className="text-gray-600 mb-4">
                    You haven't added any properties yet. Get started by adding your first property.
                  </p>
                  <Link
                    to="/homeowner/add-property"
                    className={`px-6 py-3 rounded-md inline-block ${
                      userVerificationStatus === 'unverified' 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    onClick={(e) => {
                      if (userVerificationStatus === 'unverified') {
                        e.preventDefault();
                      }
                    }}
                  >
                    Add Your First Property
                  </Link>
                </div>
              )}
            </div>
            
            {/* Pending Properties */}
            {pendingProperties.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Pending Approval</h3>
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800">
                        You have {pendingProperties.length} {pendingProperties.length === 1 ? 'property' : 'properties'} pending admin approval
                      </h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        Your listings will be reviewed shortly. You'll be notified when they're approved.
                      </p>
                      <Link
                        to="/homeowner/my-listings"
                        className="mt-2 inline-block text-sm text-yellow-800 underline"
                      >
                        View pending listings
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommended Properties for Renters */}
        {!isAdmin && userType === 'renter' && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recommended for You</h2>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleViewPropertiesClick}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all"
              >
                View All
              </motion.button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Example recommended properties */}
              {/* Property Card 1 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
                    For Rent
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">Modern Studio Apartment</h3>
                  <p className="text-gray-600 mb-2">123 Main St, Cebu City</p>
                  <p className="text-blue-600 font-bold">₱15,000 / month</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                      </svg>
                      1 BR
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Available Now
                    </div>
                  </div>
                </div>
              </motion.div>
              
              {/* Property Card 2 */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
              >
                <div className="h-48 bg-gray-200 relative">
                  <div className="absolute top-2 left-2 bg-green-500 text-white py-1 px-2 rounded text-sm">
                    For Sale
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">Luxury Condo with View</h3>
                  <p className="text-gray-600 mb-2">456 Ocean Ave, Cebu City</p>
                  <p className="text-green-600 font-bold">₱4,500,000</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
                      </svg>
                      2 BR
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Available Now
                    </div>
                  </div>
                </div>
              </motion.div>
              
             {/* Property Card 3 */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.3 }}
  className="rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
>
  <div className="h-48 bg-gray-200 relative">
    <div className="absolute top-2 left-2 bg-blue-500 text-white py-1 px-2 rounded text-sm">
      For Rent
    </div>
  </div>
  <div className="p-4">
    <h3 className="font-bold text-lg mb-2">Family Home with Garden</h3>
    <p className="text-gray-600 mb-2">789 Park Rd, Cebu City</p>
    <p className="text-blue-600 font-bold">₱25,000 / month</p>
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center text-sm text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3" />
        </svg>
        3 BR
      </div>
      <div className="flex items-center text-sm text-gray-500">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        June 1
      </div>
    </div>
  </div>
</motion.div>
</div>
</div>
)}
</motion.div>
</>
);
};

export default Dashboard;