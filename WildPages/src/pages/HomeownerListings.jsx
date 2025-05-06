// src/pages/HomeownerListings.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, onValue, remove, query, orderByChild, equalTo, get, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from "../components/navbar2";

// Status Change Dropdown Component
const StatusChangeDropdown = ({ currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine available status options based on current status
  let statusOptions = [];
  if (currentStatus === 'For Sale') {
    statusOptions = ['For Sale', 'Sold'];
  } else if (currentStatus === 'For Rent') {
    statusOptions = ['For Rent', 'Rented'];
  } else if (currentStatus === 'Sold') {
    statusOptions = ['Sold', 'For Sale'];
  } else if (currentStatus === 'Rented') {
    statusOptions = ['Rented', 'For Rent'];
  }
  
  // Background and text color based on status
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
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusStyles(currentStatus)}`}
      >
        {currentStatus}
        <svg
          className="w-4 h-4 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {statusOptions.map((status) => (
              <button
                key={status}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  currentStatus === status ? 'font-medium' : ''
                }`}
                role="menuitem"
                onClick={() => {
                  onStatusChange(status);
                  setIsOpen(false);
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const HomeownerListings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ownedProperties, setOwnedProperties] = useState([]);
  const [agentProperties, setAgentProperties] = useState([]); // Properties where user is assigned as agent
  const [pendingProperties, setPendingProperties] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [finalConfirm, setFinalConfirm] = useState(null); // New state for final confirmation
  const [userProfile, setUserProfile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('unverified');

  // Check if user is logged in and is a homeowner
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Fetch user profile to check type and verification
    const fetchUserProfile = async () => {
      try {
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            setUserProfile(userData);
            
            // Check if user is a homeowner
            if (userData.userType !== 'owner') {
              setError("You need to be registered as a homeowner to view this page.");
              setTimeout(() => {
                navigate('/profile');
              }, 3000);
              return;
            }
            
            // Set verification status
            setVerificationStatus(userData.verificationStatus || 'unverified');
          }
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [currentUser, navigate]);

  // Fetch owned, agent, and pending properties
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchProperties = () => {
      setLoading(true);
      
      // Fetch properties owned by the user
      const approvedPropertiesQuery = query(
        ref(db, 'properties'), 
        orderByChild('ownerId'), 
        equalTo(currentUser.uid)
      );
      
      onValue(approvedPropertiesQuery, (snapshot) => {
        const properties = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            properties.push({
              id: childSnapshot.key,
              ...childSnapshot.val(),
              isOwner: true // Mark as owned directly
            });
          });
        }
        setOwnedProperties(properties);
      });
      
      // Fetch properties where the user is assigned as agent
      const userPropertiesRef = ref(db, `users/${currentUser.uid}/properties`);
      
      onValue(userPropertiesRef, (snapshot) => {
        const properties = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const propertyData = childSnapshot.val();
            // Add a flag to indicate these are agent properties (not directly owned)
            properties.push({
              ...propertyData,
              isAgent: true
            });
          });
        }
        setAgentProperties(properties);
      });
      
      // Fetch pending properties
      const pendingPropertiesQuery = query(
        ref(db, 'pendingProperties'),
        orderByChild('ownerId'),
        equalTo(currentUser.uid)
      );
      
      onValue(pendingPropertiesQuery, (snapshot) => {
        const properties = [];
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            properties.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
        }
        setPendingProperties(properties);
        setLoading(false);
      });
    };
    
    fetchProperties();
  }, [currentUser]);

  // Function to handle status change
  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      // Reference to the property in the database
      const propertyRef = ref(db, `properties/${propertyId}`);
      
      // Update the status
      await update(propertyRef, {
        status: newStatus
      });
      
      // Show success message
      setSuccess(`Property status updated to ${newStatus}`);
      
      // Update local state
      setOwnedProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId ? { ...property, status: newStatus } : property
        )
      );
      
      // Update agent properties if needed
      setAgentProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId ? { ...property, status: newStatus } : property
        )
      );
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating property status:', err);
      setError(`Failed to update status: ${err.message}`);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Format price
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Delete property
  const handleDeleteProperty = async (propertyId, isPending, isAgent = false) => {
    try {
      const collectionPath = isPending ? 'pendingProperties' : 'properties';
      
      console.log(`Deleting property: ${propertyId}`);
      console.log(`Collection path: ${collectionPath}`);
      
      // Delete from main properties collection if not an agent property
      if (!isAgent) {
        await remove(ref(db, `${collectionPath}/${propertyId}`));
        console.log(`✅ Successfully deleted property from ${collectionPath}`);
        
        // For completely confirmed deletion, check if it's really gone
        const checkRef = ref(db, `${collectionPath}/${propertyId}`);
        const snapshot = await get(checkRef);
        if (!snapshot.exists()) {
          console.log("Confirmed: Property no longer exists in the database");
        } else {
          console.error("Warning: Property still exists after deletion attempt");
        }
      }
      
      // If this is a property where user is agent, remove from user's properties list
      if (isAgent) {
        await remove(ref(db, `users/${currentUser.uid}/properties/${propertyId}`));
        console.log(`✅ Successfully removed property from agent's list`);
      }
      
      setSuccess('Property deleted successfully');
      setDeleteConfirm(null);
      setFinalConfirm(null);
      
      // Update local state
      if (isPending) {
        setPendingProperties(pendingProperties.filter(p => p.id !== propertyId));
      } else if (isAgent) {
        setAgentProperties(agentProperties.filter(p => p.id !== propertyId));
      } else {
        setOwnedProperties(ownedProperties.filter(p => p.id !== propertyId));
      }
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting property:', err);
      setError(`Failed to delete property: ${err.message}`);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
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

  // Render verification status banner
  const renderVerificationBanner = () => {
    if (verificationStatus === 'verified') {
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
                Your account is verified. You can add new properties and manage your listings.
              </p>
            </div>
          </div>
        </div>
      );
    } else if (verificationStatus === 'pending') {
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
                Your account is not verified yet. Please upload verification documents in your profile to list and manage properties.
              </p>
              <div className="mt-2">
                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Go to Profile
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <>
        <Navbar2 />
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  // Combine owned properties and agent properties
  const allPublishedProperties = [...ownedProperties, ...agentProperties];

  return (
    <>
      <Navbar2 />
      <div className="max-w-7xl mx-auto pt-9 px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Properties</h1>
          <p className="text-gray-600">Manage your property listings and add new properties.</p>
        </div>
        
        {/* Verification Status Banner */}
        {renderVerificationBanner()}
        
        {/* Success message */}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
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
        
        {/* Add Property Button */}
        <div className="mb-8">
          <Link 
            to="/homeowner/add-property" 
            className={`px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center ${
              verificationStatus === 'unverified' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={(e) => {
              if (verificationStatus === 'unverified') {
                e.preventDefault();
                setError('You need to verify your account before adding properties');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Property
          </Link>
        </div>
        
        {/* Pending Properties Section */}
        {pendingProperties.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold mb-4">Pending Approval ({pendingProperties.length})</h2>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingProperties.map((property) => (
                      <tr key={property.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <img 
                                className="h-10 w-10 rounded-md object-cover" 
                                src={getFullImageUrl(property.image)} 
                                alt={property.title}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/src/assets/placeholder-property.jpg';
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {property.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {property.location}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{property.type}</div>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            property.status === 'For Sale' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {property.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatPrice(property.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(property.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setDeleteConfirm({ id: property.id, title: property.title, isPending: true })}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-yellow-50 p-4 border-t border-yellow-100">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      These properties are pending admin approval. You will be notified once they are approved.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* All Published Properties Section (owned + agent) */}
        <div>
          <h2 className="text-xl font-bold mb-4">My Published Properties ({allPublishedProperties.length})</h2>
          
          {allPublishedProperties.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="text-xl font-medium text-gray-900 mb-2">No published properties yet</h3>
              <p className="text-gray-500 mb-4">
                You don't have any approved properties yet. Add a new property or wait for your pending listings to be approved.
              </p>
              <Link 
                to="/homeowner/add-property" 
                className={`px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center ${
                  verificationStatus === 'unverified' ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={(e) => {
                  if (verificationStatus === 'unverified') {
                    e.preventDefault();
                    setError('You need to verify your account before adding properties');
                  }
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add New Property
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPublishedProperties.map((property) => (
                <div 
                  key={property.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg relative"
                >
                  {/* Tag to indicate if property is owned or if user is an agent */}
                  {property.isAgent && (
                    <div className="absolute top-2 right-2 bg-purple-500 text-white py-1 px-2 rounded text-xs z-10">
                      Agent
                    </div>
                  )}
                  {property.isOwner && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white py-1 px-2 rounded text-xs z-10">
                      Owner
                    </div>
                  )}
                  
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
                    {/* Status indicator - positioned on the left */}
                    <div className="absolute top-2 left-2 z-20">
                      <StatusChangeDropdown 
                        currentStatus={property.status || 'For Sale'} 
                        onStatusChange={(newStatus) => handleStatusChange(property.id, newStatus)}
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2">{property.title}</h3>
                    <p className="text-gray-600 mb-2 truncate">{property.location}</p>
                    <p className={`${
                      property.status === 'For Sale' ? 'text-green-600' : 
                      property.status === 'For Rent' ? 'text-blue-600' :
                      property.status === 'Sold' ? 'text-gray-600' : 'text-purple-600'
                    } font-bold`}>
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                        </svg>
                        {property.bathrooms} Bath
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                        </svg>
                        {property.area} m²
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                      <Link 
                        to={`/properties/${property.id}`} 
                        className="text-blue-600 hover:text-blue-800"
                      >
                        View Listing
                      </Link>
                      <button
                        onClick={() => setDeleteConfirm({ 
                          id: property.id, 
                          title: property.title, 
                          isPending: false,
                          isAgent: property.isAgent || false
                        })}
                        className="text-red-600 hover:text-red-800"
                      >
                        {property.isAgent ? 'Remove' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* First Delete Confirmation Modal */}
        {deleteConfirm && !finalConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-xl font-bold mb-2">
                  {deleteConfirm.isAgent ? 'Remove Property?' : 'Delete Property?'}
                </h2>
                <p className="text-gray-600">
                  {deleteConfirm.isAgent 
                    ? `Are you sure you want to remove "${deleteConfirm.title}" from your listings? This will only remove it from your agent listings.`
                    : `Are you sure you want to delete "${deleteConfirm.title}"? This action cannot be undone.`
                  }
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (deleteConfirm.isPending) {
                      // For pending properties, show the final confirmation
                      setFinalConfirm({
                        ...deleteConfirm,
                        message: `Warning: Deleting this pending property will permanently remove it from your account. This operation cannot be reversed.`
                      });
                    } else if (deleteConfirm.isAgent) {
                      // For agent properties, show the final confirmation
                      setFinalConfirm({
                        ...deleteConfirm,
                        message: `Warning: Removing this property from your agent listings means you'll no longer have access to manage it. Are you absolutely sure?`
                      });
                    } else {
                      // For owned properties, show the final confirmation
                      setFinalConfirm({
                        ...deleteConfirm,
                        message: `WARNING: This property will be permanently deleted from our database and cannot be recovered. All associated data, inquiries, and interactions will be lost. Are you absolutely sure you want to proceed?`
                      });
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {deleteConfirm.isAgent ? 'Yes, Remove' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Final Confirmation Modal */}
        {finalConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🚨</div>
                <h2 className="text-xl font-bold mb-2">
                  Final Warning
                </h2>
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-left">
                  <p className="text-red-700">
                    {finalConfirm.message}
                  </p>
                </div>
                <p className="text-gray-600 font-medium">
                  Type the property name to confirm:
                </p>
                <input
                  type="text"
                  className="w-full mt-2 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Enter property name"
                  onChange={(e) => {
                    // Here you could add verification logic if needed
                    // For example, only enable the delete button if the name matches
                    // This is just a placeholder for UI demonstration
                  }}
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => {
                    setFinalConfirm(null);
                    setDeleteConfirm(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Go Back
                </button>
                <button
                  onClick={() => handleDeleteProperty(
                    finalConfirm.id, 
                    finalConfirm.isPending,
                    finalConfirm.isAgent || false
                  )}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  {finalConfirm.isAgent ? 'Permanently Remove' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-10">
          <h2 className="text-xl font-bold mb-4">Managing Your Properties</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Pending Properties</h3>
                <p className="text-gray-600">
                  New properties must be approved by our admin team before they appear on the site. This process typically takes 24-48 hours.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Inquiries</h3>
                <p className="text-gray-600">
                  You'll receive notifications when potential renters or buyers inquire about your properties. Check your messages regularly.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Best Practices</h3>
                <p className="text-gray-600">
                  Properties with high-quality photos, detailed descriptions, and accurate pricing tend to receive more inquiries. Keep your listings updated!
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Property Status</h3>
                <p className="text-gray-600">
                  You can now update your property status to "Sold" or "Rented" when a deal is closed. This helps keep your listings accurate and up to date for potential clients.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Agent Properties</h3>
                <p className="text-gray-600">
                  Properties where you're listed as an agent will appear in your dashboard. You can manage them just like your own properties, but removing them will only remove them from your listings, not delete them completely.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeownerListings;