import React, { useState, useMemo, useEffect } from 'react';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    User, 
    signInAnonymously, 
    GoogleAuthProvider, 
    signInWithPopup 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from 'firebase/firestore';

// Component Imports
import Header from './components/Header/Header';
import PlayerManager from './components/PlayerManager/PlayerManager';
import TournamentBracket from './components/TournamentBracket/TournamentBracket';
import WinnerDisplay from './components/WinnerDisplay/WinnerDisplay';
import Login from './components/Login/Login';

// Type Imports
import { Player, Match } from './types';

// --- STYLES ---
// Using CSS Modules for component-specific styles
import styles from './App.module.css';

// --- MAIN APP COMPONENT ---
export default function App() {
    // Firebase State
    const [auth, setAuth] = useState<ReturnType<typeof getAuth> | null>(null);
    const [db, setDb] = useState<ReturnType<typeof getFirestore> | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);

    // App State
    const [players, setPlayers] = useState<Player[]>([]);
    const [matches, setMatches] = useState<Match[]>([]);
    const [isBracketGenerated, setIsBracketGenerated] = useState(false);
    const [tournamentWinner, setTournamentWinner] = useState<Player | null>(null);

    // --- FIREBASE SETUP ---
    useEffect(() => {
        // =================================================================
        // PASTE YOUR FIREBASE CONFIGURATION OBJECT HERE
        // You can get this from your Firebase project settings.
        // =================================================================
        const firebaseConfig = {
            apiKey: "AIzaSyDE1D4zdxzb4UIqFjYpRBgrH41vN4MFBfA",
            authDomain: "starwars-ii-tournament.firebaseapp.com",
            projectId: "starwars-ii-tournament",
            storageBucket: "starwars-ii-tournament.firebasestorage.app",
            messagingSenderId: "203627704841",
            appId: "1:203627704841:web:a53d31d25801dea7c07ed8"
        };

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const authInstance = getAuth(app);
        const dbInstance = getFirestore(app);

        setAuth(authInstance);
        setDb(dbInstance);

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
            setUser(currentUser);
            setIsLoadingAuth(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
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
        if(auth) {
            await auth.signOut();
        }
    };


    // --- TOURNAMENT LOGIC ---
    // This logic will be moved to a custom hook in a later step
    const handleAddPlayer = (name: string) => {
        if (isBracketGenerated) {
            alert("Cannot add players after the bracket has been generated. Please reset first.");
            return;
        }
        if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert("Player with this name already exists.");
            return;
        }
        const newPlayer: Player = { id: crypto.randomUUID(), name, userId: user?.uid };
        setPlayers(prev => [...prev, newPlayer]);
    };

    const handleRemovePlayer = (id: string) => {
        if (isBracketGenerated) {
            alert("Cannot remove players after the bracket has been generated. Please reset first.");
            return;
        }
        setPlayers(prev => prev.filter(p => p.id !== id));
    };

    const handleReset = () => {
        setPlayers([]);
        setMatches([]);
        setIsBracketGenerated(false);
        setTournamentWinner(null);
    };

    const handleGenerateBracket = () => {
      if (players.length < 2) {
        alert("Need at least 2 players to generate a bracket.");
        return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const numPlayers = shuffledPlayers.length;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
    
    const roundOnePlayers: (Player | null)[] = [];
    for (let i = 0; i < bracketSize / 2; i++) {
        roundOnePlayers.push(shuffledPlayers[i] || null);
    }
    for (let i = bracketSize / 2; i < numPlayers; i++) {
        const insertIndex = (i - bracketSize / 2) * 2 + 1;
        roundOnePlayers.splice(insertIndex, 0, shuffledPlayers[i]);
    }

    let allMatches: Match[] = [];
    let matchIdCounter = 0;
    
    for (let i = 0; i < roundOnePlayers.length; i += 2) {
        const p1 = roundOnePlayers[i];
        const p2 = roundOnePlayers[i + 1] || {id: 'BYE', name: 'BYE'};
        allMatches.push({
            id: matchIdCounter++,
            round: 1,
            matchInRound: i / 2,
            players: [p1, p2],
            winner: p2.id === 'BYE' ? p1 : null,
        });
    }

    let currentRound = 1;
    let matchesInCurrentRound = allMatches.length;
    while (matchesInCurrentRound > 1) {
        const matchesInNextRound = matchesInCurrentRound / 2;
        for (let i = 0; i < matchesInNextRound; i++) {
            allMatches.push({
                id: matchIdCounter++,
                round: currentRound + 1,
                matchInRound: i,
                players: [null, null],
                winner: null,
            });
        }
        matchesInCurrentRound = matchesInNextRound;
        currentRound++;
    }

    const finalMatches = [...allMatches];
    finalMatches.filter(m => m.round === 1 && m.winner).forEach(match => {
        const nextRound = match.round + 1;
        const nextMatchInRound = Math.floor(match.matchInRound / 2);
        const playerSlot = match.matchInRound % 2;
        const nextMatch = finalMatches.find(m => m.round === nextRound && m.matchInRound === nextMatchInRound);
        if (nextMatch) {
            nextMatch.players[playerSlot] = match.winner;
        }
    });

    setMatches(finalMatches);
    setIsBracketGenerated(true);
    };

    const handleSetWinner = (matchId: number, winner: Player) => {
      let nextMatches = [...matches];
      const matchIndex = nextMatches.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return;
  
      nextMatches[matchIndex].winner = winner;
  
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
      const totalRounds = Math.log2(bracketSize);
      const currentMatch = nextMatches[matchIndex];
  
      if (currentMatch.round === totalRounds) {
          setMatches(nextMatches);
          setTournamentWinner(winner);
          return;
      }
      
      const nextRound = currentMatch.round + 1;
      const nextMatchInRound = Math.floor(currentMatch.matchInRound / 2);
      const nextMatchIndex = nextMatches.findIndex(m => m.round === nextRound && m.matchInRound === nextMatchInRound);
  
      if (nextMatchIndex !== -1) {
          const playerSlot = currentMatch.matchInRound % 2;
          nextMatches[nextMatchIndex].players[playerSlot] = winner;
      }
  
      setMatches(nextMatches);
    };

    // --- RENDER LOGIC ---
    if (isLoadingAuth) {
        return <div className={styles.loading}>Loading Transmission...</div>;
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
                            onAddPlayer={handleAddPlayer}
                            onRemovePlayer={handleRemovePlayer}
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

            {tournamentWinner && <WinnerDisplay winner={tournamentWinner} onClose={handleReset} />}
        </div>
    );
}
