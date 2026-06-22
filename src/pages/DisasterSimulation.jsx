import { useState } from "react";
import { ShieldAlert, Flame, Ship, Bus, Sparkles } from "lucide-react";

export default function DisasterSimulation({ onTriggerDisaster }) {
  const [activeScenario, setActiveScenario] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLaunch = async (scenario) => {
    setIsLoading(true);
    setFeedback("");
    setActiveScenario(scenario);
    try {
      const res = await onTriggerDisaster(scenario);
      setFeedback(`🚨 DISASTER DISPATCHED: ${res.message || "Mass casualties injected into queue!"}`);
    } catch {
      setFeedback("Simulation trigger timeout.");
    } finally {
      setIsLoading(false);
    }
  };

  const scenarios = [
    {
      id: "bus",
      title: "Highway Bus Multi-Collison",
      icon: Bus,
      description: "A highway bus loses control on Manikganj Highway. Injects 3 critical road casualties with major fracture trauma and internal bleedings. Drains central ICU bed reserves.",
      color: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60",
      btnClass: "bg-amber-500 hover:bg-amber-600 text-white"
    },
    {
      id: "launch",
      title: "Sadarghat Launch Capsize",
      icon: Ship,
      description: "A launch capsize occurs near Buriganga Sadarghat River Terminal. Injects toxic near-drowning patients requiring oxygen and ventilators. Spikes Shahbagh DMCH cluster queue loads.",
      color: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white"
    },
    {
      id: "fire",
      title: "Gazipur Factory Fire Rescue",
      icon: Flame,
      description: "A major chemical fire breaks out inside an industrial garment zone in Gazipur. Injects severe toxic inhalation and body burn patients with high ventilator need criteria.",
      color: "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-900/60",
      btnClass: "bg-red-600 hover:bg-red-700 text-white"
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6 text-slate-800 dark:text-slate-100 transition-colors">
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="p-2.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-2xl">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-lg font-display font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 uppercase font-mono tracking-tight">
            Mass Disaster Incident Center
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simulate extreme mass casualty crashes to stress-test Banker's matrices, scheduling queues, and aging starvation prevention
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {scenarios.map((scen) => {
          const Icon = scen.icon;
          return (
            <div 
              key={scen.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between space-y-4 hover:scale-[1.01] transition-all duration-300 ${scen.color}`}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white dark:bg-slate-900 text-orange-600 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-display font-extrabold text-slate-800 dark:text-slate-200">{scen.title}</h3>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {scen.description}
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleLaunch(scen.id)}
                className={`w-full py-2.5 rounded-xl text-xs font-mono font-bold transition select-none ${scen.btnClass} disabled:opacity-40 cursor-pointer shadow-xs`}
              >
                {isLoading && activeScenario === scen.id ? "Injecting Disaster..." : "Trigger Collision Event"}
              </button>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div className="p-4 bg-red-50 dark:bg-red-950/25 border border-red-200 dark:border-red-900/50 rounded-xl text-xs font-mono text-center text-red-650 dark:text-red-400 text-red-600 animate-pulse font-bold">
          {feedback}
        </div>
      )}

      {/* OS Simulation Principles Explained */}
      <div className="flex items-start gap-3 bg-orange-50/50 dark:bg-slate-950/50 p-5 rounded-2xl border border-orange-200 dark:border-slate-800 relative">
        <Sparkles className="w-5 h-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-orange-400 block uppercase font-mono">Stress Testing Principles (OS Concepts)</span>
          <p className="text-[10px] text-slate-650 dark:text-slate-300 leading-relaxed mt-1">
            Triggering these scenarios releases massive burstTime requirements. Go to **Hospital Command** to observe:
          </p>
          <ul className="list-disc list-inside text-[9px] text-slate-600 dark:text-slate-350 font-mono space-y-1.5 pb-2 mt-2 pl-2">
            <li><strong className="text-slate-800 dark:text-slate-200">Banker&apos;s Safety Check:</strong> Depletion of oxygens may cause safety tests to decline new allocations immediately, triggering a safe-state denial lockout.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Starvation Prevention:</strong> Prolonged pending queues trigger aging protocols. Click &quot;Run Aging Cycle&quot; in the gantt card to promote starved casualties!</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
