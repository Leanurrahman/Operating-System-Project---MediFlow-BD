import { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, AlertTriangle, Cpu, Clock, CheckCircle2 } from "lucide-react";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

export default function LiveQueueGantt({ algorithmName, timeline = [], results = [], onAgeToggle, isLoading }) {
  const [currentTick, setCurrentTick] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 9. Use React state properly: schedulerQueue, activeTask, ganttData
  const [schedulerQueue, setSchedulerQueue] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [ganttData, setGanttData] = useState([]);

  // Local feedback states for the starvation aging process
  const [ageFeedback, setAgeFeedback] = useState("");
  const [isAging, setIsAging] = useState(false);

  // Sync state with props
  useEffect(() => {
    setSchedulerQueue(results || []);
    setGanttData(timeline || []);
  }, [results, timeline]);

  // Sync active task dynamically
  useEffect(() => {
    if (ganttData && currentTick < ganttData.length && ganttData[currentTick]) {
      setActiveTask(ganttData[currentTick]);
    } else {
      setActiveTask(null);
    }
  }, [currentTick, ganttData]);

  // Sync active task to firestore under activeDispatches/current_active
  useEffect(() => {
    let active = true;
    async function syncActiveTask() {
      if (activeTask) {
        try {
          // Get original request from Firestore to find assignedAmbulanceId & assignedOperatorId
          const reqRef = doc(db, "emergencyRequests", activeTask.id);
          const reqSnap = await getDoc(reqRef);
          let assignedAmbulanceId = "amb1";
          let assignedOperatorId = "operator1";
          
          if (reqSnap.exists()) {
            const reqData = reqSnap.data();
            if (reqData.assignedAmbulanceId) {
              assignedAmbulanceId = reqData.assignedAmbulanceId;
            }
          }
          
          // Get operator for that ambulance from ambulances collection
          const ambRef = doc(db, "ambulances", assignedAmbulanceId);
          const ambSnap = await getDoc(ambRef);
          if (ambSnap.exists()) {
            const ambData = ambSnap.data();
            if (ambData.operatorId) {
              assignedOperatorId = ambData.operatorId;
            }
          }
          
          if (!active) return;
          
          await setDoc(doc(db, "activeDispatches", "current_active"), {
            dispatchId: `dispatch_${activeTask.id}`,
            patientId: activeTask.id,
            patientName: activeTask.jobName,
            assignedAmbulanceId,
            assignedOperatorId,
            status: "assigned",
            queuePosition: 1,
            updatedAt: new Date().toISOString()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, "activeDispatches/current_active");
        }
      } else {
        // If simulation is completed, or reset, or no active task:
        try {
          await deleteDoc(doc(db, "activeDispatches", "current_active"));
        } catch (e) {
          handleFirestoreError(e, OperationType.DELETE, "activeDispatches/current_active");
        }
      }
    }
    
    syncActiveTask();
    return () => {
      active = false;
    };
  }, [activeTask]);

  // Auto tick simulation loop
  useEffect(() => {
    let timer = null;
    if (isPlaying && currentTick < ganttData.length) {
      timer = setTimeout(() => {
        setCurrentTick((prev) => prev + 1);
      }, 500);
    } else if (currentTick >= ganttData.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentTick, ganttData]);

  const handlePlayPause = () => {
    if (ganttData.length === 0) return;
    if (currentTick >= ganttData.length) {
      setCurrentTick(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTick(0);
    setIsPlaying(false);
  };

  const handleAgeClick = async () => {
    if (isAging) return;
    setIsAging(true);
    setAgeFeedback("Evaluating ready queue starvation...");
    try {
      const res = await onAgeToggle();
      if (res && res.success) {
        if (res.pendingCount === 0) {
          setAgeFeedback("ℹ No pending cases detected to apply aging.");
        } else {
          setAgeFeedback(`✓ Evaluation success! Evaluated ${res.pendingCount} cases and promoted ${res.promotedCount} starved patients.`);
        }
      } else if (res && res.error) {
        setAgeFeedback(`❌ Evaluation fail: ${res.error}`);
      } else {
        setAgeFeedback("✓ Starvation aging cycle completed successfully!");
      }
    } catch (e) {
      setAgeFeedback("❌ Starvation aging evaluation failed.");
    } finally {
      setIsAging(false);
      setTimeout(() => setAgeFeedback(""), 7000);
    }
  };

  // 4. Gantt chart short labels: Nusrat -> Nus, Tanvir -> Tan, Farhana -> Far, Mehedi -> Meh
  const getShortLabel = (name) => {
    if (!name) return "";
    const lower = name.toLowerCase();
    if (lower.includes("nusrat")) return "Nus";
    if (lower.includes("tanvir")) return "Tan";
    if (lower.includes("farhana")) return "Far";
    if (lower.includes("mehedi")) return "Meh";
    if (lower.includes("ahmed")) return "Ahm";
    return name.substring(0, 3);
  };

  // Highlight patients that suffer from starvation:
  // Low priority (priorityValue >= 3 or 4) AND arrived early but still waiting
  const starvedPatients = schedulerQueue.filter(
    (job) => job.priorityValue >= 3 && job.arrivalTime < currentTick && job.waitingTime > 6
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div>
          <h3 className="text-base font-display font-extrabold text-slate-900 flex items-center gap-2">
            <Cpu className="text-orange-600 pr-1 w-5 h-5 animate-pulse" />
            OS Scheduler Queue & Gantt Center
          </h3>
          <p className="text-xs text-slate-500">
            Current Algorithm Simulation: <span className="font-extrabold text-orange-600 font-mono">{algorithmName}</span>
          </p>
        </div>

        {/* Dynamic Sim Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={ganttData.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs ${
              isPlaying 
                ? "bg-amber-50 text-amber-700 border border-amber-200" 
                : "bg-orange-600 hover:bg-orange-700 text-white"
            } disabled:opacity-40`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-amber-700 text-amber-700" /> : <Play className="w-4 h-4 fill-white text-white" />}
            {isPlaying ? "Pause SIM" : "Play SIM"}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={ganttData.length === 0}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition cursor-pointer shadow-3xs"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          {onAgeToggle && (
            <button
              type="button"
              onClick={handleAgeClick}
              disabled={isAging}
              className="px-3.5 py-2 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-xs font-mono text-orange-600 font-bold transition cursor-pointer disabled:opacity-55"
              title="Prevent patient starvation by raising waiting items priority state"
            >
              {isAging ? "⚡ Aging..." : "⚡ Run Aging Cycle"}
            </button>
          )}
        </div>
      </div>

      {ageFeedback && (
        <div className="mb-4 p-2.5 bg-orange-50/50 border border-orange-200/50 rounded-2xl text-[11px] font-mono font-bold text-orange-700 text-center animate-pulse">
          {ageFeedback}
        </div>
      )}

      {ganttData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <Clock className="w-8 h-8 text-slate-300 mb-2 animate-pulse" />
          <p className="text-sm text-slate-500 font-mono">No active ambulance scheduler queue loaded</p>
          <span className="text-[10px] text-slate-400">Please report emergencies or trigger custom actions</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Timeline and Active Executor Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-3xs">
              <div>
                <span className="text-[10px] text-slate-400 font-mono block mb-1">ALGORITHM EXECUTION STATE</span>
                <span className="text-2xl font-black text-orange-600 dark:text-orange-500 font-mono">
                  Tick: {currentTick} / {ganttData.length}
                </span>
              </div>
              
              {/* Dynamic Progress Slider */}
              <div className="mt-4">
                <input
                  type="range"
                  min="0"
                  max={ganttData.length}
                  value={currentTick}
                  onChange={(e) => setCurrentTick(Number(e.target.value))}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-200 dark:bg-slate-700 accent-orange-600"
                />
              </div>
            </div>

            {/* 6. Active Task / Patient dynamically updates based on the currently executing scheduled patient */}
            <div className={`rounded-2xl p-4 border flex flex-col justify-between shadow-3xs transition-all duration-300 ${
              (ganttData.length > 0 && currentTick === ganttData.length)
                ? "bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400"
                : "bg-slate-50 dark:bg-slate-900/60 border-orange-200 dark:border-slate-850 text-slate-800"
            }`}>
              <div>
                <span className={`text-[10px] font-mono block mb-1 ${(ganttData.length > 0 && currentTick === ganttData.length) ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600"}`}>
                  IN EXECUTION (AMBULANCE)
                </span>
                <div className="font-display font-extrabold tracking-tight truncate text-base text-slate-800 dark:text-slate-100">
                  {(ganttData.length > 0 && currentTick === ganttData.length) ? "Simulation Completed" : (activeTask?.jobName || "Idle (No Patient)")}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 font-mono flex justify-between mt-2">
                <span>Task UID: {(!(ganttData.length > 0 && currentTick === ganttData.length) && activeTask?.id) ? activeTask.id.substring(0, 8) : "N/A"}</span>
                {(ganttData.length > 0 && currentTick === ganttData.length) ? (
                  <span className="inline-flex items-center px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded font-bold text-[9px]">COMPLETED</span>
                ) : (
                  <span className="font-bold text-orange-600 animate-pulse">Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Completion Summary Card Section */}
          {ganttData.length > 0 && currentTick === ganttData.length && (() => {
            const totalPatients = schedulerQueue.length;
            const totalWaitingTime = schedulerQueue.reduce((acc, job) => acc + (job.waitingTime || 0), 0);
            const avgTurnaroundTime = totalPatients > 0 
              ? (schedulerQueue.reduce((acc, job) => acc + (job.turnaroundTime || 0), 0) / totalPatients).toFixed(2) 
              : "0.00";
            const avgResponseTime = totalPatients > 0 
              ? (schedulerQueue.reduce((acc, job) => acc + (job.responseTime || 0), 0) / totalPatients).toFixed(2) 
              : "0.00";

            return (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-5 shadow-sm space-y-4 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans leading-none uppercase tracking-wider">
                        Completion Summary Dashboard
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        Performance benchmarks and metrics breakdown
                      </p>
                    </div>
                  </div>
                  {/* 5. Show a green badge: "Scheduling Run Completed Successfully" */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Scheduling Run Completed Successfully
                  </span>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3 rounded-xl shadow-3xs text-left">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Total Patients Processed</span>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono mt-1">
                      {totalPatients} Patients
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3 rounded-xl shadow-3xs text-left">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Total Waiting Time</span>
                    <div className="text-lg font-black text-slate-800 dark:text-slate-100 font-mono mt-1">
                      {totalWaitingTime} ticks
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3 rounded-xl shadow-3xs text-left">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Avg Turnaround Time</span>
                    <div className="text-lg font-black text-orange-600 dark:text-orange-400 font-mono mt-1">
                      {avgTurnaroundTime} units
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800 p-3 rounded-xl shadow-3xs text-left">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase tracking-wider">Avg Response Time</span>
                    <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                      {avgResponseTime} units
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Gantt Chart Block */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2 uppercase tracking-wider">Gantt Chart Timeline Grid</h4>
            <div className="flex flex-row gap-1.5 px-3 py-4 bg-slate-50 border border-slate-200 rounded-2xl overflow-x-auto select-none shadow-3xs max-w-full">
              {ganttData.map((slice, tickIndex) => {
                const isActive = tickIndex === currentTick;
                // Assign consistent color based on job ID
                const charCodeSum = slice.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const colors = ["bg-orange-500", "bg-amber-400", "bg-yellow-400", "bg-red-400", "bg-indigo-400"];
                const colorClass = colors[charCodeSum % colors.length];

                return (
                  <div
                    key={`gantt-slice-${tickIndex}`}
                    onClick={() => setCurrentTick(tickIndex)}
                    className={`flex flex-col items-center justify-center min-w-[36px] h-11 rounded text-[9px] font-mono cursor-pointer transition-all shrink-0 ${
                      isActive 
                        ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-white opacity-100 scale-105" 
                        : "opacity-60 hover:opacity-90"
                    } ${colorClass} text-slate-900 font-bold`}
                    title={`Tick ${tickIndex}: Patient ${slice.jobName}`}
                  >
                    <span>{tickIndex}</span>
                    <span className="text-[8px] font-black tracking-tighter truncate max-w-[32px]">
                      {getShortLabel(slice.jobName)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Starvation Alerts */}
          {starvedPatients.length > 0 && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-xs font-mono">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Patient Starvation Detected!</span>
                <span className="block text-[10px] text-slate-500 mt-1">
                  Low priority requests (e.g. {starvedPatients.map(p => p.patientName).join(", ")}) are starving due to high incoming priority loads. Run aging cycle to dynamically promote them.
                </span>
              </div>
            </div>
          )}

          {/* Metrics Dashboard Table */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 font-mono mb-2 uppercase tracking-wider font-bold">Scheduled Metrics Breakdown</h4>
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-3xs bg-white">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                    <th className="py-2.5 px-3">Patient Name</th>
                    <th className="py-2.5 px-3">Arrival</th>
                    <th className="py-2.5 px-3">Service CPU</th>
                    <th className="py-2.5 px-3">Waiting Time</th>
                    <th className="py-2.5 px-3">Turnaround</th>
                    <th className="py-2.5 px-3">Response Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 text-slate-700">
                  {/* 5. Scheduled Metrics Breakdown table must display the correct patient for every row */}
                  {schedulerQueue.map((job) => (
                    <tr key={`metric-row-${job.id}`} className="hover:bg-slate-50/50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{job.patientName}</td>
                      <td className="py-2.5 px-3">{job.arrivalTime} ticks</td>
                      <td className="py-2.5 px-3 text-orange-600 font-bold">{job.estimatedServiceTime || job.burstTime}u</td>
                      <td className="py-2.5 px-3 text-amber-600 font-extrabold">{job.waitingTime} units</td>
                      <td className="py-2.5 px-3">{job.turnaroundTime} units</td>
                      <td className="py-2.5 px-3">{job.responseTime} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
