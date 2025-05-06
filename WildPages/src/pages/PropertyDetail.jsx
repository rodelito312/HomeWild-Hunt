import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPropertyById, watchPropertyById } from '../services/propertyService';
import { useAuth } from '../context/AuthContext';
import PropertyMap from '../components/PropertyMap';
// Import the residence image
import residenceBackground from '../assets/Residence.jpg';
// Import Firebase auth for logout
import { logout } from '../firebase/auth';
// Import Firebase database functions
import { ref, push, serverTimestamp } from 'firebase/database';
import { db } from '../firebase/config';
// Import motion components from framer-motion
import { motion } from 'framer-motion';

const PropertyDetail = () => {
  // Get the property ID from URL parameters
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [isFavorite, setIsFavorite] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // New state variables for image zooming and dragging
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this property. Please contact me with more information.'
  });

  // Reference to the map component and image container
  const mapRef = useRef(null);
  const imageContainerRef = useRef(null);
  const profileMenuRef = useRef(null);

  // Fade transition variant
  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
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

  // Format price with commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Check if user is owner or agent of the property
  const isUserOwnerOrAgent = () => {
    if (!currentUser) return false;
    
    // Check if user ID matches property owner ID
    if (property.ownerId && property.ownerId === currentUser.uid) return true;
    
    // Check if user is the agent for this property
    if (property.agent && property.agent.id === currentUser.uid) return true;
    
    return false;
  };

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

  // Fetch property data and check favorites using real-time listener
  useEffect(() => {
    let unsubscribe;
    
    const setupPropertyWatcher = () => {
      try {
        setLoading(true);
        
        // Set up real-time listener
        unsubscribe = watchPropertyById(id, (propertyData, error) => {
          if (error) {
            console.error('Error watching property:', error);
            setError('Failed to load property details. Please try again later.');
            setLoading(false);
            return;
          }
          
          if (!propertyData) {
            setError('Property not found or has been deleted');
            setProperty(null);
            setLoading(false);
            return;
          }
          
          setProperty(propertyData);
          setLoading(false);
          
          // Check if property is in favorites (only if user is logged in)
          if (currentUser) {
            const favs = JSON.parse(localStorage.getItem(`favorites_${currentUser.uid}`) || '[]');
            setFavorites(favs);
            setIsFavorite(favs.includes(id));
          }
        });
      } catch (err) {
        console.error('Error setting up property watcher:', err);
        setError('Failed to load property details. Please try again later.');
        setLoading(false);
      }
    };

    setupPropertyWatcher();
    
    // Clean up listener when component unmounts
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [id, currentUser]);

  // Reset image position and zoom when changing active image
  useEffect(() => {
    resetImageView();
  }, [activeImage]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  // Handle contact form submission
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    // Check if user is logged in
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    
    try {
      // Set loading state to show a spinner
      setSubmitting(true);
      
      // Create the message object
      const messageData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || formData.name,
        userEmail: currentUser.email || formData.email,
        userPhone: formData.phone,
        propertyId: id,
        propertyTitle: property.title,
        message: formData.message,
        timestamp: serverTimestamp(),
        ownerSeen: false,
        ownerId: property.ownerId
      };
      
      // Reference to propertyMessages collection
      const messagesRef = ref(db, 'propertyMessages');
      
      // Push the new message to the database
      await push(messagesRef, messageData);
      
      // Show success message
      alert(`Thank you for your interest, ${formData.name || currentUser.displayName}! Your message has been sent to the property owner.`);
      
      // Reset form (optional)
      setFormData({
        ...formData,
        message: 'I am interested in this property. Please contact me with more information.'
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again later.');
    } finally {
      // Reset loading state
      setSubmitting(false);
    }
  };

  // Handle back button
  const handleBackToListing = () => {
    navigate('/properties');
  };

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }
    
    const updatedFavorites = [...favorites];
    
    if (isFavorite) {
      // Remove from favorites
      const index = updatedFavorites.indexOf(id);
      if (index > -1) {
        updatedFavorites.splice(index, 1);
      }
    } else {
      // Add to favorites
      if (!updatedFavorites.includes(id)) {
        updatedFavorites.push(id);
      }
    }
    
    setFavorites(updatedFavorites);
    setIsFavorite(!isFavorite);
    localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(updatedFavorites));
  };

  // Handle login button click in modal
  const handleLoginClick = () => {
    navigate('/login', { state: { from: `/property/${id}` } });
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

  // Navigate to messages page
  const handleMessagesClick = () => {
    navigate('/messages');
    setShowProfileMenu(false);
  };

  // Navigate to settings page
  const handleSettingsClick = () => {
    navigate('/settings');
    setShowProfileMenu(false);
  };

  // Handle location click to focus map
  const handleLocationClick = () => {
    if (mapRef.current && property?.coordinates) {
      // Switch to location tab if not already active
      if (activeTab !== 'location') {
        setActiveTab('location');
        
        // Give time for tab to switch, then focus map
        setTimeout(() => {
          mapRef.current.focusLocation(
            property.coordinates.lat,
            property.coordinates.lng,
            15
          );
          
          // Scroll to map view
          const mapElement = document.querySelector('.property-map-container');
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      } else {
        // Focus map immediately if already on location tab
        mapRef.current.focusLocation(
          property.coordinates.lat,
          property.coordinates.lng,
          15
        );
      }
    }
  };

  // *** IMPROVED IMAGE VIEWER FUNCTIONS ***
  
  // Handle image click for zooming in/out
  const handleImageClick = () => {
    if (isZoomed) {
      resetImageView();
    } else {
      setZoomLevel(2);
      setIsZoomed(true);
    }
  };

  // Improved reset function with smooth transition
  const resetImageView = () => {
    setZoomLevel(1);
    setImagePosition({ x: 0, y: 0 });
    setIsZoomed(false);
    
    // Apply smooth transition when resetting
    if (imageContainerRef.current) {
      const imageElement = imageContainerRef.current.querySelector('img');
      if (imageElement) {
        imageElement.style.transition = 'transform 0.3s ease';
        // Remove transition after it completes
        setTimeout(() => {
          if (imageElement) {
            imageElement.style.transition = '';
          }
        }, 300);
      }
    }
  };

  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Add these lines to improve dragging feel
      if (imageContainerRef.current) {
        const imageElement = imageContainerRef.current.querySelector('img');
        if (imageElement) {
          imageElement.style.transition = 'none'; // Remove transition during drag
        }
      }
      
      // Prevent default behavior to avoid text selection during drag
      e.preventDefault();
    }
  };

  // Improved mouse move handler with proper constraints
  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      // Calculate constraints based on zoom level and container size
      // This prevents the image from being dragged too far outside view
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const maxX = (zoomLevel - 1) * containerRect.width / 2;
      const maxY = (zoomLevel - 1) * containerRect.height / 2;
      
      // Calculate new positions with constraints
      const newX = Math.min(Math.max(imagePosition.x + dx, -maxX), maxX);
      const newY = Math.min(Math.max(imagePosition.y + dy, -maxY), maxY);
      
      setImagePosition({
        x: newX,
        y: newY
      });
      
      setDragStart({ x: e.clientX, y: e.clientY });
      
      // Prevent default behavior to avoid text selection during drag
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
    }
  };

  // Improved zoom in function with focus preservation
  const handleZoomIn = (e) => {
    e.stopPropagation();
    if (zoomLevel < 3) {
      const newZoom = zoomLevel + 0.5;
      setZoomLevel(newZoom);
      setIsZoomed(true);
      
      // When increasing zoom, keep the center point stable
      if (imageContainerRef.current) {
        const containerRect = imageContainerRef.current.getBoundingClientRect();
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        // Adjust position to maintain center focus
        const scaleFactor = 0.5 / newZoom;
        setImagePosition({
          x: imagePosition.x - (centerX * scaleFactor),
          y: imagePosition.y - (centerY * scaleFactor)
        });
      }
    }
  };

  // Improved zoom out function
  const handleZoomOut = (e) => {
    e.stopPropagation();
    if (zoomLevel > 1) {
      const newZoom = zoomLevel - 0.5;
      setZoomLevel(newZoom);
      
      // When decreasing zoom, adjust position to maintain context
      if (imageContainerRef.current && newZoom > 1) {
        const containerRect = imageContainerRef.current.getBoundingClientRect();
        
        // Calculate constraints for new zoom level
        const maxX = (newZoom - 1) * containerRect.width / 2;
        const maxY = (newZoom - 1) * containerRect.height / 2;
        
        // Constrain position to new boundaries
        setImagePosition({
          x: Math.min(Math.max(imagePosition.x, -maxX), maxX),
          y: Math.min(Math.max(imagePosition.y, -maxY), maxY)
        });
      }
      
      if (newZoom === 1) {
        resetImageView();
      }
    }
  };

  // Add touch event handlers for mobile support
  const handleTouchStart = (e) => {
    if (zoomLevel > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ 
        x: e.touches[0].clientX, 
        y: e.touches[0].clientY 
      });
      
      // Prevent default to avoid page scrolling during image drag
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && zoomLevel > 1 && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStart.x;
      const dy = touch.clientY - dragStart.y;
      
      // Calculate constraints based on zoom level and container size
      const containerRect = imageContainerRef.current.getBoundingClientRect();
      const maxX = (zoomLevel - 1) * containerRect.width / 2;
      const maxY = (zoomLevel - 1) * containerRect.height / 2;
      
      // Calculate new positions with constraints
      const newX = Math.min(Math.max(imagePosition.x + dx, -maxX), maxX);
      const newY = Math.min(Math.max(imagePosition.y + dy, -maxY), maxY);
      
      setImagePosition({
        x: newX,
        y: newY
      });
      
      setDragStart({ 
        x: touch.clientX, 
        y: touch.clientY 
      });
      
      // Prevent default to avoid page scrolling during image drag
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Double tap handler for mobile zoom
  const lastTapTimeRef = useRef(0);
  const handleDoubleTap = (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTimeRef.current;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      handleImageClick();
      e.preventDefault();
    }
    
    lastTapTimeRef.current = currentTime;
  };

  // Contact Form with login check
  const renderContactForm = () => {
    return (
      <form className="space-y-4" onSubmit={handleContactSubmit}>
        <div>
          <input 
            type="text" 
            name="name"
            placeholder="Your Name" 
            className={`w-full p-3 border border-gray-300 rounded-md ${!currentUser ? 'bg-gray-100' : ''}`}
            value={currentUser?.displayName || formData.name}
            onChange={handleInputChange}
            required
            disabled={!currentUser}
          />
        </div>
        <div>
          <input 
            type="email"
            name="email"
            placeholder="Your Email" 
            className={`w-full p-3 border border-gray-300 rounded-md ${!currentUser ? 'bg-gray-100' : ''}`}
            value={currentUser?.email || formData.email}
            onChange={handleInputChange}
            required
            disabled={!currentUser}
          />
        </div>
        <div>
          <input 
            type="tel"
            name="phone"
            placeholder="Your Phone" 
            className={`w-full p-3 border border-gray-300 rounded-md ${!currentUser ? 'bg-gray-100' : ''}`}
            value={formData.phone}
            onChange={handleInputChange}
            required
            disabled={!currentUser}
          />
        </div>
        <div>
          <textarea 
            name="message"
            placeholder="Message"
            rows="4"
            className={`w-full p-3 border border-gray-300 rounded-md ${!currentUser ? 'bg-gray-100' : ''}`}
            value={formData.message}
            onChange={handleInputChange}
            required
            disabled={!currentUser}
          ></textarea>
        </div>
        {currentUser ? (
          <button 
            type="submit"
            disabled={submitting}
            className={`w-full py-3 ${submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md transition-colors flex items-center justify-center`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              'Contact Agent'
            )}
          </button>
        ) : (
          <button 
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Login to Contact Agent
          </button>
        )}
      </form>
    );
  };

  // Contact Agent section
  const contactAgentSection = () => {
    // If user is owner or agent, show a different message
    if (isUserOwnerOrAgent()) {
      return (
        <div className="mt-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-blue-800">Your Property</h3>
                <p className="text-blue-600">This is your property listing. You can edit it from your dashboard.</p>
              </div>
            </div>
            <div className="mt-4">
              <button 
                onClick={() => navigate('/my-properties')}
                className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Manage This Property
              </button>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Contact Agent</h3>
        <div className="flex items-center mb-4">
          <img 
            src={property.agent?.image && !property.agent.image.startsWith('/src') ? getFullImageUrl(property.agent.image) : '/src/assets/agent.jpg'}
            alt={property.agent?.name || 'Agent'}
            className="w-16 h-16 rounded-full mr-4 object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/src/assets/agent.jpg'; // Fallback image
            }}
          />
          <div>
            <h4 className="font-bold">{property.agent?.name || 'Agent'}</h4>
            <p className="text-sm text-gray-600">{property.agent?.email || 'agent@example.com'}</p>
            <p className="text-sm text-gray-600">{property.agent?.phone || 'N/A'}</p>
          </div>
        </div>
        
        {renderContactForm()}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Property Not Found</h1>
        <p className="mb-8">{error || "The property you are looking for does not exist or has been removed."}</p>
        <div className="flex justify-center space-x-4">
          <button 
            onClick={handleBackToListing}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            View All Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeVariants}
      transition={{ duration: 0.5 }}
      className="min-h-screen pb-12"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url(${residenceBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Login Required Modal - Updated text to be more generic */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h2 className="text-xl font-bold mb-2">Login Required</h2>
              <p className="text-gray-600">You must be logged in to use this feature.</p>
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
      
      {/* Header with navigation and favorite button */}
      <div className="bg-white shadow-sm mb-4">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center text-sm text-gray-500">
            <Link to="/" className="hover:text-blue-500">Home</Link>
            <span className="mx-2">›</span>
            <Link to="/properties" className="hover:text-blue-500">Properties</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-800">{property.title}</span>
          </div>
          <div className="flex items-center space-x-4">
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
                      onClick={handleMessagesClick}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Messages
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

      {/* Property Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
            <div className="flex items-center text-gray-600 mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 mr-1 text-blue-500 cursor-pointer" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                onClick={handleLocationClick}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span 
                className="cursor-pointer hover:text-blue-500" 
                onClick={handleLocationClick}
              >
                {property.location}
              </span>
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600">
            {formatPrice(property.price)}
            <span className="text-sm font-normal text-gray-600 ml-2">{property.status}</span>
          </div>
        </div>
      </div>

      {/* Property Images Gallery */}
      <div className="container mx-auto px-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            {/* Enhanced Image Viewer with proper aspect ratio */}
            <div 
              ref={imageContainerRef}
              className="bg-gray-200 rounded-lg overflow-hidden relative h-0 pb-[56.25%]" /* 16:9 aspect ratio */
              style={{ cursor: isZoomed ? 'move' : 'zoom-in' }}
              onClick={handleImageClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
            >
              <div 
                className="absolute inset-0 transition-transform duration-200"
                style={{ 
                  transform: `scale(${zoomLevel}) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
                  transformOrigin: 'center center'
                }}
              >
                <img 
                  src={property.images && property.images.length > 0 ? getFullImageUrl(property.images[activeImage]) : '/src/assets/placeholder-property.jpg'} 
                  alt={`${property.title} - Image ${activeImage + 1}`}
                  className="w-full h-full object-contain" /* Changed from object-cover to object-contain */
                  draggable="false"
                  onTouchStart={handleDoubleTap}
                />
              </div>
              
              {/* Zoom controls */}
              <div className="absolute bottom-4 right-4 flex space-x-2">
                <button 
                  className="bg-white/80 p-2 rounded-full hover:bg-white"
                  onClick={handleZoomOut}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <button 
                  className="bg-white/80 p-2 rounded-full hover:bg-white"
                  onClick={handleZoomIn}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              
              {/* Image counter */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                {activeImage + 1} / {property.images?.length || 1}
              </div>

              {/* Navigation buttons */}
              {property.images && property.images.length > 1 && (
                <>
                  <button 
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage(prev => prev === 0 ? property.images.length - 1 : prev - 1);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImage(prev => prev === property.images.length - 1 ? 0 : prev + 1);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail gallery with proper aspect ratio */}
            {property.images && property.images.length > 1 && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {property.images.map((img, index) => (
                  <div 
                    key={index}
                    className={`h-0 pb-[75%] rounded-lg overflow-hidden cursor-pointer relative ${activeImage === index ? 'ring-2 ring-blue-500' : ''}`}
                    onClick={() => setActiveImage(index)}
                  >
                    <img 
                      src={getFullImageUrl(img)} 
                      alt={`Thumbnail ${index + 1}`} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Property Quick Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4">Property Details</h2>
            
            <div className="space-y-3">
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Property ID:</span>
                <span className="font-semibold">{property.propertyId}</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Property Type:</span>
                <span className="font-semibold">{property.type}</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Bedrooms:</span>
                <span className="font-semibold">{property.bedrooms}</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Bathrooms:</span>
                <span className="font-semibold">{property.bathrooms}</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Area:</span>
                <span className="font-semibold">{property.area} sq m</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Year Built:</span>
                <span className="font-semibold">{property.yearBuilt || 'N/A'}</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">Parking:</span>
                <span className="font-semibold">{property.parkingSpaces || 0} spaces</span>
              </div>
              <div className="flex justify-between pb-3 border-b">
                <span className="text-gray-600">View:</span>
                <span className="font-semibold">{property.viewType || 'N/A'}</span>
              </div>
            </div>
            
            {/* Navigation buttons */}
            <div className="flex justify-between mt-6 mb-6">
              <button 
                onClick={handleBackToListing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Listings
              </button>
              <button 
                onClick={handleToggleFavorite}
                className={`px-4 py-2 ${isFavorite ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'} rounded-md hover:${isFavorite ? 'bg-red-700' : 'bg-gray-300'} flex items-center`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isFavorite ? 'Saved to Wishlist' : 'Add to Wishlist'}
              </button>
            </div>

            {/* Contact Agent section */}
            {contactAgentSection()}
          </div>
        </div>
      </div>

      {/* Property Detailed Info */}
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b">
            <button 
              className={`px-6 py-4 font-medium text-sm focus:outline-none ${
                activeTab === 'description' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('description')}
            >
              Description
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm focus:outline-none ${
                activeTab === 'amenities' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('amenities')}
            >
              Amenities
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm focus:outline-none ${
                activeTab === 'location' 
                  ? 'text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-600 hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('location')}
            >
              Location
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div>
                <h3 className="text-xl font-bold mb-4">Property Description</h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  {property.description}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Property Features</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {property.bedrooms} Bedrooms
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {property.bathrooms} Bathrooms
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {property.area} sq m
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {property.parkingSpaces || 0} Parking Spaces
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Additional Details</h4>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Property ID: {property.propertyId}
                      </li>
                      {property.yearBuilt && (
                        <li className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                          Year Built: {property.yearBuilt}
                        </li>
                      )}
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Property Type: {property.type}
                      </li>
                      <li className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Status: {property.status}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

{activeTab === 'location' && (
              <div>
                <h3 className="text-xl font-bold mb-6">Property Location</h3>
                
                {/* Map */}
                <div className="h-80 mb-6 rounded-lg overflow-hidden property-map-container">
                  <PropertyMap property={property} ref={mapRef} height="320px" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Address</h4>
                    <p className="text-gray-700">{property.location}</p>
                    {property.city && (
                      <p className="text-gray-700 mt-1">City: {property.city}</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-lg font-semibold mb-3">Neighborhood Information</h4>
                    <p className="text-gray-700 mb-3">
                      Neighborhood: {property.neighborhood || 'Information not available'}
                    </p>
                    <p className="text-gray-700">
                      Zip Code: {property.zipCode || 'Information not available'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom navigation button */}
      <div className="container mx-auto px-4 mt-8">
        <div className="flex justify-start">
          <button
            onClick={handleBackToListing}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyDetail;