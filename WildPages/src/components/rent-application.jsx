import React, { useState } from 'react';

const RentApplication = () => {
    const [applications] = useState([
        { id: 1, name: 'John Doe', status: 'new', bookedAt: new Date(Date.now() - 3 * 60 * 60 * 1000) }, // 3 hours ago
        { id: 2, name: 'Jane Smith', status: 'undecided', bookedAt: new Date(Date.now() - 5 * 60 * 60 * 1000) }, // 5 hours ago
        { id: 3, name: 'Nico Adora', status: 'approved', bookedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) },
        { id: 4, name: 'Olvis Nino', status: 'approved', bookedAt: new Date(Date.now() - 8 * 60 * 60 * 1000) }, // 8 hours ago
    ]);
    const [selectedStatus, setSelectedStatus] = useState('new');

    const calculateHoursAgo = (date) => {
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        return diffInHours;
    };

    return (
        <div className=" p-0 ml-0 rounded-lg shadow-lg bg-white h-[525px] w-1/2 flex flex-col">
            <h1 className="text-xl m-5 font-bold text-center mb-6">Rental Application</h1>
            <div className="flex justify-around mb-1">
                {['new', 'undecided', 'approved'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`px-4 py-2 text-sm font-semibold transition-colors duration-300 ${
                            selectedStatus === status ? 'underline text-green-600' : 'text-gray-700'
                        }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>
            <div className="flex-grow border-t border-gray-100 rounded-t-lg p-6 mt-0 overflow-auto">
                <ul className="list-none m-0 p-0 w-full">
                    {applications
                        .filter((app) => app.status === selectedStatus)
                        .map((app) => (
                            <li key={app.id} className="text-gray-700 flex justify-between w-full">
                                <span>{app.name}</span>
                                <span>{calculateHoursAgo(app.bookedAt)} hours ago</span>
                            </li>
                        ))}
                </ul>
            </div>
        </div>
    );
};

export default RentApplication;