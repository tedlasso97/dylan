import React from "react";
import { IoMdClose } from "react-icons/io";
import Sidebar from "./Sidebar";

interface MobileSidebarProps {
  toggleComponentVisibility: () => void;
  isDarkMode?: boolean;
}

const MobileSidebar = ({ toggleComponentVisibility, isDarkMode = false }: MobileSidebarProps) => {
  const themed = (light: string, dark: string) => (isDarkMode ? dark : light);

  return (
    <div id="headlessui-portal-root display:hidden">
      <div data-headlessui-portal="">
        <button
          type="button"
          aria-hidden="true"
          className="fixed top-[1px] left-[1px] w-[1px] h-0 p-0 m-[-1px] overflow-hidden whitespace-nowrap border-0"
        ></button>
        <div>
          <div
            className="relative z-40"
            id="headlessui-dialog-:re:"
            role="dialog"
            aria-modal="true"
            data-headlessui-state="open"
          >
            <div
              className={themed(
                "fixed inset-0 bg-gray-900 bg-opacity-75 opacity-100",
                "fixed inset-0 bg-black bg-opacity-70 opacity-100"
              )}
            ></div>
            <div className="fixed inset-0 z-40 flex">
              <div
                className={themed(
                  "relative flex w-full max-w-xs flex-1 flex-col bg-gray-800 translate-x-0",
                  "relative flex w-full max-w-xs flex-1 flex-col bg-gray-900 translate-x-0"
                )}
                id="headlessui-dialog-panel-:rf:"
                data-headlessui-state="open"
              >
                <div className="absolute top-0 right-0 -mr-12 pt-2 opacity-100">
                  <button
                    type="button"
                    className={themed(
                      "ml-1 flex h-10 w-10 items-center justify-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 hover:bg-gray-700 rounded-md transition-colors",
                      "ml-1 flex h-10 w-10 items-center justify-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-300 hover:bg-gray-800 rounded-md transition-colors"
                    )}
                    tabIndex={0}
                    onClick={toggleComponentVisibility}
                  >
                    <span className="sr-only">Close sidebar</span>
                    <IoMdClose className="h-6 w-6 text-gray-100" />
                  </button>
                </div>
                <Sidebar isDarkMode={isDarkMode} />
              </div>
              <div className="w-14 flex-shrink-0"></div>
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-hidden="true"
          className="fixed top-[1px] left-[1px] w-[1px] h-0 p-0 m-[-1px] overflow-hidden whitespace-nowrap border-0"
        ></button>
      </div>
    </div>
  );
};

export default MobileSidebar;
