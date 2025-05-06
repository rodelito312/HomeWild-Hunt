// src/pages/PropertyApprovalManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get, remove, set, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from "../components/navbar2";
import { addNotification } from '../firebase/notifications';

const PropertyApprovalManagement = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [pendingProperties, setPendingProperties] = useState([]);
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [pendingUserTypeChanges, setPendingUserTypeChanges] = useState([]);
  const [activeTab, setActiveTab] = useState('properties');
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State variables for the image gallery
  const [showGallery, setShowGallery] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Helper function to get proper document/image URL
  const getFullUrl = (url) => {
    if (!url) return '/src/assets/placeholder-property.jpg';
    
    // If it's already a full URL (starting with http), return it as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Otherwise, prepend the server URL to make it a complete URL
    return `http://localhost:5000${url}`;
  };
  
  // Check admin status
  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/login');
      return;
    }
  }, [currentUser, isAdmin, navigate]);
  
  // Check for tab parameter in URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    
    if (tabParam) {
      if (['properties', 'verifications', 'userTypeChanges'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, [location]);
  
  // Fetch pending properties, verifications, and user type changes
  useEffect(() => {
    const fetchPendingItems = async () => {
      if (!isAdmin) return;
      
      try {
        setLoading(true);
        
        // Fetch pending properties
        const propertiesRef = ref(db, 'pendingProperties');
        const propertiesSnapshot = await get(propertiesRef);
        
        const properties = [];
        if (propertiesSnapshot.exists()) {
          propertiesSnapshot.forEach((childSnapshot) => {
            // Convert single image to images array if needed
            const property = childSnapshot.val();
            if (!property.images && property.image) {
              property.images = [property.image];
            } else if (!property.images) {
              property.images = [];
            }
            
            properties.push({
              id: childSnapshot.key,
              ...property
            });
          });
        }
        setPendingProperties(properties);
        
        // Fetch users with pending verification - FIXED
        const usersRef = ref(db, 'users');
        const usersSnapshot = await get(usersRef);
        
        const pendingUsers = [];
        if (usersSnapshot.exists()) {
          usersSnapshot.forEach((childSnapshot) => {
            const user = childSnapshot.val();
            
            // Only include users with pending verification AND verified status in database
            // This means they've already clicked "Save Profile" to submit verification
            if (user.verificationStatus === 'pending' && 
                user.verificationDocuments && 
                user.verificationDocuments.length > 0) {
              // Make sure documents have actually been submitted to Firebase
              const allDocumentsHaveStatus = user.verificationDocuments.every(doc => doc.status === 'pending' || doc.status === 'verified' || doc.status === 'rejected');
              
              if (allDocumentsHaveStatus) {
                pendingUsers.push({
                  id: childSnapshot.key,
                  ...user
                });
              }
            }
          });
        }
        setPendingVerifications(pendingUsers);
        
        // Fetch pending user type changes
        const typeChangesRef = ref(db, 'pendingUserTypeChanges');
        const typeChangesSnapshot = await get(typeChangesRef);
        
        const pendingChanges = [];
        if (typeChangesSnapshot.exists()) {
          typeChangesSnapshot.forEach((childSnapshot) => {
            pendingChanges.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
        }
        setPendingUserTypeChanges(pendingChanges);
        
      } catch (err) {
        console.error('Error fetching pending items:', err);
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPendingItems();
  }, [isAdmin]);
  
  // Open image gallery for a property
  const openGallery = (property) => {
    setSelectedProperty(property);
    setCurrentImageIndex(0);
    setShowGallery(true);
  };
  
  // Close image gallery
  const closeGallery = () => {
    setShowGallery(false);
    setSelectedProperty(null);
    setCurrentImageIndex(0);
  };
  
  // Navigate to next image
  const nextImage = () => {
    if (selectedProperty && selectedProperty.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === selectedProperty.images.length - 1 ? 0 : prevIndex + 1
      );
    }
  };
  
  // Navigate to previous image
  const prevImage = () => {
    if (selectedProperty && selectedProperty.images.length > 0) {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? selectedProperty.images.length - 1 : prevIndex - 1
      );
    }
  };
  
  // Approve a property listing - UPDATED to preserve the property ID and send notification
  const handleApproveProperty = async (property) => {
    try {
      setActionLoading(property.id);
      
      // Get the property ID from the pending property
      const propertyId = property.id;
      
      // Log the process
      console.log(`Approving property ${propertyId}:`, property);
      
      // Create a copy of the property with approval information
      const approvedProperty = {
        ...property,
        approvalStatus: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: currentUser.uid
      };
      
      // Set the property in the main properties collection with the SAME ID
      const propertiesRef = ref(db, `properties/${propertyId}`);
      await set(propertiesRef, approvedProperty);
      console.log("Added to properties collection with ID:", propertyId);
      
      // Remove from pending properties
      const pendingRef = ref(db, `pendingProperties/${propertyId}`);
      await remove(pendingRef);
      console.log("Removed from pendingProperties collection");
      
      // Update local state
      setPendingProperties(pendingProperties.filter(p => p.id !== propertyId));
      
      // Send notification to the property owner
      if (property.ownerId) {
        await addNotification(property.ownerId, {
          type: 'property',
          title: 'Property Approved',
          message: `Your property "${property.title}" has been approved and is now live!`,
          link: `/properties/${propertyId}`
        });
      }
      
      setSuccess(`Property "${property.title}" has been approved and published.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error approving property:', err);
      setError(`Failed to approve property: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Reject a property listing with notification
  const handleRejectProperty = async (property) => {
    try {
      setActionLoading(property.id);
      
      // Simply remove from pending properties
      await remove(ref(db, `pendingProperties/${property.id}`));
      
      // Update local state
      setPendingProperties(pendingProperties.filter(p => p.id !== property.id));
      
      // Send notification to the property owner
      if (property.ownerId) {
        await addNotification(property.ownerId, {
          type: 'property',
          title: 'Property Rejected',
          message: `Your property "${property.title}" was not approved. Please contact support for more information.`,
          link: '/dashboard'
        });
      }
      
      setSuccess(`Property "${property.title}" has been rejected.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error rejecting property:', err);
      setError(`Failed to reject property: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Verify a user with notification
  const handleVerifyUser = async (user) => {
    try {
      setActionLoading(user.id);
      
      // Update user verification status
      await set(ref(db, `users/${user.id}/verificationStatus`), 'verified');
      
      // Update verification documents status
      if (user.verificationDocuments && user.verificationDocuments.length > 0) {
        const verificationDocuments = [...user.verificationDocuments];
        verificationDocuments.forEach(doc => {
          doc.status = 'verified';
        });
        
        await set(ref(db, `users/${user.id}/verificationDocuments`), verificationDocuments);
      }
      
      // Update local state
      setPendingVerifications(pendingVerifications.filter(u => u.id !== user.id));
      
      // Send notification to the user
      await addNotification(user.id, {
        type: 'system',
        title: 'Verification Approved',
        message: 'Congratulations! Your account has been verified. You now have full access to all features.',
        link: '/profile'
      });
      
      setSuccess(`User "${user.displayName || user.email}" has been verified.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error verifying user:', err);
      setError(`Failed to verify user: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Reject a user verification with notification
  const handleRejectVerification = async (user) => {
    try {
      setActionLoading(user.id);
      
      // Update user verification status
      await set(ref(db, `users/${user.id}/verificationStatus`), 'unverified');
      
      // Update verification documents status
      if (user.verificationDocuments && user.verificationDocuments.length > 0) {
        const verificationDocuments = [...user.verificationDocuments];
        verificationDocuments.forEach(doc => {
          doc.status = 'rejected';
        });
        
        await set(ref(db, `users/${user.id}/verificationDocuments`), verificationDocuments);
      }
      
      // Update local state
      setPendingVerifications(pendingVerifications.filter(u => u.id !== user.id));
      
      // Send notification to the user
      await addNotification(user.id, {
        type: 'system',
        title: 'Verification Rejected',
        message: 'Your verification request was not approved. Please check your documents and try again or contact support.',
        link: '/profile'
      });
      
      setSuccess(`Verification for "${user.displayName || user.email}" has been rejected.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error rejecting verification:', err);
      setError(`Failed to reject verification: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Approve user type change with notification
  const handleApproveUserTypeChange = async (changeRequest) => {
    try {
      setActionLoading(changeRequest.id);
      
      // Update user type in the user's profile
      await set(ref(db, `users/${changeRequest.userId}/userType`), changeRequest.requestedUserType);
      
      // Clear the pending user type change
      await set(ref(db, `users/${changeRequest.userId}/pendingUserType`), null);
      
      // Completely remove the pending request from the database
      // instead of just updating its status
      await remove(ref(db, `pendingUserTypeChanges/${changeRequest.id}`));
      
      // Update local state
      setPendingUserTypeChanges(pendingUserTypeChanges.filter(c => c.id !== changeRequest.id));
      
      // Send notification to the user
      await addNotification(changeRequest.userId, {
        type: 'system',
        title: 'Account Type Changed',
        message: `Your account has been successfully changed to ${changeRequest.requestedUserType === 'owner' ? 'Homeowner' : 'Renter'}.`,
        link: '/profile'
      });
      
      setSuccess(`Account type change for "${changeRequest.userName || changeRequest.userEmail}" to ${changeRequest.requestedUserType === 'owner' ? 'Homeowner' : 'Renter'} has been approved.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error approving account type change:', err);
      setError(`Failed to approve account type change: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Reject user type change with notification
  const handleRejectUserTypeChange = async (changeRequest) => {
    try {
      setActionLoading(changeRequest.id);
      
      // Clear the pending user type change in the user's profile
      await set(ref(db, `users/${changeRequest.userId}/pendingUserType`), null);
      
      // Now completely remove the pending request from the database
      // Instead of just updating its status
      await remove(ref(db, `pendingUserTypeChanges/${changeRequest.id}`));
      
      // Update local state
      setPendingUserTypeChanges(pendingUserTypeChanges.filter(c => c.id !== changeRequest.id));
      
      // Send notification to the user
      await addNotification(changeRequest.userId, {
        type: 'system',
        title: 'Account Type Change Rejected',
        message: `Your request to change your account type to ${changeRequest.requestedUserType === 'owner' ? 'Homeowner' : 'Renter'} was not approved. Please contact support for more information.`,
        link: '/profile'
      });
      
      setSuccess(`Account type change for "${changeRequest.userName || changeRequest.userEmail}" has been rejected.`);
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error rejecting account type change:', err);
      setError(`Failed to reject account type change: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
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
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
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
  
  return (
    <>
      <Navbar2 />
      <div className="max-w-7xl mx-auto pt-9 px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Approval Management</h1>
          <p className="text-gray-600">Review and approve property listings, user verifications, and account type changes.</p>
        </div>
        
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
        
        {/* Tabs */}
        <div className="mb-6">
          <div className="sm:hidden">
            <select
              className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              <option value="properties">Pending Properties ({pendingProperties.length})</option>
              <option value="verifications">Pending Verifications ({pendingVerifications.length})</option>
              <option value="userTypeChanges">Pending Account Type Changes ({pendingUserTypeChanges.length})</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'properties'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Properties ({pendingProperties.length})
                </button>
                <button
                  onClick={() => setActiveTab('verifications')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'verifications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pending Verifications ({pendingVerifications.length})
                </button>
                <button
                  onClick={() => setActiveTab('userTypeChanges')}
                  className={`w-1/3 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'userTypeChanges'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Account Type Changes ({pendingUserTypeChanges.length})
                </button>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Pending Properties Tab */}
        {activeTab === 'properties' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pendingProperties.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No pending properties</h3>
                <p className="text-gray-500">
                  All property listings have been reviewed. Check back later for new submissions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type/Status</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingProperties.map((property) => (
                      <tr key={property.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 cursor-pointer" onClick={() => openGallery(property)}>
                              {property.images && property.images.length > 0 ? (
                                <div className="relative">
                                  <img 
                                    className="h-10 w-10 rounded-md object-cover" 
                                    src={getFullUrl(property.images[0])} 
                                    alt={property.title}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/src/assets/placeholder-property.jpg';
                                    }}
                                  />
                                  {property.images.length > 1 && (
                                    <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                      {property.images.length}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-10 w-10 rounded-md bg-gray-200 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {property.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {property.location}, {property.city}
                              </div>
                              {property.images && property.images.length > 0 && (
                                <button 
                                  onClick={() => openGallery(property)}
                                  className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                                >
                                  View {property.images.length} {property.images.length === 1 ? 'image' : 'images'}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{property.homeowner?.name || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{property.homeowner?.email || 'No email'}</div>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatPrice(property.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(property.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleApproveProperty(property)}
                              disabled={actionLoading === property.id}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === property.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectProperty(property)}
                              disabled={actionLoading === property.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === property.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Pending Verifications Tab */}
        {activeTab === 'verifications' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pendingVerifications.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No pending verifications</h3>
                <p className="text-gray-500">
                  All user verification requests have been processed. Check back later for new submissions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingVerifications.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              {user.photoURL ? (
                                <img 
                                  className="h-10 w-10 rounded-full object-cover" 
                                  src={getFullUrl(user.photoURL)} 
                                  alt={user.displayName || user.email}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.displayName || 'No name'}
                              </div>
                              <div className="text-xs text-gray-500">
                                Joined: {formatDate(user.createdAt)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.userType === 'owner' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {user.userType === 'owner' ? 'Homeowner' : 'Renter'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2 max-w-xs">
                            {user.verificationDocuments && user.verificationDocuments.map((doc, index) => (
                              <div key={index} className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <a 
                                  href={getFullUrl(doc.url)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-sm text-blue-600 hover:text-blue-800 truncate"
                                >
                                  {doc.name}
                                </a>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleVerifyUser(user)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === user.id ? 'Processing...' : 'Verify User'}
                            </button>
                            <button
                              onClick={() => handleRejectVerification(user)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === user.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pending User Type Changes Tab */}
        {activeTab === 'userTypeChanges' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {pendingUserTypeChanges.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No pending account type changes</h3>
                <p className="text-gray-500">
                  All account type change requests have been processed. Check back later for new submissions.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Type</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested On</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingUserTypeChanges.map((change) => (
                      <tr key={change.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{change.userName || 'No name'}</div>
                              <div className="text-xs text-gray-500">{change.userEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            change.currentUserType === 'owner' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {change.currentUserType === 'owner' ? 'Homeowner' : 'Renter'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            change.requestedUserType === 'owner' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {change.requestedUserType === 'owner' ? 'Homeowner' : 'Renter'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(change.requestedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleApproveUserTypeChange(change)}
                              disabled={actionLoading === change.id}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === change.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => handleRejectUserTypeChange(change)}
                              disabled={actionLoading === change.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === change.id ? 'Processing...' : 'Reject'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Image Gallery Modal */}
        {showGallery && selectedProperty && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              {/* Background overlay */}
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              {/* Modal */}
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    type="button"
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={closeGallery}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {selectedProperty.title} - Property Images
                    </h3>
                    
                    {selectedProperty.images && selectedProperty.images.length > 0 ? (
                      <div className="mt-2">
                        {/* Main image */}
                        <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4" style={{ height: '400px' }}>
                          <img
                            src={getFullUrl(selectedProperty.images[currentImageIndex])}
                            alt={`Property image ${currentImageIndex + 1}`}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/src/assets/placeholder-property.jpg';
                            }}
                          />
                          
                          {/* Navigation arrows */}
                          {selectedProperty.images.length > 1 && (
                            <>
                              <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2"
                              >
                                <svg className="h-6 w-6 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                              </button>
                              <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-75 rounded-full p-2"
                              >
                                <svg className="h-6 w-6 text-gray-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </>
                          )}
                          
                          {/* Image counter */}
                          <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                            {currentImageIndex + 1} / {selectedProperty.images.length}
                          </div>
                        </div>
                        
                        {/* Thumbnails */}
                        {selectedProperty.images.length > 1 && (
                          <div className="flex overflow-x-auto space-x-2 pb-2">
                            {selectedProperty.images.map((image, index) => (
                              <div
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`cursor-pointer h-16 w-16 flex-shrink-0 rounded-md overflow-hidden ${
                                  index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                                }`}
                              >
                                <img
                                  src={getFullUrl(image)}
                                  alt={`Thumbnail ${index + 1}`}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/src/assets/placeholder-property.jpg';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Property details */}
                        <div className="mt-4 bg-gray-50 p-4 rounded-md">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-500">Type</p>
                              <p className="font-medium">{selectedProperty.type}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Status</p>
                              <p className="font-medium">{selectedProperty.status}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Location</p>
                              <p className="font-medium">{selectedProperty.location}, {selectedProperty.city}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Price</p>
                              <p className="font-medium">{formatPrice(selectedProperty.price)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-gray-500">No images available for this property.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={closeGallery}
                  >
                    Close
                  </button>
                  
                  <div className="mt-3 mr-2 sm:mt-0 sm:w-auto sm:text-sm">
                    <button
                      onClick={() => handleApproveProperty(selectedProperty)}
                      disabled={actionLoading === selectedProperty.id}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === selectedProperty.id ? 'Processing...' : 'Approve Property'}
                    </button>
                  </div>
                  
                  <div className="mt-3 mr-2 sm:mt-0 sm:w-auto sm:text-sm">
                    <button
                      onClick={() => handleRejectProperty(selectedProperty)}
                      disabled={actionLoading === selectedProperty.id}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === selectedProperty.id ? 'Processing...' : 'Reject Property'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approval Guidelines */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Approval Guidelines</h2>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">Property Verification Guidelines</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Ensure property images are clear and accurately represent the listing</li>
              <li>Verify that property details like price, location, and amenities are reasonable and consistent</li>
              <li>Check that the property description doesn't contain inappropriate content or contact information</li>
              <li>Confirm that the owner is verified before approving their property listings</li>
              <li>For high-value properties (over ₱10M), conduct additional verification if necessary</li>
            </ul>
          </div>
          
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">User Verification Guidelines</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Check that ID documents are clear, valid, and not expired</li>
              <li>Verify that the name on documents matches the user's profile information</li>
              <li>For homeowners, validate any business-related documentation if provided</li>
              <li>Ensure all sensitive information is handled according to privacy policies</li>
              <li>Reject verification if documents appear altered or suspicious</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Account Type Change Guidelines</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-700">
              <li>Verify that the user has a legitimate reason for changing their account type</li>
              <li>When switching to Homeowner, check if user has sufficient verification documents</li>
              <li>When switching to Renter, ensure no active property listings will be orphaned</li>
              <li>For users with a history of frequently switching types, request additional verification</li>
              <li>Approve changes promptly to provide good user experience</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default PropertyApprovalManagement;