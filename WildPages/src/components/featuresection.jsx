import { features } from "../constants";

const FeatureSection = () => {
  return (
  <div id="features" className="relative py-20 px-4">
    <div className="text-center">
      <span className="rounded-full h-6 lg:text-6xl font-medium px-2 py-1">
        Fea
        <span className="bg-gradient-to-r from-orange-500 to-orange-800 text-transparent bg-clip-text">
          tures
        </span>
      </span>
    </div>
    <div className="flex flex-wrap mt-10">
      {features.map((feature, index) => (
        <div key={index} className="w-full sm:w-1/2 lg:w-1/3">
          <div className="flex p-14 shadow-lg justify-between m-5">
            <div className="flex h-10 w-10 p-2 bg-neutral-900 text-orange-700 justify-center items-center rounded-full">
              {feature.icon}
            </div>
            <div className="ml-4">
              <h5 className="mt-1 mb-2 text-xl">{feature.text}</h5>
              <p className="text-md text-amber-300">{feature.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
  );
};

export default FeatureSection;
