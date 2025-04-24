import { CheckCircle2 } from "lucide-react";
import { pricingOptions } from "../constants";

const Pricing = () => {
  return (
    <div className="py-20 px-4" id="accommodation">
      <h2 className="text-3xl sm:text-5xl lg:text-6xl text-center my-8 tracking-wide">
        Flexible <span className="bg-gradient-to-r from-orange-500 to-orange-800 text-transparent bg-clip-text">Accommodation Plans</span>
      </h2>
      <div className="flex flex-wrap justify-center">
        {pricingOptions.map((option, index) => (
          <div key={index} className="w-full sm:w-1/2 lg:w-1/3 p-4">
            <div className="p-10 border border-neutral-50 bg-white rounded-xl shadow-lg">
              <p className="text-4xl mb-6 font-semibold text-orange-500">
                {option.title}
                {option.title === "Comfort Stay" && (
                  <span className="bg-gradient-to-r from-orange-500 to-red-400 text-transparent bg-clip-text text-xl mb-4 ml-2">
                    (Popular Choice)
                  </span>
                )}
              </p>
              <p className="mb-6 text-5xl font-bold text-white">
                {option.price}
              </p>
              <ul>
                {option.features.map((feature, index) => (
                  <li key={index} className="mt-5 flex items-center text-black">
                    <CheckCircle2 className="text-green-400" />
                    <span className="ml-3">{feature}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className="inline-flex justify-center items-center w-full h-12 p-5 mt-12 text-lg font-semibold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition duration-300"
              >
                Book Now
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;