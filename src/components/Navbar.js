"use client";

import Link from "next/link";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import { MdEmail } from "react-icons/md";
const linkedin = "https://www.linkedin.com/in/choudhry347/";
const github = "https://github.com/Choudhry18";
const Email = "mailto:chabdullah347@hotmail.com";
const Navbar = () => {
  return (
    <nav className="w-full bg-gray-900 text-white py-3 px-6 flex items-center justify-between">
      {/* Left section: Logo and title */}
      <div className="flex items-center gap-3">
        <Link href="/">
          <div className="flex items-center gap-2">
            <img src="https://affiniuscapital.com/app/uploads/2023/01/logo-main-1.png" alt="Affinius Logo" className="h-8 w-auto" />
          </div>
        </Link>
      </div>
      
      {/* Middle section: Navigation links */}
      <div className="hidden md:flex space-x-4">
        <h1 className="text-xl font-bold hidden md:block"> Data Assessment</h1>
      </div>
      
      {/* Right section: Search and social links */}
      <div className="flex items-center gap-4">
        <div className="relative hidden md:block w-48">
            <h1 className="text-xl font-bold hidden md:block"> Choudhry Abdullah </h1>
        </div>
        
        <a href={linkedin} target="_blank" rel="noopener noreferrer">
          <FaLinkedin size={24} className="hover:text-blue-400 transition duration-300" />
        </a>
        <a href={github} target="_blank" rel="noopener noreferrer">
          <FaGithub size={24} className="hover:text-gray-400 transition duration-300" />
        </a>
        <a href={Email} target="_blank" rel="noopener noreferrer">
          <MdEmail size={24} className="hover:text-blue-400 transition duration-300" />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;