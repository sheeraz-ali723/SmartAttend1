import React from 'react';

const Navbar = () => {
  return (
    <nav className="w-full bg-slate-950 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
<div className="flex items-center h-20 gap-16">          
          {/* Logo */}
          <div className="text-3xl font-bold cursor-pointer">
            Dev<span className="text-cyan-400">Hub</span>
          </div>

          {/* Nav Links */}
          <ul className="hidden md:flex items-center gap-10 text-lg font-medium">
            <li>
              <a
                href="/"
                className="hover:text-cyan-400 transition duration-300"
              >
                Home
              </a>
            </li>

            <li>
              <a
                href="/about"
                className="hover:text-cyan-400 transition duration-300"
              >
                About
              </a>
            </li>

            <li>
              <a
                href="/services"
                className="hover:text-cyan-400 transition duration-300"
              >
                Services
              </a>
            </li>

            <li>
              <a
                href="/portfolio"
                className="hover:text-cyan-400 transition duration-300"
              >
                Portfolio
              </a>
            </li>
          </ul>

          {/* Button */}
          <button className="bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 rounded-full font-semibold shadow-lg hover:scale-105 hover:shadow-cyan-500/50 transition duration-300">
            Get Started
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
