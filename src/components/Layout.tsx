import { useState, createContext, useContext } from "react";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";

const cx = (...classes: (string | false | null | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const themed = (isDarkMode: boolean, light: string, dark: string) =>
  isDarkMode ? dark : light;

interface LayoutProps {
  children: React.ReactNode;
  isDarkMode?: boolean;
  hideSidebar?: boolean;
}

interface MobileSidebarContextType {
  isComponentVisible: boolean;
  toggleComponentVisibility: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(undefined);

export const useMobileSidebar = () => {
  const context = useContext(MobileSidebarContext);
  if (!context) {
    throw new Error('useMobileSidebar must be used within a Layout');
  }
  return context;
};

const Layout = ({ children, isDarkMode = false, hideSidebar = false }: LayoutProps) => {
  const [isComponentVisible, setIsComponentVisible] = useState(false);

  const toggleComponentVisibility = () => {
    setIsComponentVisible(!isComponentVisible);
  };

  return (
    <MobileSidebarContext.Provider value={{ isComponentVisible, toggleComponentVisibility }}>
      <main
        className={cx(
          "overflow-hidden w-full h-screen relative flex",
          themed(isDarkMode, "bg-slate-100/80 text-gray-900", "bg-slate-950/70 text-gray-100")
        )}
      >
        {!hideSidebar && isComponentVisible ? (
          <MobileSidebar
            toggleComponentVisibility={toggleComponentVisibility}
            isDarkMode={isDarkMode}
          />
        ) : null}
        {!hideSidebar && (
          <div
            className={cx(
              "hidden flex-shrink-0 md:flex md:w-[270px] md:flex-col border-r",
              themed(isDarkMode, "bg-slate-100 border-slate-200", "bg-[#111217] border-white/10")
            )}
          >
            <div className="flex h-full min-h-0 flex-col">
              <Sidebar isDarkMode={isDarkMode} />
            </div>
          </div>
        )}
        <div className={cx("flex-1 overflow-y-auto", themed(isDarkMode, "bg-slate-100/40", "bg-[#0f1014]"))}>
          {children}
        </div>
      </main>
    </MobileSidebarContext.Provider>
  );
};

export default Layout;
