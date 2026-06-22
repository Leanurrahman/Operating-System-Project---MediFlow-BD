import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-bootstrap mechanism for development convenience
  const ensureUserProfile = async (user, fallbackRole = null, extraData = {}) => {
    try {
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      const expectedRole = localStorage.getItem("expected_role");
      let targetRole = fallbackRole;
      let name = user.displayName || (user.email ? user.email.split("@")[0] : "User");
      
      if (user.email === "osadmin22@gmail.com") {
        targetRole = "hospital_admin";
        name = "Dr. Leanur Rahman (Admin)";
      } else if (user.email === "operator01@gmail.com") {
        targetRole = "ambulance_operator";
        name = "Ambulance Operator";
      } else if (user.email === "operator@gmail.com") {
        targetRole = "ambulance_operator";
        name = "Kamil Ahsan (Operator)";
      }

      if (!targetRole) {
        targetRole = "patient";
      }

     if (userDocSnap.exists()) {
  const existingData = userDocSnap.data();

  if (user.email === "osadmin22@gmail.com" && existingData.role !== "hospital_admin") {
    const updatedProfile = {
      ...existingData,
      uid: user.uid,
      email: user.email,
      name: "Dr. Leanur Rahman (Admin)",
      role: "hospital_admin",
      status: "active",
    };

    await setDoc(userDocRef, updatedProfile, { merge: true });
    return updatedProfile;
  }

  return existingData;
}

      let newProfile;
      if (user.email === "operator01@gmail.com" || targetRole === "ambulance_operator") {
        newProfile = {
          uid: user.uid,
          name: "Ambulance Operator",
          email: user.email,
          role: "ambulance_operator",
          status: "active",
          ambulanceId: "",
          createdAt: serverTimestamp()
        };
      } else {
        newProfile = {
          uid: user.uid,
          name: extraData.name || name,
          email: user.email || "",
          role: targetRole,
          status: "active",
          createdAt: new Date().toISOString(),
          ...extraData
        };
      }

      await setDoc(userDocRef, newProfile);
      return newProfile;
    } catch (e) {
      console.error("Error ensuring user profile in Firestore:", e);
      // Return a structural profile even if permission-denied occurred in initial load
      let bootstrappedRole = fallbackRole || "patient";
      if (user.email === "osadmin22@gmail.com") {
        bootstrappedRole = "hospital_admin";
      } else if (user.email === "operator01@gmail.com" || user.email === "operator@gmail.com") {
        bootstrappedRole = "ambulance_operator";
      }
      
      return {
        uid: user.uid,
        name: extraData.name || (user.email === "operator01@gmail.com" ? "Ambulance Operator" : "User"),
        email: user.email || "",
        role: bootstrappedRole,
        status: "active",
        createdAt: new Date().toISOString(),
        ...extraData
      };
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        // Enforce matching profile exists
        const profile = await ensureUserProfile(user);
        
        // Strict role validation based on expected login role tracker
        const expectedRole = localStorage.getItem("expected_role");
        let isMatch = true;
        if (expectedRole) {
          if (expectedRole === "patient" && profile.role !== "patient") isMatch = false;
          if (expectedRole === "admin" && profile.role !== "hospital_admin") isMatch = false;
          if (expectedRole === "operator" && profile.role !== "ambulance_operator") isMatch = false;
        }

        if (!isMatch) {
          await signOut(auth);
          setCurrentUser(null);
          localStorage.removeItem("expected_role");
        } else {
          setCurrentUser(profile);
          localStorage.removeItem("expected_role");
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Real Login Flow
  const login = async (email, password) => {
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const profile = await ensureUserProfile(credential.user);
      
      const expectedRole = localStorage.getItem("expected_role");
      let isMatch = true;
      let errorMessage = "This account is not authorized to access this section.";

      if (expectedRole) {
        if (expectedRole === "patient" && profile.role !== "patient") {
          isMatch = false;
          errorMessage = "This account is not allowed to login as Patient.";
        }
        if (expectedRole === "admin" && profile.role !== "hospital_admin") {
          isMatch = false;
          errorMessage = "This account is not allowed to login as Hospital Admin.";
        }
        if (expectedRole === "operator" && profile.role !== "ambulance_operator") {
          isMatch = false;
          errorMessage = "This account is not allowed";
        }
      }

      if (!isMatch) {
        await signOut(auth);
        setCurrentUser(null);
        localStorage.removeItem("expected_role");
        const mismatchErr = new Error(errorMessage);
        mismatchErr.code = "auth/mismatched-role";
        throw mismatchErr;
      }

      setCurrentUser(profile);
      setLoading(false);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Real Registration Flow for Public Patient
  const registerPatient = async ({ name, email, phone, password, location, bloodGroup }) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const extraData = {
        name,
        phone,
        location: location || "Dhaka",
        bloodGroup: bloodGroup || "O+",
      };
      const profile = await ensureUserProfile(credential.user, "patient", extraData);
      setCurrentUser(profile);
      setLoading(false);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  // Sign out flow
  const logout = async () => {
    setLoading(true);
    setCurrentUser(null);
    await signOut(auth);
    setLoading(false);
  };

  const value = {
    currentUser,
    loading,
    login,
    registerPatient,
    logout,
    setCurrentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
