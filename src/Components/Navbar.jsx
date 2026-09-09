import { FiBell, FiMenu } from "react-icons/fi";

const Navbar = () => {
  return (
    <header className="flex h-20 items-center justify-between border-b border-slate-100 bg-white px-6">

      <button className="text-xl text-slate-600 lg:hidden">
        <FiMenu />
      </button>

      <div className="ml-auto flex items-center gap-5">

        <button className="relative text-xl text-slate-500">
          <FiBell />

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600">
            A
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-700">
              Admin
            </p>

            <p className="text-xs text-slate-400">
              Administrator
            </p>
          </div>

        </div>

      </div>

    </header>
  );
};

export default Navbar;