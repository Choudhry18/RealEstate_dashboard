"use client"; // Required for client-side components

import { FaLinkedin, FaGithub } from "react-icons/fa";
const linkedin = "https://www.linkedin.com/in/choudhry347/";
const github = "https://github.com/Choudhry18"
const Navbar = () => {
  return (
    <nav className="w-full bg-gray-900 text-white py-4 px-6 flex justify-between items-center">
      <h1 className="text-xl font-bold">Data Assessment for Affinius</h1>
      <div className="flex gap-4">
        <a href={linkedin} target="_blank" rel="noopener noreferrer">
          <FaLinkedin size={24} className="hover:text-blue-400 transition duration-300" />
        </a>
        <a href={github} target="_blank" rel="noopener noreferrer">
          <FaGithub size={24} className="hover:text-gray-400 transition duration-300" />
        </a>
      </div>
    </nav>
  );
};

export default Navbar;
