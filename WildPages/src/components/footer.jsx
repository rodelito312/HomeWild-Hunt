import { resourcesLinks, platformLinks, communityLinks, footerContent } from "../constants";
import hlogo from "../assets/HomeLogo.png";
import { Facebook, Mail } from "lucide-react"; 

const Footer = () => {
  return (
    <footer className="py-10 px-4 shadow-lg bg-gray-200">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 ml-20">
        <div>
          <h3 className="text-md font-semibold mb-4">Resources</h3>
          <ul className="space-y-2">
            {resourcesLinks.map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="text-black hover:text-gray-400"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-md font-semibold mb-4">Platform</h3>
          <ul className="space-y-2">
            {platformLinks.map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="text-black hover:text-gray-400"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-md font-semibold mb-4">Community</h3>
          <ul className="space-y-2">
            {communityLinks.map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="text-black hover:text-gray-400"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div> 
      <div className="flex text-black w-full py-6 flex-col items-center">
        <div className="flex items-center space-x-0.5">
          <img src={hlogo} alt="HomeWildHunt Logo" className="h-10" />
          <span className="text-sm">{footerContent.company} {footerContent.rights}</span>
          <div className="flex space-x-2 ml-2">
            <Mail className=" hover:text-white cursor-pointer" size={40} />
            <Facebook className=" hover:text-white cursor-pointer" size={40} />
          </div>
        </div>
      </div>      
    </footer>
  );
};

export default Footer;
