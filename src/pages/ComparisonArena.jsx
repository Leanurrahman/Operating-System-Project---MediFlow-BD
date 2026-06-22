import { useState } from "react";
import { Trophy, Sparkles } from "lucide-react";

export default function ComparisonArena() {
  const [selectedMetric, setSelectedMetric] = useState("waiting");

  // Simulated benchmark comparison results derived from actual OS scheduling algorithms run criteria
  const metricsData = {
    "SRTF": { name: "SRTF (Preemptive)", waiting: 4.2, turnaround: 8.8, response: 1.8, fairness: 0.95, desc: "Preemptive Shortest Remaining Time First. Minimizes average waiting time perfectly.", rank: 1 },
    "SJF": { name: "SJF (Shortest Job First)", waiting: 5.5, turnaround: 10.2, response: 2.1, fairness: 0.88, desc: "Non-preemptive Shortest job selection. Relies on accurate burst pre-calculations.", rank: 2 },
    "Priority": { name: "Priority (Symptom-Based)", waiting: 6.8, turnaround: 12.0, response: 2.5, fairness: 0.75, desc: "Clinical severity prioritized scheduler. Risks starvation without aging.", rank: 3 },
    "RoundRobin": { name: "Round Robin (Quantum=2)", waiting: 8.1, turnaround: 14.5, response: 3.2, fairness: 0.99, desc: "Fair distribution slice rotation. High context switcher overhead.", rank: 4 },
    "FCFS": { name: "FCFS (Baseline Queue)", waiting: 10.5, turnaround: 16.8, response: 4.5, fairness: 0.60, desc: "First-Come First-Served. Easy to implement, highly prone to Convoy effect.", rank: 5 }
  };

  const getMaxVal = () => {
    if (selectedMetric === "fairness") return 1.0;
    return 18.0; // max scale bounds
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 text-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-display font-extrabold text-slate-900 flex items-center gap-2">
            <Trophy className="text-orange-600 w-5 h-5" />
            OS Algorithm Benchmark Arena
          </h2>
          <p className="text-xs text-slate-500">
            Compare FCFS, SJF, SRTF, Priority, and Round Robin on key clinical dispatch performance parameters
          </p>
        </div>

        {/* Metric selector tags */}
        <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setSelectedMetric("waiting")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${selectedMetric === "waiting" ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
          >
            AVG WAITING
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("turnaround")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${selectedMetric === "turnaround" ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
          >
            TURNAROUND
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("response")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${selectedMetric === "response" ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
          >
            RESPONSE TIME
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric("fairness")}
            className={`px-3 py-1.5 rounded-lg border font-bold transition cursor-pointer ${selectedMetric === "fairness" ? "bg-orange-600 text-white border-orange-600 shadow-xs" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
          >
            FAIRNESS INDEX
          </button>
        </div>
      </div>

      {/* BENCHMARK GRAPH */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Graphic Bars */}
        <div className="lg:col-span-2 bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-5">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block mb-3 font-bold">
            Relative Comparison Spectrum (lower is better, except fairness)
          </span>

          <div className="space-y-4 font-mono text-xs">
            {Object.entries(metricsData).map(([key, data]) => {
              const val = data[selectedMetric];
              const max = getMaxVal();
              const percentWidth = Math.min(100, (val / max) * 100);

              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-slate-800">{data.name}</span>
                    <span className="font-black text-orange-600">
                      {val} {selectedMetric === "fairness" ? "score" : "units"}
                    </span>
                  </div>

                  {/* Visual Bar with orange theme */}
                  <div className="w-full bg-slate-200/50 rounded-lg h-3 overflow-hidden border border-slate-200 relative">
                    <div
                      className="bg-orange-600 h-full rounded-r transition-all duration-500 ease-out"
                      style={{ width: `${percentWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* WINNER ANALYSIS & RANKINGS */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-orange-600">
            <Sparkles className="w-4 h-4" />
            BENCHMARK PERFORMANCE RANKINGS
          </div>

          <div className="divide-y divide-slate-150 font-mono text-xs text-slate-700">
            {Object.entries(metricsData)
              .sort((a, b) => a[1].rank - b[1].rank)
              .map(([key, data]) => (
                <div key={`rank-${key}`} className="py-2.5 flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center font-bold text-[10px] text-orange-600 border border-slate-200 shrink-0 mt-0.5 shadow-2xs">
                    #{data.rank}
                  </div>
                  <div>
                    <span className="font-bold text-slate-800 block">{data.name}</span>
                    <span className="text-[10px] text-slate-500 leading-relaxed block mt-0.5">
                      {data.desc}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
