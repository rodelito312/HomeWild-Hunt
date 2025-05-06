import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, onValue, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from '../components/navbar2';

const MessagesPage = () => {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('inbox');

  useEffect(() => {
    if (!currentUser) return;

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
    
    // Clean up listeners on unmount
    return () => {
      inboxUnsubscribe();
      outboxUnsubscribe();
    };
  }, [currentUser]);

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

  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
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

  // Filter messages based on active tab
  const filteredMessages = activeTab === 'inbox' 
    ? messages.filter(msg => msg.direction === 'incoming')
    : messages.filter(msg => msg.direction === 'outgoing');
  
  // Count unread messages
  const unreadCount = messages.filter(msg => msg.direction === 'incoming' && !msg.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar2 />
      
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold">Messages</h1>
            <p className="text-gray-600">
              Communicate with property owners and potential buyers
            </p>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b">
            <button
              className={`px-6 py-3 text-sm font-medium ${
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
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'sent' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('sent')}
            >
              Sent
            </button>
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
              <p>No messages {activeTab === 'inbox' ? 'received' : 'sent'} yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((message) => (
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;