// src/pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref as dbRef, get, update, push, remove } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from "../components/navbar2";

const Profile = () => {
  const { currentUser, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [tempUserTypeChange, setTempUserTypeChange] = useState(null);
  const [showTypeChangeConfirmation, setShowTypeChangeConfirmation] = useState(false);
  // New state for tracking newly uploaded documents (not yet saved)
  const [newDocuments, setNewDocuments] = useState([]);
  
  // State for delete profile functionality
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showFinalDeleteConfirmation, setShowFinalDeleteConfirmation] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // User profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    bio: '',
    userType: 'renter', // Default to 'renter'
    pendingUserType: null, // Field to track pending account type change
    verificationStatus: 'unverified',
    verificationDocuments: [],
    
    // Renter-specific fields
    preferences: {
      propertyTypes: [],
      priceRange: { min: 0, max: 0 },
      preferredLocations: [],
      amenities: []
    },
    
    // Owner-specific fields
    ownerInfo: {
      businessName: '',
      taxId: '',
      yearsInBusiness: 0,
      contactEmail: '',
      contactPhone: '',
      businessAddress: '',
      propertyManager: false
    }
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch profile from Firebase
        const userRef = dbRef(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          setProfile({
            ...profile,
            ...userData,
            displayName: userData.displayName || currentUser.displayName || '',
            email: userData.email || currentUser.email || '',
            phone: userData.phone || '',
            userType: userData.userType || 'renter',
            pendingUserType: userData.pendingUserType || null,
            verificationStatus: userData.verificationStatus || 'unverified',
            verificationDocuments: userData.verificationDocuments || [],
            preferences: userData.preferences || profile.preferences,
            ownerInfo: userData.ownerInfo || profile.ownerInfo,
          });
          
          // Set profile image if exists
          if (userData.photoURL) {
            setImagePreview(userData.photoURL);
          } else if (currentUser.photoURL) {
            setImagePreview(currentUser.photoURL);
          }
        } else {
          // If no profile exists, create one with default values
          setProfile({
            ...profile,
            displayName: currentUser.displayName || '',
            email: currentUser.email || '',
            userType: 'renter'
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser, navigate]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile({
        ...profile,
        [parent]: {
          ...profile[parent],
          [child]: value
        }
      });
    } else {
      setProfile({
        ...profile,
        [name]: value
      });
    }
  };
  
  // Handle owner info input changes
  const handleOwnerInfoChange = (e) => {
    const { name, value } = e.target;
    
    setProfile({
      ...profile,
      ownerInfo: {
        ...profile.ownerInfo,
        [name]: value
      }
    });
  };

  // Handle user type selection (temporary, not saved until form submission)
  const handleUserTypeSelect = (newUserType) => {
    // If already the current type, don't do anything
    if (profile.userType === newUserType) {
      return;
    }
    
    // If there's already a pending change, don't allow another selection
    if (profile.pendingUserType) {
      return;
    }
    
    // Set temporary selection
    setTempUserTypeChange(newUserType);
    
    // Show confirmation modal or message
    setShowTypeChangeConfirmation(true);
  };
  
  // Cancel user type change
  const cancelUserTypeChange = () => {
    setTempUserTypeChange(null);
    setShowTypeChangeConfirmation(false);
  };

  // Handle property type selection (checkboxes)
  const handlePropertyTypeChange = (type) => {
    const types = [...(profile.preferences.propertyTypes || [])];
    
    if (types.includes(type)) {
      const updatedTypes = types.filter(t => t !== type);
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          propertyTypes: updatedTypes
        }
      });
    } else {
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          propertyTypes: [...types, type]
        }
      });
    }
  };
  
  // Handle amenity selection (checkboxes)
  const handleAmenityChange = (amenity) => {
    const amenities = [...(profile.preferences.amenities || [])];
    
    if (amenities.includes(amenity)) {
      const updatedAmenities = amenities.filter(a => a !== amenity);
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          amenities: updatedAmenities
        }
      });
    } else {
      setProfile({
        ...profile,
        preferences: {
          ...profile.preferences,
          amenities: [...amenities, amenity]
        }
      });
    }
  };
  
  // Handle profile image selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  // Handle verification document upload - FIXED VERSION
  const handleDocumentUpload = async (e) => {
    // Don't allow document uploads if already verified
    if (profile.verificationStatus === 'verified') {
      setError('Your account is already verified. You cannot add new documents.');
      return;
    }
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Document size should be less than 5MB');
        return;
      }
      
      try {
        // Show loading state
        setSaving(true);
        setError(null);
        
        // Create a FormData instance for file upload - same approach as AddProperty
        const formData = new FormData();
        formData.append('images', file); // Use 'images' to match the AddProperty approach
        
        // Use the same endpoint pattern that works in AddProperty
        const response = await fetch('http://localhost:5000/api/upload-images', {
          method: 'POST',
          body: formData,
        });
        
        // Handle server errors using same pattern as AddProperty
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to upload document');
        }
        
        // Parse the response
        const result = await response.json();
        
        // Check if upload was successful
        if (!result.success) {
          throw new Error(result.message || 'Failed to upload document');
        }
        
        // Get the document URL from server response (first path in the array)
        const documentUrl = result.paths[0];
        
        // Create new document object
        const newDocument = {
          name: file.name,
          type: file.type,
          url: documentUrl,
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        };
        
        // Add to newly uploaded documents (temporary state, not yet saved to profile)
        setNewDocuments(prev => [...prev, newDocument]);
        
        setSuccess('Document uploaded successfully! Click "Save Profile" to complete the process.');
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
        
      } catch (err) {
        console.error('Error uploading document:', err);
        setError('Failed to upload document. Please try again.');
      } finally {
        setSaving(false);
      }
    }
  };
  
  // Remove verification document
  const handleRemoveDocument = async (index, isNewDocument = false) => {
    try {
      setSaving(true);
      
      // Check if user is verified and trying to remove an existing document
      if (profile.verificationStatus === 'verified' && !isNewDocument) {
        setError('You cannot remove documents while verified. Please contact support if needed.');
        setSaving(false);
        return;
      }
      
      if (isNewDocument) {
        // Remove from newly uploaded documents
        const updatedNewDocuments = [...newDocuments];
        updatedNewDocuments.splice(index, 1);
        setNewDocuments(updatedNewDocuments);
      } else {
        // Only allow removing documents if not verified
        const updatedDocuments = [...(profile.verificationDocuments || [])];
        updatedDocuments.splice(index, 1);
        
        // Update local state only (don't save to Firebase yet)
        setProfile({
          ...profile,
          verificationDocuments: updatedDocuments
        });
      }
      
      setSuccess('Document removed! Click "Save Profile" to save changes.');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error removing document:', err);
      setError('Failed to remove document. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Upload profile image to server - FIXED VERSION
  const uploadProfileImage = async () => {
    if (!profileImage) return null;
    
    try {
      // Create FormData for image upload - same approach as in AddProperty
      const formData = new FormData();
      formData.append('images', profileImage); // Use 'images' to match AddProperty
      
      // Use a similar endpoint pattern that works for property images
      const response = await fetch('http://localhost:5000/api/upload-images', {
        method: 'POST',
        body: formData,
      });
      
      // Handle errors using the same pattern
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload profile image');
      }
      
      // Parse response
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload profile image');
      }
      
      // Return the first image path
      return result.paths[0];
    } catch (err) {
      console.error('Error uploading image:', err);
      throw err;
    }
  };
  
  // Save profile to Firebase
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate required fields
      if (!profile.displayName || !profile.email) {
        throw new Error('Name and email are required');
      }
      
      let photoURL = profile.photoURL;
      
      // Upload profile image if changed
      if (profileImage) {
        photoURL = await uploadProfileImage();
      }
      
      // Handle user type change if requested
      let pendingUserType = profile.pendingUserType;
      
      if (tempUserTypeChange && tempUserTypeChange !== profile.userType) {
        // Create a pending user type change request
        const userTypeChangeRequest = {
          userId: currentUser.uid,
          userName: profile.displayName || currentUser.displayName || profile.email,
          currentUserType: profile.userType,
          requestedUserType: tempUserTypeChange,
          userEmail: profile.email,
          requestedAt: new Date().toISOString(),
          status: 'pending'
        };
        
        // Add to pendingUserTypeChanges collection
        const pendingChangesRef = dbRef(db, 'pendingUserTypeChanges');
        const newRequestRef = push(pendingChangesRef);
        await update(newRequestRef, userTypeChangeRequest);
        
        // Set pending user type
        pendingUserType = tempUserTypeChange;
      }
      
      // Handle verification documents and status changes
      let verificationStatus = profile.verificationStatus;
      let verificationDocuments = [...(profile.verificationDocuments || [])];
      
      // If there are new documents and we're not already verified, update status
      if (newDocuments.length > 0 && verificationStatus !== 'verified') {
        // Add new documents to existing documents
        verificationDocuments = [...verificationDocuments, ...newDocuments];
        
        // Update verification status only when saving if not already verified
        if (verificationStatus === 'unverified') {
          verificationStatus = 'pending';
        }
      }
      
      // Create updated profile object
      const updatedProfile = {
        ...profile,
        photoURL,
        pendingUserType,
        verificationStatus,
        verificationDocuments,
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firebase
      const userRef = dbRef(db, `users/${currentUser.uid}`);
      await update(userRef, updatedProfile);
      
      // Update local state 
      setProfile(updatedProfile);
      
      // Clear temporary states
      setTempUserTypeChange(null);
      setShowTypeChangeConfirmation(false);
      setNewDocuments([]);
      
      // Show specific success message for account type change
      if (pendingUserType && pendingUserType !== profile.pendingUserType) {
        setSuccess(`Profile saved successfully. Your request to change to ${pendingUserType === 'owner' ? 'Homeowner' : 'Renter'} has been submitted and is awaiting admin approval.`);
      } else if (newDocuments.length > 0 && verificationStatus === 'pending') {
        setSuccess('Profile saved successfully! Your verification documents have been submitted for review.');
      } else {
        setSuccess('Profile saved successfully!');
      }
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle Delete Profile button click
  const handleDeleteProfileClick = () => {
    setShowDeleteConfirmation(true);
  };

  // Cancel delete confirmation
  const cancelDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setShowFinalDeleteConfirmation(false);
  };

  // Show final delete confirmation
  const showFinalWarning = () => {
    setShowDeleteConfirmation(false);
    setShowFinalDeleteConfirmation(true);
  };

  // Delete profile permanently
  const handleDeleteProfile = async () => {
    try {
      setDeleting(true);
      setError(null);

      // Reference to user data in Firebase
      const userRef = dbRef(db, `users/${currentUser.uid}`);

      // Delete user profile from Firebase
      await remove(userRef);

      // Check if there are any pending user type change requests and delete them
      const pendingChangesRef = dbRef(db, 'pendingUserTypeChanges');
      const pendingChangesSnapshot = await get(pendingChangesRef);
      
      if (pendingChangesSnapshot.exists()) {
        const pendingChanges = pendingChangesSnapshot.val();
        
        // Find and delete any pending requests for this user
        Object.entries(pendingChanges).forEach(async ([key, value]) => {
          if (value.userId === currentUser.uid) {
            const requestRef = dbRef(db, `pendingUserTypeChanges/${key}`);
            await remove(requestRef);
          }
        });
      }

      // Log the user out
      await logout();
      
      // Show success message briefly before redirect
      setSuccess('Your profile has been deleted successfully. Redirecting to homepage...');
      
      // Redirect to home page after short delay
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (err) {
      console.error('Error deleting profile:', err);
      setError(err.message || 'Failed to delete profile. Please try again.');
      setDeleting(false);
      setShowFinalDeleteConfirmation(false);
    }
  };
  
  // Property types and amenities options
  const propertyTypes = [
    'Condominium', 
    'Villa', 
    'Single Family', 
    'Townhouse', 
    'Land', 
    'Apartment'
  ];
  
  const amenities = [
    'Swimming Pool',
    'Gym',
    'Security',
    'Parking',
    'Balcony',
    'Air Conditioning',
    'Garden',
    'Internet/WiFi',
    'Furnished',
    'Pet Friendly'
  ];
  
  if (loading) {
    return (
      <>
        <Navbar2 />
        <div className="max-w-4xl mx-auto pt-9 px-4 flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Navbar2 />
      <div className="min-h-screen pb-12 bg-gray-50">
        <div className="max-w-4xl mx-auto pt-9 px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Profile</h1>
            <p className="text-gray-600">Manage your personal information and preferences</p>
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
                  <p className="text-sm text-green-700">
                    {typeof success === 'string' ? success : 'Profile updated successfully!'}
                  </p>
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
          
          {/* First Delete Profile Confirmation Modal */}
          {showDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Delete Profile?</h3>
                  <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete your profile? This action will permanently remove all your information from our system.
                    </p>
                  </div>
                  <div className="items-center px-4 py-3">
                    <button
                      id="confirm-delete"
                      onClick={showFinalWarning}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Yes, Delete My Profile
                    </button>
                    <button
                      id="cancel-delete"
                      onClick={cancelDeleteConfirmation}
                      className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Final Delete Profile Confirmation Modal */}
          {showFinalDeleteConfirmation && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
              <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="mt-3 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Final Warning</h3>
                  <div className="mt-2 px-7 py-3">
                    <p className="text-sm text-gray-500">
                      This action <span className="font-bold text-red-600">CANNOT</span> be undone. You will lose all your profile data, settings, and history.
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Are you absolutely sure you want to delete your profile?
                    </p>
                  </div>
                  <div className="items-center px-4 py-3">
                    <button
                      id="final-confirm-delete"
                      onClick={handleDeleteProfile}
                      className="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      disabled={deleting}
                    >
                      {deleting ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </div>
                      ) : (
                        "Yes, Permanently Delete"
                      )}
                    </button>
                    <button
                      id="final-cancel-delete"
                      onClick={cancelDeleteConfirmation}
                      className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 text-base font-medium rounded-md w-full shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile}>
  <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
    {/* Profile Header */}
    <div className="bg-blue-50 p-6 border-b border-blue-100">
      <div className="flex flex-col md:flex-row items-start md:items-center">
        <div className="relative mb-4 md:mb-0 md:mr-6">
          <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200">
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
          <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              id="profile-image"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </label>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{profile.displayName || 'Your Name'}</h2>
          <div className="text-gray-500">{profile.email}</div>
          <div className="mt-1 flex items-center">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              profile.verificationStatus === 'verified' 
                ? 'bg-green-100 text-green-800' 
                : profile.verificationStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
            }`}>
              {profile.verificationStatus === 'verified' 
                ? 'Verified' 
                : profile.verificationStatus === 'pending'
                  ? 'Verification Pending'
                  : 'Unverified'
              }
            </span>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              profile.userType === 'owner' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-purple-100 text-purple-800'
            }`}>
              {profile.userType === 'owner' ? 'Property Owner' : 'Renter'}
            </span>
            {profile.pendingUserType && (
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Pending Change to {profile.pendingUserType === 'owner' ? 'Owner' : 'Renter'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
    
    {/* User Type Selection */}
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Account Type</h3>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-colors ${
            profile.userType === 'owner' 
              ? 'bg-blue-50 border-blue-500 text-blue-700' 
              : profile.pendingUserType === 'owner'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                : tempUserTypeChange === 'owner'
                  ? 'bg-blue-50 border-blue-500 border-dashed text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
          }`}
          onClick={() => handleUserTypeSelect('owner')}
          disabled={profile.pendingUserType !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="font-medium">Homeowner</span>
          <span className="text-xs text-gray-500 mt-1">I want to list my property</span>
          {profile.pendingUserType === 'owner' && (
            <span className="text-xs text-yellow-600 mt-1">Pending approval</span>
          )}
          {tempUserTypeChange === 'owner' && profile.userType !== 'owner' && !profile.pendingUserType && (
            <span className="text-xs text-blue-600 mt-1">Will request approval</span>
          )}
        </button>
        
        <button
          type="button"
          className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-colors ${
            profile.userType === 'renter' 
              ? 'bg-blue-50 border-blue-500 text-blue-700' 
              : profile.pendingUserType === 'renter'
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                : tempUserTypeChange === 'renter'
                  ? 'bg-blue-50 border-blue-500 border-dashed text-blue-700'
                  : 'border-gray-300 hover:bg-gray-50'
          }`}
          onClick={() => handleUserTypeSelect('renter')}
          disabled={profile.pendingUserType !== null}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="font-medium">Renter</span>
          <span className="text-xs text-gray-500 mt-1">I'm looking for a place to rent</span>
          {profile.pendingUserType === 'renter' && (
            <span className="text-xs text-yellow-600 mt-1">Pending approval</span>
          )}
          {tempUserTypeChange === 'renter' && profile.userType !== 'renter' && !profile.pendingUserType && (
            <span className="text-xs text-blue-600 mt-1">Will request approval</span>
          )}
        </button>
      </div>
      
      {/* Account Type Change Information */}
      {profile.pendingUserType && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Account Type Change Pending</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Your request to change to {profile.pendingUserType === 'owner' ? 'Homeowner' : 'Renter'} is awaiting admin approval. 
                  You'll be notified when your request is processed.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Change Confirmation */}
      {tempUserTypeChange && !profile.pendingUserType && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Account Type Change Selected</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  You have selected to change your account type to {tempUserTypeChange === 'owner' ? 'Homeowner' : 'Renter'}. 
                  This change requires admin approval and will be submitted when you save your profile.
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={cancelUserTypeChange}
                    className="mr-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Personal Information */}
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
          <input
            type="text"
            name="displayName"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={profile.displayName}
            onChange={handleInputChange}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
          <input
            type="email"
            name="email"
            className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
            value={profile.email}
            readOnly
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input
            type="tel"
            name="phone"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={profile.phone}
            onChange={handleInputChange}
            placeholder="+63 XXX XXX XXXX"
          />
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          type="text"
          name="address"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={profile.address}
          onChange={handleInputChange}
          placeholder="Your current address"
        />
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
        <input
          type="text"
          name="city"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={profile.city}
          onChange={handleInputChange}
          placeholder="City"
        />
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          name="bio"
          rows="3"
          className="w-full p-2 border border-gray-300 rounded-md"
          value={profile.bio}
          onChange={handleInputChange}
          placeholder="Tell us a bit about yourself"
        ></textarea>
      </div>
    </div>

    {/* Owner-specific Information - Only show for property owners */}
    {(profile.userType === 'owner' || tempUserTypeChange === 'owner') && (
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Property Owner Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Name (if applicable)</label>
            <input
              type="text"
              name="businessName"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={profile.ownerInfo?.businessName}
              onChange={handleOwnerInfoChange}
              placeholder="Business or company name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (if applicable)</label>
            <input
              type="text"
              name="taxId"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={profile.ownerInfo?.taxId}
              onChange={handleOwnerInfoChange}
              placeholder="Tax identification number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
            <input
              type="number"
              name="yearsInBusiness"
              min="0"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={profile.ownerInfo?.yearsInBusiness}
              onChange={handleOwnerInfoChange}
              placeholder="Number of years in real estate"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Contact Email</label>
            <input
              type="email"
              name="contactEmail"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={profile.ownerInfo?.contactEmail}
              onChange={handleOwnerInfoChange}
              placeholder="Contact email for business inquiries"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Business Contact Phone</label>
            <input
              type="tel"
              name="contactPhone"
              className="w-full p-2 border border-gray-300 rounded-md"
              value={profile.ownerInfo?.contactPhone}
              onChange={handleOwnerInfoChange}
              placeholder="Contact phone for business inquiries"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
          <input
            type="text"
            name="businessAddress"
            className="w-full p-2 border border-gray-300 rounded-md"
            value={profile.ownerInfo?.businessAddress}
            onChange={handleOwnerInfoChange}
            placeholder="Business address (if different from personal address)"
          />
        </div>
      </div>
    )}

    {/* Renter Preferences - Show for Renters */}
    {(profile.userType === 'renter' || tempUserTypeChange === 'renter') && (
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Rental Preferences</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property Types</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {propertyTypes.map((type) => (
              <div key={type} className="flex items-center">
                <input
                  type="checkbox"
                  id={`type-${type}`}
                  checked={profile.preferences?.propertyTypes?.includes(type)}
                  onChange={() => handlePropertyTypeChange(type)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor={`type-${type}`} className="ml-2 text-sm text-gray-700">
                  {type}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Amenities</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {amenities.map((amenity) => (
              <div key={amenity} className="flex items-center">
                <input
                  type="checkbox"
                  id={`amenity-${amenity}`}
                  checked={profile.preferences?.amenities?.includes(amenity)}
                  onChange={() => handleAmenityChange(amenity)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                />
                <label htmlFor={`amenity-${amenity}`} className="ml-2 text-sm text-gray-700">
                  {amenity}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>

  {/* Verification Documents */}
  <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-2">Identity Verification</h3>
      <p className="text-sm text-gray-600 mb-4">
        Verify your identity to build trust with other users. Upload government-issued ID or other documents.
      </p>
      
      {/* Warning for verified users */}
      {profile.verificationStatus === 'verified' && (
        <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-500 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Your account is verified! Document management is disabled. If you need to update your verification documents, please contact support.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-2">
        {/* Existing documents from profile */}
        {profile.verificationDocuments && profile.verificationDocuments.length > 0 ? (
          <div className="space-y-2">
            {profile.verificationDocuments.map((doc, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
              >
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-700">{doc.name}</div>
                    <div className="text-xs text-gray-500">
                      {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Pending upload'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 ${
                    doc.status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : doc.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {doc.status === 'verified' 
                      ? 'Verified' 
                      : doc.status === 'rejected'
                        ? 'Rejected'
                        : 'Pending'
                    }
                  </span>
                  {/* Only show remove button if not verified */}
                  {profile.verificationStatus !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index, false)}
                      className="text-gray-400 hover:text-red-500"
                      disabled={saving}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : newDocuments.length === 0 ? (
          <div className="text-center py-4 bg-gray-50 border border-gray-200 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No verification documents uploaded</p>
          </div>
        ) : null}
        
        {/* Newly uploaded documents (not yet saved) */}
        {newDocuments.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">New Documents (Not Yet Saved)</h4>
            <div className="space-y-2">
              {newDocuments.map((doc, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-gray-700">{doc.name}</div>
                      <div className="text-xs text-gray-500">
                        Uploaded {new Date(doc.uploadedAt).toLocaleTimeString()} (not yet saved)
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mr-2 bg-blue-100 text-blue-800">
                      Waiting to save
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index, true)}
                      className="text-gray-400 hover:text-red-500"
                      disabled={saving}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Document upload section - disabled for verified users */}
      <div className="mt-4">
  <label htmlFor="document-upload" className="block text-sm font-medium text-gray-700 mb-2">Upload Document</label>
  <div className="flex items-center">
    <input
      id="document-upload"
      type="file"
      accept=".pdf,.jpg,.jpeg,.png"
      onChange={handleDocumentUpload}
      disabled={saving || profile.verificationStatus === 'verified'}
      className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 ${
        profile.verificationStatus === 'verified' ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    />
  </div>
  <p className="text-xs text-gray-500 mt-1">
    Accepted formats: PDF, JPG, PNG. Max size: 5MB.
  </p>
  <div className="mt-2 p-2 bg-blue-50 rounded-md">
    <p className="text-xs text-blue-700">
      <strong>Note:</strong> Documents are uploaded to our server but will only be submitted for verification when you click "Save Profile".
    </p>
  </div>
</div>
</div>
</div>

{/* Reviews and Ratings */}
<div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
<div className="p-6">
  <h3 className="text-lg font-semibold mb-4">Reviews & Ratings</h3>
  
  <div className="flex items-center mb-4">
    <div className="flex items-center">
      <span className="text-3xl font-bold text-gray-800">4.8</span>
      <div className="ml-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg 
              key={star}
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 ${star <= 4 ? 'text-yellow-500' : 'text-gray-300'}`} 
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <div className="text-sm text-gray-500">Based on 12 reviews</div>
      </div>
    </div>
  </div>
  
  <div className="space-y-4">
    {/* Example reviews - In a real app, these would come from the database */}
    <div className="p-4 border border-gray-200 rounded-md">
      <div className="flex justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="font-medium">John Doe</div>
            <div className="text-sm text-gray-500">March 15, 2025</div>
          </div>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg 
              key={star}
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 ${star <= 5 ? 'text-yellow-500' : 'text-gray-300'}`} 
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="mt-2">
        {profile.userType === 'owner' ? 
          "Great property with all the amenities as advertised. Responsive owner who was always available for any concerns." :
          "Great tenant! Always paid rent on time and kept the property in excellent condition."
        }
      </p>
    </div>
    
    <div className="p-4 border border-gray-200 rounded-md">
      <div className="flex justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-500 mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <div className="font-medium">Jane Smith</div>
            <div className="text-sm text-gray-500">February 20, 2025</div>
          </div>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg 
              key={star}
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 ${star <= 4 ? 'text-yellow-500' : 'text-gray-300'}`} 
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
      </div>
      <p className="mt-2">
        {profile.userType === 'owner' ? 
          "The location was perfect for my needs. Clean and well-maintained property with great amenities." :
          "Very responsive and professional. Would definitely rent from again!"
        }
      </p>
    </div>
  </div>
</div>
</div>

{/* Delete Profile Section */}
<div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
<div className="p-6">
  <h3 className="text-lg font-semibold mb-4 text-red-600">Delete Profile</h3>
  <p className="text-sm text-gray-600 mb-4">
    If you wish to permanently delete your profile and all associated data from our system, click the button below. This action cannot be undone.
  </p>
  
  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800">Warning</h3>
        <div className="mt-1 text-sm text-red-700">
          <p>
            Deleting your profile will permanently remove all your data, including:
          </p>
          <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
            <li>Personal information and preferences</li>
            <li>Account settings</li>
            <li>Verification documents</li>
            <li>Review history</li>
            {profile.userType === 'owner' && (
              <li>Property listings and associated information</li>
            )}
            {profile.userType === 'renter' && (
              <li>Saved properties and rental applications</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <div className="mt-4 flex justify-end">
    <button
      type="button"
      onClick={handleDeleteProfileClick}
      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      disabled={deleting}
    >
      Delete My Profile
    </button>
  </div>
</div>
</div>

{/* Save Button */}
<div className="mt-6 flex justify-end">
<button
  type="submit"
  className={`px-6 py-3 rounded-md ${
    saving 
      ? 'bg-blue-400 cursor-not-allowed' 
      : 'bg-blue-600 hover:bg-blue-700'
  } text-white`}
  disabled={saving}
>
  {saving ? (
    <div className="flex items-center">
      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Saving...
    </div>
  ) : (
    tempUserTypeChange ? 'Save Profile & Submit Change Request' : 'Save Profile'
  )}
</button>
</div>
</form>
</div>
</div>
</>
);
};

export default Profile;