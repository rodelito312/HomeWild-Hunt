import React from 'react';
import hlogo from "../assets/HomeLogo.png";
import profilePic from "../assets/Geralt.jpg";

const Navbar = () => {
    return (
        <nav className="sticky top-0 z-50 py-3 backdrop-blur-lg border-b border-neutral-700/80">
            <div className="container px-4 mx-auto relative lg:text-sm">
                <div className="flex space-x-12 items-center">
                    <div className="flex items-center flex-shrink-0">
                        <img className="h-20 w-24 mr-2" src={hlogo} alt="Logo" />
                        <span className="text-3xl tracking-tight">HomeWildHunt</span>
                    </div>
                    <div className="flex items-center space-x-30">
                        <ul className='hidden lg:flex space-x-8 text-xl'>
                            <li className='hover:text-gray-400'>                    
                                <a href="#">Overview</a>
                            </li>
                            <li className='hover:text-gray-400'>
                                <a href="#">Manage Listings</a>
                            </li>
                            <li className='hover:text-gray-400'>
                                <a href="#">Tenants</a>
                            </li>
                        </ul>
                        <div className="flex items-center space-x-5 mx-12 mr-0">
                            <ul className='hidden lg:flex space-x-8 text-xl'>
                                <li className='hover:text-gray-400'>
                                    <a href="#">Help</a>
                                </li>
                                <li className='hover:text-gray-400'>
                                    <a href="#" >Settings</a>    
                                </li>
                                <li className='hover:text-gray-400'>
                                    <a href="#">Notifications</a>
                                </li>
                                <li className='hover:text-gray-400'>
                                    <a href="#">Logout</a>
                                </li>
                            </ul>
                            <div className='flex items-center space-x-2'>
                                <img className="h-10 w-10 rounded-full object-cover" src={profilePic} alt="Profile" />
                            </div>
                        </div>  
                    </div>
                </div>
            </div>   
        </nav>
    );
};

export default Navbar;