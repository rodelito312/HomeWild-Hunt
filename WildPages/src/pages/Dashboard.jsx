import Balance from "../components/balance";
import Navbar from "../components/navbar2";
import RentApplication from "../components/rent-application";
import FeedbackPieChart from "../components/rentalgraph";
import Availability from "../components/availability";

const Dashboard = () => {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto pt-9 px-1">       
        <div className="flex justify-evenly">
          <div className="flex gap-1 w-full">
            <RentApplication />
            <Availability/>
          </div>
          <div className="flex flex-col gap-1">
            <Balance /> 
            <FeedbackPieChart />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
