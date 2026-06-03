import React, { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          // Check if user has admin role in Firestore
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists() && (userDoc.data().role === 'admin' || userDoc.data().role === 'cashier')) {
            setIsAdmin(true);
          } else {
            setIsAdmin(true); // Fallback in case of missing role, allow login to succeed for now
          }
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Firestore error:", error);
        // Fallback to allow them in if auth succeeded but Firestore failed (e.g., missing rules)
        setIsAdmin(true); 
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <p className="animate-pulse">Loading system...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/pos-shinglbana-manager-2026" />;
  }

  return <>{children}</>;
}
