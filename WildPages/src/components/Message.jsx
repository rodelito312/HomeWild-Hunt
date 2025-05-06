import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, onValue, update, push, serverTimestamp } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from './navbar2';

const Messages = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [propertyMessages, setPropertyMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');
  const [userRole, setUserRole] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Determine user role (owner or renter)
    const userRef = ref(db, `users/${currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUserRole(userData.userType || 'renter'); // Default to renter if not specified
      }
    });

    setLoading(true);
    
    // Reference to the user's messages (inbox)
    const messagesRef = ref(db, `messages/${currentUser.uid}`);
    
    // Reference to the user's sent messages (outbox)
    const sentMessagesRef = ref(db, `sentMessages/${currentUser.uid}`);
    
    // Set up listeners for both incoming and outgoing messages
    const inboxUnsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = [];
        
        snapshot.forEach((childSnapshot) => {
          const messageId = childSnapshot.key;
          const messageData = childSnapshot.val();
          
          messagesData.push({
            id: messageId,
            ...messageData,
            direction: 'incoming'
          });
        });
        
        // Sort by timestamp (newest first)
        messagesData.sort((a, b) => b.timestamp - a.timestamp);
        
        setMessages((prevMessages) => {
          // Filter out any incoming messages we already have
          const existingOutgoing = prevMessages.filter(msg => msg.direction === 'outgoing');
          return [...existingOutgoing, ...messagesData];
        });
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inbox messages:", error);
      setError("Failed to load messages. Please try again later.");
      setLoading(false);
    });
    
    const outboxUnsubscribe = onValue(sentMessagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const messagesData = [];
        
        snapshot.forEach((childSnapshot) => {
          const messageId = childSnapshot.key;
          const messageData = childSnapshot.val();
          
          messagesData.push({
            id: messageId,
            ...messageData,
            direction: 'outgoing'
          });
        });
        
        // Sort by timestamp (newest first)
        messagesData.sort((a, b) => b.timestamp - a.timestamp);
        
        setMessages((prevMessages) => {
          // Filter out any outgoing messages we already have
          const existingIncoming = prevMessages.filter(msg => msg.direction === 'incoming');
          return [...existingIncoming, ...messagesData];
        });
      }
    }, (error) => {
      console.error("Error fetching outbox messages:", error);
    });

    // For homeowners: fetch property messages
    if (currentUser) {
      // Fetch user's properties first to establish ownership
      const propertiesRef = ref(db, 'properties');
      const propertiesUnsubscribe = onValue(propertiesRef, (snapshot) => {
        if (snapshot.exists()) {
          const ownedProperties = [];
          
          snapshot.forEach((childSnapshot) => {
            const property = childSnapshot.val();
            
            // Only include properties owned by current user
            if (property.ownerId === currentUser.uid) {
              ownedProperties.push({
                id: childSnapshot.key,
                ...property
              });
            }
          });
          
          setProperties(ownedProperties);
          
          // Now fetch messages for these properties
          if (ownedProperties.length > 0) {
            const propertyIds = ownedProperties.map(p => p.id);
            const propertyMessagesRef = ref(db, 'propertyMessages');
            
            const propertyMessagesUnsubscribe = onValue(propertyMessagesRef, (msgSnapshot) => {
              if (msgSnapshot.exists()) {
                const propMsgs = [];
                
                msgSnapshot.forEach((msgChildSnapshot) => {
                  const propMsg = {
                    id: msgChildSnapshot.key,
                    ...msgChildSnapshot.val()
                  };
                  
                  // Only include messages for properties owned by current user
                  if (propertyIds.includes(propMsg.propertyId)) {
                    propMsgs.push(propMsg);
                  }
                });
                
                // Sort by timestamp (newest first)
                propMsgs.sort((a, b) => {
                  // Handle Firebase server timestamps which might be objects
                  const getTime = (timestamp) => {
                    if (!timestamp) return 0;
                    if (timestamp.toMillis) return timestamp.toMillis();
                    return typeof timestamp === 'number' ? timestamp : 0;
                  };
                  
                  return getTime(b.timestamp) - getTime(a.timestamp);
                });
                
                setPropertyMessages(propMsgs);
              }
            });
            
            return () => {
              propertyMessagesUnsubscribe();
            };
          }
        }
      });
      
      return () => {
        inboxUnsubscribe();
        outboxUnsubscribe();
        propertiesUnsubscribe();
      };
    }
    
    return () => {
      inboxUnsubscribe();
      outboxUnsubscribe();
    };
  }, [currentUser, navigate]);

  // Function to mark a message as read
  const markAsRead = async (messageId) => {
    if (!currentUser) return;
    
    try {
      const messageRef = ref(db, `messages/${currentUser.uid}/${messageId}`);
      await update(messageRef, { read: true });
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  // Function to mark a property message as seen by owner
  const markPropertyMessageAsSeen = async (messageId) => {
    if (!currentUser) return;
    
    try {
      const messageRef = ref(db, `propertyMessages/${messageId}`);
      await update(messageRef, { ownerSeen: true });
    } catch (error) {
      console.error("Error marking property message as seen:", error);
    }
  };

  // Function to send a reply to a property inquiry
  const sendReply = async (e) => {
    e.preventDefault();
    
    if (!currentUser || !selectedMessage || !replyText.trim()) return;
    
    try {
      setSendingReply(true);
      
      // Create new message object
      const replyMessage = {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || 'Property Owner',
        recipientId: selectedMessage.userId,
        recipientName: selectedMessage.userName || 'Property Inquirer',
        propertyId: selectedMessage.propertyId,
        propertyTitle: selectedMessage.propertyTitle || 'Property',
        content: replyText,
        timestamp: serverTimestamp(),
        read: false,
        isReplyTo: selectedMessage.id
      };
      
      // Add to recipient's inbox
      const recipientInboxRef = ref(db, `messages/${selectedMessage.userId}`);
      const newMessageRef = push(recipientInboxRef);
      
      // Also add to sender's sent messages
      const senderOutboxRef = ref(db, `sentMessages/${currentUser.uid}/${newMessageRef.key}`);
      
      // Update both locations
      await update(newMessageRef, replyMessage);
      await update(senderOutboxRef, replyMessage);
      
      // Mark the original message as replied
      const originalMessageRef = ref(db, `propertyMessages/${selectedMessage.id}`);
      await update(originalMessageRef, { replied: true });
      
      // Reset the form
      setReplyText('');
      setShowReplyForm(false);
      setSelectedMessage(null);
      
      // Show success message (you could add a toast notification here)
      alert("Reply sent successfully!");
      
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };

  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    let date;
    
    // Handle Firebase server timestamps which might be objects
    if (timestamp.toDate) {
      // Firestore timestamp
      date = timestamp.toDate();
    } else if (typeof timestamp === 'object' && timestamp.seconds) {
      // Another Firestore timestamp format
      date = new Date(timestamp.seconds * 1000);
    } else {
      // Regular timestamp (number)
      date = new Date(timestamp);
    }
    
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Today - show time
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (diffDays < 7) {
      // Within a week
      return `${diffDays} days ago`;
    } else {
      // More than a week
      return date.toLocaleDateString();
    }
  };

  // Get the property info for a property message
  const getPropertyInfo = (propertyId) => {
    return properties.find(p => p.id === propertyId) || { title: 'Unknown Property' };
  };

  // Filter messages based on active tab
  const filteredMessages = (() => {
    if (activeTab === 'inbox') {
      return messages.filter(msg => msg.direction === 'incoming');
    } else if (activeTab === 'sent') {
      return messages.filter(msg => msg.direction === 'outgoing');
    } else if (activeTab === 'property-inquiries') {
      return propertyMessages;
    }
    return [];
  })();
  
  // Count unread messages
  const unreadCount = messages.filter(msg => msg.direction === 'incoming' && !msg.read).length;
  
  // Count unseen property inquiries (for homeowners)
  const unseenInquiryCount = propertyMessages.filter(msg => !msg.ownerSeen).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar2 />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-gray-600">
              Communicate with {userRole === 'owner' ? 'property inquirers' : 'property owners'}
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b overflow-x-auto">
            <button
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'inbox' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('inbox')}
            >
              Inbox
              {unreadCount > 0 && (
                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'sent' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('sent')}
            >
              Sent
            </button>
            
            {/* Property Inquiries tab for homeowners */}
            {userRole === 'owner' && (
              <button
                className={`px-6 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === 'property-inquiries' 
                    ? 'border-b-2 border-blue-500 text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('property-inquiries')}
              >
                Property Inquiries
                {unseenInquiryCount > 0 && (
                  <span className="ml-2 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                    {unseenInquiryCount}
                  </span>
                )}
              </button>
            )}
          </div>
          
          {/* Messages list */}
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              {error}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <p>
                {activeTab === 'inbox' 
                  ? 'No messages received yet.' 
                  : activeTab === 'sent'
                    ? 'No messages sent yet.'
                    : 'No property inquiries yet.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {activeTab !== 'property-inquiries' ? (
                // Regular messages (inbox and sent)
                filteredMessages.map((message) => (
                  <Link
                    key={message.id}
                    to={`/messages/${message.id}`}
                    className={`block p-4 hover:bg-gray-50 transition-colors ${
                      !message.read && activeTab === 'inbox' ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => {
                      if (!message.read && message.direction === 'incoming') {
                        markAsRead(message.id);
                      }
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                          {activeTab === 'inbox' 
                            ? message.senderName?.charAt(0).toUpperCase() || 'U' 
                            : message.recipientName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activeTab === 'inbox' 
                              ? message.senderName || 'Unknown User' 
                              : message.recipientName || 'Property Owner'}
                          </p>
                          <p className="text-xs text-gray-500 ml-2">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mt-1 truncate">
                          {message.propertyTitle}
                        </p>
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {message.content}
                        </p>
                        
                        {/* Unread indicator */}
                        {!message.read && message.direction === 'incoming' && (
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500 mt-1"></span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                // Property inquiries (for homeowners)
                filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !message.ownerSeen ? 'bg-green-50' : ''
                    }`}
                    onClick={() => {
                      if (!message.ownerSeen) {
                        markPropertyMessageAsSeen(message.id);
                      }
                      setSelectedMessage(message);
                      setShowReplyForm(!showReplyForm);
                    }}
                  >
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                          {message.userName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 flex items-center">
                            {message.userName || 'Unknown User'}
                            {message.replied && (
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                                Replied
                              </span>
                            )}
                            {!message.ownerSeen && (
                              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                New
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 ml-2">
                            {formatDate(message.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 font-medium mt-1">
                          Re: {message.propertyTitle || getPropertyInfo(message.propertyId).title}
                        </p>
                        <div className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                          {message.message}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-gray-500">
                            <span className="mr-3">Phone: {message.userPhone || 'Not provided'}</span>
                            <span>Email: {message.userEmail || 'Not provided'}</span>
                          </div>
                          <button
                            className={`px-3 py-1 rounded ${message.replied ? 'bg-gray-100 text-gray-500' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMessage(message);
                              setShowReplyForm(true);
                            }}
                            disabled={message.replied}
                          >
                            {message.replied ? 'Replied' : 'Reply'}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Reply form */}
                    {showReplyForm && selectedMessage && selectedMessage.id === message.id && (
                      <div className="mt-4 pl-12">
                        <form onSubmit={sendReply} className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Reply to {message.userName || 'Inquirer'}</h4>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
                            rows="3"
                            placeholder="Type your reply here..."
                            required
                          ></textarea>
                          <div className="flex justify-end space-x-2">
                            <button
                              type="button"
                              className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                              onClick={() => setShowReplyForm(false)}
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                              disabled={sendingReply || !replyText.trim()}
                            >
                              {sendingReply ? (
                                <span className="flex items-center">
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Sending...
                                </span>
                              ) : 'Send Reply'}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;