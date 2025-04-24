import React, { useState } from 'react';

const initialRooms = [
    { id: 1, name: 'Room A', isOccupied: false },
    { id: 2, name: 'Room B', isOccupied: true },
    { id: 3, name: 'Room C', isOccupied: false },
    { id: 4, name: 'Room D', isOccupied: true },
    { id: 5, name: 'Room E', isOccupied: false },
];

const Availability = () => {
    const [rooms, setRooms] = useState(initialRooms);

    const toggleAvailability = (roomId) => {
        const updatedRooms = rooms.map(room =>
            room.id === roomId ? { ...room, isOccupied: !room.isOccupied } : room
        );
        setRooms(updatedRooms);
    };

    return (
        <div className="p-0 ml-0 rounded-lg shadow-lg bg-white h-[525px] w-1/2 flex flex-col mx-2 overflow-y-auto">
            <h1 className='text-xl m-5 font-bold text-center mb-6'>Availability</h1>
            <div className="px-6 space-y-4">
                {rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between border-b py-2">
                        <div>
                            <p className="font-medium">{room.name}</p>
                            <p className={`text-sm ${room.isOccupied ? 'text-red-500' : 'text-green-500'}`}>
                                {room.isOccupied ? 'Occupied' : 'Vacant'}
                            </p>
                        </div>
                        <button
                            onClick={() => toggleAvailability(room.id)}
                            className="px-4 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
                        >
                            Mark as {room.isOccupied ? 'Vacant' : 'Occupied'}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Availability;
