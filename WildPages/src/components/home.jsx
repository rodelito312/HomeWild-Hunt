import homeph from "../assets/Residence.jpg";
import { Search } from "lucide-react";

const HomeSection = () => {
  return (
    <section
      id="home"
      className="relative flex flex-col items-center justify-center text-center min-h-screen px-4"
      style={{
        backgroundImage: `url(${homeph})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >    
      <div className="absolute inset-0 bg-black/40 z-0" />
      <div className="relative z-10 max-w-4xl">
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white">
          Find Your Perfect Stay,{" "}
          <span className="bg-gradient-to-r from-orange-500 to-red-800 text-transparent bg-clip-text">
            Effortlessly!
          </span>
        </h1>
        <p className="mt-8 text-lg text-white">
          Seamless Rentals for Students, Travelers & Professionals. <br />
          Easily discover, book, and manage rental spaces with trustworthy hosts—because finding a home should be simple.
        </p>
        <div className="flex justify-center mt-10">
          <form className="w-full max-w-2xl">
            <div className="flex items-center bg-white shadow-lg rounded-lg overflow-hidden">
              <Search className="w-6 h-6 text-gray-600 mx-4" />
              <input
                type="search"
                placeholder="Search for city or address"
                className="w-full p-4 text-lg text-gray-800 focus:outline-none"
                required
              />
              <button
                type="submit"
                className="px-6 py-4 text-lg font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-r-lg"
              >
                Search
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default HomeSection;
