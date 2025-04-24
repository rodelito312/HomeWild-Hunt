import { useState } from "react";

const Review = () => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleRating = (value) => {
    setRating(value);
  };

  const handleMouseEnter = (value) => {
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <form
        action="#"
        className="bg-white shadow-lg rounded-lg p-6"
        id="review"
      >
        <h1 className="text-2xl font-semibold mb-4">Leave a Review</h1>

        {/* Interactive Star Rating */}
        <div className="mb-4">
          <label className="block text-lg font-medium mb-2">Your Rating</label>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRating(star)}
                onMouseEnter={() => handleMouseEnter(star)}
                onMouseLeave={handleMouseLeave}
                className={`focus:outline-none ${
                  (hoverRating || rating) >= star ? "text-yellow-400" : "text-gray-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Review Title */}
        <label className="block mb-4">
          Review Title
          <input
            type="text"
            name="title"
            className="w-full mt-1 border rounded px-3 py-2"
            placeholder="Summarize your experience"
            required
          />
        </label>

        {/* Review Text */}
        <label className="block mb-4">
          Your Review
          <textarea
            name="review"
            maxLength="500"
            className="w-full mt-1 border rounded px-3 py-2 h-24 resize-none"
            placeholder="Tell others about your experience with this property"
          ></textarea>
          <p className="text-sm text-right text-gray-500">0/500 characters</p>
        </label>

        {/* Pros */}
        <label className="block mb-4">
          Pros
          <input
            type="text"
            name="pros"
            className="w-full mt-1 border rounded px-3 py-2"
            placeholder="What did you like about this property?"
          />
        </label>

        {/* Cons */}
        <label className="block mb-6">
          Cons
          <input
            type="text"
            name="cons"
            className="w-full mt-1 border rounded px-3 py-2"
            placeholder="What could be improved?"
          />
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg"
        >
          Submit Review
        </button>
      </form>
    </div>
  );
};

export default Review;
