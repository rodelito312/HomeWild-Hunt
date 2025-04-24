import Navbar from "../components/navbar";
import Home from "../components/home";
import FeatureSection from "../components/featuresection";
import Workflow from "../components/workflow";
import Footer from "../components/footer";
import Accommodation from "../components/accommodation";

const Homepage = () => {
  return (
    <>
      <Navbar />      
      <div className="mx-auto px-0">
        <Home /> 
        <FeatureSection />
        <Workflow />
        <Accommodation />
        <Footer />
      </div>
    </>
  );
};

export default Homepage;
