// src/components/navbar2.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { logout } from '../firebase/auth';
import { db } from '../firebase/config';
import { ref, get, onValue, update, remove } from 'firebase/database';
import hlogo from "../assets/HomeLogo.png";
import profilePic from "../assets/Geralt.jpg";

const Navbar2 = ({ onLogoutClick }) => {
    const navigate = useNavigate();
    const { currentUser, isAdmin } = useAuth();
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [userType, setUserType] = useState('renter'); // Default to renter
    
    // Add notification states
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    
    // Add message states
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
    
    // Add admin pending counts
    const [pendingPropertiesCount, setPendingPropertiesCount] = useState(0);
    const [pendingVerificationsCount, setPendingVerificationsCount] = useState(0);
    const [pendingTypeChangesCount, setPendingTypeChangesCount] = useState(0);
    
    // Get user type from Firebase
    useEffect(() => {
        if (currentUser) {
            const fetchUserType = async () => {
                try {
                    const userRef = ref(db, `users/${currentUser.uid}`);
                    const snapshot = await get(userRef);
                    
                    if (snapshot.exists()) {
                        const userData = snapshot.val();
                        setUserType(userData.userType || 'renter');
                    }
                } catch (error) {
                    console.error("Error fetching user type:", error);
                }
            };
            
            fetchUserType();
        }
    }, [currentUser]);
    
    // Fetch notifications, messages and admin pending counts
    useEffect(() => {
        if (!currentUser) return;
        
        // Fetch user notifications
        const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
        
        const notificationsUnsubscribe = onValue(notificationsRef, (snapshot) => {
            if (snapshot.exists()) {
                const notificationsData = [];
                let unread = 0;
                
                snapshot.forEach((childSnapshot) => {
                    const notification = {
                        id: childSnapshot.key,
                        ...childSnapshot.val()
                    };
                    
                    notificationsData.push(notification);
                    
                    // Count unread notifications
                    if (!notification.read) {
                        unread++;
                    }
                });
                
                // Sort by timestamp (newest first)
                notificationsData.sort((a, b) => b.timestamp - a.timestamp);
                
                setNotifications(notificationsData);
                setUnreadCount(unread);
            } else {
                setNotifications([]);
                setUnreadCount(0);
            }
        });
        
        // Fetch unread messages count
        const messagesRef = ref(db, `messages/${currentUser.uid}`);
        
        const messagesUnsubscribe = onValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                let unreadMessages = 0;
                
                snapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    if (!message.read) {
                        unreadMessages++;
                    }
                });
                
                setUnreadMessagesCount(unreadMessages);
            } else {
                setUnreadMessagesCount(0);
            }
        });
        
        // Fetch admin-specific counts if user is admin
        let pendingPropertiesUnsubscribe = () => {};
        let pendingVerificationsUnsubscribe = () => {};
        let pendingTypeChangesUnsubscribe = () => {};
        
        if (isAdmin) {
            // Fetch pending properties count
            const pendingPropertiesRef = ref(db, 'pendingProperties');
            pendingPropertiesUnsubscribe = onValue(pendingPropertiesRef, (snapshot) => {
                setPendingPropertiesCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
            });
            
            // Fetch pending verifications count
            const usersRef = ref(db, 'users');
            pendingVerificationsUnsubscribe = onValue(usersRef, (snapshot) => {
                if (snapshot.exists()) {
                    let count = 0;
                    snapshot.forEach((childSnapshot) => {
                        const user = childSnapshot.val();
                        if (user.verificationStatus === 'pending' && 
                            user.verificationDocuments && 
                            user.verificationDocuments.length > 0) {
                            count++;
                        }
                    });
                    setPendingVerificationsCount(count);
                } else {
                    setPendingVerificationsCount(0);
                }
            });
            
            // Fetch pending user type changes count
            const pendingTypeChangesRef = ref(db, 'pendingUserTypeChanges');
            pendingTypeChangesUnsubscribe = onValue(pendingTypeChangesRef, (snapshot) => {
                setPendingTypeChangesCount(snapshot.exists() ? Object.keys(snapshot.val()).length : 0);
            });
        }
        
        // Clean up listeners on unmount
        return () => {
            notificationsUnsubscribe();
            messagesUnsubscribe();
            if (isAdmin) {
                pendingPropertiesUnsubscribe();
                pendingVerificationsUnsubscribe();
                pendingTypeChangesUnsubscribe();
            }
        };
    }, [currentUser, isAdmin]);
    
    // Get total pending count for admin badge
    const getTotalPendingCount = () => {
        return pendingPropertiesCount + pendingVerificationsCount + pendingTypeChangesCount;
    };
    
    // Handle external logout click if provided
    const handleLogoutClick = () => {
        if (onLogoutClick) {
            onLogoutClick();
        } else {
            setShowLogoutModal(true);
        }
    };

    // Handle logout after confirmation
    const handleLogoutConfirm = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setShowLogoutModal(false);
        }
    };

    // Cancel logout
    const handleLogoutCancel = () => {
        setShowLogoutModal(false);
    };
    
    // Toggle profile dropdown
    const toggleProfileMenu = () => {
        setShowProfileMenu(!showProfileMenu);
        
        // Close notifications dropdown if open
        if (showNotifications) {
            setShowNotifications(false);
        }
    };
    
    // Toggle notifications dropdown
    const toggleNotifications = () => {
        setShowNotifications(!showNotifications);
        
        // Close profile menu if open
        if (showProfileMenu) {
            setShowProfileMenu(false);
        }
    };
    
    // Mark notification as read
    const markNotificationAsRead = async (notificationId) => {
        if (!currentUser) return;
        
        try {
            const notificationRef = ref(db, `notifications/${currentUser.uid}/${notificationId}`);
            await update(notificationRef, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };
    
    // Mark all notifications as read
    const markAllAsRead = async () => {
        if (!currentUser || notifications.length === 0) return;
        
        try {
            const updates = {};
            notifications.forEach(notification => {
                if (!notification.read) {
                    updates[`${notification.id}/read`] = true;
                }
            });
            
            if (Object.keys(updates).length > 0) {
                const userNotificationsRef = ref(db, `notifications/${currentUser.uid}`);
                await update(userNotificationsRef, updates);
            }
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };
    
    // Clear all notifications
    const clearAllNotifications = async () => {
        if (!currentUser || notifications.length === 0) return;
        
        try {
            const notificationsRef = ref(db, `notifications/${currentUser.uid}`);
            await remove(notificationsRef);
        } catch (error) {
            console.error("Error clearing notifications:", error);
        }
    };
    
    // Handle notification click - mark as read and navigate if needed
    const handleNotificationClick = async (notification) => {
        if (!notification.read) {
            await markNotificationAsRead(notification.id);
        }
        
        // Close the dropdown
        setShowNotifications(false);
        
        // Navigate to the relevant page if link provided
        if (notification.link) {
            navigate(notification.link);
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
    
    // Handle My Properties navigation based on user type
    const handleMyPropertiesClick = () => {
        if (userType === 'owner') {
            navigate('/homeowner/my-listings');
        } else {
            navigate('/my-properties');
        }
        setShowProfileMenu(false);
    };
    
    // Handle Messages navigation
    const handleMessagesClick = () => {
        navigate('/messages');
        setShowProfileMenu(false);
    };
    
    return (
        <>
            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full">
                        <div className="text-center mb-6">
                            <div className="text-6xl mb-4">😢</div>
                            <h2 className="text-xl font-bold mb-2">Are you sure you want to logout?</h2>
                            <p className="text-gray-600">Are you done using me?</p>
                        </div>
                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleLogoutCancel}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                            >
                                Stay
                            </button>
                            <button
                                onClick={handleLogoutConfirm}
                                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <nav className="sticky top-0 z-50 py-3 bg-white backdrop-blur-lg border-b border-gray-200 shadow-sm">
                <div className="container px-4 mx-auto relative lg:text-sm">
                    <div className="flex justify-between items-center">
                        {/* Logo and Brand */}
                        <div className="flex items-center">
                            <Link to="/" className="flex items-center">
                                <img className="h-10 w-12 mr-2" src={hlogo} alt="Logo" />
                                <span className="text-2xl font-bold tracking-tight">HomeWildHunt</span>
                            </Link>
                        </div>
                        
                        {/* Main Navigation */}
                        <div className="hidden lg:flex items-center space-x-1">
                            <Link to="/dashboard" className="px-3 py-2 rounded-md text-gray-700 font-medium hover:bg-gray-100 transition-colors">
                                Overview
                            </Link>
                        </div>
                        
                        {/* Right Side Menu */}
                        <div className="flex items-center space-x-4">
                            {/* Enhanced Notification Icon with Dropdown */}
                            <div className="relative">
                                <button 
                                    onClick={toggleNotifications}
                                    className="px-3 py-2 rounded-md text-gray-700 font-medium hover:bg-gray-100 transition-colors"
                                >
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                        {/* User notification badge */}
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                        
                                        {/* Admin pending items badge */}
                                        {isAdmin && getTotalPendingCount() > 0 && unreadCount === 0 && (
                                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                                {getTotalPendingCount() > 9 ? '9+' : getTotalPendingCount()}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                
                                {/* Notifications Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200 max-h-96 overflow-y-auto">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-semibold">Notifications</h3>
                                                <div className="flex space-x-2">
                                                    {unreadCount > 0 && (
                                                        <button 
                                                            onClick={markAllAsRead}
                                                            className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer"
                                                        >
                                                            Mark all as read
                                                        </button>
                                                    )}
                                                    {notifications.length > 0 && (
                                                        <button 
                                                            onClick={clearAllNotifications}
                                                            className="text-xs text-red-600 hover:text-red-800 cursor-pointer"
                                                        >
                                                            Clear all
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Admin pending items section */}
                                        {isAdmin && getTotalPendingCount() > 0 && (
                                            <div className="bg-yellow-50 px-4 py-3 border-b border-gray-100">
                                                <h4 className="text-sm font-medium text-yellow-800 mb-2">Pending Approvals</h4>
                                                
                                                {pendingPropertiesCount > 0 && (
                                                    <div 
                                                        onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate('/admin/approval-management');
                                                        }}
                                                        className="flex items-center justify-between py-1 cursor-pointer hover:bg-yellow-100 px-2 -mx-2 rounded"
                                                    >
                                                        <span className="text-sm text-yellow-800">Pending Properties</span>
                                                        <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                            {pendingPropertiesCount}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {pendingVerificationsCount > 0 && (
                                                    <div 
                                                        onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate('/admin/approval-management?tab=verifications');
                                                        }}
                                                        className="flex items-center justify-between py-1 cursor-pointer hover:bg-yellow-100 px-2 -mx-2 rounded"
                                                    >
                                                        <span className="text-sm text-yellow-800">Pending Verifications</span>
                                                        <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                            {pendingVerificationsCount}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                {pendingTypeChangesCount > 0 && (
                                                    <div 
                                                        onClick={() => {
                                                            setShowNotifications(false);
                                                            navigate('/admin/approval-management?tab=userTypeChanges');
                                                        }}
                                                        className="flex items-center justify-between py-1 cursor-pointer hover:bg-yellow-100 px-2 -mx-2 rounded"
                                                    >
                                                        <span className="text-sm text-yellow-800">Account Type Changes</span>
                                                        <span className="bg-yellow-200 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                                                            {pendingTypeChangesCount}
                                                        </span>
                                                    </div>
                                                )}
                                                
                                                <div className="mt-2 text-xs text-yellow-700">
                                                    <Link 
                                                        to="/admin/approval-management"
                                                        onClick={() => setShowNotifications(false)}
                                                        className="font-medium hover:underline"
                                                    >
                                                        Go to Approval Management →
                                                    </Link>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* User notifications */}
                                        {notifications.length > 0 ? (
                                            <div>
                                                {notifications.map((notification) => (
                                                    <div 
                                                        key={notification.id}
                                                        onClick={() => handleNotificationClick(notification)}
                                                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                                                    >
                                                        <div className="flex items-start">
                                                            {/* Notification Type Icon */}
                                                            <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                                                                notification.type === 'property' ? 'bg-green-100 text-green-500' :
                                                                notification.type === 'message' ? 'bg-blue-100 text-blue-500' :
                                                                notification.type === 'system' ? 'bg-purple-100 text-purple-500' :
                                                                'bg-gray-100 text-gray-500'
                                                            }`}>
                                                                {notification.type === 'property' && (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                                                    </svg>
                                                                )}
                                                                {notification.type === 'message' && (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                                                    </svg>
                                                                )}
                                                                {notification.type === 'system' && (
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Notification Content */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {notification.title}
                                                                </p>
                                                                <p className="text-sm text-gray-500 truncate">
                                                                    {notification.message}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    {formatNotificationTime(notification.timestamp)}
                                                                </p>
                                                            </div>
                                                            
                                                            {/* Unread Indicator */}
                                                            {!notification.read && (
                                                                <div className="ml-2 flex-shrink-0">
                                                                    <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                <div className="px-4 py-2 text-center border-t border-gray-100">
                                                    <Link 
                                                        to="/notifications" 
                                                        className="text-sm text-blue-600 hover:text-blue-800"
                                                        onClick={() => setShowNotifications(false)}
                                                    >
                                                        View all notifications
                                                    </Link>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {/* Show empty state only if there are no notifications AND no admin pending items */}
                                                {!(isAdmin && getTotalPendingCount() > 0) && (
                                                    <div className="px-4 py-6 text-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                        </svg>
                                                        <p className="text-gray-500 text-sm">No notifications yet</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            {/* Profile Menu Dropdown */}
                            <div className="relative">
                                <div 
                                    className="flex items-center space-x-2 cursor-pointer px-3 py-2 rounded-md hover:bg-gray-100 transition-colors"
                                    onClick={toggleProfileMenu}
                                >
                                    <div className="flex items-center">
                                        {currentUser?.photoURL ? (
                                            <img 
                                                className="h-8 w-8 rounded-full object-cover border-2 border-gray-200" 
                                                src={currentUser.photoURL} 
                                                alt="Profile" 
                                            />
                                        ) : (
                                            <img 
                                                className="h-8 w-8 rounded-full object-cover border-2 border-gray-200" 
                                                src={profilePic} 
                                                alt="Profile" 
                                            />
                                        )}
                                        <div className="ml-2 flex flex-col">
                                            <span className="text-sm font-medium">
                                                {currentUser?.displayName || currentUser?.email || 'User'}
                                            </span>
                                            {isAdmin && (
                                                <span className="text-xs text-blue-600 font-medium">
                                                    Admin
                                                </span>
                                            )}
                                        </div>
                                        <svg 
                                            xmlns="http://www.w3.org/2000/svg" 
                                            className={`h-5 w-5 ml-1 text-gray-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} 
                                            viewBox="0 0 20 20" 
                                            fill="currentColor"
                                        >
                                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                </div>
                                
                                {/* Profile Dropdown Menu - Updated with Messages link */}
                                {showProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                                        {/* Updated profile link based on user role */}
                                        {isAdmin ? (
                                            <Link to="/admin/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                Your Profile
                                            </Link>
                                        ) : (
                                            <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                                Your Profile
                                            </Link>
                                        )}
                                        
                                        {/* My Properties link */}
                                        {!isAdmin && (
                                            <button
                                                onClick={handleMyPropertiesClick}
                                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                                My Properties
                                            </button>
                                        )}
                                        
                                        {/* Messages link - Added for all user types */}
                                        <button
                                            onClick={handleMessagesClick}
                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                            Messages
                                            {unreadMessagesCount > 0 && (
                                                <span className="ml-2 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                    {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                                                </span>
                                            )}
                                        </button>
                                        
                                        <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                                            Settings
                                        </Link>
                                        <div className="border-t border-gray-100 my-1"></div>
                                        <button
                                            onClick={handleLogoutClick}
                                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                        >
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Mobile Menu Button - Hidden on larger screens */}
                        <div className="lg:hidden">
                            <button className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100">
                                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>   
            </nav>
        </>
    );
};

export default Navbar2;