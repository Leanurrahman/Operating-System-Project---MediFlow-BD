import { useState } from "react";
import { ShieldCheck, ShieldAlert, Sparkles, Building2, HelpCircle } from "lucide-react";

export default function BankersVisualizer({ 
  matrix, 
  isSafe, 
  safeSequence, 
  warningAlert, 
  onClaimVerify, 
  hospitals 
}) {
  const [selectedHospital, setSelectedHospital] = useState("");
  const [icuClaim, setIcuClaim] = useState(0);
  const [oxyClaim, setOxyClaim] = useState(0);
  const [ventClaim, setVentClaim] = useState(0);
  const [docClaim, setDocClaim] = useState(0);
  const [otClaim, setOtClaim] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!selectedHospital) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      // Send clinical test vector containing all 5 parameters
      const result = await onClaimVerify(selectedHospital, [icuClaim, oxyClaim, ventClaim, docClaim, otClaim]);
      setFeedback({ success: result.success, text: result.message });
      if (result.success) {
        // Reset inputs on successful resource allocation
        setIcuClaim(0);
        setOxyClaim(0);
        setVentClaim(0);
        setDocClaim(0);
        setOtClaim(0);
      }
    } catch (err) {
      setFeedback({ success: false, text: "System communications timeout." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMatrixData = matrix && matrix.maxNeed && Object.keys(matrix.maxNeed).length > 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-xs space-y-6 text-slate-800 dark:text-slate-100">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h3 className="text-sm font-display font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <Sparkles className="text-orange-600 w-5 h-5 animate-pulse" />
            Banker’s Algorithm Control Module (5-Resource Avoidance Engine)
          </h3>
          <p className="text-xs text-slate-550 dark:text-slate-400">
            Real-time critical deadlock avoidance validation across ICU Beds, Oxygen, Ventilators, Doctors, and Operation Theaters.
          </p>
        </div>

        {/* Safety Badge */}
        <div className={`px-4 py-1.5 rounded-full border flex items-center justify-center gap-1.5 text-xs font-mono font-black tracking-wider self-start md:self-auto ${
          isSafe 
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60" 
            : "bg-red-50 dark:bg-red-900/20 text-red-650 dark:text-red-400 border-red-200 dark:border-red-800/60"
        }`}>
          {isSafe ? <ShieldCheck className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
          {isSafe ? "SAFE STATE VERIFIED" : "UNSAFE STATE ALERT"}
        </div>
      </div>

      {/* Safe Sequence Display */}
      {isSafe ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3.5 text-xs font-mono text-emerald-600 dark:text-emerald-400">
          <span className="font-bold flex items-center gap-1">✓ Safe Sequence Cleared (Zero Deadlock Paths found):</span>{" "}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {safeSequence && safeSequence.length > 0 ? (
              safeSequence.map((step, idx) => (
                <span key={`safe-seq-${idx}`} className="flex items-center gap-1 text-[11px]">
                  <span className="bg-white dark:bg-slate-800 border border-emerald-500/30 px-2.5 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-black shadow-2xs">
                    {step}
                  </span>
                  {idx < safeSequence.length - 1 && <span className="opacity-60 font-bold">&gt;&gt;</span>}
                </span>
              ))
            ) : (
              <span className="text-slate-500">Idle ready. No active patients holding clinical assets.</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3.5 text-xs font-mono text-red-650 dark:text-red-400">
          <span className="font-bold">⚠️ Deadlock Risk Warning:</span>{" "}
          {warningAlert || "No clinical safety sequence satisfies active hospital needs. Request assignment denied to prevent systemic clinical deadlock."}
        </div>
      )}

      {/* Active Vectors Display */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Available Vectors */}
        <div className="bg-slate-50 dark:bg-slate-900/45 rounded-2xl p-4 border border-slate-150 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tracking-wider block mb-1 uppercase font-bold">Unallocated Pool</span>
            <span className="text-[9px] text-slate-450 dark:text-slate-500 block font-mono mb-2">Available Regional Reserves [I, O, V, D, T]</span>
          </div>
          
          <div className="grid grid-cols-5 gap-1 font-mono text-center mt-2">
            <div className="bg-white dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200 dark:border-slate-850/60 shadow-2xs">
              <span className="text-[7.5px] text-slate-500 block font-bold" title="ICU Beds">ICU</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{matrix.available?.[0] ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200 dark:border-slate-850/60 shadow-2xs">
              <span className="text-[7.5px] text-slate-500 block font-bold" title="Oxygen Cylinder">OXY</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{matrix.available?.[1] ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200 dark:border-slate-850/60 shadow-2xs">
              <span className="text-[7.5px] text-slate-500 block font-bold" title="Ventilators">VENT</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{matrix.available?.[2] ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200 dark:border-slate-850/60 shadow-2xs">
              <span className="text-[7.5px] text-slate-500 block font-bold" title="Doctors">DOC</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{matrix.available?.[3] ?? 0}</span>
            </div>
            <div className="bg-white dark:bg-slate-850 p-1.5 rounded-lg border border-slate-200 dark:border-slate-850/60 shadow-2xs">
              <span className="text-[7.5px] text-slate-500 block font-bold" title="Operation Theater">OT</span>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{matrix.available?.[4] ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Live Matrix Data Table */}
        <div className="md:col-span-3 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left font-mono text-[11px] h-full whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase text-[9px] font-black">
                <th className="py-2 px-3">Clinical Node</th>
                <th className="py-2 px-3 text-center">Allocated [I, O, V, D, T]</th>
                <th className="py-2 px-3 text-center font-bold">Declared Max [I, O, V, D, T]</th>
                <th className="py-2 px-3 text-center">Needed [I, O, V, D, T]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 bg-white dark:bg-slate-900/20">
              {hasMatrixData ? (
                Object.keys(matrix.maxNeed).map((hId) => {
                  const name = hospitals.find((h) => h.id === hId)?.hospitalName || hospitals.find((h) => h.id === hId)?.name || hId;
                  const alloc = matrix.allocation[hId] || [0, 0, 0, 0, 0];
                  const max = matrix.maxNeed[hId] || [0, 0, 0, 0, 0];
                  const need = matrix.need[hId] || [0, 0, 0, 0, 0];

                  return (
                    <tr key={`matrix-${hId}`} className="hover:bg-slate-50 dark:hover:bg-slate-850/40 transition">
                      <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[130px]" title={name}>
                        {name}
                      </td>
                      <td className="py-2 px-3 text-center text-emerald-600 dark:text-emerald-400 font-bold">
                        [{alloc.slice(0, 5).join(", ")}]
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500 font-semibold">
                        [{max.slice(0, 5).join(", ")}]
                      </td>
                      <td className="py-2 px-3 text-center text-orange-600 dark:text-orange-400 font-bold">
                        [{need.slice(0, 5).join(", ")}]
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="py-4 text-center text-slate-400">No active hospitals synced.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Claim Form */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/35 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 font-mono flex items-center gap-1.5 uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-orange-600" />
            SIMULATE EMERGENCY CLAIM REQUEST (TEST BANKER'S DISPATCH CODES)
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Simulate a patient's emergency package demands below. The Banker's solver will immediately analyze the full regional safety path and state either approval or rejection!
          </p>
        </div>

        <form onSubmit={handleClaimSubmit} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider col-span-2 md:col-span-1 min-w-0">
              <label className="font-mono">TARGET CLINIC</label>
              <select
                required
                value={selectedHospital}
                onChange={(e) => setSelectedHospital(e.target.value)}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:border-orange-500 focus:outline-none w-full truncate font-bold"
              >
                <option value="">Select Hospital</option>
                {hospitals.map((h) => (
                  <option key={`opt-${h.id}`} value={h.id}>
                    {h.hospitalName || h.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <label className="font-mono" title="ICU Beds claim">ICU BEDS (0-5)</label>
              <input
                type="number"
                min="0"
                max="5"
                value={icuClaim}
                onChange={(e) => setIcuClaim(Number(e.target.value))}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <label className="font-mono" title="Oxygen Cylinder claim">OXYGEN (0-10)</label>
              <input
                type="number"
                min="0"
                max="10"
                value={oxyClaim}
                onChange={(e) => setOxyClaim(Number(e.target.value))}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <label className="font-mono" title="Ventilators claim">VENTILATORS (0-5)</label>
              <input
                type="number"
                min="0"
                max="5"
                value={ventClaim}
                onChange={(e) => setVentClaim(Number(e.target.value))}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <label className="font-mono" title="On-duty doctors claim">DOCTORS (0-5)</label>
              <input
                type="number"
                min="0"
                max="5"
                value={docClaim}
                onChange={(e) => setDocClaim(Number(e.target.value))}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-col gap-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <label className="font-mono" title="Operation theater claim">OP THEATERS (0-2)</label>
              <input
                type="number"
                min="0"
                max="2"
                value={otClaim}
                onChange={(e) => setOtClaim(Number(e.target.value))}
                className="bg-white dark:bg-slate-850 border border-slate-250 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 font-mono focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedHospital}
              className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 font-mono font-bold text-white text-xs rounded-xl transition-all disabled:opacity-40 select-none w-full md:w-auto shrink-0 cursor-pointer shadow-xs uppercase tracking-wider"
            >
              {isSubmitting ? "Processing Claims..." : "Submit Vector Claim Check"}
            </button>

            {/* Microfeedback toast info */}
            {feedback && (
              <div className={`px-3 py-1.5 rounded-xl text-xs font-mono shrink border ${
                feedback.success 
                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 font-bold" 
                  : "bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border-red-200 dark:border-red-800/60 font-bold"
              }`}>
                {feedback.text}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
