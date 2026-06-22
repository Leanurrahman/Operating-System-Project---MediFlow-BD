import {
  Building2,
  Cpu,
  Facebook,
  Flame,
  Globe,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Truck,
  Twitter,
  Youtube
} from "lucide-react";

export default function Footer({ setActiveTab }) {
  const handleQuickLink = (tabId) => {
    if (setActiveTab) {
      setActiveTab(tabId);
      // Smooth scroll to top of main content
      const mainEl = document.querySelector("main");
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const platforms = [
    { name: "Ambulance Scheduling", icon: Truck },
    { name: "Live Tracking", icon: Globe },
    { name: "Hospital Recommendation", icon: Building2 },
    { name: "Emergency Pharmacy", icon: ShieldCheck },
    { name: "Blood Donor Support", icon: Heart },
    { name: "Disaster Simulation", icon: Flame }
  ];

  const quickLinks = [
    { name: "Home Base", id: "home" },
    { name: "SOS Patient Desk", id: "patient" },
    { name: "OS Algorithm Arena", id: "arena" },
    { name: "Emergency Logs & Dispatch", id: "operator" },
    { name: "Hospital Resources", id: "hospital" },
    { name: "Disaster Center", id: "disaster" }
  ];

  return (
    <footer className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-colors duration-300 mt-6 md:mt-8 rounded-2xl shadow-xs overflow-hidden" id="dashboard-footer">
      <div className="px-5 md:px-8 py-10 md:py-12">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12" id="mediflow-footer-grid">
          
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-bold text-white font-display text-base shadow-md shadow-orange-600/20 select-none shrink-0">
                M
              </div>
              <span className="font-display font-extrabold tracking-tight text-base text-slate-900 dark:text-white">
                MEDIFLOW <span className="text-orange-600">BD</span>
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-sans">
              Smart emergency ambulance scheduling, hospital resource management, and real-time emergency support platform for Bangladesh.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-805 bg-slate-50 dark:bg-slate-850 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-500/30 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all duration-200 flex items-center justify-center active:scale-95"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a 
                href="https://wa.me/8801945457270?text=Hello%20MediFlow%20BD%20Support" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-805 bg-slate-50 dark:bg-slate-850 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-500/30 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all duration-200 flex items-center justify-center active:scale-95"
                title="WhatsApp Support"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-805 bg-slate-50 dark:bg-slate-850 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-500/30 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all duration-200 flex items-center justify-center active:scale-95"
                title="Twitter / X"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg border border-slate-200/80 dark:border-slate-805 bg-slate-50 dark:bg-slate-850 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-500/30 text-slate-500 dark:text-slate-400 hover:text-orange-500 transition-all duration-200 flex items-center justify-center active:scale-95"
                title="YouTube"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Emergency Support Column */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
              24/7 Emergency Support
            </h3>
            <div className="space-y-3 pt-1">
              <a 
                href="https://wa.me/8801945457270?text=Hello%20MediFlow%20BD%20Support"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px] font-bold rounded-lg transition-all shadow-md shadow-emerald-600/10 active:scale-95 cursor-pointer select-none"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp Direct Message
              </a>
              <div className="space-y-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span className="hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer">emergency@mediflowbd.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>Hotline: <strong className="text-slate-800 dark:text-slate-200">16263</strong> (BD Health)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-500">
              Quick Navigation
            </h3>
            <ul className="space-y-2 text-xs font-sans text-slate-505 dark:text-slate-405">
              {quickLinks.map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => handleQuickLink(link.id)}
                    className="hover:text-orange-500 dark:hover:text-orange-450 hover:underline transition-colors duration-150 text-left font-semibold cursor-pointer text-slate-500 dark:text-slate-400 flex items-center gap-1.5"
                  >
                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0"></span>
                    {link.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Features Column */}
          <div className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-500">
              Platform Modules
            </h3>
            <ul className="space-y-2 text-xs font-sans text-slate-505 dark:text-slate-405">
              {platforms.map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <li key={feat.name} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 py-0.5">
                    <FeatIcon className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span>{feat.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* Divider */}
        <div className="h-px bg-slate-200/80 dark:bg-slate-800/80 my-8"></div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-center md:text-left leading-relaxed">
            <Cpu className="w-4 h-4 text-orange-500 animate-pulse shrink-0" />
            <span className="text-[10.5px]">
              Powered by <strong className="text-slate-800 dark:text-slate-200">OS Scheduling & Banker&apos;s Avoidance</strong>, Firebase DB & Real-time Central Dispatch.
            </span>
          </div>
          <p className="text-[11px] shrink-0">
            &copy; 2026 MediFlow BD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
