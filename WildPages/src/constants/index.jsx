import { Search, Home, Users, CalendarCheck, Star, ShieldCheck } from "lucide-react";


export const navItems = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Workflow", href: "#workflow" },
  { label: "Accommodations", href: "#accommodation" },
];


export const features = [
  {
    icon: <Search />,
    text: "Advanced Search",
    description:
      "Refine your search with filters to find the perfect accommodation that meets your needs.",
  },
  {
    icon: <Home />,
    text: "Detailed Listings",
    description:
      "Browse accommodations with high-quality photos, detailed descriptions, pricing, and amenities.",
  },
  {
    icon: <Users />,
    text: "Community Space",
    description:
      "Engage with other users, ask for advice, and connect with homeowners and tenants.",
  },
  {
    icon: <CalendarCheck />,
    text: "Easy Booking System",
    description:
      "Book accommodations effortlessly with our streamlined, user-friendly booking system.",
  },
  {
    icon: <Star />,
    text: "Wishlist & Reviews",
    description:
      "Save your favorite listings and read real reviews and ratings from past tenants.",
  },
  {
    icon: <ShieldCheck />,
    text: "Secure Verification",
    description:
      "Ensuring security and authenticity through tenant and landlord registration and verification.",
  },
];

export const checklistItems = [
  {
    title: "Powerful Search Filters",
    description: "Find accommodations that match your exact preferences with advanced search options.",

  },
  {
    title: "Detailed Property Listings",
    description: "Explore homes with high-quality images, pricing details, amenities, and full descriptions.",
   
  },
  {
    title: "Engage with the Community",
    description: "Ask for advice, connect with homeowners, and engage with fellow tenants.",

  },
  {
    title: "Seamless Booking System",
    description: "Book your ideal stay with a smooth and hassle-free reservation process.",
  
  },
  {
    title: "Save & Compare Listings",
    description: "Add properties to your Wishlist to revisit and compare later.",
  
  },
  {
    title: "Secure & Verified Rentals",
    description: "Stay safe with verified tenant and landlord profiles for trust and security.",
   
  },
];

export const pricingOptions = [
  {
    title: "Basic Stay",
    features: [
      "Single Room",
      "Shared Kitchen & Bathroom",
      "Free Wi-Fi",
      "Secure Entry Access",
    ],
  },
  {
    title: "Comfort Stay",
    features: [
      "Furnished Private Room",
      "Attached Bathroom",
      "High-Speed Wi-Fi",
      "Laundry Access",
      "24/7 Security",
    ],
  },
  {
    title: "Luxury Stay",
    features: [
      "Spacious Fully Furnished Room",
      "Ensuite Bathroom & Kitchen",
      "Smart TV & Work Desk",
      "Housekeeping Services",
      "Premium Security System",
    ],
  },
];

export const resourcesLinks = [
  { href: "#", text: "How It Works" },
  { href: "#", text: "User Guide" },
  { href: "#", text: "Help Center" },
];

export const platformLinks = [
  { href: "#", text: "Search & Filters" },
  { href: "#", text: "Accommodation Listings" },
  { href: "#", text: "Booking System" },
  { href: "#", text: "Wishlist & Favorites" },
  { href: "#", text: "User Profiles & Reviews" },
];

export const communityLinks = [
  { href: "#", text: "Advice & Discussions" },
  { href: "#", text: "Events & Meetups" },
  { href: "#", text: "Tenant & Landlord Forum" },
  { href: "#", text: "Safety & Verification" },
  { href: "#", text: "Support & Assistance" },
];

export const footerContent = {
  company: "HomeWildHunt",
  rights: "© 2025 Nocturnals. All rights reserved.",
};
