import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';


const Balance = () => {
    const [rentalBalance, setRentalBalance] = useState(0);
    const [utilityBalance, setUtilityBalance] = useState(0);
    const [rentalPercentage, setRentalPercentage] = useState(10);
    const [utilityPercentage, setUtilityPercentage] = useState(20);

    const handleRentalChange = (e) => {
        setRentalBalance(e.target.value);
        setRentalPercentage((prev) => prev + 1);
    };

    const handleUtilityChange = (e) => {
        setUtilityBalance(e.target.value);
        setUtilityPercentage((prev) => prev + 1);
    };

    return (
        <div className="max-w-xl mx-auto p-4 ml-0 rounded-lg shadow-lg bg-white">
            <div className="flex justify-between">
                <div className="w-1/2 p-4 ">
                    <h2 className="text-lg font-semibold">Outstanding Balance - Rentals</h2>
                    <div className="mt-2 flex items-center">
                        <span className="mr-2">₱</span>
                        <input
                            type="number"
                            value={rentalBalance}
                            onChange={handleRentalChange}
                            placeholder="Enter amount in PHP"
                            className="p-2 rounded w-full"
                        />
                    </div>
                    <div className="mt-2 flex items-center text-green-600">
                        <span>Last month ({rentalPercentage}%)</span>
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
                <div className="w-1/2 p-4">
                    <h2 className="text-lg font-semibold">Outstanding Balance - Utilities</h2>
                    <div className="mt-2 flex items-center">
                        <span className="mr-2">₱</span>
                        <input
                            type="number"
                            value={utilityBalance}
                            onChange={handleUtilityChange}
                            placeholder="Enter amount in PHP"
                            className="p-2 rounded w-full"
                        />
                    </div>
                    <div className="mt-2 flex items-center text-green-600">
                        <span>Last month ({utilityPercentage}%)</span>
                        <ArrowUpRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Balance;