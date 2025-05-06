// src/firebase/notifications.js
import { db } from './config';
import { ref, push, update, get, remove, query, orderByChild, equalTo } from 'firebase/database';

// Add a new notification
export const addNotification = async (userId, notification) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    const newNotification = {
      ...notification,
      timestamp: Date.now(),
      read: false
    };
    await push(notificationsRef, newNotification);
    return true;
  } catch (error) {
    console.error("Error adding notification:", error);
    return false;
  }
};

// Add notification for new pending approval (for admins)
export const addPendingApprovalNotification = async (type, itemId, details) => {
  try {
    // Fetch all admin users
    const adminsRef = ref(db, 'admins');
    const adminsSnapshot = await get(adminsRef);
    
    if (adminsSnapshot.exists()) {
      const adminPromises = [];
      
      // For each admin, add a notification
      adminsSnapshot.forEach((childSnapshot) => {
        const adminId = childSnapshot.key;
        
        // Create notification based on type
        let notification = {
          type: 'system',
          read: false,
          timestamp: Date.now()
        };
        
        switch (type) {
          case 'property':
            notification.title = 'New Property Pending Approval';
            notification.message = `A new property "${details.title}" needs your approval.`;
            notification.link = '/admin/approval-management';
            break;
          case 'verification':
            notification.title = 'User Verification Request';
            notification.message = `User "${details.name || details.email}" has requested verification.`;
            notification.link = '/admin/approval-management?tab=verifications';
            break;
          case 'typeChange':
            notification.title = 'Account Type Change Request';
            notification.message = `User "${details.name || details.email}" wants to change account type to ${details.requestedType === 'owner' ? 'Homeowner' : 'Renter'}.`;
            notification.link = '/admin/approval-management?tab=userTypeChanges';
            break;
          default:
            notification.title = 'New Approval Request';
            notification.message = 'There is a new item pending your approval.';
            notification.link = '/admin/approval-management';
        }
        
        // Add notification for this admin
        const notificationsRef = ref(db, `notifications/${adminId}`);
        adminPromises.push(push(notificationsRef, notification));
      });
      
      // Wait for all notifications to be added
      await Promise.all(adminPromises);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error adding admin notifications:", error);
    return false;
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (userId, notificationId) => {
  try {
    const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
    await update(notificationRef, { read: true });
    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    const snapshot = await get(notificationsRef);
    
    if (snapshot.exists()) {
      const updates = {};
      snapshot.forEach((childSnapshot) => {
        updates[`${childSnapshot.key}/read`] = true;
      });
      
      await update(notificationsRef, updates);
    }
    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};

// Delete a notification
export const deleteNotification = async (userId, notificationId) => {
  try {
    const notificationRef = ref(db, `notifications/${userId}/${notificationId}`);
    await remove(notificationRef);
    return true;
  } catch (error) {
    console.error("Error deleting notification:", error);
    return false;
  }
};

// Get unread notifications count
export const getUnreadNotificationsCount = async (userId) => {
  try {
    const unreadQuery = query(
      ref(db, `notifications/${userId}`),
      orderByChild('read'),
      equalTo(false)
    );
    
    const snapshot = await get(unreadQuery);
    return snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
  } catch (error) {
    console.error("Error getting unread notifications count:", error);
    return 0;
  }
};

// Create a test notification (for development only)
export const createTestNotification = async (userId) => {
  try {
    const types = ['property', 'message', 'system'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    let notification = {
      type: randomType,
      timestamp: Date.now(),
      read: false
    };
    
    switch (randomType) {
      case 'property':
        notification.title = 'New Property Match';
        notification.message = 'A new property matching your search criteria is now available.';
        notification.link = '/properties';
        break;
      case 'message':
        notification.title = 'New Message Received';
        notification.message = 'You have received a new message regarding your inquiry.';
        notification.link = '/messages';
        break;
      case 'system':
        notification.title = 'Account Update';
        notification.message = 'Your account settings have been updated successfully.';
        notification.link = '/profile';
        break;
    }
    
    const notificationsRef = ref(db, `notifications/${userId}`);
    await push(notificationsRef, notification);
    
    return true;
  } catch (error) {
    console.error("Error creating test notification:", error);
    return false;
  }
};

// Generate sample notifications for testing
export const generateSampleNotifications = async (userId) => {
  try {
    const notificationSamples = [
      {
        type: 'property',
        title: 'New Property Listed',
        message: 'A new property matching your preferences has been listed in your area.',
        link: '/properties'
      },
      {
        type: 'property',
        title: 'Price Reduction',
        message: 'A property in your wishlist has had its price reduced by 10%.',
        link: '/wishlist'
      },
      {
        type: 'message',
        title: 'New Message from Owner',
        message: 'You have received a new message about your property inquiry.',
        link: '/messages'
      },
      {
        type: 'system',
        title: 'Verification Approved',
        message: 'Your account verification has been approved. You now have full access.',
        link: '/profile'
      },
      {
        type: 'system',
        title: 'Welcome to HomeWildHunt',
        message: 'Complete your profile to get personalized property recommendations.',
        link: '/profile'
      }
    ];
    
    // Create promises for all notification additions
    const promises = notificationSamples.map(async (sample, index) => {
      // Add random delay for timestamps to make them appear different
      const randomDelay = Math.floor(Math.random() * 3600000 * 48); // Random delay up to 48 hours
      const notification = {
        ...sample,
        timestamp: Date.now() - randomDelay,
        read: index > 2 // Make the first 3 unread
      };
      
      const notificationsRef = ref(db, `notifications/${userId}`);
      return push(notificationsRef, notification);
    });
    
    // Wait for all notifications to be added
    await Promise.all(promises);
    
    return notificationSamples.length;
  } catch (error) {
    console.error("Error generating sample notifications:", error);
    return 0;
  }
};

// Delete all notifications for a user
export const clearAllNotifications = async (userId) => {
  try {
    const notificationsRef = ref(db, `notifications/${userId}`);
    await remove(notificationsRef);
    return true;
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return false;
  }
};