// src/pages/HomeownerListingForm.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref as dbRef, push, set, get } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from "../components/navbar2";

const HomeownerListingForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState('unverified');
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    type: 'Condominium',
    status: 'For Sale',
    bedrooms: 1,
    bathrooms: 1,
    area: '',
    location: '',
    city: '',
    neighborhood: '',
    zipCode: '',
    yearBuilt: '',
    parkingSpaces: 0,
    amenities: [],
  });
  
  // Handle file uploads
  const [selectedImages, setSelectedImages] = useState([]);
  const [previewImages, setPreviewImages] = useState([]);
  
  // Property types
  const propertyTypes = [
    'Condominium', 
    'Villa', 
    'Single Family', 
    'Townhouse', 
    'Land', 
    'Apartment'
  ];
  
  // Common amenities
  const commonAmenities = [
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
  
  // Check user verification status
  useEffect(() => {
    const checkUserVerification = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      try {
        setLoading(true);
        
        // Get user profile to check verification status
        const userRef = dbRef(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          setUserProfile(userData);
          
          // Check if user is a homeowner
          if (userData.userType !== 'owner') {
            setError("You need to be registered as a homeowner to add properties. Please update your profile.");
            setTimeout(() => {
              navigate('/profile');
            }, 3000);
            return;
          }
          
          // Set verification status
          setVerificationStatus(userData.verificationStatus || 'unverified');
        } else {
          setError("User profile not found. Please complete your profile first.");
          setTimeout(() => {
            navigate('/profile');
          }, 3000);
        }
      } catch (err) {
        console.error('Error checking verification:', err);
        setError('Failed to load user profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    checkUserVerification();
  }, [currentUser, navigate]);
  
  // Geocode address to get coordinates and location details
  const geocodeAddress = async (address) => {
    try {
      // Using Google Maps Geocoding API with your existing API key
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=AIzaSyB2GZaombfNIfsZgBfkhQ98xQ5rh1Fl_g0`);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        
        // Extract zipCode and neighborhood from address_components
        let zipCode = '';
        let neighborhood = '';
        
        if (result.address_components) {
          for (const component of result.address_components) {
            // Postal code / zip code
            if (component.types.includes('postal_code')) {
              zipCode = component.long_name;
            }
            
            // Neighborhood
            if (component.types.includes('neighborhood') || 
                component.types.includes('sublocality_level_1') ||
                component.types.includes('sublocality')) {
              neighborhood = component.long_name;
            }
          }
        }
        
        return {
          coordinates: {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng
          },
          zipCode,
          neighborhood
        };
      }
      
      // Default to Cebu City if geocoding fails
      console.log("Geocoding failed, using default coordinates");
      return {
        coordinates: { lat: 10.3157, lng: 123.8854 },
        zipCode: '',
        neighborhood: ''
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return {
        coordinates: { lat: 10.3157, lng: 123.8854 },
        zipCode: '',
        neighborhood: ''
      };
    }
  };
  
  // Auto-suggest zipCode and neighborhood when location or city changes
  useEffect(() => {
    const suggestLocationDetails = async () => {
      if (formData.location) {
        const fullAddress = formData.location + (formData.city ? `, ${formData.city}` : '');
        
        if (fullAddress.length > 5) { // Only trigger geocoding if we have enough characters
          try {
            const geoDetails = await geocodeAddress(fullAddress);
            
            // Update form data with the geocoded information if available
            if (geoDetails.zipCode && !formData.zipCode) {
              setFormData(prev => ({
                ...prev,
                zipCode: geoDetails.zipCode
              }));
            }
            
            if (geoDetails.neighborhood && !formData.neighborhood) {
              setFormData(prev => ({
                ...prev,
                neighborhood: geoDetails.neighborhood
              }));
            }
          } catch (err) {
            console.error('Error auto-suggesting location details:', err);
            // Don't show an error to user, just log it
          }
        }
      }
    };
    
    // Add a debounce to avoid too many API calls
    const debounceTimer = setTimeout(() => {
      suggestLocationDetails();
    }, 1000);
    
    return () => clearTimeout(debounceTimer);
  }, [formData.location, formData.city]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'amenities') {
      // Handle checkboxes for amenities
      if (checked) {
        setFormData({
          ...formData,
          amenities: [...formData.amenities, value]
        });
      } else {
        setFormData({
          ...formData,
          amenities: formData.amenities.filter(amenity => amenity !== value)
        });
      }
    } else {
      // Handle other inputs
      setFormData({
        ...formData,
        [name]: type === 'number' ? (value === '' ? '' : Number(value)) : value
      });
    }
  };
  
  // Handle image selection
  const handleImageChange = (e) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      
      // Limit to 5 images
      const filesToAdd = filesArray.slice(0, 5 - selectedImages.length);
      
      setSelectedImages([...selectedImages, ...filesToAdd]);
      
      // Create preview URLs
      const newPreviewImages = filesToAdd.map(file => URL.createObjectURL(file));
      setPreviewImages([...previewImages, ...newPreviewImages]);
    }
  };
  
  // Remove an image
  const removeImage = (index) => {
    const newSelectedImages = [...selectedImages];
    const newPreviewImages = [...previewImages];
    
    // Remove the image at the specified index
    newSelectedImages.splice(index, 1);
    
    // Revoke the object URL to avoid memory leaks
    URL.revokeObjectURL(previewImages[index]);
    newPreviewImages.splice(index, 1);
    
    setSelectedImages(newSelectedImages);
    setPreviewImages(newPreviewImages);
  };
  
  // Upload images to server - MODIFIED TO USE NODE SERVER INSTEAD OF FIREBASE
  const uploadImagesToServer = async (images) => {
    if (!images || images.length === 0) {
      return [];
    }
  
    try {
      // Create a FormData instance
      const formData = new FormData();
      
      // Append each image to the FormData
      images.forEach(image => {
        formData.append('images', image);
      });
    
      // Send the request to the API endpoint
      const response = await fetch('http://localhost:5000/api/upload-images', {
        method: 'POST',
        body: formData,
      });
    
      // Handle server errors
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload images');
      }
    
      // Parse the response
      const result = await response.json();
      
      // Check if upload was successful
      if (!result.success) {
        throw new Error(result.message || 'Failed to upload images');
      }
    
      // Return the image paths
      return result.paths;
    } catch (error) {
      console.error('Error uploading images:', error);
      throw error;
    }
  };
  
  // Helper function to get full image URL
  const getFullImageUrl = (url) => {
    if (!url) return '';
    
    // If it's already a full URL, return it as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Otherwise, prepend the server URL
    return `http://localhost:5000${url}`;
  };
  
  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If user is not verified, show explanation and guidance
    if (verificationStatus !== 'verified') {
      if (verificationStatus === 'pending') {
        setError('Your account verification is pending. You will be able to add properties once an admin approves your verification.');
      } else {
        setError('Your account needs to be verified before you can add properties. Please upload verification documents in your profile.');
        setTimeout(() => {
          navigate('/profile');
        }, 3000);
      }
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      
      // Basic validation
      if (!formData.title || !formData.price || !formData.location) {
        throw new Error('Please fill in all required fields');
      }
      
      // Geocode the address to get coordinates
      const fullAddress = formData.location + (formData.city ? `, ${formData.city}` : '');
      console.log(`Geocoding address: ${fullAddress}`);
      const geoData = await geocodeAddress(fullAddress);
      console.log("Obtained coordinates:", geoData.coordinates);
      
      // Upload images to server
      let imagePaths = [];
      if (selectedImages.length > 0) {
        console.log("Uploading images...");
        imagePaths = await uploadImagesToServer(selectedImages);
        console.log("Image paths:", imagePaths);
      }
      
      // Generate a random property ID
      const propertyId = 'PROP-' + Math.floor(100000 + Math.random() * 900000);
      
      // Get homeowner info
      const homeownerInfo = {
        name: userProfile.displayName || 'Homeowner',
        email: userProfile.email,
        phone: userProfile.phone || 'Not provided',
        image: userProfile.photoURL || '/src/assets/agent.jpg'
      };
      
      // Create property object with pending approval status
      const propertyData = {
        ...formData,
        images: imagePaths.length > 0 ? imagePaths : ['/src/assets/placeholder-property.jpg'],
        image: imagePaths.length > 0 ? imagePaths[0] : '/src/assets/placeholder-property.jpg',
        propertyId,
        ownerId: currentUser.uid,
        createdAt: new Date().toISOString(),
        coordinates: geoData.coordinates,
        // Make sure zipCode and neighborhood are included
        zipCode: formData.zipCode || geoData.zipCode || '',
        neighborhood: formData.neighborhood || geoData.neighborhood || '',
        homeowner: homeownerInfo,
        approvalStatus: 'pending', // Property starts as pending approval
      };
      
      // Add property to Firebase in pending properties collection first
      const newPropertyRef = push(dbRef(db, 'pendingProperties'));
      await set(newPropertyRef, propertyData);
      
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        navigate('/homeowner/my-listings');
      }, 2000);
      
    } catch (err) {
      console.error('Error adding property:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
                Your account is verified. You can add property listings.
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
                Your account is not verified yet. Please upload verification documents in your profile before adding properties.
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
  
  return (
    <>
      <Navbar2 />
      <div className="max-w-4xl mx-auto pt-9 px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Add Your Property</h1>
          <p className="text-gray-600">Fill in the details to add your property listing. It will be reviewed by our team before being published.</p>
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
                <p className="text-sm text-green-700">
                  Property submitted successfully! It is now pending admin approval. Redirecting to your listings...
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
        
        {/* Add Property Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="md:col-span-2">
                <h2 className="text-xl font-bold mb-4">Basic Information</h2>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Title*</label>
                <input
                  type="text"
                  name="title"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g. Beautiful 2BR Condo with Ocean View"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows="4"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your property in detail - include key features, renovations, nearby attractions, etc."
                ></textarea>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price (PHP)*</label>
                <input
                  type="number"
                  name="price"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="e.g. 5000000"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option>For Sale</option>
                  <option>For Rent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
                <select
                  name="type"
                  className="w-full p-2 border border-gray-300 rounded-md bg-white"
                  value={formData.type}
                  onChange={handleInputChange}
                >
                  {propertyTypes.map((type, index) => (
                    <option key={index}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area (sq m)</label>
                <input
                  type="number"
                  name="area"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.area}
                  onChange={handleInputChange}
                  placeholder="e.g. 75"
                />
              </div>
              
              {/* Property Details */}
              <div className="md:col-span-2 mt-4">
                <h2 className="text-xl font-bold mb-4">Property Details</h2>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
                <input
                  type="number"
                  name="bedrooms"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.bedrooms}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
                <input
                  type="number"
                  name="bathrooms"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.bathrooms}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year Built</label>
                <input
                  type="number"
                  name="yearBuilt"
                  min="1900"
                  max={new Date().getFullYear()}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.yearBuilt}
                  onChange={handleInputChange}
                  placeholder="e.g. 2020"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parking Spaces</label>
                <input
                  type="number"
                  name="parkingSpaces"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.parkingSpaces}
                  onChange={handleInputChange}
                />
              </div>
              
              {/* Location */}
              <div className="md:col-span-2 mt-4">
                <h2 className="text-xl font-bold mb-4">Location</h2>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address/Location*</label>
                <input
                  type="text"
                  name="location"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your property address"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Enter a complete address for accurate map placement
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g. Cebu City"
                />
              </div>
              
              {/* Add new fields for neighborhood and zipCode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Neighborhood</label>
                <input
                  type="text"
                  name="neighborhood"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.neighborhood}
                  onChange={handleInputChange}
                  placeholder="Auto-suggested after address entry"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  className="w-full p-2 border border-gray-300 rounded-md"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  placeholder="Auto-suggested after address entry"
                />
              </div>
              
              {/* Amenities */}
              <div className="md:col-span-2 mt-4">
                <h2 className="text-xl font-bold mb-4">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {commonAmenities.map((amenity, index) => (
                    <div key={index} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`amenity-${index}`}
                        name="amenities"
                        value={amenity}
                        checked={formData.amenities.includes(amenity)}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600"
                      />
                      <label htmlFor={`amenity-${index}`} className="ml-2 text-sm text-gray-700">
                        {amenity}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Images */}
              <div className="md:col-span-2 mt-4">
                <h2 className="text-xl font-bold mb-4">Property Images</h2>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Images (Max 5)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    disabled={selectedImages.length >= 5}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedImages.length}/5 images selected
                  </p>
                </div>
                
                {/* Image previews */}
                {previewImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
                    {previewImages.map((previewUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={previewUrl}
                          alt={`Preview ${index + 1}`}
                          className="h-32 w-full rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500 hover:bg-red-100"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Property Submission Disclaimer */}
                <div className="mt-6 bg-blue-50 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        Your property listing will be reviewed by our admin team before it appears on the site. 
                        You'll be notified once it's approved.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit buttons */}
              <div className="md:col-span-2 mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/homeowner/my-listings')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                  disabled={submitting || verificationStatus === 'unverified'}
                >
                  {submitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Property'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Additional Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">What Happens Next?</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                1
              </div>
              <div>
                <h3 className="text-lg font-medium">Verification Review</h3>
                <p className="text-gray-600">
                  If you haven't been verified yet, our admin team will review your identity documents first.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                2
              </div>
              <div>
                <h3 className="text-lg font-medium">Property Review</h3>
                <p className="text-gray-600">
                  Our team will review your property details to ensure they meet our listing guidelines.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                3
              </div>
              <div>
                <h3 className="text-lg font-medium">Publication</h3>
                <p className="text-gray-600">
                  Once approved, your property will be published on our platform and visible to potential renters or buyers.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                4
              </div>
              <div>
                <h3 className="text-lg font-medium">Inquiries Management</h3>
                <p className="text-gray-600">
                  You'll receive notifications for any inquiries about your property. You can manage these in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomeownerListingForm;