// src/pages/AdminProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase/config';
import { ref as dbRef, get, update } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../context/AuthContext';
import Navbar from "../components/navbar2";
import { logout } from '../firebase/auth';
// Import motion component for transitions
import { motion } from 'framer-motion';

const AdminProfile = () => {
  const { currentUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // Fade transition variant
  const fadeVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 }
  };
  
  // Admin profile state
  const [profile, setProfile] = useState({
    displayName: '',
    email: '',
    phone: '',
    role: 'admin',
    department: '',
    position: 'System Administrator',
    joinDate: '',
    bio: '',
    accessLevel: 'full', // 'full', 'limited', etc.
    adminPreferences: {
      notifications: true,
      emailAlerts: true,
      darkMode: false
    }
  });

  // Fetch admin profile data
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) {
        navigate('/login');
        return;
      }
      
      // Ensure only admin users can access this page
      if (!isAdmin) {
        navigate('/dashboard');
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch profile from Firebase
        const userRef = dbRef(db, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          
          setProfile({
            ...profile,
            ...userData,
            displayName: userData.displayName || currentUser.displayName || '',
            email: userData.email || currentUser.email || '',
            phone: userData.phone || '',
            role: userData.role || 'admin',
            department: userData.department || '',
            position: userData.position || 'System Administrator',
            joinDate: userData.joinDate || '',
            bio: userData.bio || '',
            accessLevel: userData.accessLevel || 'full',
            adminPreferences: userData.adminPreferences || profile.adminPreferences
          });
          
          // Set profile image if exists
          if (userData.photoURL) {
            setImagePreview(userData.photoURL);
          } else if (currentUser.photoURL) {
            setImagePreview(currentUser.photoURL);
          }
        } else {
          // If no profile exists, create one with default values
          setProfile({
            ...profile,
            displayName: currentUser.displayName || '',
            email: currentUser.email || ''
          });
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [currentUser, navigate, isAdmin]);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested properties like adminPreferences
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setProfile({
        ...profile,
        [parent]: {
          ...profile[parent],
          [child]: value
        }
      });
    } else {
      setProfile({
        ...profile,
        [name]: value
      });
    }
  };
  
  // Handle toggle changes for boolean preferences
  const handleToggleChange = (name) => {
    const [parent, child] = name.split('.');
    setProfile({
      ...profile,
      [parent]: {
        ...profile[parent],
        [child]: !profile[parent][child]
      }
    });
  };
  
  // Handle profile image selection
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check file size (limit to 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  // Upload profile image to Firebase Storage
  const uploadProfileImage = async () => {
    if (!profileImage) return null;
    
    const imageRef = storageRef(storage, `profile_images/${currentUser.uid}/${Date.now()}-${profileImage.name}`);
    
    try {
      const snapshot = await uploadBytes(imageRef, profileImage);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw err;
    }
  };
  
  // Save profile to Firebase
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Validate required fields
      if (!profile.displayName || !profile.email) {
        throw new Error('Name and email are required');
      }
      
      let photoURL = profile.photoURL;
      
      // Upload profile image if changed
      if (profileImage) {
        photoURL = await uploadProfileImage();
      }
      
      // Create updated profile object
      const updatedProfile = {
        ...profile,
        photoURL,
        updatedAt: new Date().toISOString()
      };
      
      // Save to Firebase
      const userRef = dbRef(db, `users/${currentUser.uid}`);
      await update(userRef, updatedProfile);
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Show logout confirmation modal
  const handleLogoutClick = () => {
    setShowLogoutModal(true);
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
  
  if (loading) {
    return (
      <>
        <Navbar onLogoutClick={handleLogoutClick} />
        <div className="max-w-4xl mx-auto pt-9 px-4 flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }
  
  return (
    <>
      <Navbar onLogoutClick={handleLogoutClick} />
      <motion.div 
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeVariants}
        transition={{ duration: 0.5 }}
        className="min-h-screen pb-12 bg-gray-50"
      >
        {/* Logout Confirmation Modal */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-lg p-8 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">😢</div>
                <h2 className="text-xl font-bold mb-2">Are you sure you want to logout?</h2>
                <p className="text-gray-600">Are you done using me?</p>
              </div>
              <div className="flex justify-center space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogoutCancel}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Stay
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleLogoutConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Yes, Logout
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
        
        <div className="max-w-4xl mx-auto pt-9 px-4">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin Profile</h1>
              <p className="text-gray-600">Manage your admin account information and preferences</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/admin/dashboard')}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Back to Dashboard
            </motion.button>
          </div>
          
          {/* Success message */}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-green-50 border-l-4 border-green-500 p-4 mb-6"
            >
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">
                    Profile updated successfully!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* Error message */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border-l-4 border-red-500 p-4 mb-6"
            >
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
            </motion.div>
          )}
          
          {/* Admin Profile Form */}
          <form onSubmit={handleSaveProfile}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
            >
              {/* Profile Header */}
              <div className="bg-blue-50 p-6 border-b border-blue-100">
                <div className="flex flex-col md:flex-row items-start md:items-center">
                  <div className="relative mb-4 md:mb-0 md:mr-6">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-200">
                      {imagePreview ? (
                        <img
                          src={imagePreview}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-gray-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <label htmlFor="profile-image" className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full cursor-pointer hover:bg-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">{profile.displayName || 'Admin Name'}</h2>
                    <div className="text-gray-500">{profile.email}</div>
                    <div className="mt-1 flex items-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {profile.position || 'Administrator'}
                      </span>
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Access: {profile.accessLevel === 'full' ? 'Full' : 'Limited'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Admin Information */}
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Admin Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name*</label>
                    <input
                      type="text"
                      name="displayName"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profile.displayName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address*</label>
                    <input
                      type="email"
                      name="email"
                      className="w-full p-2 border border-gray-300 rounded-md bg-gray-50"
                      value={profile.email}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profile.phone}
                      onChange={handleInputChange}
                      placeholder="+63 XXX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      name="department"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profile.department}
                      onChange={handleInputChange}
                      placeholder="e.g. IT, Sales, Management"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      name="position"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profile.position}
                      onChange={handleInputChange}
                      placeholder="e.g. System Administrator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                    <input
                      type="date"
                      name="joinDate"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={profile.joinDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    name="bio"
                    rows="3"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={profile.bio}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself and your role as an administrator"
                  ></textarea>
                </div>
              </div>
              
              {/* Admin Preferences */}
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4">Admin Preferences</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Receive In-App Notifications</h4>
                      <p className="text-sm text-gray-500">Get notified about new properties, user activities, etc.</p>
                    </div>
                    <div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={profile.adminPreferences.notifications}
                          onChange={() => handleToggleChange('adminPreferences.notifications')}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition ${profile.adminPreferences.notifications ? 'bg-blue-500' : 'bg-gray-300'}`}>
                          <div className={`transform transition-transform w-4 h-4 bg-white rounded-full mt-1 ${profile.adminPreferences.notifications ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Alerts</h4>
                      <p className="text-sm text-gray-500">Receive email notifications for important events</p>
                    </div>
                    <div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={profile.adminPreferences.emailAlerts}
                          onChange={() => handleToggleChange('adminPreferences.emailAlerts')}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition ${profile.adminPreferences.emailAlerts ? 'bg-blue-500' : 'bg-gray-300'}`}>
                          <div className={`transform transition-transform w-4 h-4 bg-white rounded-full mt-1 ${profile.adminPreferences.emailAlerts ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Dark Mode</h4>
                      <p className="text-sm text-gray-500">Use dark theme for the admin dashboard</p>
                    </div>
                    <div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={profile.adminPreferences.darkMode}
                          onChange={() => handleToggleChange('adminPreferences.darkMode')}
                          className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition ${profile.adminPreferences.darkMode ? 'bg-blue-500' : 'bg-gray-300'}`}>
                          <div className={`transform transition-transform w-4 h-4 bg-white rounded-full mt-1 ${profile.adminPreferences.darkMode ? 'translate-x-6' : 'translate-x-1'}`}></div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-md">
                  <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-yellow-800">Admin Account Security</h4>
                      <p className="text-sm text-yellow-600 mt-1">
                        As an administrator, you have access to sensitive data and system controls. Please ensure you use a strong password and enable two-factor authentication when available.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Activity Log */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white rounded-lg shadow-md overflow-hidden mb-6"
            >
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                
                <div className="space-y-4">
                  {/* Example activity entries - would be dynamically generated */}
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex"
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Added new property: Luxury Condo in Cebu City</div>
                      <div className="text-xs text-gray-500">May 2, 2025 - 10:30 AM</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex"
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Approved user verification: user@example.com</div>
                      <div className="text-xs text-gray-500">May 1, 2025 - 3:45 PM</div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex"
                  >
                    <div className="flex-shrink-0 mr-3">
                      <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium">Updated system settings: Email configurations</div>
                      <div className="text-xs text-gray-500">April 30, 2025 - 11:20 AM</div>
                    </div>
                  </motion.div>
                </div>
                
                <div className="mt-4 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                  >
                    View All Activity →
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className={`px-6 py-3 rounded-md ${
                  saving 
                    ? 'bg-blue-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
                disabled={saving}
              >
                {saving ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  'Save Profile'
                )}
              </motion.button>
            </div>
          </form>
        </div>
      </motion.div>
    </>
  );
};

export default AdminProfile;