import { CheckCircle2 } from "lucide-react";
import bookingImg from "../assets/bookingImg1.png";
import bookingImgs from "../assets/bookingImg2.png";
import { checklistItems } from "../constants";

const Workflow = () => {
  return (
    <div className="py-20 px-4 bg-blue-200" id="workflow">
      <h2 className="text-3xl sm:text-5xl lg:text-6xl text-center tracking-wide">
        Find & Book Your{" "}
        <span className="bg-gradient-to-r from-orange-500 to-orange-800 text-transparent bg-clip-text">
          Perfect Stay with Ease!
        </span>
      </h2>
      <div className="flex flex-wrap justify-center">
        <div className="p-2 w-full lg:w-1/2 mt-6">
          <img src={bookingImg} alt="Booking Process" className="mb-1.5 shadow-lg mx-2 my-4 w-full"/>
          <img src={bookingImgs} alt="Booking Online" className="shadow-lg mx-2 my-4 w-full"/>
        </div>
        <div className="pt-12 w-full lg:w-1/2">
          {checklistItems.map((item, index) => (
            <div key={index} className="flex mb-12">
              <div className="text-orange-400 mx-6 bg-neutral-900 h-10 w-10 p-2 flex justify-center items-center rounded-full">
              <CheckCircle2 />
              </div>
              <div>
                <h5 className="mt-1 mb-2 text-xl">{item.title}</h5>
                <p className="text-md text-amber-800">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Workflow;
