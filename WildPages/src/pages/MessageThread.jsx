import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get, onValue, push, serverTimestamp, update } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import Navbar2 from '../components/navbar2';

const MessageThread = () => {
  const { id } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [thread, setThread] = useState(null);
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Automatically scroll to the bottom when messages load or new messages come in
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [thread]);
  
  useEffect(() => {
    if (!currentUser || !id) return;
    
    setLoading(true);
    
    // Find the thread in both incoming and outgoing messages
    const findThread = async () => {
      try {
        // Check inbox first
        const inboxRef = ref(db, `messages/${currentUser.uid}/${id}`);
        const inboxSnapshot = await get(inboxRef);
        
        if (inboxSnapshot.exists()) {
          const messageData = inboxSnapshot.val();
          
          // Check if we have an existing thread with this property and sender
          const threadRef = ref(db, `messageThreads/${currentUser.uid}_${messageData.senderId}_${messageData.propertyId}`);
          const threadSnapshot = await get(threadRef);
          
          if (threadSnapshot.exists()) {
            // There's an existing thread - load it
            setupThreadListener(`${currentUser.uid}_${messageData.senderId}_${messageData.propertyId}`, messageData.propertyId, messageData.senderId);
            
            // Mark message as read if it's not already
            if (!messageData.read) {
              await update(inboxRef, { read: true });
            }
            
            return;
          }
          
          // No existing thread - create one from this message
          const newThreadRef = ref(db, `messageThreads/${currentUser.uid}_${messageData.senderId}_${messageData.propertyId}`);
          await push(newThreadRef, {
            ...messageData,
            direction: 'incoming'
          });
          
          setupThreadListener(`${currentUser.uid}_${messageData.senderId}_${messageData.propertyId}`, messageData.propertyId, messageData.senderId);
          
          // Mark message as read if it's not already
          if (!messageData.read) {
            await update(inboxRef, { read: true });
          }
          
          return;
        }
        
        // Not found in inbox, check outbox
        const outboxRef = ref(db, `sentMessages/${currentUser.uid}/${id}`);
        const outboxSnapshot = await get(outboxRef);
        
        if (outboxSnapshot.exists()) {
          const messageData = outboxSnapshot.val();
          
          // Check if we have an existing thread with this property and recipient
          const threadRef = ref(db, `messageThreads/${currentUser.uid}_${messageData.recipientId}_${messageData.propertyId}`);
          const threadSnapshot = await get(threadRef);
          
          if (threadSnapshot.exists()) {
            // There's an existing thread - load it
            setupThreadListener(`${currentUser.uid}_${messageData.recipientId}_${messageData.propertyId}`, messageData.propertyId, messageData.recipientId);
            return;
          }
          
          // No existing thread - create one from this message
          const newThreadRef = ref(db, `messageThreads/${currentUser.uid}_${messageData.recipientId}_${messageData.propertyId}`);
          await push(newThreadRef, {
            ...messageData,
            direction: 'outgoing'
          });
          
          setupThreadListener(`${currentUser.uid}_${messageData.recipientId}_${messageData.propertyId}`, messageData.propertyId, messageData.recipientId);
          return;
        }
        
        // Message not found in either inbox or outbox
        setError("Message not found.");
        setLoading(false);
      } catch (err) {
        console.error("Error fetching message:", err);
        setError("Failed to load the message. Please try again later.");
        setLoading(false);
      }
    };
    
    findThread();
    
    // Clean up listeners on unmount
    return () => {
      // If we have an active listener, remove it
    };
  }, [currentUser, id]);
  
  // Setup a listener for the message thread
  const setupThreadListener = (threadId, propertyId, otherUserId) => {
    // First, load the property information
    const propertyRef = ref(db, `properties/${propertyId}`);
    get(propertyRef).then((snapshot) => {
      if (snapshot.exists()) {
        setProperty(snapshot.val());
      }
    }).catch((error) => {
      console.error("Error fetching property:", error);
    });
    
    // Then set up a listener for the thread
    const threadRef = ref(db, `messageThreads/${threadId}`);
    const unsubscribe = onValue(threadRef, (snapshot) => {
      if (snapshot.exists()) {
        const messages = [];
        snapshot.forEach((childSnapshot) => {
          messages.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        
        // Sort messages by timestamp
        messages.sort((a, b) => a.timestamp - b.timestamp);
        
        setThread({
          id: threadId,
          messages,
          propertyId,
          otherUserId
        });
      } else {
        setThread({
          id: threadId,
          messages: [],
          propertyId,
          otherUserId
        });
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Error loading thread:", error);
      setError("Failed to load the conversation. Please try again later.");
      setLoading(false);
    });
    
    return unsubscribe;
  };
  
  // Handle sending a reply
  const handleSendReply = async (e) => {
    e.preventDefault();
    
    if (!replyText.trim() || !thread || !currentUser) {
      return;
    }
    
    try {
      setSendingReply(true);
      
      const replyData = {
        content: replyText.trim(),
        timestamp: serverTimestamp(),
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email,
        direction: 'outgoing',
        propertyId: thread.propertyId,
        propertyTitle: property?.title || 'Property Inquiry',
        read: false
      };
      
      // Add the message to the thread
      const threadRef = ref(db, `messageThreads/${thread.id}`);
      await push(threadRef, replyData);
      
      // Also add to the recipient's inbox
      const recipientInboxRef = ref(db, `messages/${thread.otherUserId}`);
      await push(recipientInboxRef, {
        ...replyData,
        recipientId: thread.otherUserId,
        direction: 'incoming' // From the recipient's perspective, this is incoming
      });
      
      // And to the sender's outbox
      const senderOutboxRef = ref(db, `sentMessages/${currentUser.uid}`);
      await push(senderOutboxRef, {
        ...replyData,
        recipientId: thread.otherUserId
      });
      
      // Create a notification for the recipient
      const notificationsRef = ref(db, `notifications/${thread.otherUserId}`);
      await push(notificationsRef, {
        type: 'message',
        title: 'New Message',
        message: `${currentUser.displayName || currentUser.email} replied to your message about ${property?.title || 'a property'}`,
        timestamp: serverTimestamp(),
        read: false,
        link: `/messages`,
        propertyId: thread.propertyId
      });
      
      // Clear the input
      setReplyText('');
      
    } catch (err) {
      console.error("Error sending reply:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSendingReply(false);
    }
  };
  
  // Format date from timestamp
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = date.getTime() >= today.getTime();
    const isYesterday = date.getTime() >= yesterday.getTime() && date.getTime() < today.getTime();
    
    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar2 />
      
      <div className="flex-1 container mx-auto px-4 py-6 flex flex-col">
        <div className="mb-4">
          <button
            onClick={() => navigate('/messages')}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Back to Messages
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1 flex flex-col">
          {/* Property info header */}
          {property && (
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <img 
                    src={property.image || '/src/assets/placeholder-property.jpg'} 
                    alt={property.title}
                    className="h-12 w-12 object-cover rounded"
                  />
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-semibold">{property.title}</h2>
                  <p className="text-sm text-gray-600">{property.location}</p>
                  {property.status && (
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                      property.status === 'For Sale' 
                        ? 'bg-green-100 text-green-800' 
                        : property.status === 'For Rent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {property.status}
                    </span>
                  )}
                </div>
                <div className="ml-auto">
                  <Link 
                    to={`/property/${thread?.propertyId}`} 
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                  >
                    View Property
                  </Link>
                </div>
              </div>
            </div>
          )}
          
          {/* Message thread */}
          {loading ? (
            <div className="flex-1 flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="flex-1 p-8 text-center text-red-500">
              {error}
            </div>
          ) : thread && thread.messages.length === 0 ? (
            <div className="flex-1 p-8 text-center text-gray-500">
              <p>No messages in this conversation yet.</p>
            </div>
          ) : (
            <div className="flex-1 p-4 overflow-y-auto">
              {thread.messages.map((message, index) => (
                <div 
                  key={message.id} 
                  className={`flex mb-4 ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-3/4 rounded-lg p-3 ${
                      message.direction === 'outgoing' 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="text-sm">{message.content}</div>
                    <div className="text-xs text-right mt-1 opacity-70">
                      {formatDate(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
          
          {/* Reply form */}
          <div className="border-t p-4">
            <form onSubmit={handleSendReply} className="flex">
              <input
                type="text"
                placeholder="Type your message..."
                className="flex-1 border rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={loading || sendingReply}
              />
              <button
                type="submit"
                className={`bg-blue-600 text-white rounded-r-lg px-4 py-2 ${
                  loading || sendingReply || !replyText.trim() 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:bg-blue-700'
                }`}
                disabled={loading || sendingReply || !replyText.trim()}
              >
                {sendingReply ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageThread;