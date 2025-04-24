const Message = () => {
    return (
        <div className="max-w-2xl mx-auto px-4 py-10">    
  
            <form
            action="#"
            className="bg-white shadow-lg rounded-lg p-6"
            id="inquiry"
            >
                <h1 className="text-2xl font-semibold mb-4">Message Property Owner</h1>
                <div className="mb-6">
                        <h2 className="text-lg font-medium mb-2">Your Contact Information</h2>
                        <label className="block mb-3">
                        Full Name
                        <input
                            type="text"
                            name="fullName"
                            className="w-full mt-1 border rounded px-3 py-2"
                            required
                        />
                        </label>
            
                        <label className="block mb-3">
                            Email Address
                            <input
                            type="email"
                            name="email"
                            className="w-full mt-1 border rounded px-3 py-2"
                            required
                            />
                        </label>
                        <label className="block mb-3">
                            Phone Number
                            <input
                            type="tel"
                            name="phone"
                            className="w-full mt-1 border rounded px-3 py-2"
                            placeholder="(123) 456-7890"
                            required
                            />
                        </label>
                    </div>
                            
                    <div className="mb-6">
                        <h2 className="text-lg font-medium mb-2">Schedule a Viewing (Optional)</h2>
                        <div className="flex gap-4">
                            <label className="block mb-3">
                            Desired Move-in Date
                            <input
                                type="date"
                                name="moveInDate"
                                className="w-full mt-1 border rounded px-3 py-2"
                                required
                            />
                            </label>

                            <label className="w-1/2">
                                Preferred Time
                                <select
                                    name="preferredTime"
                                    className="w-full mt-1 border rounded px-3 py-2"
                                    required
                                >
                                    <option value="" disabled selected>
                                    Select a time
                                    </option>
                                    <option value="9am">9:00 AM</option>
                                    <option value="10am">10:00 AM</option>
                                    <option value="11am">11:00 AM</option>
                                    <option value="12pm">12:00 PM</option>
                                    <option value="1pm">1:00 PM</option>
                                    <option value="2pm">2:00 PM</option>
                                    <option value="3pm">3:00 PM</option>
                                    <option value="4pm">4:00 PM</option>
                                    <option value="5pm">5:00 PM</option>
                                </select>
                            </label>
                        </div>
                        
                        <label className="block">
                        Your Message
                        <textarea
                            name="message"
                            maxLength="500"
                            className="w-full mt-1 border rounded px-3 py-2 h-24 resize-none"
                            placeholder="Share any questions or additional information..."
                        ></textarea>
                        <p className="text-sm text-right text-gray-500">0/1000 characters</p>
                        </label>
                    </div>
        
                <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex justify-center items-center gap-2"
                >
                    <span>📨</span> Send Message
                </button>
        
                <p className="text-sm text-gray-500 mt-2 text-center">
                    The property owner will respond to you directly
                </p>
            </form>
        </div>
    );
  };
  
  export default Message;
  