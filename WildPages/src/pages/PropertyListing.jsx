import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import PropertyMap from '../components/PropertyMap';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase/auth';
// Import the residence image
import residenceBackground from '../assets/Residence.jpg';
// Import motion components for fade transition
import { motion, AnimatePresence } from 'framer-motion';

const PropertyListing = () => {
  // Navigation
  const navigate = useNavigate();
  const location = useLocation(); // Add this to access URL parameters
  const { currentUser, isAdmin } = useAuth();
  
  // State
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [cities, setCities] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 3 rows of 3 columns
  
  // Filter states
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Main Locations');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [selectedType, setSelectedType] = useState('All Types');
  const [sortOrder, setSortOrder] = useState('Date New to Old');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Reference to the map component and profile menu
  const mapRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Fade transition variant
  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };

  // Property types for filtering
  const propertyTypes = [
    'Condominium', 
    'Villa', 
    'Single Family', 
    'Townhouse', 
    'Land', 
    'Apartment'
  ];

  // Status options - Updated to include Sold and Rented status
  const statusOptions = ['For Sale', 'For Rent', 'Sold', 'Rented'];

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileMenuRef]);

  // Check for URL parameters when component loads
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const keywordParam = params.get('keyword');
    
    if (keywordParam) {
      setSearchKeyword(keywordParam);
      
      // Wait for component to fully mount and properties to load
      setTimeout(() => {
        // Focus map on the search location if search has location terms
        if (keywordParam.trim() && mapRef.current) {
          mapRef.current.focusByLocationName(keywordParam);
          
          // Scroll to map view for better UX
          const mapElement = document.querySelector('.map-container');
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        
        // Optional: Auto-submit the search form to filter properties
        const searchForm = document.querySelector('form');
        if (searchForm) searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
      }, 1000); // Increased timeout to ensure map is fully loaded
    }
  }, [location.search]);

  // Navigate to profile page
  const handleProfileClick = () => {
    // Check if user is admin and redirect accordingly
    if (isAdmin) {
      navigate('/admin/dashboard'); // Send admin to admin dashboard
    } else {
      navigate('/profile'); // Send regular users to profile
    }
    setShowProfileMenu(false);
  };

  // Navigate to my properties page
  const handleMyPropertiesClick = () => {
    navigate('/my-properties');
    setShowProfileMenu(false);
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
    setShowProfileMenu(false);
  };

  // Show logout confirmation modal
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setShowProfileMenu(false);
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

  // Load favorites from localStorage
  useEffect(() => {
    if (currentUser) {
      const storedFavorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.uid}`) || '[]');
      setFavorites(storedFavorites);
    } else {
      setFavorites([]);
    }
  }, [currentUser]);

  // Fetch properties from Firebase Realtime Database
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        
        // Create a reference to the properties node in your Realtime Database
        const propertiesRef = ref(db, 'properties');
        
        // Get all properties
        const snapshot = await get(propertiesRef);
        
        if (snapshot.exists()) {
          // Convert the Firebase snapshot to an array of properties with IDs
          const propertiesData = [];
          snapshot.forEach((childSnapshot) => {
            propertiesData.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          
          setProperties(propertiesData);
          setFilteredProperties(propertiesData);
          
          // Extract unique cities for the location filter
          const uniqueCities = [...new Set(propertiesData.map(property => 
            property.city || (property.location ? property.location.split(',')[0].trim() : '')
          ))].filter(city => city !== '');
          
          setCities(uniqueCities);
        } else {
          // If no properties exist, set empty arrays
          setProperties([]);
          setFilteredProperties([]);
          setCities([]);
          console.log("No properties found in the database");
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Apply filters when filter criteria change
  useEffect(() => {
    const applyFilters = () => {
      try {
        // Only filter if we have properties
        if (properties.length === 0) return;
        
        setLoading(true);
        
        let filtered = [...properties];
        
        // Filter by type
        if (selectedType !== 'All Types') {
          filtered = filtered.filter(property => property.type === selectedType);
        }
        
        // Filter by status
        if (selectedStatus !== 'All Status') {
          filtered = filtered.filter(property => property.status === selectedStatus);
        }
        
        // Filter by location
        if (selectedLocation !== 'All Main Locations') {
          filtered = filtered.filter(property => 
            property.city === selectedLocation || 
            (property.location && property.location.includes(selectedLocation))
          );
        }
        
        // Filter by price range
        if (minPrice) {
          filtered = filtered.filter(property => property.price >= parseInt(minPrice));
        }
        
        if (maxPrice) {
          filtered = filtered.filter(property => property.price <= parseInt(maxPrice));
        }
        
        // Sort properties
        if (sortOrder === 'Price Low to High') {
          filtered.sort((a, b) => a.price - b.price);
        } else if (sortOrder === 'Price High to Low') {
          filtered.sort((a, b) => b.price - a.price);
        } else {
          // Default: Date New to Old - assuming each property has a createdAt value
          filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
            const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
            return dateB - dateA;
          });
        }
        
        // Apply keyword search
        if (searchKeyword.trim()) {
          const keyword = searchKeyword.toLowerCase();
          filtered = filtered.filter(property => 
            (property.title && property.title.toLowerCase().includes(keyword)) ||
            (property.description && property.description.toLowerCase().includes(keyword)) ||
            (property.location && property.location.toLowerCase().includes(keyword)) ||
            (property.type && property.type.toLowerCase().includes(keyword)) ||
            (property.city && property.city.toLowerCase().includes(keyword))
          );
        }
        
        setFilteredProperties(filtered);
        // Reset to first page when filters change
        setCurrentPage(1);
      } catch (err) {
        console.error('Error applying filters:', err);
        setError('Failed to filter properties. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    applyFilters();
  }, [
    searchKeyword, 
    selectedLocation, 
    selectedStatus, 
    selectedType, 
    sortOrder, 
    minPrice, 
    maxPrice,
    properties
  ]);

  // Get current page items
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProperties.slice(indexOfFirstItem, indexOfLastItem);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredProperties.length / itemsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Go to next page
  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  // Go to previous page
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Function to format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    
    // Update URL with the current search keyword (for bookmarking)
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('keyword', searchKeyword);
    window.history.pushState({}, '', currentUrl);
    
    // Focus map on the search location if search has location terms
    if (searchKeyword.trim() && mapRef.current) {
      mapRef.current.focusByLocationName(searchKeyword);
      
      // Scroll to map view for better UX
      const mapElement = document.querySelector('.map-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedLocation('All Main Locations');
    setSelectedStatus('All Status');
    setSelectedType('All Types');
    setSortOrder('Date New to Old');
    setMinPrice('');
    setMaxPrice('');
  };

  // Handle location icon click
  const handleLocationClick = (property) => {
    if (mapRef.current && property.coordinates) {
      mapRef.current.focusLocation(
        property.coordinates.lat,
        property.coordinates.lng
      );
      
      // Scroll to map view
      const mapElement = document.querySelector('.map-container');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Toggle favorite
  const toggleFavorite = (propertyId) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    
    const updatedFavorites = [...favorites];
    const index = updatedFavorites.indexOf(propertyId);
    
    if (index > -1) {
      // Remove from favorites
      updatedFavorites.splice(index, 1);
    } else {
      // Add to favorites
      updatedFavorites.push(propertyId);
    }
    
    setFavorites(updatedFavorites);
    localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(updatedFavorites));
  };

  // Handle login button click in modal
  const handleLoginClick = () => {
    navigate('/login', { state: { from: '/properties' } });
  };
  
  // Function to get status styles based on property status
  const getStatusStyles = (status) => {
    switch (status) {
      case 'For Sale':
        return 'bg-green-100 text-green-800';
      case 'For Rent':
        return 'bg-blue-100 text-blue-800';
      case 'Sold':
        return 'bg-gray-100 text-gray-800';
      case 'Rented':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-white text-gray-800';
    }
  };

  // Pagination component
  const Pagination = () => {
    const pageNumbers = [];
    
    // Generate page numbers
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    
    // Display limited page numbers with ellipsis for better UX
    const renderPageNumbers = () => {
      // Show fewer page numbers on mobile
      const maxVisiblePages = window.innerWidth < 768 ? 3 : 5;
      
      if (totalPages <= maxVisiblePages) {
        // Show all pages if there are few
        return pageNumbers.map(number => (
          <button
            key={number}
            onClick={() => paginate(number)}
            className={`px-3 py-1 ${
              currentPage === number ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            } rounded mx-1 hover:bg-blue-400 transition-colors`}
          >
            {number}
          </button>
        ));
      } else {
        // Show pages with ellipsis
        const items = [];
        
        // Always show first page
        items.push(
          <button
            key={1}
            onClick={() => paginate(1)}
            className={`px-3 py-1 ${
              currentPage === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            } rounded mx-1 hover:bg-blue-400 transition-colors`}
          >
            1
          </button>
        );
        
        // Calculate range of visible pages
        let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 3);
        
        // Adjust start if we're near the end
        if (endPage - startPage < maxVisiblePages - 3) {
          startPage = Math.max(2, endPage - (maxVisiblePages - 3));
        }
        
        // Add ellipsis if necessary at the beginning
        if (startPage > 2) {
          items.push(
            <span key="start-ellipsis" className="px-2">
              ...
            </span>
          );
        }
        
        // Add visible page numbers
        for (let i = startPage; i <= endPage; i++) {
          items.push(
            <button
              key={i}
              onClick={() => paginate(i)}
              className={`px-3 py-1 ${
                currentPage === i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              } rounded mx-1 hover:bg-blue-400 transition-colors`}
            >
              {i}
            </button>
          );
        }
        
        // Add ellipsis if necessary at the end
        if (endPage < totalPages - 1) {
          items.push(
            <span key="end-ellipsis" className="px-2">
              ...
            </span>
          );
        }
        
        // Always show last page
        if (totalPages > 1) {
          items.push(
            <button
              key={totalPages}
              onClick={() => paginate(totalPages)}
              className={`px-3 py-1 ${
                currentPage === totalPages ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
              } rounded mx-1 hover:bg-blue-400 transition-colors`}
            >
              {totalPages}
            </button>
          );
        }
        
        return items;
      }
    };
    
    return (
      <div className="flex flex-wrap items-center justify-center mt-8">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded mx-1 ${
            currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        
        {renderPageNumbers()}
        
        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded mx-1 ${
            currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <motion.div 
      className="bg-gray-50 min-h-screen"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeVariants}
      transition={{ duration: 0.5 }}
    >
      {/* Header with navigation and logo */}
      <div className="bg-white shadow-sm py-3">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <div className="text-2xl font-bold text-black flex items-center cursor-default">
                <img 
                  src="/src/assets/HomeLogo.png" 
                  alt="HomeWildHunt Logo" 
                  className="h-10 mr-2" 
                />
                HomeWildHunt
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-gray-600 hover:text-black">Home</Link>
              <Link to="/wishlist" className="text-gray-600 hover:text-red-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                My Wishlist
                {currentUser && favorites.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {favorites.length}
                  </span>
                )}
              </Link>
              
              {/* Profile dropdown menu */}
{currentUser ? (
  <div className="relative" ref={profileMenuRef}>
    <button 
      onClick={() => setShowProfileMenu(!showProfileMenu)}
      className="flex items-center space-x-2 focus:outline-none"
    >
      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
        {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : "U"}
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
    
    {showProfileMenu && (
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
        <div className="px-4 py-2 border-b">
          <p className="text-sm font-medium text-gray-900">{currentUser.displayName || 'User'}</p>
          <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
        </div>
        <button
          onClick={handleProfileClick}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Profile
        </button>
        <button
          onClick={handleMyPropertiesClick}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          My Properties
        </button>
        <button
          onClick={handleSettingsClick}
          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Settings
        </button>
        <div className="border-t my-1"></div>
        <button
          onClick={handleLogoutClick}
          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    )}
  </div>
) : (
  <Link to="/login" className="text-gray-600 hover:text-blue-600">
    Login
  </Link>
)}
</div>
</div>
</div>
</div>

{/* Login Required Modal */}
{showLoginModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full">
      <div className="text-center mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="text-gray-600">You must be logged in to add properties to your wishlist.</p>
      </div>
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowLoginModal(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleLoginClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Login Now
        </button>
      </div>
    </div>
  </div>
)}

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

{/* Search bar section with background image */}
<div 
  className="py-6"
  style={{
    backgroundImage: `url(${residenceBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative'
  }}
>
  {/* Semi-transparent overlay */}
  <div 
    className="absolute inset-0"
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
    }}
  ></div>
  
  <div className="container mx-auto px-4 relative z-10">
    <div className="bg-white rounded-lg p-4 shadow-md">
      <form onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keyword</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Search by keyword..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option>All Main Locations</option>
              {cities.map((city, index) => (
                <option key={index} value={city}>{city}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option>All Status</option>
              {statusOptions.map((status, index) => (
                <option key={index}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md bg-white"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option>All Types</option>
              {propertyTypes.map((type, index) => (
                <option key={index}>{type}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-between items-center">
          <button 
            type="button" 
            onClick={resetFilters}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center space-x-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span>Reset Filters</span>
          </button>
          <div className="flex space-x-2">
            <button 
              type="button"
              onClick={() => {
                document.getElementById('advancedFilters').classList.toggle('hidden');
              }}
              className="px-4 py-2 border border-blue-500 text-blue-500 rounded-md hover:bg-blue-50"
            >
              Advanced Filters
            </button>
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Search
            </button>
          </div>
        </div>
        
        {/* Advanced filters (hidden by default) */}
        <div id="advancedFilters" className="mt-4 pt-4 border-t hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              >
                <option value="">No Min</option>
                <option value="1000000">₱1,000,000</option>
                <option value="5000000">₱5,000,000</option>
                <option value="10000000">₱10,000,000</option>
                <option value="20000000">₱20,000,000</option>
                <option value="30000000">₱30,000,000</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              >
                <option value="">No Max</option>
                <option value="5000000">₱5,000,000</option>
                <option value="10000000">₱10,000,000</option>
                <option value="20000000">₱20,000,000</option>
                <option value="30000000">₱30,000,000</option>
                <option value="50000000">₱50,000,000</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

{/* Map section with background image */}
<div 
  className="h-96 relative map-container"
  style={{
    backgroundImage: `url(${residenceBackground})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }}
>
  <div 
    className="absolute inset-0"
    style={{
      backgroundColor: 'rgba(255, 255, 255, 0.4)',
    }}
  ></div>
  
  <div className="relative z-10 h-full">
    <PropertyMap properties={filteredProperties} ref={mapRef} />
  </div>
  
  {/* Map controls */}
  <div className="absolute top-4 right-4 z-20 flex flex-col space-y-2">
    <button 
      className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50"
      title="Zoom In"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>
    <button 
      className="p-3 bg-white rounded-full shadow-md hover:bg-gray-50"
      title="Zoom Out"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
      </svg>
    </button>
  </div>
</div>

{/* Breadcrumb and title */}
<div className="container mx-auto px-4 py-6">
  <div className="flex justify-between items-center mb-4">
    <div className="flex items-center text-sm text-gray-500">
      <Link to="/" className="hover:text-blue-500">Home</Link>
      <span className="mx-2">›</span>
      <span className="text-gray-800">Listings</span>
    </div>
  </div>
  
  <h1 className="text-3xl font-bold mb-2">Listings</h1>
  <p className="text-gray-600">
    {filteredProperties.length === 0 && !loading 
      ? 'No listings found matching your criteria' 
      : `Showing ${Math.min(currentItems.length, itemsPerPage)} of ${filteredProperties.length} ${filteredProperties.length === 1 ? 'listing' : 'listings'}`
    }
  </p>
  
  {/* Sort and view controls */}
  <div className="flex justify-between items-center mt-6">
    <div className="flex items-center">
      <span className="mr-2">Sort By:</span>
      <select
        className="p-2 border border-gray-300 rounded-md bg-white"
        value={sortOrder}
        onChange={(e) => setSortOrder(e.target.value)}
      >
        <option>Date New to Old</option>
        <option>Price Low to High</option>
        <option>Price High to Low</option>
      </select>
    </div>
    <div className="flex space-x-2">
      <button 
        className={`p-2 ${viewMode === 'grid' ? 'text-blue-500' : 'text-gray-500'}`}
        onClick={() => setViewMode('grid')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      </button>
      <button 
        className={`p-2 ${viewMode === 'list' ? 'text-blue-500' : 'text-gray-500'}`}
        onClick={() => setViewMode('list')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  </div>
  
  {/* Loading state */}
  {loading && (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  )}
  
  {/* Error state */}
  {error && (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            {error}
          </p>
        </div>
      </div>
    </div>
  )}
  
  {/* No properties found but message for initial setup */}
  {!loading && !error && filteredProperties.length === 0 && (
    <div className="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mb-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
      <h3 className="text-xl font-medium text-gray-900">No properties found</h3>
      <p className="mt-2 text-gray-500">
        You need to add properties to your Firebase Realtime Database to see listings here.
      </p>
      <div className="mt-6">
        <Link to="/" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
          Go to Home
        </Link>
      </div>
    </div>
  )}
  
  {/* Property grid with AnimatePresence for smooth transitions */}
{!loading && !error && filteredProperties.length > 0 && (
  <AnimatePresence>
    <div className={`mt-8 ${
      viewMode === 'grid' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
        : 'space-y-6'
    }`}>
      {currentItems.map((property) => (
        <motion.div
          key={property.id}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={fadeVariants}
          transition={{ duration: 0.3 }}
          className={`bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow ${
            viewMode === 'grid' ? '' : 'flex flex-col md:flex-row'
          }`}
        >
          <div className={viewMode === 'grid' ? 'relative' : 'relative md:w-1/3'}>
            <img 
              src={getFullImageUrl(property.image)} 
              alt={property.title}
              className={`w-full ${viewMode === 'grid' ? 'h-64' : 'h-64 md:h-full'} object-cover`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/src/assets/placeholder-property.jpg'; // Fallback image
              }}
            />
            <div className="absolute bottom-4 left-4 flex space-x-2">
              {property.tags && property.tags.map((tag, idx) => (
                <span 
                  key={idx} 
                  className={`px-2 py-1 text-xs font-semibold rounded-md ${
                    tag === 'Featured' 
                      ? 'bg-blue-500 text-white' 
                      : tag === 'Trendy' || tag === 'Premium'
                        ? 'bg-orange-500 text-white' 
                        : tag === 'Beachfront'
                          ? 'bg-teal-500 text-white'
                          : 'bg-purple-500 text-white'
                  }`}
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="absolute top-4 left-4">
              <span className={`px-2 py-1 text-xs font-bold rounded ${
                property.status === 'For Sale' 
                  ? 'bg-green-100 text-green-800' 
                  : property.status === 'For Rent'
                    ? 'bg-blue-100 text-blue-800'
                    : property.status === 'Sold'
                      ? 'bg-gray-100 text-gray-800'
                      : property.status === 'Rented'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-white text-gray-800'
              }`}>
                {property.status}
              </span>
            </div>
            <div className="absolute top-4 right-4 flex space-x-1">
              <button 
                className={`p-1.5 bg-white rounded-full ${favorites.includes(property.id) ? 'text-red-500' : 'text-gray-800 hover:text-red-500'}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(property.id);
                }}
              >
                {favorites.includes(property.id) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                )}
              </button>
              <button 
                className="p-1.5 bg-white rounded-full text-gray-800 hover:text-blue-500"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className={`p-4 ${viewMode === 'grid' ? '' : 'md:w-2/3'}`}>
            <h3 className="text-xl font-bold mb-2 hover:text-blue-500">
              <Link to={`/property/${property.id}`}>{property.title}</Link>
            </h3>
            
            <div className="flex items-center text-gray-600 mb-2">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-1 text-blue-500 cursor-pointer" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLocationClick(property);
                }}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                />
              </svg>
              <span 
                className="text-sm cursor-pointer hover:text-blue-500"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleLocationClick(property);
                }}
              >
                {property.location}
              </span>
            </div>
            
            <div className="flex items-center mb-3">
              <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                {property.type}
              </span>
            </div>
            
            {viewMode === 'list' && (
              <p className="text-gray-600 mb-4 line-clamp-2">
                {property.description ? property.description.substring(0, 150) + '...' : 'No description available'}
              </p>
            )}
            
            <div className="font-bold text-2xl text-blue-600 mb-3">
              {formatPrice(property.price)}
              {property.status === 'For Rent' && ' / month'}
            </div>

            <div className="flex justify-between text-gray-600 text-sm">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>{property.bedrooms || 0}</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>{property.bathrooms || 0}</span>
              </div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>{property.area || 0} sq m</span>
              </div>
            </div>

            {viewMode === 'list' && (
              <div className="mt-4 flex space-x-2">
                <Link 
                  to={`/property/${property.id}`}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  View Details
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(property.id);
                  }}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    favorites.includes(property.id)
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {favorites.includes(property.id) ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      <span>Saved</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  </AnimatePresence>
)}

{/* Pagination */}
{!loading && !error && filteredProperties.length > 0 && (
  <Pagination />
)}

{/* Status Guide Section - Add a new section that explains the status colors */}
{!loading && !error && filteredProperties.length > 0 && (
  <div className="bg-white rounded-lg shadow-md p-6 mt-10">
    <h2 className="text-lg font-semibold mb-4">Property Status Guide</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center">
        <span className="inline-block w-16 h-6 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">For Sale</span>
        <span className="text-sm text-gray-700">Property is available for purchase</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-16 h-6 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">For Rent</span>
        <span className="text-sm text-gray-700">Property is available for rent</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-16 h-6 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">Sold</span>
        <span className="text-sm text-gray-700">Property has been sold and is no longer available</span>
      </div>
      <div className="flex items-center">
        <span className="inline-block w-16 h-6 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">Rented</span>
        <span className="text-sm text-gray-700">Property has been rented and is no longer available</span>
      </div>
    </div>
  </div>
)}
</div>
</motion.div>
  );
};

export default PropertyListing;