import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from "../components/navbar2";

const RenterProperties = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contactedProperties, setContactedProperties] = useState([]);
  const [messages, setMessages] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState([]);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('properties');

  // Check if user is logged in
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Check if user is a renter
    const fetchUserProfile = async () => {
      try {
        const userRef = ref(db, `users/${currentUser.uid}`);
        
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            
            // Redirect homeowners to their listings page
            if (userData.userType === 'owner') {
              navigate('/homeowner/my-listings');
              return;
            }
          }
        });
      } catch (err) {
        console.error('Error fetching user profile:', err);
      }
    };
    
    fetchUserProfile();
  }, [currentUser, navigate]);

  // Fetch properties user has contacted and messages
  useEffect(() => {
    if (!currentUser) return;
    
    const fetchContactedProperties = () => {
      setLoading(true);
      
      // Fetch inquiries/messages sent by this user
      const messagesQuery = query(
        ref(db, 'propertyMessages'),
        orderByChild('userId'),
        equalTo(currentUser.uid)
      );
      
      onValue(messagesQuery, (snapshot) => {
        const messagesList = [];
        const contactedPropertyIds = new Set();
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            const message = {
              id: childSnapshot.key,
              ...childSnapshot.val()
            };
            
            messagesList.push(message);
            
            // Add to contacted property IDs
            if (message.propertyId) {
              contactedPropertyIds.add(message.propertyId);
            }
          });
        }
        
        setMessages(messagesList);
        
        // Identify unread messages (messages sent in the last 24 hours)
        const now = new Date();
        const dayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        const newMessages = messagesList.filter(msg => {
          // Check if timestamp exists and is valid
          if (!msg.timestamp) return false;
          
          // Handle server timestamp or regular timestamp
          const msgTime = msg.timestamp.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp);
          return msgTime > dayAgo;
        });
        
        setUnreadMessages(newMessages.map(msg => msg.id));
        
        // Now fetch the property details for each contacted property
        if (contactedPropertyIds.size > 0) {
          const propertiesRef = ref(db, 'properties');
          
          onValue(propertiesRef, (propSnapshot) => {
            const propertiesList = [];
            
            if (propSnapshot.exists()) {
              propSnapshot.forEach((childSnapshot) => {
                const propertyId = childSnapshot.key;
                
                // Only include properties that were contacted
                if (contactedPropertyIds.has(propertyId)) {
                  propertiesList.push({
                    id: propertyId,
                    ...childSnapshot.val()
                  });
                }
              });
            }
            
            setContactedProperties(propertiesList);
            setLoading(false);
          });
        } else {
          setContactedProperties([]);
          setLoading(false);
        }
      });
    };
    
    fetchContactedProperties();
  }, [currentUser]);

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
          <h1 className="text-3xl font-bold mb-2">My Properties</h1>
          <p className="text-gray-600">View properties you've contacted and your communication with owners.</p>
        </div>
        
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
              <option value="properties">Contacted Properties ({contactedProperties.length})</option>
              <option value="messages">Messages ({messages.length}){unreadMessages.length > 0 && ` (${unreadMessages.length} new)`}</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('properties')}
                  className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'properties'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Contacted Properties ({contactedProperties.length})
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                    activeTab === 'messages'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Messages ({messages.length})
                  {unreadMessages.length > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {unreadMessages.length} new
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        </div>
        
        {/* Properties Tab */}
        {activeTab === 'properties' && (
          <div>
            {contactedProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No contacted properties yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't contacted any property owners yet. Browse properties and reach out to owners to see your inquiries here.
                </p>
                <Link 
                  to="/properties" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contactedProperties.map((property) => (
                  <div 
                    key={property.id}
                    className="bg-white rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg"
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
                      {/* Show badge if property has unread messages */}
                      {messages.some(m => m.propertyId === property.id && unreadMessages.includes(m.id)) && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white py-1 px-2 rounded-full text-xs">
                          New Messages
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{property.title}</h3>
                      <p className="text-gray-600 mb-2 truncate">{property.location}</p>
                      <p className={`${property.status === 'For Sale' ? 'text-green-600' : 'text-blue-600'} font-bold`}>
                        {formatPrice(property.price)}
                        {property.status === 'For Rent' && ' / month'}
                      </p>
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(property.createdAt).split(',')[0]}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                          </svg>
                          {messages.filter(m => m.propertyId === property.id).length} Messages
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between">
                        <Link 
                          to={`/property/${property.id}`} 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          View Property
                        </Link>
                        <Link
                          to={`/message?propertyId=${property.id}`}
                          className="text-green-600 hover:text-green-800"
                        >
                          Send Message
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {messages.length === 0 ? (
              <div className="p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No messages yet</h3>
                <p className="text-gray-500 mb-4">
                  You haven't sent any messages to property owners yet. Contact owners to inquire about properties you're interested in.
                </p>
                <Link 
                  to="/properties" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                  </svg>
                  Browse Properties
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {messages.map((message) => {
                      // Find the property for this message
                      const property = contactedProperties.find(p => p.id === message.propertyId);
                      const isUnread = unreadMessages.includes(message.id);
                      
                      return (
                        <tr 
                          key={message.id} 
                          className={`${isUnread ? 'bg-blue-50' : ''}`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {property ? (
                                <>
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
                                      {isUnread && (
                                        <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                                          New
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {property.location}
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  Property not available
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 max-w-xs line-clamp-2">
                              {message.message}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(message.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              {property && (
                                <>
                                  <Link 
                                    to={`/property/${property.id}`}
                                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                                  >
                                    View Property
                                  </Link>
                                  <Link
                                    to={`/message?propertyId=${property.id}`}
                                    className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                                  >
                                    Send Message
                                  </Link>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Information Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-10">
          <h2 className="text-xl font-bold mb-4">How to Use My Properties</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Contacted Properties</h3>
                <p className="text-gray-600">
                  This section shows all properties you've contacted. You can view property details and continue communication with owners.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Messages</h3>
                <p className="text-gray-600">
                  View your message history with property owners. You can continue conversations about properties you're interested in.
                </p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium">Next Steps</h3>
                <p className="text-gray-600">
                  After contacting owners, you may schedule property viewings or ask additional questions. Keep track of your communication here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RenterProperties;