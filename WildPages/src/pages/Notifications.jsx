// src/pages/Notifications.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import { ref, onValue, update, remove } from 'firebase/database';
import Navbar2 from "../components/navbar2";
import { markAllNotificationsAsRead, deleteNotification } from '../firebase/notifications';

const Notifications = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    // Fetch notifications from Firebase
    const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
    
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      setLoading(true);
      if (snapshot.exists()) {
        const notificationsData = [];
        
        snapshot.forEach((childSnapshot) => {
          notificationsData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });
        
        // Sort by timestamp (newest first)
        notificationsData.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(notificationsData);
      } else {
        setNotifications([]);
      }
      setLoading(false);
    });
    
    // Clean up listener on unmount
    return () => unsubscribe();
  }, [currentUser, navigate]);

  // Handle marking all notifications as read
  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;
    
    try {
      await markAllNotificationsAsRead(currentUser.uid);
      setSuccess("All notifications marked as read");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      setError("Failed to mark notifications as read. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle notification click - mark as read and navigate if needed
  const handleNotificationClick = async (notification) => {
    if (!notification.read) {
      // Mark as read
      try {
        const notificationRef = ref(db, `notifications/${currentUser.uid}/${notification.id}`);
        await update(notificationRef, { read: true });
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    }
    
    // Navigate based on notification type
    if (notification.link) {
      navigate(notification.link);
    }
  };

  // Handle notification deletion
  const handleDeleteNotification = async (event, notificationId) => {
    event.stopPropagation(); // Prevent parent click handler
    
    try {
      await deleteNotification(currentUser.uid, notificationId);
      setSuccess("Notification deleted");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error deleting notification:", error);
      setError("Failed to delete notification. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Handle clearing all notifications
  const handleClearAll = async () => {
    if (!currentUser || notifications.length === 0) return;
    
    try {
      const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
      await remove(notificationsRef);
      setSuccess("All notifications cleared");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error clearing notifications:", error);
      setError("Failed to clear notifications. Please try again.");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Format notification time
  const formatNotificationTime = (timestamp) => {
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

  return (
    <>
      <Navbar2 />
      
      <div className="max-w-4xl mx-auto pt-9 px-4 pb-10">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Notifications</h1>
          
          {notifications.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleMarkAllAsRead}
                className="px-4 py-2 bg-blue-100 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Mark all as read
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-100 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
              >
                Clear all
              </button>
            </div>
          )}
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
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {notifications.length > 0 ? (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      {/* Notification Type Icon */}
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${
                        notification.type === 'property' ? 'bg-green-100 text-green-500' :
                        notification.type === 'message' ? 'bg-blue-100 text-blue-500' :
                        notification.type === 'system' ? 'bg-purple-100 text-purple-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {notification.type === 'property' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                        )}
                        {notification.type === 'message' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        )}
                        {notification.type === 'system' && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      
                      {/* Notification Content */}
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            {notification.title}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {formatNotificationTime(notification.timestamp)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                        {notification.link && (
                          <div className="mt-2">
                            <span className="text-xs text-blue-600">
                              {notification.link.includes('/properties/') ? 'View Property' :
                               notification.link.includes('/profile') ? 'View Profile' :
                               notification.link.includes('/messages') ? 'View Messages' :
                               'View Details'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteNotification(e, notification.id)}
                        className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                        aria-label="Delete notification"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      
                      {/* Unread indicator */}
                      {!notification.read && (
                        <div className="ml-2 flex-shrink-0">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-500 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h2 className="text-xl font-medium text-gray-900 mb-2">No notifications yet</h2>
                <p className="text-gray-600 mb-4">
                  You're all caught up! We'll notify you when there are updates on your properties,
                  messages, or important system announcements.
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Return to Dashboard
                </button>
              </div>
            )}
          </>
        )}
        
        {/* Add Test Notification Button - for development only */}
        {process.env.NODE_ENV === 'development' && notifications.length === 0 && (
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Developer Tools</h3>
            <button
              onClick={async () => {
                // Import and call the generateSampleNotifications function
                const { generateSampleNotifications } = await import('../firebase/notifications');
                const count = await generateSampleNotifications(currentUser.uid);
                setSuccess(`Generated ${count} sample notifications for testing.`);
                setTimeout(() => setSuccess(null), 3000);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Generate Test Notifications
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Notifications;