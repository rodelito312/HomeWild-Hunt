// src/pages/ManageListings.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebase/config';
import { ref, get, remove, update } from 'firebase/database';
import Navbar2 from "../components/navbar2";

// Status Change Dropdown Component
const StatusChangeDropdown = ({ propertyId, currentStatus, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine available status options based on current status
  let statusOptions = [];
  if (currentStatus === 'For Sale') {
    statusOptions = ['For Sale', 'Sold', 'For Rent'];
  } else if (currentStatus === 'For Rent') {
    statusOptions = ['For Rent', 'Rented', 'For Sale'];
  } else if (currentStatus === 'Sold') {
    statusOptions = ['Sold', 'For Sale'];
  } else if (currentStatus === 'Rented') {
    statusOptions = ['Rented', 'For Rent'];
  }
  
  // Background and text color based on status
  const getStatusStyles = (status) => {
    switch (status) {
      case 'For Sale':
        return 'bg-green-100 text-green-800';
      case 'For Rent':
        return 'bg-blue-100 text-blue-800';
      case 'Sold':
        return 'bg-gray-100 text-gray-800';
      case 'Rented':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getStatusStyles(currentStatus)}`}
      >
        {currentStatus}
        <svg
          className="w-4 h-4 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu" aria-orientation="vertical">
            {statusOptions.map((status) => (
              <button
                key={status}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                  currentStatus === status ? 'font-medium' : ''
                }`}
                role="menuitem"
                onClick={() => {
                  onStatusChange(propertyId, status);
                  setIsOpen(false);
                }}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ManageListings = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null); // Added success message state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filteredProperties, setFilteredProperties] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 10;

  // Fetch properties from Firebase
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const propertiesRef = ref(db, 'properties');
        const snapshot = await get(propertiesRef);
        
        if (snapshot.exists()) {
          const propertiesData = [];
          snapshot.forEach((childSnapshot) => {
            propertiesData.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          
          setProperties(propertiesData);
          setFilteredProperties(propertiesData);
        } else {
          setProperties([]);
          setFilteredProperties([]);
        }
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Filter properties when search keyword changes
  useEffect(() => {
    if (searchKeyword.trim() === '') {
      setFilteredProperties(properties);
      setCurrentPage(1); // Reset to first page when search changes
      return;
    }
    
    const keyword = searchKeyword.toLowerCase();
    const filtered = properties.filter(property => 
      (property.title && property.title.toLowerCase().includes(keyword)) ||
      (property.location && property.location.toLowerCase().includes(keyword)) ||
      (property.propertyId && property.propertyId.toLowerCase().includes(keyword))
    );
    
    setFilteredProperties(filtered);
    setCurrentPage(1); // Reset to first page when search changes
  }, [searchKeyword, properties]);

  // Function to handle status change
  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      // Reference to the property in the database
      const propertyRef = ref(db, `properties/${propertyId}`);
      
      // Update the status
      await update(propertyRef, {
        status: newStatus
      });
      
      // Show success message
      setSuccess(`Property status updated to ${newStatus}`);
      
      // Update local state
      setProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId ? { ...property, status: newStatus } : property
        )
      );
      
      setFilteredProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId ? { ...property, status: newStatus } : property
        )
      );
      
      // Clear success message after a few seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error updating property status:', err);
      setError(`Failed to update status: ${err.message}`);
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Format price with commas
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', { 
      style: 'currency', 
      currency: 'PHP',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Handle property deletion
  const handleDeleteProperty = async (id) => {
    if (!window.confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }
    
    try {
      const propertyRef = ref(db, `properties/${id}`);
      await remove(propertyRef);
      
      // Update local state
      setProperties(prev => prev.filter(property => property.id !== id));
      setFilteredProperties(prev => prev.filter(property => property.id !== id));
      
      setSuccess('Property deleted successfully!');
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Error deleting property:', err);
      setError('Failed to delete property. Please try again.');
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  // Get current properties for pagination
  const indexOfLastProperty = currentPage * propertiesPerPage;
  const indexOfFirstProperty = indexOfLastProperty - propertiesPerPage;
  const currentProperties = filteredProperties.slice(indexOfFirstProperty, indexOfLastProperty);
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredProperties.length / propertiesPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <>
      <Navbar2 />
      <div className="max-w-7xl mx-auto pt-9 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Manage Property Listings</h1>
          <p className="text-gray-600">Add, edit, or remove property listings from your database.</p>
        </div>
        
        {/* Search and Actions Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-col md:flex-row justify-between items-center">
          <div className="w-full md:w-1/2 mb-4 md:mb-0">
            <input
              type="text"
              placeholder="Search properties..."
              className="w-full p-2 border border-gray-300 rounded-md"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
          <div>
            <Link
              to="/admin/add-property"
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 inline-block"
            >
              Add New Property
            </Link>
          </div>
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
        
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
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
        
        {/* Properties table */}
        {!loading && !error && (
          <>
            {filteredProperties.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No properties found</h3>
                <p className="text-gray-500 mb-6">
                  {searchKeyword 
                    ? 'No properties match your search criteria.' 
                    : 'You have not added any properties yet.'}
                </p>
                <Link
                  to="/admin/add-property"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block"
                >
                  Add Your First Property
                </Link>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="w-full overflow-x-auto" style={{ minWidth: '100%' }}>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>Property</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>Location</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Type</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Price</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '10%' }}>Status</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '25%' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentProperties.map((property) => (
                          <tr key={property.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0">
                                  <img 
                                    className="h-10 w-10 rounded-md object-cover" 
                                    src={property.images?.[0] || property.image} 
                                    alt={property.title}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = '/src/assets/placeholder-property.jpg';
                                    }}
                                  />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{property.title}</div>
                                  <div className="text-sm text-gray-500">ID: {property.propertyId}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{property.location}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{property.type}</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{formatPrice(property.price)}</div>
                            </td>
                            <td className="px-6 py-4">
                              {/* Status Dropdown Component */}
                              <StatusChangeDropdown
                                propertyId={property.id}
                                currentStatus={property.status || 'For Sale'}
                                onStatusChange={handleStatusChange}
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center space-x-3">
                                <a 
                                  href={`/property/${property.id}`} 
                                  className="text-indigo-600 hover:text-indigo-900 font-medium"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                                <Link 
                                  to={`/admin/edit-property/${property.id}`} 
                                  className="text-blue-600 hover:text-blue-900 font-medium"
                                >
                                  Edit
                                </Link>
                                <button 
                                  onClick={() => handleDeleteProperty(property.id)}
                                  className="text-red-600 hover:text-red-900 font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-md">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Showing <span className="font-medium">{indexOfFirstProperty + 1}</span> to{' '}
                          <span className="font-medium">
                            {indexOfLastProperty > filteredProperties.length 
                              ? filteredProperties.length 
                              : indexOfLastProperty}
                          </span>{' '}
                          of <span className="font-medium">{filteredProperties.length}</span> properties
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => paginate(currentPage > 1 ? currentPage - 1 : 1)}
                            disabled={currentPage === 1}
                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                              currentPage === 1 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Previous</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {[...Array(totalPages)].map((_, index) => (
                            <button
                              key={index}
                              onClick={() => paginate(index + 1)}
                              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                                currentPage === index + 1
                                  ? 'bg-blue-50 border-blue-500 text-blue-600 z-10'
                                  : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {index + 1}
                            </button>
                          ))}
                          
                          <button
                            onClick={() => paginate(currentPage < totalPages ? currentPage + 1 : totalPages)}
                            disabled={currentPage === totalPages}
                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                              currentPage === totalPages 
                                ? 'text-gray-300 cursor-not-allowed' 
                                : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            <span className="sr-only">Next</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Status Change Legend */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Property Status Guide</h2>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="inline-block w-16 h-6 bg-green-100 text-green-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">For Sale</span>
              <span className="text-sm text-gray-700">Property is available for purchase</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-16 h-6 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">For Rent</span>
              <span className="text-sm text-gray-700">Property is available for rent</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-16 h-6 bg-gray-100 text-gray-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">Sold</span>
              <span className="text-sm text-gray-700">Property has been sold and is no longer available</span>
            </div>
            <div className="flex items-center">
              <span className="inline-block w-16 h-6 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full flex items-center justify-center mr-3">Rented</span>
              <span className="text-sm text-gray-700">Property has been rented and is no longer available</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Click on a property's status to change it. Status changes are immediately reflected on the website and will also update in the homeowner's dashboard.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageListings;