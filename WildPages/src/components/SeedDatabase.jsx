import React, { useState } from 'react';
import { db } from '../firebase/config';
import { ref, push, set, get } from 'firebase/database';

// Sample property data for the Philippines
const sampleProperties = [
  {
    title: 'Modern Condo in Makati',
    location: 'Ayala Avenue, Makati City, Metro Manila, Philippines',
    price: 12500000,
    type: 'Condominium',
    bedrooms: 2,
    bathrooms: 2,
    area: 120,
    images: [
      'https://via.placeholder.com/800x600?text=Makati+Condo',
      'https://via.placeholder.com/800x600?text=Condo+Living+Room',
      'https://via.placeholder.com/800x600?text=Condo+Kitchen',
      'https://via.placeholder.com/800x600?text=Condo+Bedroom',
      'https://via.placeholder.com/800x600?text=Condo+Bathroom'
    ],
    status: 'For Sale',
    tags: ['Featured', 'Premium'],
    description: 'Luxurious condominium unit in the heart of Makati CBD. Walking distance to malls, restaurants, and offices. This 2-bedroom unit features modern design, floor-to-ceiling windows with city views, high-end appliances, and a balcony. The building has amenities including a swimming pool, gym, function rooms, and 24/7 security.',
    amenities: [
      'Swimming Pool',
      'Fitness Center',
      'Sky Lounge',
      'Function Room',
      '24/7 Security',
      'Parking Space',
      'CCTV Surveillance',
      'High-speed Internet Ready',
      'Backup Power',
      'Lobby Reception'
    ],
    agent: {
      name: 'Maria Santos',
      email: 'maria@homewildhunt.com',
      phone: '(+63) 917-123-4567',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 2019,
    propertyId: 'HWH-PH-1001',
    city: 'Makati',
    neighborhood: 'Ayala Center',
    zipCode: '1200',
    parkingSpaces: 1,
    viewType: 'City View',
    isFeatured: true,
    coordinates: {
      lat: 14.5547,
      lng: 121.0244
    }
  },
  {
    title: 'Beachfront Villa in Cebu',
    location: 'Mactan Island, Lapu-Lapu City, Cebu, Philippines',
    price: 35000000,
    type: 'Villa',
    bedrooms: 4,
    bathrooms: 5,
    area: 350,
    images: [
      'https://via.placeholder.com/800x600?text=Cebu+Villa',
      'https://via.placeholder.com/800x600?text=Villa+Living+Room',
      'https://via.placeholder.com/800x600?text=Villa+Kitchen',
      'https://via.placeholder.com/800x600?text=Villa+Master+Bedroom',
      'https://via.placeholder.com/800x600?text=Villa+Beach+View'
    ],
    status: 'For Sale',
    tags: ['Premium', 'Beachfront'],
    description: 'Stunning beachfront villa in exclusive Mactan Island. This luxury property offers direct beach access, panoramic ocean views, and impeccable tropical modern design. Featuring an infinity pool, spacious outdoor entertaining areas, gourmet kitchen, and luxurious bedrooms. Perfect as a vacation home or permanent residence for those seeking a resort lifestyle.',
    amenities: [
      'Private Beach Access',
      'Infinity Pool',
      'Garden',
      'Outdoor Dining Area',
      'Smart Home System',
      'Floor-to-Ceiling Windows',
      'Italian Kitchen',
      'Walk-in Closets',
      'Marble Bathrooms',
      'Staff Quarters'
    ],
    agent: {
      name: 'Carlos Reyes',
      email: 'carlos@homewildhunt.com',
      phone: '(+63) 918-765-4321',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 2021,
    propertyId: 'HWH-PH-1002',
    city: 'Cebu',
    neighborhood: 'Mactan Island',
    zipCode: '6015',
    parkingSpaces: 3,
    viewType: 'Ocean View',
    isFeatured: true,
    coordinates: {
      lat: 10.3157,
      lng: 123.9777
    }
  },
  {
    title: 'Heritage House in Vigan',
    location: 'Calle Crisologo, Vigan City, Ilocos Sur, Philippines',
    price: 18000000,
    type: 'Single Family',
    bedrooms: 5,
    bathrooms: 3,
    area: 280,
    images: [
      'https://via.placeholder.com/800x600?text=Vigan+Heritage+House',
      'https://via.placeholder.com/800x600?text=Heritage+Living+Room',
      'https://via.placeholder.com/800x600?text=Heritage+Kitchen',
      'https://via.placeholder.com/800x600?text=Heritage+Bedroom',
      'https://via.placeholder.com/800x600?text=Heritage+Courtyard'
    ],
    status: 'For Sale',
    tags: ['Historical', 'Ancestral'],
    description: 'Rare opportunity to own a piece of Philippine history. This beautifully preserved ancestral house in Vigan\'s UNESCO World Heritage zone features Spanish colonial architecture with Filipino elements. Original hardwood floors, capiz shell windows, and a central courtyard. Renovated with modern conveniences while maintaining its historical integrity. Located on the famous cobblestone street of Calle Crisologo.',
    amenities: [
      'Central Courtyard',
      'Capiz Shell Windows',
      'Hardwood Floors',
      'High Ceilings',
      'Original Woodwork',
      'Updated Plumbing',
      'Modern Kitchen',
      'Indoor-Outdoor Living',
      'Store Front Opportunity',
      'Tourist Area'
    ],
    agent: {
      name: 'Luis Navarro',
      email: 'luis@homewildhunt.com',
      phone: '(+63) 919-876-5432',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 1870,
    propertyId: 'HWH-PH-1003',
    city: 'Vigan',
    neighborhood: 'Heritage Zone',
    zipCode: '2700',
    parkingSpaces: 1,
    viewType: 'Street View',
    isFeatured: true,
    coordinates: {
      lat: 17.5747,
      lng: 120.3871
    }
  },
  {
    title: 'Modern Bungalow in Tagaytay',
    location: 'Tagaytay City, Cavite, Philippines',
    price: 9500000,
    type: 'Single Family',
    bedrooms: 3,
    bathrooms: 2,
    area: 200,
    images: [
      'https://via.placeholder.com/800x600?text=Tagaytay+Bungalow',
      'https://via.placeholder.com/800x600?text=Bungalow+Living+Room',
      'https://via.placeholder.com/800x600?text=Bungalow+Kitchen',
      'https://via.placeholder.com/800x600?text=Bungalow+Bedroom',
      'https://via.placeholder.com/800x600?text=Taal+Lake+View'
    ],
    status: 'For Sale',
    tags: ['Mountain View'],
    description: 'Contemporary bungalow with stunning views of Taal Lake and Volcano. Located in a secure subdivision in Tagaytay City, this property offers the perfect weekend getaway or permanent residence in the cool highlands. Open floor plan with large windows to maximize the view, modern kitchen, spacious deck, and landscaped garden. Cool climate all year round.',
    amenities: [
      'Panoramic View',
      'Garden',
      'Deck',
      'Fireplace',
      'Open Floor Plan',
      'Gated Community',
      'Security',
      'Parking',
      'Laundry Room',
      'Storage'
    ],
    agent: {
      name: 'Ana Gomez',
      email: 'ana@homewildhunt.com',
      phone: '(+63) 917-234-5678',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 2018,
    propertyId: 'HWH-PH-1004',
    city: 'Tagaytay',
    neighborhood: 'Highlands',
    zipCode: '4120',
    parkingSpaces: 2,
    viewType: 'Lake View',
    isFeatured: false,
    coordinates: {
      lat: 14.1153,
      lng: 120.9380
    }
  },
  {
    title: 'Luxury Townhouse in BGC',
    location: 'Bonifacio Global City, Taguig, Metro Manila, Philippines',
    price: 25000000,
    type: 'Townhouse',
    bedrooms: 3,
    bathrooms: 4,
    area: 220,
    images: [
      'https://via.placeholder.com/800x600?text=BGC+Townhouse',
      'https://via.placeholder.com/800x600?text=Townhouse+Living+Room',
      'https://via.placeholder.com/800x600?text=Townhouse+Kitchen',
      'https://via.placeholder.com/800x600?text=Townhouse+Bedroom',
      'https://via.placeholder.com/800x600?text=Townhouse+Rooftop'
    ],
    status: 'For Sale',
    tags: ['Luxury', 'Premium'],
    description: 'Exclusive multi-level townhouse in the prestigious Bonifacio Global City. This modern residence offers the perfect combination of luxury and convenience. Features include high ceilings, premium finishes, smart home technology, gourmet kitchen, and a private rooftop terrace with city views. Steps away from high-end shopping, international restaurants, and corporate offices.',
    amenities: [
      'Private Rooftop',
      'Smart Home System',
      'Designer Kitchen',
      'Walk-in Closets',
      'Home Office',
      'Entertainment Room',
      'Elevator',
      'Private Garage',
      'Security System',
      'Backup Power'
    ],
    agent: {
      name: 'Marco Torres',
      email: 'marco@homewildhunt.com',
      phone: '(+63) 918-345-6789',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 2020,
    propertyId: 'HWH-PH-1005',
    city: 'Taguig',
    neighborhood: 'Bonifacio Global City',
    zipCode: '1634',
    parkingSpaces: 2,
    viewType: 'City View',
    isFeatured: true,
    coordinates: {
      lat: 14.5508,
      lng: 121.0529
    }
  },
  {
    title: 'Oceanfront Lot in Batangas',
    location: 'Nasugbu, Batangas, Philippines',
    price: 15000000,
    type: 'Land',
    bedrooms: 0,
    bathrooms: 0,
    area: 1000,
    images: [
      'https://via.placeholder.com/800x600?text=Batangas+Beachfront+Lot',
      'https://via.placeholder.com/800x600?text=Beach+View',
      'https://via.placeholder.com/800x600?text=Sunset+View',
      'https://via.placeholder.com/800x600?text=Aerial+View',
      'https://via.placeholder.com/800x600?text=Access+Road'
    ],
    status: 'For Sale',
    tags: ['Beachfront', 'Investment'],
    description: 'Prime oceanfront lot in Nasugbu, Batangas with spectacular views of the South China Sea. This 1000 sqm property offers 30 meters of beach frontage on a pristine white sand beach. Ideal for building a private beach house or small resort. Power and water connections available. Just a 2-hour drive from Manila via Cavite-Tagaytay-Nasugbu highway.',
    amenities: [
      'White Sand Beach',
      'Ocean Access',
      'Clear Title',
      'Accessible by Road',
      'Electricity Available',
      'Water Source Available',
      'Gentle Slope',
      'Near Resorts',
      'Sunset Views',
      'Development Potential'
    ],
    agent: {
      name: 'Elena Cruz',
      email: 'elena@homewildhunt.com',
      phone: '(+63) 917-456-7890',
      image: 'https://via.placeholder.com/100x100?text=Agent'
    },
    yearBuilt: 0,
    propertyId: 'HWH-PH-1006',
    city: 'Batangas',
    neighborhood: 'Nasugbu',
    zipCode: '4231',
    parkingSpaces: 0,
    viewType: 'Ocean View',
    isFeatured: false,
    coordinates: {
      lat: 14.0760,
      lng: 120.6310
    }
  }
];

const SeedDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSeedDatabase = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    
    try {
      // Check if data already exists
      const propertiesRef = ref(db, 'properties');
      const snapshot = await get(propertiesRef);
      
      if (snapshot.exists() && Object.keys(snapshot.val()).length > 0) {
        setMessage('Database already contains properties. No sample data was added.');
        setLoading(false);
        return;
      }
      
      // Add sample properties
      for (const property of sampleProperties) {
        const newPropertyRef = push(ref(db, 'properties'));
        await set(newPropertyRef, {
          ...property,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      
      setMessage('Sample properties successfully added to the database!');
    } catch (error) {
      console.error('Error seeding database:', error);
      setError(`Failed to seed database: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Database Setup</h2>
      <p className="mb-4">
        Add sample Philippine properties to your database for testing. 
        This will only add data if your database is empty.
      </p>
      
      <button
        onClick={handleSeedDatabase}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
      >
        {loading ? 'Adding Sample Data...' : 'Add Sample Properties'}
      </button>
      
      {message && (
        <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
};

export default SeedDatabase;