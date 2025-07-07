import React, { useState, useEffect } from "react";

// Firebase Imports
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Component Imports
import Header from "./components/Header/Header";
import PlayerManager from "./components/PlayerManager/PlayerManager";
import TournamentBracket from "./components/TournamentBracket/TournamentBracket";
import WinnerDisplay from "./components/WinnerDisplay/WinnerDisplay";
import Login from "./components/Login/Login";

// Hook Imports
import { useTournament } from "./hooks/useTournament";

// --- STYLES ---
import styles from "./app.module.css";

// --- Firebase Config Validation (Vite) ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

const isFirebaseConfigValid = 
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId;

// --- MAIN APP COMPONENT ---
export default function App() {
  // Firebase State
  const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Custom hook now provides all tournament and player list logic
  const {
    players,
    matches,
    isBracketGenerated,
    tournamentWinner,
    isLoading: isLoadingTournament,
    myPlayers,
    addPlayerToMyList,
    removePlayerFromMyList,
    addPlayerFromMyListToTournament,
    handleAddPlayer,
    handleRemovePlayer,
    handleGenerateBracket,
    handleSetWinner,
    handleReset,
  } = useTournament(user, db);

  // --- FIREBASE SETUP ---
  useEffect(() => {
    if (isFirebaseConfigValid) {
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);

      setAuth(authInstance);
      setDb(dbInstance); 

      const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
        setUser(currentUser);
        setIsLoadingAuth(false);
      });

      return () => unsubscribe();
    } else {
        setIsLoadingAuth(false);
    }
  }, []);

  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error during sign-in:", error);
    }
  };

  const handleLogout = async () => {
    if (auth) {
      await handleReset();
      await auth.signOut();
    }
  };

  // --- RENDER LOGIC ---
  const isLoading = isLoadingAuth || isLoadingTournament;

  if (isLoading) {
    return <div className={styles.loading}>Loading Transmission...</div>;
  }
  
  if (!isFirebaseConfigValid) {
      return (
          <div className={styles.errorContainer}>
              <h1>Configuration Error</h1>
              <p>Firebase configuration is missing or incomplete.</p>
              <p>Please ensure your <code>.env</code> file is set up correctly with the <code>VITE_</code> prefix for local development, or that environment variables are set on your deployment server.</p>
          </div>
      )
  }

  return (
    <div className={styles.app}>
      <Header user={user} onLogout={handleLogout} />

      {!user ? (
        <Login onLogin={handleLogin} />
      ) : (
        <>
          {!isBracketGenerated ? (
            <PlayerManager
              players={players}
              myPlayers={myPlayers}
              onAddPlayer={handleAddPlayer}
              onRemovePlayer={handleRemovePlayer}
              addPlayerToMyList={addPlayerToMyList}
              removePlayerFromMyList={removePlayerFromMyList}
              addPlayerFromMyListToTournament={addPlayerFromMyListToTournament}
              onGenerate={handleGenerateBracket}
              onReset={handleReset}
            />
          ) : (
            <div className={styles.resetContainer}>
              <button onClick={handleReset} className={styles.button}>
                Reset Tournament
              </button>
            </div>
          )}

          <TournamentBracket matches={matches} onSetWinner={handleSetWinner} />
        </>
      )}

      {tournamentWinner && (
        <WinnerDisplay winner={tournamentWinner} onClose={handleReset} />
      )}
    </div>
  );
}
