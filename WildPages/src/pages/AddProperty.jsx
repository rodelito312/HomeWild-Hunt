import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref as dbRef, push, set, get } from 'firebase/database';
import Navbar2 from "../components/navbar2";
import { useAuth } from '../context/AuthContext';

const AddProperty = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Agents state
  const [agents, setAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  
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
    agentId: '',
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
  
  // Fetch agents (users who can act as agents)
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);
        
        // Create a reference to the users node
        const usersRef = dbRef(db, 'users');
        
        // Get all users
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const agentsData = [];
          
          snapshot.forEach((childSnapshot) => {
            const userData = {
              id: childSnapshot.key,
              ...childSnapshot.val()
            };
            
            // Include verified homeowners by default
            if (userData.userType === 'owner' && userData.verificationStatus === 'verified') {
              agentsData.push(userData);
            } 
            // Also include verified renters who have agent role (for flexibility)
            else if (userData.userType === 'renter' && userData.verificationStatus === 'verified' && userData.isAgent) {
              agentsData.push(userData);
            }
          });
          
          setAgents(agentsData);
        } else {
          setAgents([]);
        }
      } catch (err) {
        console.error('Error fetching agent users:', err);
      } finally {
        setLoadingAgents(false);
      }
    };
    
    fetchAgents();
  }, []);
  
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
  
  // Upload images to the server
  const uploadImages = async (images) => {
    if (!images || images.length === 0) {
      return [];
    }
  
    // Create a FormData instance
    const formData = new FormData();
    
    // Append each image to the FormData
    images.forEach(image => {
      formData.append('images', image);
    });
  
    try {
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
  
      // Return the image paths with full server URL
      return result.paths.map(path => `http://localhost:5000${path}`);
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
  
  // Add property to agent's listings
  const addPropertyToAgentList = async (agentId, propertyId, propertyData) => {
    try {
      if (!agentId) return;
      
      // Create a reference to the agent's properties collection
      const agentPropertyRef = dbRef(db, `users/${agentId}/properties/${propertyId}`);
      
      // Create a simplified property object for the agent's list
      const simplifiedProperty = {
        id: propertyId,
        title: propertyData.title,
        location: propertyData.location,
        price: propertyData.price,
        status: propertyData.status,
        type: propertyData.type,
        image: propertyData.image,
        createdAt: propertyData.createdAt
      };
      
      // Save the property to the agent's list
      await set(agentPropertyRef, simplifiedProperty);
      
      console.log(`Property added to agent ${agentId}'s listings`);
    } catch (error) {
      console.error('Error adding property to agent\'s list:', error);
      // We'll continue with the property creation even if this fails
      // but log the error for debugging
    }
  };
  
  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Basic validation
      if (!formData.title || !formData.price || !formData.location) {
        throw new Error('Please fill in all required fields');
      }
      
      // Validate agent selection
      if (!formData.agentId) {
        throw new Error('Please select an agent for this property');
      }
      
      // Geocode the address to get coordinates
      const fullAddress = formData.location + (formData.city ? `, ${formData.city}` : '');
      console.log(`Geocoding address: ${fullAddress}`);
      const geoData = await geocodeAddress(fullAddress);
      console.log("Obtained coordinates:", geoData.coordinates);
      
      // Upload images
      let imagePaths = [];
      if (selectedImages.length > 0) {
        console.log("Uploading images...");
        imagePaths = await uploadImages(selectedImages);
        console.log("Image paths:", imagePaths);
      }
      
      // Generate a random property ID
      const propertyId = 'PROP-' + Math.floor(100000 + Math.random() * 900000);
      
      // Get the selected agent's details
      const selectedAgent = agents.find(agent => agent.id === formData.agentId);
      
      // Create agent object
      const agentData = {
        id: selectedAgent.id,
        name: selectedAgent.displayName || selectedAgent.email.split('@')[0],
        email: selectedAgent.email,
        phone: selectedAgent.phone || '+63 123 456 7890',
        image: selectedAgent.photoURL || '/src/assets/agent.jpg',
        userType: selectedAgent.userType
      };
      
      // Create property object
      const propertyData = {
        ...formData,
        images: imagePaths.length > 0 ? imagePaths : ['/src/assets/placeholder-property.jpg'],
        image: imagePaths.length > 0 ? imagePaths[0] : '/src/assets/placeholder-property.jpg',
        propertyId,
        createdAt: new Date().toISOString(),
        ownerId: currentUser.uid, // The current user is the owner of the property listing
        coordinates: geoData.coordinates,
        // Make sure zipCode and neighborhood are included
        zipCode: formData.zipCode || geoData.zipCode || '',
        neighborhood: formData.neighborhood || geoData.neighborhood || '',
        agent: agentData
      };
      
      // Remove agentId from the data (it's just for the form)
      delete propertyData.agentId;
      
      // Add property to Firebase
      const newPropertyRef = push(dbRef(db, 'properties'));
      const newPropertyId = newPropertyRef.key;
      await set(newPropertyRef, propertyData);
      
      // Add property to the agent's listings
      await addPropertyToAgentList(agentData.id, newPropertyId, propertyData);
      
      setSuccess(true);
      
      // Reset form after successful submission
      setTimeout(() => {
        navigate('/admin/manage-listings');
      }, 2000);
      
    } catch (err) {
      console.error('Error adding property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <Navbar2 />
      <div className="max-w-4xl mx-auto pt-9 px-4 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Add New Property</h1>
          <p className="text-gray-600">Fill in the details to add a new property listing.</p>
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
                  Property added successfully! Redirecting to property listings...
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
              
              {/* Agent Selection */}
              <div className="md:col-span-2 mt-4">
                <h2 className="text-xl font-bold mb-4">Property Agent</h2>
                
                {loadingAgents ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading agents...</span>
                  </div>
                ) : agents.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          No verified agents available. Add verified users with agent capabilities first.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Agent*</label>
                    <select
                      name="agentId"
                      className="w-full p-2 border border-gray-300 rounded-md bg-white"
                      value={formData.agentId}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select an agent</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.displayName || agent.email} ({agent.userType === 'owner' ? 'Homeowner' : 'Renter Agent'})
                        </option>
                      ))}
                    </select>
                    
                    {formData.agentId && (
                      <div className="mt-4 flex items-start p-4 border border-gray-200 rounded-md">
                        <div className="mr-4">
                          <img 
                            src={getFullImageUrl(agents.find(a => a.id === formData.agentId)?.photoURL) || '/src/assets/agent.jpg'} 
                            alt="Agent" 
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {agents.find(a => a.id === formData.agentId)?.displayName || agents.find(a => a.id === formData.agentId)?.email}
                          </h4>
                          <p className="text-sm text-gray-600">{agents.find(a => a.id === formData.agentId)?.email}</p>
                          <p className="text-sm text-gray-600">
                            {agents.find(a => a.id === formData.agentId)?.phone || 'No phone number provided'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              agents.find(a => a.id === formData.agentId)?.userType === 'owner' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-purple-100 text-purple-800'
                            }`}>
                              {agents.find(a => a.id === formData.agentId)?.userType === 'owner' ? 'Homeowner' : 'Renter Agent'}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                          className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Submit buttons */}
              <div className="md:col-span-2 mt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => navigate('/admin/manage-listings')}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    'Add Property'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default AddProperty;