/**
 * Formats a Firestore timestamp, JS Date, ISO string, etc.
 * Supports:
 * - Firestore Timestamp (.toDate() or .seconds)
 * - JS Date
 * - ISO string / unix epoch
 * - missing/null fallback as "Recently completed"
 */
export function formatFirestoreTimestamp(timestamp) {
  if (!timestamp) return "Recently completed";
  try {
    // 1. If it's a Firestore Timestamp (has toDate method)
    if (timestamp && typeof timestamp.toDate === "function") {
      return timestamp.toDate().toLocaleString();
    }
    // 2. If it's a Firestore Timestamp without toDate but has seconds/nanoseconds (raw object)
    if (timestamp && typeof timestamp.seconds === "number") {
      return new Date(timestamp.seconds * 1000).toLocaleString();
    }
    // 3. If it's a JS Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleString();
    }
    // 4. If it's an ISO string, serializable date or number milliseconds
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString();
    }
  } catch (e) {
    console.error("Error formatting timestamp:", e);
  }
  return "Recently completed";
}
