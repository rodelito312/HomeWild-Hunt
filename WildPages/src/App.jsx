// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Existing pages
import Homepage from './pages/Homepage';
import Dashboard from './pages/Dashboard';
import Review from './pages/LeaveReview';
import Message from './pages/MessageProperty';
import Send from './pages/Send';
import NotFound from './pages/NotFound';

// Property pages
import PropertyListing from './pages/PropertyListing';
import PropertyDetail from './pages/PropertyDetail';

// Admin pages
import ManageListings from './pages/ManageListings';
import AddProperty from './pages/AddProperty';
import EditProperty from './pages/EditProperty';
import UserManagement from './pages/UserManagement';
import AdminProfile from './pages/AdminProfile';
import PropertyApprovalManagement from './pages/PropertyApprovalManagement';

// Homeowner pages
import HomeownerListingForm from './pages/HomeownerListingForm';
import HomeownerListings from './pages/HomeownerListings';

// Renter pages
import RenterProperties from './pages/RenterProperties';

// Auth pages
import Login from './components/Login';
import Signup from './components/Signup';

// Components
import Wishlist from './components/Wishlist';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';

// Import the Profile page
import Profile from './pages/Profile';

// Import Notifications page
import Notifications from './pages/Notifications';

// Import Messages pages 
// NOTE: You'll need to create these files in the correct location
import MessagesPage from './components/Message'; // Changed name to avoid conflicts
import MessageThreadPage from './pages/MessageThread'; // Changed name to avoid conflicts

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route index element={<Homepage />} />
          <Route path="/properties" element={<PropertyListing />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Protected routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/review" element={
            <ProtectedRoute>
              <Review />
            </ProtectedRoute>
          } />
          <Route path="/message" element={
            <ProtectedRoute>
              <Message />
            </ProtectedRoute>
          } />
          <Route path="/send" element={
            <ProtectedRoute>
              <Send />
            </ProtectedRoute>
          } />
          <Route path="/wishlist" element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          } />
          
          {/* Profile route */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          
          {/* Notifications route */}
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          
          {/* Messages routes - New */}
          <Route path="/messages" element={
            <ProtectedRoute>
              <MessagesPage />
            </ProtectedRoute>
          } />
          <Route path="/messages/:id" element={
            <ProtectedRoute>
              <MessageThreadPage />
            </ProtectedRoute>
          } />
          
          {/* My Properties - smart route that redirects based on user role */}
          <Route path="/my-properties" element={
            <ProtectedRoute>
              <RenterProperties />
            </ProtectedRoute>
          } />
          
          {/* Homeowner routes */}
          <Route path="/homeowner/add-property" element={
            <ProtectedRoute>
              <HomeownerListingForm />
            </ProtectedRoute>
          } />
          <Route path="/homeowner/my-listings" element={
            <ProtectedRoute>
              <HomeownerListings />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin/dashboard" element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          } />
          <Route path="/admin/manage-listings" element={
            <AdminRoute>
              <ManageListings />
            </AdminRoute>
          } />
          <Route path="/admin/add-property" element={
            <AdminRoute>
              <AddProperty />
            </AdminRoute>
          } />
          <Route path="/admin/edit-property/:id" element={
            <AdminRoute>
              <EditProperty />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />
          <Route path="/admin/profile" element={
            <AdminRoute>
              <AdminProfile />
            </AdminRoute>
          } />
          <Route path="/admin/approval-management" element={
            <AdminRoute>
              <PropertyApprovalManagement />
            </AdminRoute>
          } />
          
          {/* Contact page */}
          <Route path="/contact" element={<div>Contact Page</div>} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;