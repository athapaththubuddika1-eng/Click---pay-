import React, { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import { doc, setDoc } from "firebase/firestore";

export default function Register({ setUser }) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [refCode, setRefCode] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: displayName,
        email,
        balance: 0,
        referredBy: refCode || null,
      });
      setUser(userCredential.user);
      alert("✅ Registration successful!");
    } catch (error) {
      alert("⚠️ Registration failed: " + error.message);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2 text-gray-700">📝 Register</h2>
      <form onSubmit={handleRegister} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Username"
          className="p-2 border rounded-lg"
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <input
          type="email"
          placeholder="Email"
          className="p-2 border rounded-lg"
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="p-2 border rounded-lg"
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          type="text"
          placeholder="Referral Code (optional)"
          className="p-2 border rounded-lg"
          onChange={(e) => setRefCode(e.target.value)}
        />
        <button
          type="submit"
          className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
        >
          Register
        </button>
      </form>
    </div>
  );
}
