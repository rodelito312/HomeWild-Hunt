import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Message from '../components/Message';
import Navbar2 from '../components/navbar2';

const MessageProperty = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Get property ID from either URL params, state, or query params
  const propertyId = id || 
                    (location.state && location.state.propertyId) || 
                    new URLSearchParams(location.search).get('property');
  
  // Fetch property details if we have an ID
  useEffect(() => {
    const fetchProperty = async () => {
      if (!propertyId) {
        setError("No property specified. Please select a property to message about.");
        setLoading(false);
        return;
      }
      
      try {
        const propertyRef = ref(db, `properties/${propertyId}`);
        const snapshot = await get(propertyRef);
        
        if (snapshot.exists()) {
          setProperty(snapshot.val());
        } else {
          setError("Property not found.");
        }
      } catch (err) {
        console.error('Error fetching property:', err);
        setError("Failed to load property details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProperty();
  }, [propertyId]);
  
  // Handle successful message submission
  const handleMessageSent = () => {
    // Redirect to messages page or back to property
    setTimeout(() => {
      navigate('/messages');
    }, 3000);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar2 />
      
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Message Property Owner</h1>
          <p className="text-gray-600">
            Ask questions about this property or schedule a viewing
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
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
        ) : (
          <Message 
            propertyId={propertyId}
            onMessageSent={handleMessageSent}
          />
        )}
        
        {/* Back button */}
        <div className="mt-6">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-600 hover:text-blue-800 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Property
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageProperty;