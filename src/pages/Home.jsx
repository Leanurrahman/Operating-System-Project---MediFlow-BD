import React, { useState, useEffect } from "react";
import { HeartPulse, Cpu, Sparkles, ShieldCheck, Flame, Droplets, ShoppingBag, UserCheck2, Building2, Truck, ArrowRight, ArrowDown } from "lucide-react";

export default function Home({ setActiveTab, currentUserRole, onLoginClick }) {
  const [counts, setCounts] = useState({ hospitals: 0, ambulances: 0, bloodGroups: 0, algos: 0 });

  useEffect(() => {
    const duration = 1200; // 1.2s animation
    const steps = 40;
    const stepTime = duration / steps;
    let currentStep = 0;
    
    const timer = setInterval(() => {
      currentStep++;
      setCounts({
        hospitals: Math.min(50, Math.floor((50 / steps) * currentStep)),
        ambulances: Math.min(100, Math.floor((100 / steps) * currentStep)),
        bloodGroups: Math.min(8, Math.floor((8 / steps) * currentStep)),
        algos: Math.min(5, Math.floor((5 / steps) * currentStep))
      });
      if (currentStep >= steps) {
        clearInterval(timer);
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, []);

  const osSchedulingFeatures = [
    {
      title: "FCFS (First-Come, First-Served)",
      description: "Baseline queue allocation. Processes rescue calls strictly in order of arrival, ensuring non-preemptive baseline fairness without triage bias.",
      color: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-500/50",
      iconColor: "text-orange-600"
    },
    {
      title: "SJF & SRTF (Shortest Job First)",
      description: "Non-preemptive and preemptive variants. Dispatches low-duration, quick-service calls first to minimize queue wait metrics and maximize vehicle turnover.",
      color: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/50",
      iconColor: "text-amber-600"
    },
    {
      title: "Priority (Severity Triage)",
      description: "High-severity symptoms (such as Cardiac Incidents/Heart Attacks) get top queue status. Out-of-order priority access directly saves lives first.",
      color: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-yellow-500/50",
      iconColor: "text-yellow-600"
    },
    {
      title: "Round Robin (Circular Rotation)",
      description: "Slices resource time-quanta into equal intervals, fairly distributing critical medical oxygen claims and clinical beds among competing hospital requests.",
      color: "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-orange-600/50",
      iconColor: "text-orange-600"
    }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Banner Section */}
      <section className="relative text-center max-w-3xl mx-auto py-12 space-y-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-600/10 dark:bg-orange-500/5 border border-orange-500/20 rounded-full text-[11px] font-mono font-bold text-orange-600 dark:text-orange-500 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          Operating System Principles applied to Bangladesh Emergency Healthcare
        </div>
        
        <h1 className="text-3.5xl md:text-5xl font-black tracking-tight leading-none text-slate-900 dark:text-white font-sans">
          Intelligent Dispatcher & <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 animate-gradient">
            Deadlock-Free Resource Planner
          </span>
        </h1>

        {/* Project Purpose Statement Card */}
        <div className="bg-slate-100/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-850 text-slate-700 dark:text-slate-300 text-xs md:text-sm font-sans max-w-2xl mx-auto leading-relaxed shadow-3xs">
          <span className="font-bold text-slate-900 dark:text-white block mb-1 text-center font-mono text-[10px] uppercase tracking-wider text-orange-600">Project Purpose & Systems Architecture</span>
          Bangladesh emergency systems suffer from extreme bottleneck stress. MediFlow BD leverages core computer science operating system paradigms—specifically, multi-level CPU scheduling, priority aging queues, and Banker&apos;s deadlock avoidance matrices—to orchestrate life-saving dispatches, organize clinical beds, and optimize blood reserves safely under structural strain.
        </div>

        {/* Hero Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto w-full pt-2 text-left">
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-2.5 rounded-2xl shadow-3xs hover:border-orange-500/30 transition duration-300">
            <div className="p-2 bg-rose-500/10 text-rose-505 dark:text-rose-455 rounded-xl shrink-0">
              <Building2 className="w-4.5 h-4.5 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-990 dark:text-white font-mono leading-none">
                {counts.hospitals}+
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-sans mt-0.5 leading-none">Hospitals</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-2.5 rounded-2xl shadow-3xs hover:border-orange-500/30 transition duration-300">
            <div className="p-2 bg-amber-500/10 text-amber-505 dark:text-amber-455 rounded-xl shrink-0">
              <Truck className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-990 dark:text-white font-mono leading-none">
                {counts.ambulances}+
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-sans mt-0.5 leading-none">Ambulances</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-2.5 rounded-2xl shadow-3xs hover:border-orange-500/30 transition duration-300">
            <div className="p-2 bg-red-500/10 text-red-505 dark:text-red-455 rounded-xl shrink-0">
              <Droplets className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-990 dark:text-white font-mono leading-none">
                {counts.bloodGroups}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-sans mt-0.5 leading-none">Blood Groups</div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-2.5 rounded-2xl shadow-3xs hover:border-orange-500/30 transition duration-300">
            <div className="p-2 bg-orange-500/10 text-orange-505 dark:text-orange-455 rounded-xl shrink-0">
              <Cpu className="w-4.5 h-4.5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <div className="text-base sm:text-lg font-black text-slate-990 dark:text-white font-mono leading-none">
                {counts.algos}
              </div>
              <div className="text-[9px] sm:text-[10px] text-slate-500 font-sans mt-0.5 leading-none">Algorithms</div>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 p-3 flex items-center gap-2.5 rounded-2xl shadow-3xs hover:border-orange-500/30 transition duration-300">
            <div className="p-2 bg-emerald-500/10 text-emerald-505 dark:text-emerald-455 rounded-xl shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-500 animate-pulse" />
            </div>
            <div>
              <div className="text-[11px] font-black text-emerald-650 dark:text-emerald-400 font-mono leading-tight uppercase">
                Banker&apos;s
              </div>
              <div className="text-[9px] text-slate-500 font-sans leading-none mt-0.5">Deadlock Avoidance</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
          {currentUserRole ? (
            <button
              onClick={() => setActiveTab(currentUserRole === "hospital_admin" ? "hospital" : (currentUserRole === "ambulance_operator" ? "operator" : "patient"))}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-750 font-bold text-white rounded-xl text-xs font-mono shadow-md shadow-orange-600/15 transition-all select-none cursor-pointer"
            >
              Go to Active Command Desk
            </button>
          ) : (
            <button
              onClick={() => onLoginClick("patient")}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-750 font-bold text-white rounded-xl text-xs font-mono shadow-md shadow-orange-600/15 transition-all select-none cursor-pointer hover:scale-[1.01]"
            >
              Open User Portal
            </button>
          )}
          
          {currentUserRole ? (
            <button
              onClick={() => setActiveTab("arena")}
              className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 shadow-3xs transition-all select-none cursor-pointer"
            >
              Algorithm Benchmark Arena
            </button>
          ) : (
            <button
              onClick={() => onLoginClick("admin")}
              className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-700 dark:text-slate-300 shadow-3xs transition-all select-none cursor-pointer"
            >
              Open Admin Portal
            </button>
          )}
        </div>
      </section>

      {/* System Workflow Section */}
      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-orange-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-2 mb-8 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest leading-none">
            Processing Flow
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight font-sans">
            How MediFlow BD Works
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto font-sans leading-relaxed">
            A continuous orchestration modeling a real-time OS microkernel, driving complete emergency lifecycle synchronization.
          </p>
        </div>

        {/* Connection flow container */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 relative z-10">
          {/* Card 1: Patient Request */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center border border-rose-500/20">
                <UserCheck2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">1. Patient Request</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Trigger an SOS request with key diagnostics, location coordinates, and vital medical requirements.
                </p>
              </div>
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden md:flex items-center text-orange-540 z-20">
              <ArrowRight className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="flex md:hidden justify-center mt-3 text-orange-540">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Card 2: Hospital Validation */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center border border-orange-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">2. Hospital Validation</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Real-time validation of regional active units, oxygen supply parameters, and specialty care options.
                </p>
              </div>
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden md:flex items-center text-orange-540 z-20">
              <ArrowRight className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="flex md:hidden justify-center mt-3 text-orange-540">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Card 3: OS Scheduler */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-yellow-500/10 text-yellow-400 rounded-xl flex items-center justify-center border border-yellow-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">3. OS Scheduler</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Applies intelligent algorithms (Priority Severity or SRTF) to allocate placement slots fairly.
                </p>
              </div>
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden md:flex items-center text-orange-540 z-20">
              <ArrowRight className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="flex md:hidden justify-center mt-3 text-orange-540">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Card 4: Ambulance Dispatch */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center border border-amber-500/20">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">4. Ambulance Dispatch</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Automatic route generation alerts nearest operator, providing safe real-time GPS tracking paths.
                </p>
              </div>
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden md:flex items-center text-orange-540 z-20">
              <ArrowRight className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="flex md:hidden justify-center mt-3 text-orange-540">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Card 5: Hospital Admission */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">5. Hospital Admission</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Direct clinical transition. Banker &apos;s deadlock solver locks emergency bed allocations safely.
                </p>
              </div>
            </div>
            <div className="absolute top-1/2 -right-3 -translate-y-1/2 hidden md:flex items-center text-orange-540 z-20">
              <ArrowRight className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="flex md:hidden justify-center mt-3 text-orange-540">
              <ArrowDown className="w-4 h-4 animate-bounce" />
            </div>
          </div>

          {/* Card 6: Completed Case */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-2xl relative flex flex-col justify-between hover:border-orange-500/30 transition duration-300">
            <div className="space-y-3">
              <div className="w-9 h-9 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-100 font-mono tracking-tight uppercase">6. Completed Case</h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Resources successfully released back into state registers, guaranteeing safety sequence continuity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OS Scheduling Sections */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center justify-center gap-2 font-display">
            <Cpu className="text-orange-600" /> Inspired by OS Core Schedulers
          </h2>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 font-mono uppercase tracking-wider">Queueing emergency dispatches strictly using OS optimization criteria</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {osSchedulingFeatures.map((feat, i) => (
            <div 
              key={`feat-${i}`}
              className={`p-5 rounded-3xl border shadow-3xs transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 ${feat.color}`}
            >
              <h3 className="text-xs font-black text-slate-900 dark:text-white font-mono flex items-center justify-between uppercase">
                {feat.title}
                <div className={`h-2 w-2 rounded-full ${feat.iconColor} bg-current animate-pulse`} />
              </h3>
              <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed mt-2.5">
                {feat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Dynamic Starvation Prevention Note */}
        <div className="bg-slate-100/50 dark:bg-slate-900/20 max-w-3xl mx-auto p-4 rounded-xl border border-slate-200/50 dark:border-slate-850 text-center text-[11px] text-slate-500 dark:text-slate-450 font-mono">
          🚨 <strong className="text-slate-800 dark:text-slate-300 font-bold">STARVATION RESOLUTION</strong>: Low-priority dispatches are prone to queue starvation. We implement an **Aging Policy** that dynamically decrements priority indexes based on wait loops to avoid operational exclusion!
        </div>
      </section>

      {/* Banker's Algorithm and Safety Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="space-y-4">
          <div className="inline-block p-2.5 bg-orange-500/10 rounded-xl text-orange-400">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-lg font-bold tracking-tight text-white font-sans">
            Banker&apos;s Deadlock Avoidance Model
          </h2>
          <p className="text-xs text-slate-350 leading-relaxed">
            Clinical resources in emergency situations are scarce. Ambulances compete for oxygen tanks, while trauma victims compete for ICU beds and ventilators. Undirected resource handovers cause **Deadlocked States** where patients block each other from completion.
          </p>
          <p className="text-xs text-slate-350 leading-relaxed">
            By executing multi-resource safe-state computations, the MediFlow dispatch engine ensures safe sequence metrics. All allocations are vetted; unsafe claims are rejected, preventing catastrophic city-wide lockdowns.
          </p>
        </div>

        <div className="flex flex-col justify-center space-y-4 border-t md:border-t-0 md:border-l border-slate-800 pt-6 md:pt-0 md:pl-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400 text-xs font-bold font-mono border border-rose-500/20 mt-0.5 shrink-0">
              U
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Unsafe Request Safeguards</span>
              <p className="text-[10px] text-slate-400 leading-normal">Blocks allocation arrays that leave insufficient buffer reserves to fulfill worst-case demands of other clinics.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold font-mono border border-emerald-500/20 mt-0.5 shrink-0">
              S
            </div>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Automated Safe Sequence Generation</span>
              <p className="text-[10px] text-slate-400 leading-normal">Computes execution arrays ensuring that every hospital is guaranteed a pathway to access full resources sequentially.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Support Features cards */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-md font-bold tracking-wider text-slate-450 dark:text-slate-400 font-mono uppercase">Operational Service Clusters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-3xs space-y-2.5 transition-all hover:shadow-md">
            <Flame className="w-6 h-6 text-rose-500 mx-auto animate-bounce" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white font-mono uppercase">Disaster Simulation</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
              Trigger highway collisions or factory fire scenarios, stressing systems under immediate resource drain conditions.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-3xs space-y-2.5 transition-all hover:shadow-md">
            <Droplets className="w-6 h-6 text-orange-600 mx-auto animate-pulse" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-white font-mono uppercase font-black">Blood Donor Desk</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
              Instantly query emergency donors in Dhaka matching specific blood groups, coupled with real-time phone links.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-3xs space-y-2.5 transition-all hover:shadow-md">
            <ShoppingBag className="w-6 h-6 text-amber-600 mx-auto animate-pulse" />
            <h3 className="text-sm font-bold text-slate-850 dark:text-white font-mono uppercase font-black">Emergency Pharmacies</h3>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
              Order critical cardiovascular or asthma therapeutics instantly, with FCFS priority delivery tracking.
            </p>
          </div>
        </div>
      </section>

      {/* Login/Register CTA Grid Section */}
      {!currentUserRole && (
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
          
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Begin Operational Session
            </h2>
            <p className="text-xs text-slate-550 dark:text-slate-400 font-sans leading-relaxed">
              Access the clinical control systems of Bangladesh. Select your organizational command desk below to login with test credentials or register an SOS account.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-2">
            <button
              onClick={() => onLoginClick("patient")}
              className="p-4 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition text-slate-800 dark:text-slate-100 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-500 flex items-center justify-center group-hover:scale-110 transition">
                <UserCheck2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-black font-mono tracking-wider block uppercase">Patient Desk</span>
                <span className="text-[10px] text-slate-500">SOS Triage & Pharmacy</span>
              </div>
            </button>

            <button
              onClick={() => onLoginClick("admin")}
              className="p-4 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition text-slate-800 dark:text-slate-100 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-500 flex items-center justify-center group-hover:scale-110 transition">
                <Building2 className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-black font-mono tracking-wider block uppercase">Hospital Admin</span>
                <span className="text-[10px] text-slate-500">Resource & Deadlock Core</span>
              </div>
            </button>

            <button
              onClick={() => onLoginClick("operator")}
              className="p-4 bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 rounded-2xl flex flex-col items-center justify-center gap-2.5 transition text-slate-800 dark:text-slate-100 group cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-500 flex items-center justify-center group-hover:scale-110 transition">
                <Truck className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs font-black font-mono tracking-wider block uppercase">Ambulance logs</span>
                <span className="text-[10px] text-slate-500">Driver Routing & States</span>
              </div>
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
