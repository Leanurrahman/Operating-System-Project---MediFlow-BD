import { useState, useEffect } from "react";
import { X, Camera, Shield, Mail, Phone, User, Activity, CheckCircle, Loader, MapPin } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";

export default function ProfileModal({ isOpen, onClose, currentUser, onUpdateProfile }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [locationStr, setLocationStr] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadProgress, setUploadProgress] = useState("");

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || "");
      setPhone(currentUser.phone || "");
      setPhotoPreview(currentUser.photoURL || "");
      setBloodGroup(currentUser.bloodGroup || "O+");
      setLocationStr(currentUser.location || "");
      setPhotoFile(null);
      setErrorMsg("");
      setUploadProgress("");
    }
  }, [currentUser, isOpen]);

  if (!isOpen || !currentUser) return null;

  // Render Role Badge
  const getRoleLabel = (role) => {
    switch (role) {
      case "hospital_admin":
        return { text: "Hospital Admin", color: "bg-red-50 text-red-700 border-red-200" };
      case "ambulance_operator":
        return { text: "Ambulance Operator", color: "bg-blue-50 text-blue-700 border-blue-200" };
      case "patient":
      default:
        return { text: "Patient", color: "bg-orange-50 text-orange-700 border-orange-200" };
    }
  };

  const roleTheme = getRoleLabel(currentUser.role);

  // File Handle
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validation: Image type
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file (PNG, JPG, JPEG).");
      return;
    }

    // Validation: Max size 2MB
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Image size exceeds the 2MB boundary limit.");
      return;
    }

    setPhotoFile(file);
    setErrorMsg("");

    // Read local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Image upload with storage -> Base64 fallback pattern
  const uploadImage = async (file) => {
    const uploadWithTimeout = new Promise(async (resolve, reject) => {
      // Fast timeout to prevent long Firebase SDK retry hanging
      const timeoutId = setTimeout(() => {
        reject(new Error("Firebase Storage upload timed out."));
      }, 1500);

      try {
        const storageRef = ref(storage, `profiles/${currentUser.uid}_${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        clearTimeout(timeoutId);
        resolve(downloadURL);
      } catch (err) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });

    try {
      setUploadProgress("Uploading photo to storage...");
      return await uploadWithTimeout;
    } catch (err) {
      console.warn("Firebase Storage upload timed out, disabled, or failed. Using Base64 fallback.", err);
      setUploadProgress("Encoding to local data storage...");
      
      // Fallback: convert file to Base64 data string to save securely in Firestore
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
      });
    }
  };

  // Save changes
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Validate Name (required)
    if (!name.trim()) {
      setErrorMsg("Full Name is required.");
      return;
    }

    // Validate Phone number (valid bangladeshi or digits)
    const normalizedPhone = phone.trim();
    if (normalizedPhone) {
      const banglaPhoneRegex = /^(\+?88)?01[3-9]\d{8}$/;
      // allow simple digit validation or standard format
      if (!banglaPhoneRegex.test(normalizedPhone) && (normalizedPhone.length < 5 || !/^\+?\d+$/.test(normalizedPhone))) {
        setErrorMsg("Please provide a valid phone number (e.g., 017XXXXXXXX).");
        return;
      }
    }

    setIsSaving(true);
    setUploadProgress("Updating profile details...");

    try {
      let finalPhotoURL = photoPreview;

      // Upload if there is a new selected file
      if (photoFile) {
        finalPhotoURL = await uploadImage(photoFile);
      }

      setUploadProgress("Finalizing updates in database...");
      
      const userRef = doc(db, "users", currentUser.uid);
      const updateData = {
        name: name.trim(),
        phone: normalizedPhone,
        photoURL: finalPhotoURL,
        bloodGroup: bloodGroup,
        location: locationStr.trim(),
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updateData);

      // Trigger instant UI state sync callback
      onUpdateProfile({
        ...currentUser,
        ...updateData
      });

      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
      setErrorMsg(err.message || "An error occurred while saving changes.");
    } finally {
      setIsSaving(false);
      setUploadProgress("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Dialog container */}
      <div 
        className="relative w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
        id="profile-management-modal"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-100" />
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider">MediFlow ID Profile</h3>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-orange-100 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          
          {/* Avatar selector representation */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full border-4 border-slate-50 bg-slate-100 shadow-inner overflow-hidden flex items-center justify-center relative">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-3xl font-extrabold text-slate-400 font-mono">
                    {name ? name.charAt(0).toUpperCase() : "?"}
                  </span>
                )}
              </div>
              
              <label 
                htmlFor="profile-photo-upload" 
                className="absolute bottom-0 right-0 p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-full shadow-md cursor-pointer transition transform hover:scale-105"
                title="Change active profile logo"
              >
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  id="profile-photo-upload"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            
            <div className="text-center">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase border ${roleTheme.color}`}>
                {roleTheme.text}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Role Type Ident</p>
            </div>
          </div>

          {/* Validation or System error display */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-mono font-semibold flex items-start gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 animate-ping"></span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Core Input controls */}
          <div className="space-y-3.5 text-xs">
            {/* Display static read-only emails */}
            <div>
              <label className="text-[10px] text-slate-400 font-mono block mb-1">EMAIL IDENTITY (SECURE & READ-ONLY):</label>
              <div className="flex items-center gap-2.5 px-3.5 py-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-500 font-mono">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.email || "No Email Verified"}</span>
              </div>
            </div>

            {/* Display Name Input */}
            <div>
              <label htmlFor="edit-profile-name" className="text-[10px] text-slate-500 font-mono font-bold block mb-1">FULL NAME:</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  id="edit-profile-name"
                  required
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-hidden font-medium transition"
                />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label htmlFor="edit-profile-phone" className="text-[10px] text-slate-500 font-mono font-bold block mb-1">PHONE NUMBER:</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="tel" 
                  id="edit-profile-phone"
                  placeholder="e.g. 01712345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-hidden font-medium font-mono transition"
                />
              </div>
            </div>

            {/* Location Input */}
            <div>
              <label htmlFor="edit-profile-location" className="text-[10px] text-slate-500 font-mono font-bold block mb-1">LOCATION / FULL ADDRESS:</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  id="edit-profile-location"
                  placeholder="e.g. Mirpur, Dhaka, Bangladesh"
                  value={locationStr}
                  onChange={(e) => setLocationStr(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-hidden font-medium transition"
                />
              </div>
            </div>

            {/* Secondary Attributes Area - Account Status and Blood Group Dropdown */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-[10px] text-slate-400 font-mono block mb-1">ACCOUNT STATUS:</label>
                <div className="flex items-center gap-1.5 px-3.5 py-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-600 font-mono">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="capitalize text-[11px] font-bold">{currentUser.status || "Active"}</span>
                </div>
              </div>

              <div>
                <label htmlFor="edit-profile-blood" className="text-[10px] text-slate-550 font-mono font-bold block mb-1">BLOOD GROUP:</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3.5 w-3.5 h-3.5 text-red-500 pointer-events-none" />
                  <select 
                    id="edit-profile-blood"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2.5 border border-slate-200 bg-white text-slate-800 rounded-xl focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-hidden font-bold transition text-xs cursor-pointer"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Upload or save status indicator overlay */}
          {uploadProgress && (
            <div className="text-[10px] text-center font-mono font-bold text-orange-600 animate-pulse bg-orange-50/50 p-2 rounded-xl border border-orange-200/45">
              {uploadProgress}
            </div>
          )}

          {/* Operational button triggers */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-xl font-medium cursor-pointer transition disabled:opacity-50 text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/10 cursor-pointer transition disabled:opacity-50"
            >
              {isSaving ? <Loader className="w-4 h-4 animate-spin text-white" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
