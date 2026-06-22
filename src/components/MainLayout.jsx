import { useState, useEffect } from "react";
import { 
  Building2, 
  Cpu, 
  Truck, 
  HeartHandshake, 
  Menu, 
  X, 
  Bell, 
  LogOut,
  Syringe,
  CheckCircle,
  AlertTriangle,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { UserRole } from "../types";
import { useAuth } from "../context/AuthContext";
import ProfileModal from "./ProfileModal";
import Footer from "./Footer";

export default function MainLayout({ 
  children, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout, 
  onRoleChange,
  notifications,
  theme,
  setTheme,
  onLoginClick
}) {
  const { setCurrentUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Desktop sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("mediflow-sidebar-collapsed");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("mediflow-sidebar-collapsed", isSidebarCollapsed);
  }, [isSidebarCollapsed]);

  // Auto close mobile drawer on change
  useEffect(() => {
    setSidebarOpen(false);
  }, [activeTab]);

  const menuItems = [
    { id: "home", label: "Home Base", icon: HeartHandshake, roles: [UserRole.PATIENT, UserRole.OPERATOR, UserRole.ADMIN] },
    { id: "patient", label: "SOS Patient Desk", icon: Syringe, roles: [UserRole.PATIENT] },
    { id: "operator", label: "Operator Dispatch", icon: Truck, roles: [UserRole.OPERATOR] },
    { id: "hospital", label: "Hospital Command", icon: Building2, roles: [UserRole.ADMIN] },
    { id: "arena", label: "OS Algorithm Arena", icon: Cpu, roles: [UserRole.ADMIN, UserRole.PATIENT] },
    { id: "disaster", label: "Disaster Center", icon: Cpu, roles: [UserRole.ADMIN] }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-3 flex items-center justify-between shadow-xs transition-colors">
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden text-slate-600 dark:text-slate-450 mr-1"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-2" onClick={() => setActiveTab("home")}>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white font-display text-base sm:text-lg shadow-md shadow-orange-600/20 cursor-pointer select-none">
              M
            </div>
            <span className="hidden min-[380px]:inline font-display font-extrabold tracking-tight text-sm sm:text-base cursor-pointer text-slate-900 dark:text-slate-100">
              MEDIFLOW <span className="text-orange-600">BD</span>
            </span>
          </div>
        </div>

        {/* Dynamic Controls / Actions */}
        <div className="flex items-center gap-1.5 sm:gap-4">
          
          {/* Theme Mode Toggle Button */}
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white border border-slate-200/60 dark:border-slate-800 transition-all cursor-pointer"
            title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-amber-500 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-slate-500" />
            )}
          </button>

          {/* Active Notifications Icon */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-1.5 sm:p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white relative border border-slate-200/60 dark:border-slate-800"
            >
              <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-orange-600 border-2 border-white dark:border-slate-900"></span>
              )}
            </button>

            {/* Notification Pane */}
            {showNotifications && (
              <div className="absolute right-0 mt-2.5 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-bold font-mono tracking-wide text-orange-600">Live Dispatches Stream</span>
                  <span className="text-[9px] text-slate-405 dark:text-slate-400 font-mono">Last 5 min</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-805">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs font-mono text-slate-400">
                      Clear logs stack. No recent warning codes.
                    </div>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={`notif-pin-${i}`} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-950 transition text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          {n.type === "alert" && <span className="h-2 w-2 rounded-full bg-red-600 inline-block animate-pulse"></span>}
                          {n.type === "success" && <span className="h-2 w-2 rounded-full bg-green-500 inline-block"></span>}
                          {n.type === "warning" && <span className="h-2 w-2 rounded-full bg-amber-500 inline-block"></span>}
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{n.title}</span>
                        </div>
                        <p className="text-[10px] text-slate-505 dark:text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Logged in User Profile badge */}
          {currentUser ? (
            <div className="flex items-center gap-1 sm:gap-2">
              <button 
                onClick={() => setShowProfileModal(true)}
                className="flex items-center gap-1 sm:gap-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200/80 dark:border-slate-700 p-1.5 sm:px-3.5 sm:py-1.5 rounded-xl cursor-pointer transition select-none outline-hidden"
                id="header-profile-badge-btn"
                title="Manage Mediflow Profile"
              >
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.name} 
                    className="w-5.5 h-5.5 rounded-full object-cover border border-orange-500/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-5.5 h-5.5 rounded-full bg-orange-50 dark:bg-slate-900 flex items-center justify-center border border-orange-200/60 dark:border-slate-700 text-orange-600 font-bold text-[10px] font-mono">
                    {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-bold text-slate-750 dark:text-slate-350 font-mono truncate max-w-[110px]" title={currentUser.name}>
                  {currentUser.name}
                </span>
              </button>
              
              <button 
                onClick={onLogout}
                className="p-1.5 sm:p-2 bg-slate-50 dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-950 text-slate-405 dark:text-slate-400 hover:text-red-600 border border-slate-200/60 dark:border-slate-800 rounded-xl transition cursor-pointer"
                title="Log Out Profile"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onLoginClick && onLoginClick("patient")}
              className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 font-bold text-white text-xs font-mono rounded-xl cursor-pointer shadow-md shadow-orange-600/10 transition-all select-none flex items-center gap-1.5"
              id="header-login-btn"
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Desktop Sidebar */}
        {currentUser && (
          <aside className={`hidden md:flex flex-col bg-slate-900 border-r border-slate-800 shrink-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}>
            <nav className={`flex-1 ${isSidebarCollapsed ? "px-2" : "px-4"} py-5 space-y-1.5`}>
              {/* Collapse/Expand Toggle Button */}
              <div className={`flex mb-4 ${isSidebarCollapsed ? "justify-center" : "justify-end px-2"}`}>
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all active:scale-95 cursor-pointer border border-slate-800/60 bg-slate-900/50"
                  title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                  {isSidebarCollapsed ? (
                    <ChevronRight className="w-4.5 h-4.5 animate-in fade-in duration-300" />
                  ) : (
                    <ChevronLeft className="w-4.5 h-4.5 animate-in fade-in duration-300" />
                  )}
                </button>
              </div>

              {menuItems.map((item) => {
                const isAllowed = item.roles.includes(currentUser.role);
                if (!isAllowed) return null;
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={`side-nav-${item.id}`}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all select-none border-l-4 ${
                      isSidebarCollapsed ? "justify-center py-3.5 px-0" : "gap-3 px-4 py-3.5"
                    } ${
                      isActive 
                        ? "bg-orange-600/10 text-orange-500 border-orange-600 font-extrabold" 
                        : "text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white"
                    }`}
                    title={isSidebarCollapsed ? item.label : ""}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? "text-orange-500" : "text-slate-400"} ${isSidebarCollapsed ? "mx-auto" : ""}`} />
                    {!isSidebarCollapsed && (
                      <span className="truncate animate-in fade-in duration-300">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Mobile Drawer */}
        {sidebarOpen && currentUser && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="relative flex flex-col w-64 max-w-xs bg-slate-900 h-full border-r border-slate-800 p-5 shadow-2.5xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <span className="font-display font-extrabold tracking-tight text-white">MEDIFLOW MENU</span>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <nav className="space-y-1.5">
                {menuItems.map((item) => {
                  const isAllowed = item.roles.includes(currentUser.role);
                  if (!isAllowed) return null;
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={`mob-nav-${item.id}`}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all border-l-4 ${
                        isActive 
                          ? "bg-orange-600/10 text-orange-500 border-orange-600" 
                          : "text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <Icon className="w-4.5 h-4.5 text-orange-500" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col justify-between">
          <div className="w-full px-4 py-6 md:px-8 md:py-8 flex-1 flex flex-col">
            <div className="max-w-6xl mx-auto space-y-6 flex-1 w-full flex flex-col justify-between">
              <div className="space-y-6 w-full">
                {children}
              </div>
              {/* Footer of MediFlow BD */}
              <Footer setActiveTab={setActiveTab} />
            </div>
          </div>
        </main>
      </div>

      {/* Profile Management Modal Dialog */}
      <ProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={currentUser}
        onUpdateProfile={(updatedUser) => {
          setCurrentUser(updatedUser);
          // Trigger custom interactive UI feedback
          setToast({
            message: `✓ Profile updated instantly! Welcome, ${updatedUser.name}.`,
            type: "success"
          });
          setTimeout(() => setToast(null), 5000);
        }}
      />

      {/* Premium Floating Toasts Banner */}
      {toast && (
        <div 
          className="fixed bottom-5 right-5 z-55 max-w-sm bg-card-bg border border-border-color rounded-2xl shadow-2xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-350"
          id="profile-feedback-toast"
        >
          <div className="p-1 px-1.5 bg-success-color/12 rounded-lg text-success-color mt-0.5 shrink-0">
            <CheckCircle className="w-4.5 h-4.5" />
          </div>
          <div className="space-y-0.5">
            <h4 className="text-[11px] font-mono font-bold tracking-wide text-success-color uppercase">System Notification</h4>
            <p className="text-xs font-semibold text-text-primary leading-normal">{toast.message}</p>
          </div>
          <button 
            type="button" 
            onClick={() => setToast(null)}
            className="p-1 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-secondary shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
