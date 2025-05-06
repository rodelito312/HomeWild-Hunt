import { db } from '../firebase/config';
import { 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  query, 
  orderByChild, 
  equalTo,
  onValue 
} from 'firebase/database';

// Get all properties
export const getAllProperties = async () => {
  try {
    const propertiesRef = ref(db, 'properties');
    const snapshot = await get(propertiesRef);
    
    if (snapshot.exists()) {
      // Convert from object to array with IDs
      const propertiesData = snapshot.val();
      return Object.keys(propertiesData).map(key => ({
        id: key,
        ...propertiesData[key]
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting properties: ", error);
    throw error;
  }
};

// Get property by ID - UPDATED to check both collections
export const getPropertyById = async (id) => {
  try {
    // First check the main properties collection
    const propertyRef = ref(db, `properties/${id}`);
    let snapshot = await get(propertyRef);
    
    if (snapshot.exists()) {
      console.log("Property found in main properties collection");
      return {
        id,
        ...snapshot.val()
      };
    } 
    
    // If not found, check the pendingProperties collection
    console.log("Property not found in main collection, checking pendingProperties");
    const pendingPropertyRef = ref(db, `pendingProperties/${id}`);
    snapshot = await get(pendingPropertyRef);
    
    if (snapshot.exists()) {
      console.log("Property found in pendingProperties collection");
      return {
        id,
        ...snapshot.val()
      };
    }
    
    // If still not found, return null
    console.log("Property not found in any collection");
    return null;
  } catch (error) {
    console.error("Error getting property: ", error);
    throw error;
  }
};

// NEW: Watch property by ID with real-time updates
export const watchPropertyById = (id, callback) => {
  try {
    // First set up a listener for the main properties collection
    const propertyRef = ref(db, `properties/${id}`);
    
    // Set up real-time listener
    const unsubscribe = onValue(propertyRef, (snapshot) => {
      if (snapshot.exists()) {
        console.log("Property found and being watched in main properties collection");
        callback({
          id,
          ...snapshot.val()
        });
      } else {
        // If not found in main collection, check pendingProperties
        console.log("Property not found in main collection when watching, checking pendingProperties");
        const pendingPropertyRef = ref(db, `pendingProperties/${id}`);
        
        // We need to use get() here since we can't have nested onValue listeners
        get(pendingPropertyRef).then((pendingSnapshot) => {
          if (pendingSnapshot.exists()) {
            console.log("Property found in pendingProperties collection while watching");
            callback({
              id,
              ...pendingSnapshot.val()
            });
          } else {
            // If not found in either collection, return null
            console.log("Property not found in any collection while watching");
            callback(null);
          }
        }).catch((error) => {
          console.error("Error checking pendingProperties: ", error);
          callback(null, error);
        });
      }
    }, (error) => {
      console.error("Error watching property: ", error);
      callback(null, error);
    });
    
    // Return unsubscribe function to clean up listener when component unmounts
    return unsubscribe;
  } catch (error) {
    console.error("Error setting up property watcher: ", error);
    throw error;
  }
};

// Get featured properties
export const getFeaturedProperties = async () => {
  try {
    const featuredRef = query(
      ref(db, 'properties'),
      orderByChild('isFeatured'),
      equalTo(true)
    );
    
    const snapshot = await get(featuredRef);
    
    if (snapshot.exists()) {
      const propertiesData = snapshot.val();
      return Object.keys(propertiesData).map(key => ({
        id: key,
        ...propertiesData[key]
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting featured properties: ", error);
    throw error;
  }
};

// Get properties by type
export const getPropertiesByType = async (type) => {
  try {
    const typeRef = query(
      ref(db, 'properties'),
      orderByChild('type'),
      equalTo(type)
    );
    
    const snapshot = await get(typeRef);
    
    if (snapshot.exists()) {
      const propertiesData = snapshot.val();
      return Object.keys(propertiesData).map(key => ({
        id: key,
        ...propertiesData[key]
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error getting ${type} properties: `, error);
    throw error;
  }
};

// Get properties by city
export const getPropertiesByCity = async (city) => {
  try {
    const cityRef = query(
      ref(db, 'properties'),
      orderByChild('city'),
      equalTo(city)
    );
    
    const snapshot = await get(cityRef);
    
    if (snapshot.exists()) {
      const propertiesData = snapshot.val();
      return Object.keys(propertiesData).map(key => ({
        id: key,
        ...propertiesData[key]
      }));
    } else {
      return [];
    }
  } catch (error) {
    console.error(`Error getting properties in ${city}: `, error);
    throw error;
  }
};

// Filter properties (client-side)
export const filterProperties = async (filters) => {
  try {
    // Get all properties first
    const properties = await getAllProperties();
    
    // Return all if no filters
    if (!filters) return properties;
    
    // Apply filters
    return properties.filter(property => {
      // Type filter
      if (filters.type && filters.type !== 'All Types' && property.type !== filters.type) {
        return false;
      }
      
      // Status filter
      if (filters.status && filters.status !== 'All Status' && property.status !== filters.status) {
        return false;
      }
      
      // Location filter
      if (filters.location && filters.location !== 'All Main Locations' && property.city !== filters.location) {
        return false;
      }
      
      // Price range filter
      if (filters.minPrice && property.price < filters.minPrice) {
        return false;
      }
      
      if (filters.maxPrice && property.price > filters.maxPrice) {
        return false;
      }
      
      // Bedrooms filter
      if (filters.bedrooms && property.bedrooms < filters.bedrooms) {
        return false;
      }
      
      // Bathrooms filter
      if (filters.bathrooms && property.bathrooms < filters.bathrooms) {
        return false;
      }
      
      return true;
    }).sort((a, b) => {
      // Sort based on selected order
      if (filters.sort === 'Price Low to High') {
        return a.price - b.price;
      } else if (filters.sort === 'Price High to Low') {
        return b.price - a.price;
      } else {
        // Default to newest first
        return b.createdAt - a.createdAt;
      }
    });
  } catch (error) {
    console.error("Error filtering properties: ", error);
    throw error;
  }
};

// Search properties by keyword
export const searchProperties = async (keyword) => {
  try {
    // Get all properties
    const properties = await getAllProperties();
    
    if (!keyword) return properties;
    
    const lowercaseKeyword = keyword.toLowerCase();
    
    // Filter by keyword
    return properties.filter(property => {
      return (
        (property.title && property.title.toLowerCase().includes(lowercaseKeyword)) ||
        (property.description && property.description.toLowerCase().includes(lowercaseKeyword)) ||
        (property.location && property.location.toLowerCase().includes(lowercaseKeyword)) ||
        (property.neighborhood && property.neighborhood.toLowerCase().includes(lowercaseKeyword)) ||
        (property.type && property.type.toLowerCase().includes(lowercaseKeyword)) ||
        (property.city && property.city.toLowerCase().includes(lowercaseKeyword))
      );
    });
  } catch (error) {
    console.error("Error searching properties: ", error);
    throw error;
  }
};

// Get all cities (for location filters)
export const getAllCities = async () => {
  try {
    const properties = await getAllProperties();
    const cities = properties
      .map(property => property.city)
      .filter(city => city); // Remove undefined/null
      
    return [...new Set(cities)]; // Remove duplicates
  } catch (error) {
    console.error("Error getting cities: ", error);
    throw error;
  }
};