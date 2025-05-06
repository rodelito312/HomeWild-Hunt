import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerWithEmailAndPassword } from '../firebase/auth';
import hlogo from "../assets/HomeLogo.png";

const Signup = () => {
  const navigate = useNavigate();
  
  // Basic required information
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState(''); 
  
  // Optional information
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  
  // Additional optional information for preferences
  const [showPreferences, setShowPreferences] = useState(false);
  const [propertyPreferences, setPropertyPreferences] = useState([]);
  const [amenitiesPreferences, setAmenitiesPreferences] = useState([]);
  
  // Form states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  
  // Property types and amenities options
  const propertyTypes = [
    'Condominium', 
    'Villa', 
    'Single Family', 
    'Townhouse', 
    'Land', 
    'Apartment'
  ];
  
  const amenities = [
    'Swimming Pool',
    'Gym',
    'Security',
    'Parking',
    'Balcony',
    'Air Conditioning',
    'Garden',
    'Internet/WiFi',
    'Furnished',
    'Pet Friendly'
  ];
  
  const validatePassword = () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    return true;
  };
  
  const validatePhone = () => {
    // Basic phone validation - can be enhanced
    if (!phone) {
      setError('Phone number is required');
      return false;
    }
    return true;
  };

  const handlePropertyTypeChange = (type) => {
    if (propertyPreferences.includes(type)) {
      setPropertyPreferences(propertyPreferences.filter(item => item !== type));
    } else {
      setPropertyPreferences([...propertyPreferences, type]);
    }
  };
  
  const handleAmenityChange = (amenity) => {
    if (amenitiesPreferences.includes(amenity)) {
      setAmenitiesPreferences(amenitiesPreferences.filter(item => item !== amenity));
    } else {
      setAmenitiesPreferences([...amenitiesPreferences, amenity]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validatePassword() || !validatePhone()) {
      return;
    }

    // Validate user type
    if (!userType) {
      setError('Please select whether you are a homeowner or a renter');
      return;
    }
    
    setLoading(true);
    
    try {
      // Trim the email to prevent whitespace issues
      const trimmedEmail = email.trim();
      
      console.log('Attempting to register with:', {
        email: trimmedEmail,
        name,
        userType
      });
      
      // Pass the required parameters in the correct order to match your auth.js function
      // registerWithEmailAndPassword(email, password, name, userType)
      const user = await registerWithEmailAndPassword(
        trimmedEmail,
        password,
        name,
        userType
      );
      
      console.log('Registration successful:', user);
      
      // After successful registration, update the user's additional information
      // This would require an additional function in your auth.js file
      // For now, you might need to add this function or handle it separately
      
      // Redirect to home page after successful registration
      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      
      // Handle Firebase auth errors
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. If you believe this is an error, please try a different email or contact support.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format. Please check and try again.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters with a mix of letters and numbers.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection and try again.');
      } else {
        setError(err.message || 'An error occurred during registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center">
            <img className="h-12 w-auto" src={hlogo} alt="HomeWildHunt" />
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-6">
            <div className="flex">
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6 bg-white shadow rounded-lg p-8" onSubmit={handleSubmit}>
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Account Type</h3>
            
            {/* User Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Are you a homeowner or a renter?*
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-colors ${
                    userType === 'owner' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setUserType('owner')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Homeowner</span>
                  <span className="text-xs text-gray-500 mt-1">I want to list my property</span>
                </button>
                
                <button
                  type="button"
                  className={`p-4 border rounded-lg flex flex-col items-center justify-center transition-colors ${
                    userType === 'renter' 
                      ? 'bg-blue-50 border-blue-500 text-blue-700' 
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setUserType('renter')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="font-medium">Renter</span>
                  <span className="text-xs text-gray-500 mt-1">I'm looking for a place to rent</span>
                </button>
              </div>
            </div>
            
            {/* Required Information */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Required Information</h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name*
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Your full name"
                  />
                </div>
                
                <div>
                  <label htmlFor="email-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address*
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="your.email@example.com"
                  />
                </div>
                
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number*
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="+63 XXX XXX XXXX"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password*
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm Password*
                  </label>
                  <input
                    id="confirm-password"
                    name="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            </div>
            
            {/* Toggle for Optional Information */}
            <div className="border-t pt-4">
              <button
                type="button"
                className="flex items-center text-blue-600 hover:text-blue-800"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-5 w-5 mr-1 transition-transform transform ${showOptionalFields ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showOptionalFields ? 'Hide Optional Information' : 'Add Optional Information'}
              </button>
            </div>
            
            {/* Optional Personal Information */}
            {showOptionalFields && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2 mb-4">Optional Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      id="address"
                      name="address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Your address"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Your city"
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    name="bio"
                    rows="3"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Tell us a bit about yourself"
                  ></textarea>
                </div>
                
                {/* Renter Preferences (only show if user type is renter) */}
                {userType === 'renter' && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Rental Preferences</h3>
                      <button
                        type="button"
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                        onClick={() => setShowPreferences(!showPreferences)}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-4 w-4 mr-1 transition-transform transform ${showPreferences ? 'rotate-90' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {showPreferences ? 'Hide Preferences' : 'Show Preferences'}
                      </button>
                    </div>
                    
                    {showPreferences && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Property Types</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {propertyTypes.map((type) => (
                              <div key={type} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`type-${type}`}
                                  checked={propertyPreferences.includes(type)}
                                  onChange={() => handlePropertyTypeChange(type)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <label htmlFor={`type-${type}`} className="ml-2 text-sm text-gray-700">
                                  {type}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Amenities</label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {amenities.map((amenity) => (
                              <div key={amenity} className="flex items-center">
                                <input
                                  type="checkbox"
                                  id={`amenity-${amenity}`}
                                  checked={amenitiesPreferences.includes(amenity)}
                                  onChange={() => handleAmenityChange(amenity)}
                                  className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                                />
                                <label htmlFor={`amenity-${amenity}`} className="ml-2 text-sm text-gray-700">
                                  {amenity}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating account...
                  </div>
                ) : (
                  'Create account'
                )}
              </button>
            </div>
            
            <div className="text-center text-sm">
              <p className="text-gray-600">
                By creating an account, you agree to our{' '}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;