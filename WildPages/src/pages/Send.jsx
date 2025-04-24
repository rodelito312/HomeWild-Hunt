const Send = () => {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">    
        <div className="flex items-start bg-white p-4 rounded-lg shadow mb-6">
          <div className="w-20 h-20 bg-gray-200 rounded mr-4 flex items-center justify-center text-gray-400">
          </div>
          <div>
            <h2 className="text-lg font-semibold">Spacious 2BR with Balcony</h2>
            <p className="text-blue-600 font-medium">$1,850/month</p>
            <p className="text-sm text-gray-600">2 Beds • 2 Baths</p>
            <p className="text-sm text-gray-600">🏙️ Westside • May 1</p>
          </div>
        </div>
  
        <form
          action="#"
          className="bg-white shadow-lg rounded-lg p-6"
          id="inquiry"
        >
          <h1 className="text-2xl font-semibold mb-4">Send Inquiry</h1>
  
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Inquiry Type</h2>
            <div className="flex gap-20">
              <label className="flex items-center gap-1">
                <input type="radio" name="inquiryType" value="question" required />
                Question
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="inquiryType" value="visit" />
                Visit
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="inquiryType" value="apply" />
                Apply
              </label>
            </div>
          </div>
  
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-2">Rental Details</h2>
  
            <label className="block mb-3">
              Desired Move-in Date
              <input
                type="date"
                name="moveInDate"
                className="w-full mt-1 border rounded px-3 py-2"
                required
              />
            </label>
  
            <div className="flex gap-4">
              <label className="w-1/2">
                Number of Occupants
                <select
                  name="occupants"
                  className="w-full mt-1 border rounded px-3 py-2"
                  required
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
  
              <label className="w-1/2">
                Any Pets?
                <select
                  name="pets"
                  className="w-full mt-1 border rounded px-3 py-2"
                  required
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>
          </div>
  
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
  
            <div className="flex gap-4 mb-3">
              <label className="w-1/2">
                Email Address
                <input
                  type="email"
                  name="email"
                  className="w-full mt-1 border rounded px-3 py-2"
                  required
                />
              </label>
              <label className="w-1/2">
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
  
            <label className="block">
              Additional Information
              <textarea
                name="message"
                maxLength="500"
                className="w-full mt-1 border rounded px-3 py-2 h-24 resize-none"
                placeholder="Share any questions or additional information..."
              ></textarea>
              <p className="text-sm text-right text-gray-500">0/500 characters</p>
            </label>
          </div>
  
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg flex justify-center items-center gap-2"
          >
            <span>📨</span> Send Inquiry
          </button>
  
          <p className="text-sm text-gray-500 mt-2 text-center">
            We’ll forward your inquiry to the property owner
          </p>
        </form>
      </div>
    );
  };
  
  export default Send;
  