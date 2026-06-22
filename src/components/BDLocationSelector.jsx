import { BANGLADESH_LOCATIONS } from "../utils/locationData";

export default function BDLocationSelector({
  division,
  district,
  area,
  setDivision,
  setDistrict,
  setArea,
  darkTheme = false,
  simpleLayout = false
}) {
  const divisions = Object.keys(BANGLADESH_LOCATIONS);

  const handleDivisionChange = (e) => {
    const div = e.target.value;
    setDivision(div);
    if (div && BANGLADESH_LOCATIONS[div]) {
      const districts = Object.keys(BANGLADESH_LOCATIONS[div].districts);
      const firstDist = districts[0] || "";
      setDistrict(firstDist);
      if (firstDist && BANGLADESH_LOCATIONS[div].districts[firstDist]) {
        const areas = Object.keys(BANGLADESH_LOCATIONS[div].districts[firstDist].areas);
        setArea(areas[0] || "");
      } else {
        setArea("");
      }
    } else {
      setDistrict("");
      setArea("");
    }
  };

  const handleDistrictChange = (e) => {
    const dist = e.target.value;
    setDistrict(dist);
    if (division && dist && BANGLADESH_LOCATIONS[division]?.districts[dist]) {
      const areas = Object.keys(BANGLADESH_LOCATIONS[division].districts[dist].areas);
      setArea(areas[0] || "");
    } else {
      setArea("");
    }
  };

  const selectClass = darkTheme
    ? "w-full bg-slate-900 border border-slate-800 text-slate-100 rounded-lg px-2.5 py-1.5 focus:border-orange-500 focus:outline-none text-xs font-mono"
    : "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-600 focus:bg-white dark:focus:bg-slate-900 transition-all";

  const labelClass = darkTheme
    ? "text-[10px] text-slate-400 font-mono block mb-1 uppercase tracking-wider"
    : "text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold block mb-1.5 uppercase tracking-wider";

  if (simpleLayout) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Division</label>
          <select value={division} onChange={handleDivisionChange} className={selectClass}>
            <option value="">Select Division</option>
            {divisions.map((div) => (
              <option key={div} value={div}>{div}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>District</label>
          <select value={district} onChange={handleDistrictChange} className={selectClass} disabled={!division}>
            <option value="">Select District</option>
            {division &&
              Object.keys(BANGLADESH_LOCATIONS[division]?.districts || {}).map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Area/Upazila</label>
          <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass} disabled={!district}>
            <option value="">Select Area</option>
            {division &&
              district &&
              Object.keys(BANGLADESH_LOCATIONS[division]?.districts[district]?.areas || {}).map((ar) => (
                <option key={ar} value={ar}>{ar}</option>
              ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-1">
        <label className={labelClass}>DIVISION</label>
        <select value={division} onChange={handleDivisionChange} className={selectClass}>
          <option value="">Select Division</option>
          {divisions.map((div) => (
            <option key={div} value={div}>{div}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>DISTRICT</label>
        <select value={district} onChange={handleDistrictChange} className={selectClass} disabled={!division}>
          <option value="">Select District</option>
          {division &&
            Object.keys(BANGLADESH_LOCATIONS[division]?.districts || {}).map((dist) => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className={labelClass}>AREA / UPAZILA</label>
        <select value={area} onChange={(e) => setArea(e.target.value)} className={selectClass} disabled={!district}>
          <option value="">Select Area/Upazila</option>
          {division &&
            district &&
            Object.keys(BANGLADESH_LOCATIONS[division]?.districts[district]?.areas || {}).map((ar) => (
              <option key={ar} value={ar}>{ar}</option>
            ))}
        </select>
      </div>
    </div>
  );
}
