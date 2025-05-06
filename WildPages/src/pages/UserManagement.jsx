// src/pages/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebase/config';
import { ref, get, update, remove, set } from 'firebase/database';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import Navbar2 from "../components/navbar2";
import { Link } from 'react-router-dom';
import { addNotification } from '../firebase/notifications';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [pendingVerifications, setPendingVerifications] = useState([]);
  const [viewingDocuments, setViewingDocuments] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // States for confirmation dialogs
  const [showVerifyConfirm, setShowVerifyConfirm] = useState(false);
  const [showUnverifyConfirm, setShowUnverifyConfirm] = useState(false);
  const [userToModify, setUserToModify] = useState(null);
  
  // Check admin permission
  useEffect(() => {
    if (!currentUser || !isAdmin) {
      navigate('/login');
      return;
    }
  }, [currentUser, isAdmin, navigate]);
  
  // Fetch users from Firebase
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        
        // Fetch user data from Firebase
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        
        if (snapshot.exists()) {
          const usersData = [];
          const pendingVerificationUsers = [];
          
          snapshot.forEach((childSnapshot) => {
            const userData = {
              id: childSnapshot.key,
              ...childSnapshot.val()
            };
            
            usersData.push(userData);
            
            // Check if user has pending verification
            if (userData.verificationStatus === 'pending' && 
                userData.verificationDocuments && 
                userData.verificationDocuments.length > 0) {
              pendingVerificationUsers.push(userData);
            }
          });
          
          setUsers(usersData);
          setPendingVerifications(pendingVerificationUsers);
        } else {
          setUsers([]);
          setPendingVerifications([]);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);
  
  // Function to delete verification documents from storage
  const deleteVerificationDocuments = async (user) => {
    if (!user.verificationDocuments || user.verificationDocuments.length === 0) {
      return;
    }
    
    try {
      const docsToDelete = [...user.verificationDocuments];
      
      for (const doc of docsToDelete) {
        if (doc.url) {
          // Extract the storage path from the URL
          // Assuming URL is in format: http://localhost:5000/uploads/...
          // or direct Firebase storage URL
          let storagePath = doc.url;
          
          if (storagePath.startsWith('http://localhost:5000')) {
            storagePath = storagePath.replace('http://localhost:5000', '');
          }
          
          if (storagePath.startsWith('/uploads/')) {
            // Remove the /uploads/ prefix to get the actual storage path
            storagePath = storagePath.replace('/uploads/', '');
            const fileRef = storageRef(storage, storagePath);
            await deleteObject(fileRef);
          } else if (storagePath.startsWith('https://firebasestorage.googleapis.com')) {
            // For direct Firebase storage URLs, we need to extract the path differently
            // This is a simplified example - you might need to adjust based on your actual URL format
            const fileRef = storageRef(storage, storagePath);
            await deleteObject(fileRef);
          }
        }
      }
      
      // Clear the verificationDocuments in the database
      await set(ref(db, `users/${user.id}/verificationDocuments`), null);
      
      console.log('Verification documents deleted successfully');
      return true;
    } catch (err) {
      console.error('Error deleting verification documents:', err);
      return false;
    }
  };
  
  // Toggle admin status
  const toggleAdminStatus = async (userId, isCurrentlyAdmin) => {
    try {
      setActionLoading(userId);
      const adminRef = ref(db, `admins/${userId}`);
      
      if (isCurrentlyAdmin) {
        // Remove admin status
        await remove(adminRef);
        
        // Send notification about admin status removal
        await addNotification(userId, {
          type: 'system',
          title: 'Admin Status Removed',
          message: 'Your administrator privileges have been removed.',
          link: '/dashboard'
        });
        
      } else {
        // Add admin status
        await update(adminRef, {
          createdAt: new Date().toISOString()
        });
        
        // Send notification about new admin status
        await addNotification(userId, {
          type: 'system',
          title: 'Admin Status Granted',
          message: 'You have been granted administrator privileges.',
          link: '/dashboard'
        });
      }
      
      // Update local state
      setUsers(users.map(user => {
        if (user.id === userId) {
          return { ...user, isAdmin: !isCurrentlyAdmin };
        }
        return user;
      }));
      
      setSuccess('Admin status updated successfully');
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error updating admin status:', err);
      setError('Failed to update admin status. Please try again.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Verify a user
  const handleVerifyUser = async (user) => {
    try {
      setActionLoading(user.id);
      
      // Update user verification status
      await set(ref(db, `users/${user.id}/verificationStatus`), 'verified');
      
      // Update verification documents status
      if (user.verificationDocuments && user.verificationDocuments.length > 0) {
        const verificationDocuments = [...user.verificationDocuments];
        verificationDocuments.forEach(doc => {
          doc.status = 'verified';
        });
        
        await set(ref(db, `users/${user.id}/verificationDocuments`), verificationDocuments);
      }
      
      // Update local state
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return { 
            ...u, 
            verificationStatus: 'verified',
            verificationDocuments: u.verificationDocuments?.map(doc => ({
              ...doc,
              status: 'verified'
            }))
          };
        }
        return u;
      }));
      
      // Remove from pending verifications
      setPendingVerifications(pendingVerifications.filter(u => u.id !== user.id));
      
      // Send notification to the user
      await addNotification(user.id, {
        type: 'system',
        title: 'Verification Approved',
        message: 'Congratulations! Your account has been verified. You now have full access to all features.',
        link: '/profile'
      });
      
      setSuccess(`User "${user.displayName || user.email}" has been verified successfully`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset user to modify and hide confirmation
      setUserToModify(null);
      setShowVerifyConfirm(false);
      
    } catch (err) {
      console.error('Error verifying user:', err);
      setError(`Failed to verify user: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Set user to unverified
  const handleUnverifyUser = async (user) => {
    try {
      setActionLoading(user.id);
      
      // Delete verification documents from storage
      await deleteVerificationDocuments(user);
      
      // Update user verification status
      await set(ref(db, `users/${user.id}/verificationStatus`), 'unverified');
      
      // Update local state
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return { 
            ...u, 
            verificationStatus: 'unverified',
            verificationDocuments: null
          };
        }
        return u;
      }));
      
      // Send notification to the user
      await addNotification(user.id, {
        type: 'system',
        title: 'Verification Status Changed',
        message: 'Your account verification status has been changed to unverified. Your verification documents have been deleted.',
        link: '/profile'
      });
      
      setSuccess(`User "${user.displayName || user.email}" has been set to unverified and documents deleted`);
      setTimeout(() => setSuccess(null), 3000);
      
      // Reset user to modify and hide confirmation
      setUserToModify(null);
      setShowUnverifyConfirm(false);
      
      // If currently viewing documents of this user, close the modal
      if (viewingDocuments && viewingDocuments.id === user.id) {
        setViewingDocuments(null);
      }
      
    } catch (err) {
      console.error('Error unverifying user:', err);
      setError(`Failed to change verification status: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Reject a user verification
  const handleRejectVerification = async (user) => {
    try {
      setActionLoading(user.id);
      
      // Delete verification documents from storage
      await deleteVerificationDocuments(user);
      
      // Update user verification status
      await set(ref(db, `users/${user.id}/verificationStatus`), 'unverified');
      
      // Update local state
      setUsers(users.map(u => {
        if (u.id === user.id) {
          return { 
            ...u, 
            verificationStatus: 'unverified',
            verificationDocuments: null
          };
        }
        return u;
      }));
      
      // Remove from pending verifications
      setPendingVerifications(pendingVerifications.filter(u => u.id !== user.id));
      
      // Send notification to the user
      await addNotification(user.id, {
        type: 'system',
        title: 'Verification Rejected',
        message: 'Your verification request was not approved. Your documents have been deleted. Please submit new verification documents if you wish to try again.',
        link: '/profile'
      });
      
      setSuccess(`Verification for "${user.displayName || user.email}" has been rejected and documents deleted`);
      setTimeout(() => setSuccess(null), 3000);
      
      // If currently viewing documents of this user, close the modal
      if (viewingDocuments && viewingDocuments.id === user.id) {
        setViewingDocuments(null);
      }
      
    } catch (err) {
      console.error('Error rejecting verification:', err);
      setError(`Failed to reject verification: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setActionLoading(null);
    }
  };
  
  // Show verification confirmation dialog
  const confirmVerifyUser = (user) => {
    setUserToModify(user);
    setShowVerifyConfirm(true);
  };
  
  // Show unverification confirmation dialog
  const confirmUnverifyUser = (user) => {
    setUserToModify(user);
    setShowUnverifyConfirm(true);
  };
  
  // Click handler for verification status
  const handleVerificationStatusClick = (user) => {
    if (user.verificationStatus === 'verified') {
      confirmUnverifyUser(user);
    } else if (user.verificationStatus === 'unverified') {
      confirmVerifyUser(user);
    }
    // If pending, do nothing (already handled by the pending tab)
  };
  
  // Filter users based on active tab
  const getFilteredUsers = () => {
    if (activeTab === 'all') {
      return users;
    } else if (activeTab === 'homeowners') {
      return users.filter(user => user.userType === 'owner');
    } else if (activeTab === 'renters') {
      return users.filter(user => user.userType === 'renter');
    } else if (activeTab === 'pending') {
      return pendingVerifications;
    }
    return users;
  };
  
  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  // Helper function to get proper document URL
  const getFullUrl = (url) => {
    if (!url) return '/src/assets/placeholder-property.jpg';
    
    // If it's already a full URL (starting with http), return it as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // Otherwise, prepend the server URL to make it a complete URL
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
          <h1 className="text-3xl font-bold mb-2">User Management</h1>
          <p className="text-gray-600">View and manage user accounts, permissions, and verification requests.</p>
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
        
        {/* Error state */}
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
        {!loading && !error && (
          <div className="mb-6">
            <div className="sm:hidden">
              <select
                className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value)}
              >
                <option value="all">All Users ({users.length})</option>
                <option value="homeowners">Homeowners ({users.filter(user => user.userType === 'owner').length})</option>
                <option value="renters">Renters ({users.filter(user => user.userType === 'renter').length})</option>
                <option value="pending">Pending Verifications ({pendingVerifications.length})</option>
              </select>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex" aria-label="Tabs">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'all'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    All Users ({users.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('homeowners')}
                    className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'homeowners'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Homeowners ({users.filter(user => user.userType === 'owner').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('renters')}
                    className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'renters'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Renters ({users.filter(user => user.userType === 'renter').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`w-1/4 py-4 px-1 text-center border-b-2 font-medium text-sm ${
                      activeTab === 'pending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Pending Verifications ({pendingVerifications.length})
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
        
        {/* Users table */}
{!loading && !error && (
  <>
    {getFilteredUsers().length === 0 ? (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <h3 className="text-xl font-medium text-gray-900 mb-2">No users found</h3>
        <p className="text-gray-500">
          {activeTab === 'all' && "There are no registered users in the database yet."}
          {activeTab === 'homeowners' && "There are no homeowners registered yet."}
          {activeTab === 'renters' && "There are no renters registered yet."}
          {activeTab === 'pending' && "There are no pending verification requests."}
        </p>
      </div>
    ) : (
      <>
        <div className="mb-4">
          <p className="text-gray-600">
            {activeTab === 'all' && `Total users: ${getFilteredUsers().length}`}
            {activeTab === 'homeowners' && `Total homeowners: ${getFilteredUsers().length}`}
            {activeTab === 'renters' && `Total renters: ${getFilteredUsers().length}`}
            {activeTab === 'pending' && `Pending verification requests: ${getFilteredUsers().length}`}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredUsers().map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {user.photoURL ? (
                            <img 
                              className="h-10 w-10 rounded-full object-cover" 
                              src={getFullUrl(user.photoURL)} 
                              alt={user.displayName || user.email}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || 'No display name'}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {user.id.substring(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.userType === 'owner' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {user.userType === 'owner' ? 'Homeowner' : 'Renter'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.verificationStatus !== 'pending' ? (
                          <button
                            onClick={() => handleVerificationStatusClick(user)}
                            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.verificationStatus === 'verified' 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                            }`}
                          >
                            {user.verificationStatus === 'verified' 
                              ? 'Verified' 
                              : 'Unverified'
                            }
                          </button>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                        {user.verificationDocuments && user.verificationDocuments.length > 0 && (
                          <button
                            onClick={() => setViewingDocuments(user)}
                            className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                          >
                            View Docs
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.isAdmin || user.email === 'admin12345@yahoo.com'
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.isAdmin || user.email === 'admin12345@yahoo.com' ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {activeTab === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerifyUser(user)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === user.id ? 'Processing...' : 'Verify'}
                            </button>
                            <button
                              onClick={() => handleRejectVerification(user)}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {actionLoading === user.id ? 'Processing...' : 'Reject'}
                            </button>
                          </>
                        )}
                        {activeTab !== 'pending' && (
                          <button
                            onClick={() => toggleAdminStatus(user.id, user.isAdmin || user.email === 'admin12345@yahoo.com')}
                            className={`px-3 py-1 rounded-md ${
                              user.isAdmin || user.email === 'admin12345@yahoo.com'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                            disabled={user.email === 'admin12345@yahoo.com' || actionLoading === user.id}
                          >
                            {actionLoading === user.id ? 'Processing...' : (user.isAdmin || user.email === 'admin12345@yahoo.com' ? 'Remove Admin' : 'Make Admin')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Special note about the admin user */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                The main admin account (admin12345@yahoo.com) cannot have its admin status removed for security reasons.
              </p>
            </div>
          </div>
        </div>
      </>
    )}
  </>
)}

{/* Verification documents modal */}
{viewingDocuments && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Verification Documents</h2>
        <p className="text-gray-600">
          From {viewingDocuments.displayName || viewingDocuments.email} ({viewingDocuments.userType === 'owner' ? 'Homeowner' : 'Renter'})
        </p>
      </div>
      
      <div className="space-y-4">
        {viewingDocuments.verificationDocuments.map((doc, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-md p-4"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{doc.name}</h3>
                <p className="text-sm text-gray-500">
                  Uploaded: {formatDate(doc.uploadedAt)}
                </p>
              </div>
              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                doc.status === 'verified' 
                  ? 'bg-green-100 text-green-800' 
                  : doc.status === 'rejected'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}>
                {doc.status === 'verified' 
                  ? 'Verified' 
                  : doc.status === 'rejected'
                    ? 'Rejected'
                    : 'Pending'
                }
              </span>
            </div>
            
            {doc.url && (
              <div className="mt-2">
                <a 
                  href={getFullUrl(doc.url)} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 inline-block"
                >
                  View Document
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-between">
        <div>
          {viewingDocuments.verificationStatus === 'pending' && (
            <>
              <button
                onClick={() => {
                  handleVerifyUser(viewingDocuments);
                  setViewingDocuments(null);
                }}
                disabled={actionLoading === viewingDocuments.id}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === viewingDocuments.id ? 'Processing...' : 'Verify User'}
              </button>
              <button
                onClick={() => {
                  handleRejectVerification(viewingDocuments);
                  setViewingDocuments(null);
                }}
                disabled={actionLoading === viewingDocuments.id}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === viewingDocuments.id ? 'Processing...' : 'Reject Verification'}
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => setViewingDocuments(null)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

{/* Verify User Confirmation Modal */}
{showVerifyConfirm && userToModify && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Verify User Account</h2>
        <p className="text-gray-600">
          Are you sure you want to verify {userToModify.displayName || userToModify.email}? 
        </p>
        <p className="text-gray-600 mt-2">
          This will grant them full access to all verified user features on the platform.
        </p>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowVerifyConfirm(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => handleVerifyUser(userToModify)}
          disabled={actionLoading === userToModify.id}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === userToModify.id ? 'Processing...' : 'Yes, Verify User'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Unverify User Confirmation Modal */}
{showUnverifyConfirm && userToModify && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full">
      <div className="mb-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
          <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold mb-2">Remove Verification</h2>
        <p className="text-gray-600">
          Are you sure you want to remove verification from {userToModify.displayName || userToModify.email}?
        </p>
        <p className="text-gray-600 mt-2">
          This action will restrict their access to features that require verified status and delete their verification documents.
        </p>
      </div>
      
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => setShowUnverifyConfirm(false)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={() => handleUnverifyUser(userToModify)}
          disabled={actionLoading === userToModify.id}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {actionLoading === userToModify.id ? 'Processing...' : 'Yes, Remove Verification'}
        </button>
      </div>
    </div>
  </div>
)}

{/* Quick Access to Property Management */}
<div className="mt-10 bg-white rounded-lg shadow-md p-6">
  <h2 className="text-xl font-bold mb-4">Property Approval Management</h2>
  <p className="text-gray-600 mb-6">
    Review and approve property listings submitted by homeowners. Verify user identities to maintain platform trust.
  </p>
  
  <div className="flex space-x-4">
    <Link
      to="/admin/approval-management"
      className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
    >
      Go to Approval Management
      {pendingVerifications.length > 0 && (
        <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
          {pendingVerifications.length}
        </span>
      )}
    </Link>
  </div>
</div>
      </div>
    </>
  );
};

export default UserManagement;