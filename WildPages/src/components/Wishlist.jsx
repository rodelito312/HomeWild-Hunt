import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import residenceBackground from '../assets/Residence.jpg';

const Wishlist = () => {
  const [wishlistProperties, setWishlistProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Format price with commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  useEffect(() => {
    // Check if user is authenticated
    if (!currentUser) {
      navigate('/login', { state: { from: '/wishlist', message: 'Please log in to view your wishlist' } });
      return;
    }

    const fetchWishlist = async () => {
      try {
        setLoading(true);
        
        // Get favorites from localStorage, using user ID as key for personalized wishlist
        const favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.uid}`) || '[]');
        
        if (favorites.length === 0) {
          setWishlistProperties([]);
          setLoading(false);
          return;
        }
        
        // Create a reference to the properties node
        const propertiesRef = ref(db, 'properties');
        
        // Get all properties
        const snapshot = await get(propertiesRef);
        
        if (snapshot.exists()) {
          const allProperties = [];
          snapshot.forEach((childSnapshot) => {
            const property = {
              id: childSnapshot.key,
              ...childSnapshot.val()
            };
            if (favorites.includes(property.id)) {
              allProperties.push(property);
            }
          });
          
          setWishlistProperties(allProperties);
        } else {
          setWishlistProperties([]);
        }
      } catch (err) {
        console.error('Error fetching wishlist properties:', err);
        setError('Failed to load wishlist. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [currentUser, navigate]);

  // Remove from wishlist
  const removeFromWishlist = (propertyId) => {
    if (!currentUser) return;
    
    const favorites = JSON.parse(localStorage.getItem(`favorites_${currentUser.uid}`) || '[]');
    const updatedFavorites = favorites.filter(id => id !== propertyId);
    localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify(updatedFavorites));
    
    // Update state to remove property
    setWishlistProperties(prev => prev.filter(property => property.id !== propertyId));
  };

  // Clear all wishlist items
  const clearWishlist = () => {
    if (!currentUser) return;
    
    localStorage.setItem(`favorites_${currentUser.uid}`, JSON.stringify([]));
    setWishlistProperties([]);
  };

  return (
    <div 
      className="min-h-screen pb-12"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92)), url(${residenceBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Header */}
      <div className="bg-white shadow-sm mb-6">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link to="/" className="flex items-center mr-8">
                <img 
                  src="/src/assets/HomeLogo.png" 
                  alt="HomeWildHunt Logo" 
                  className="h-8 mr-2" 
                />
                <span className="text-xl font-bold">HomeWildHunt</span>
              </Link>
              <div className="flex space-x-4">
                <Link to="/" className="text-gray-600 hover:text-blue-600">Home</Link>
                <Link to="/properties" className="text-gray-600 hover:text-blue-600">Properties</Link>
                <Link to="/wishlist" className="text-red-500 font-semibold">My Wishlist</Link>
              </div>
            </div>
            <div>
              {currentUser ? (
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">Hello, {currentUser.displayName || currentUser.email}</span>
                  <Link to="/logout" className="text-gray-600 hover:text-red-500">
                    Logout
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="text-gray-600 hover:text-blue-600">Login</Link>
                  <Link to="/signup" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          {wishlistProperties.length > 0 && (
            <button 
              onClick={clearWishlist}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
        </div>
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
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
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Empty wishlist */}
        {!loading && !error && wishlistProperties.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-300 mx-auto" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Your Wishlist is Empty</h2>
            <p className="text-gray-600 mb-6">Start saving your favorite properties by clicking the heart icon on property listings.</p>
            <Link to="/properties" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Browse Properties
            </Link>
          </div>
        )}
        
        {/* Wishlist items */}
        {!loading && !error && wishlistProperties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistProperties.map(property => (
              <div key={property.id} className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img 
                    src={property.image} 
                    alt={property.title}
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/src/assets/placeholder-property.jpg'; // Fallback image
                    }}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-2 py-1 bg-white text-gray-800 text-xs font-bold rounded">
                      {property.status}
                    </span>
                  </div>
                  <button 
                    className="absolute top-4 right-4 p-1.5 bg-red-500 rounded-full text-white hover:bg-red-600"
                    onClick={() => removeFromWishlist(property.id)}
                    title="Remove from Wishlist"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {property.tags && property.tags.length > 0 && (
                    <div className="absolute bottom-4 left-4 flex space-x-2">
                      {property.tags.map((tag, idx) => (
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
                  )}
                </div>
                
                <div className="p-4">
                  <h3 className="text-xl font-bold mb-2 hover:text-blue-500">
                    <Link to={`/property/${property.id}`}>{property.title}</Link>
                  </h3>
                  
                  <div className="flex items-center text-gray-600 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm">{property.location}</span>
                  </div>
                  
                  <div className="flex items-center mb-3">
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded">
                      {property.type}
                    </span>
                  </div>
                  
                  <div className="font-bold text-2xl text-blue-600 mb-3">
                    {formatPrice(property.price)}
                  </div>
                  
                  <div className="flex justify-between text-gray-600 text-sm mb-4">
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
                  
                  <div className="flex space-x-2">
                    <Link 
                      to={`/property/${property.id}`}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white text-center rounded-md hover:bg-blue-600"
                    >
                      View Details
                    </Link>
                    <button 
                      onClick={() => removeFromWishlist(property.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;