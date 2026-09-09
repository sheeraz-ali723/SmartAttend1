import React from "react";
import { Link, Outlet } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white px-8 py-10">
      
      {/* Premium Heading */}
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold tracking-wide bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
          About Section
        </h1>
        <p className="text-gray-400 mt-3 text-lg">
          Discover our Teachers & Students
        </p>
      </div>

      {/* Premium Navbar */}
      <nav className="max-w-3xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(255,215,0,0.15)] rounded-2xl px-8 py-5">
        <ul className="flex justify-center gap-10">
          
          <li>
            <Link
              to={"Teacher"}
              className="relative px-6 py-3 text-lg font-medium text-gray-200 transition-all duration-300 rounded-xl hover:text-yellow-400 hover:bg-white/10"
            >
              Teacher
              <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-yellow-400 transition-all duration-300 hover:w-full"></span>
            </Link>
          </li>

          <li>
            <Link
              to={"Students"}
              className="relative px-6 py-3 text-lg font-medium text-gray-200 transition-all duration-300 rounded-xl hover:text-yellow-400 hover:bg-white/10"
            >
              Students
              <span className="absolute left-0 bottom-0 w-0 h-[2px] bg-yellow-400 transition-all duration-300 hover:w-full"></span>
            </Link>
          </li>

        </ul>
      </nav>

      {/* Content Area */}
      <div className="mt-14 max-w-4xl mx-auto bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-lg">
        <Outlet />
      </div>
    </div>
  );
};

export default About;