// src/firebase/auth.js
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from './config';
import { ref, set, get } from 'firebase/database';

// Google provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Sign up with email and password
export const registerWithEmailAndPassword = async (email, password, name, userType) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Add the user's name to their profile
    await updateProfile(userCredential.user, {
      displayName: name
    });
    
    // Create a user profile in the Realtime Database with the user type
    await set(ref(db, `users/${userCredential.user.uid}`), {
      uid: userCredential.user.uid,
      displayName: name,
      email: email,
      photoURL: userCredential.user.photoURL || '',
      createdAt: new Date().toISOString(),
      userType: userType || 'renter', // Default to 'renter' if not specified
      verificationStatus: 'unverified',
      
      // Set appropriate default values based on user type
      ...(userType === 'owner' ? {
        // Owner-specific defaults
        ownerInfo: {
          businessName: '',
          taxId: '',
          yearsInBusiness: 0,
          contactEmail: email,
          contactPhone: '',
          businessAddress: '',
          propertyManager: false
        },
        listedProperties: []
      } : {
        // Renter-specific defaults
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 0 },
          preferredLocations: [],
          amenities: []
        },
        rentalHistory: []
      })
    });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with email and password
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user already exists in database
    const userRef = ref(db, `users/${user.uid}`);
    const snapshot = await get(userRef);
    
    // If user doesn't exist in the database, create a profile
    if (!snapshot.exists()) {
      await set(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
        userType: 'renter', // Default to renter for Google sign-ins
        verificationStatus: 'unverified',
        
        // Renter-specific defaults
        preferences: {
          propertyTypes: [],
          priceRange: { min: 0, max: 0 },
          preferredLocations: [],
          amenities: []
        },
        rentalHistory: []
      });
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

// Sign out
export const logout = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    throw error;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    throw error;
  }
};

// Auth state observer
export const subscribeToAuthChanges = (callback) => {
  return onAuthStateChanged(auth, callback);
};