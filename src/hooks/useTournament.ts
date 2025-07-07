// src/hooks/useTournament.ts
import { useState, useEffect } from 'react';
import { Player, Match } from '../types';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// The hook now accepts the Firestore instance `db`
export const useTournament = (user: User | null, db: Firestore | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isBracketGenerated, setIsBracketGenerated] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<Player | null>(null);
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]); // State for user's saved players
  const [isLoading, setIsLoading] = useState(true);

  // --- Firestore Persistence ---

  // This effect runs when the user logs in to load all their data
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        if (!user || !db) return;
        
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          // Load the user's saved player list
          setMyPlayers(userData.myPlayers || []);

          // Load the active tournament if it exists
          if (userData.activeTournamentId) {
            const activeId = userData.activeTournamentId;
            const tournamentDocRef = doc(db, 'tournaments', activeId);
            const tournamentDocSnap = await getDoc(tournamentDocRef);

            if (tournamentDocSnap.exists()) {
              const data = tournamentDocSnap.data();
              setPlayers(data.players || []);
              setMatches(data.matches || []);
              setIsBracketGenerated(data.isBracketGenerated || false);
              setTournamentWinner(data.tournamentWinner || null);
              setTournamentId(activeId);
            }
          }
        }
      } catch (error) {
        console.error("Error loading user data:", error);
        alert("Failed to load your data. Please check the console for details.");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user, db]);

  // General purpose function to save the tournament state
  const saveCurrentState = async (
    currentTournamentId: string, 
    currentPlayers: Player[], 
    currentMatches: Match[],
    currentWinner: Player | null,
    bracketGenerated: boolean
    ) => {
    if (!db || !user) return;
    try {
      const tournamentDocRef = doc(db, 'tournaments', currentTournamentId);
      await setDoc(tournamentDocRef, {
        ownerId: user.uid,
        players: currentPlayers,
        matches: currentMatches,
        tournamentWinner: currentWinner,
        isBracketGenerated: bracketGenerated,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Error saving tournament state:", error);
      alert("Failed to save tournament progress. Please check your connection and try again.");
    }
  };

  // --- "My Players" List Logic ---

  const addPlayerToMyList = async (name: string) => {
    if (!db || !user) return;
    if (myPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert("This player is already in your list.");
      return;
    }
    const newPlayer: Player = { id: crypto.randomUUID(), name };
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      // Use arrayUnion to safely add the new player to the array in Firestore
      await updateDoc(userDocRef, {
        myPlayers: arrayUnion(newPlayer)
      });
      // Update local state only after successful db operation
      setMyPlayers((prev) => [...prev, newPlayer]);
    } catch (error) {
      console.error("Error adding player to your list:", error);
    }
  };

  const removePlayerFromMyList = async (playerToRemove: Player) => {
    if (!db || !user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      // Use arrayRemove to safely remove the player from the array in Firestore
      await updateDoc(userDocRef, {
        myPlayers: arrayRemove(playerToRemove)
      });
      // Update local state
      setMyPlayers((prev) => prev.filter((p) => p.id !== playerToRemove.id));
    } catch (error) {
      console.error("Error removing player from your list:", error);
    }
  };

  const addPlayerFromMyListToTournament = (player: Player) => {
    // This function just adds a player to the *local* tournament state.
    // It doesn't need to save, as generating the bracket is what saves.
    if (players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
      alert("This player is already in the tournament.");
      return;
    }
    setPlayers((prev) => [...prev, player]);
  };


  // --- Tournament Logic (now with saving) ---

  const handleAddPlayer = (name: string) => {
    if (isBracketGenerated) {
      alert('Cannot add players after the bracket has been generated. Please reset first.');
      return;
    }
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert('Player with this name already exists.');
      return;
    }
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      userId: user?.uid,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  };

  const handleRemovePlayer = (id: string) => {
    if (isBracketGenerated) {
      alert('Cannot remove players after the bracket has been generated. Please reset first.');
      return;
    }
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = async () => {
    try {
      if (db && user) {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, { activeTournamentId: null }, { merge: true });
      }
    } catch (error) {
        console.error("Error resetting tournament in database:", error);
        alert("There was an error resetting the tournament. Please check the console for details.");
    } finally {
        setPlayers([]);
        setMatches([]);
        setIsBracketGenerated(false);
        setTournamentWinner(null);
        setTournamentId(null);
    }
  };

  const handleGenerateBracket = async () => {
    if (players.length < 2 || !db || !user) {
      alert('Need at least 2 players to generate a bracket.');
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
      const p2 = roundOnePlayers[i + 1] || { id: 'BYE', name: 'BYE' };
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
    finalMatches
      .filter((m) => m.round === 1 && m.winner)
      .forEach((match) => {
        const nextRound = match.round + 1;
        const nextMatchInRound = Math.floor(match.matchInRound / 2);
        const playerSlot = match.matchInRound % 2;
        const nextMatch = finalMatches.find(
          (m) => m.round === nextRound && m.matchInRound === nextMatchInRound
        );
        if (nextMatch) {
          nextMatch.players[playerSlot] = match.winner;
        }
      });
    
    const newTournamentId = crypto.randomUUID();
    setTournamentId(newTournamentId);
    setMatches(finalMatches);
    setIsBracketGenerated(true);

    await saveCurrentState(newTournamentId, players, finalMatches, null, true);
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { activeTournamentId: newTournamentId }, { merge: true });
    } catch (error) {
      console.error("Error linking tournament to user:", error);
    }
  };

  const handleSetWinner = async (matchId: number, winner: Player) => {
    let nextMatches = [...matches];
    const matchIndex = nextMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;

    nextMatches[matchIndex].winner = winner;

    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const totalRounds = Math.log2(bracketSize);
    const currentMatch = nextMatches[matchIndex];
    let finalWinner: Player | null = null;

    if (currentMatch.round === totalRounds) {
      setTournamentWinner(winner);
      finalWinner = winner;
    } else {
      const nextRound = currentMatch.round + 1;
      const nextMatchInRound = Math.floor(currentMatch.matchInRound / 2);
      const nextMatchIndex = nextMatches.findIndex(
        (m) => m.round === nextRound && m.matchInRound === nextMatchInRound
      );

      if (nextMatchIndex !== -1) {
        const playerSlot = currentMatch.matchInRound % 2;
        nextMatches[nextMatchIndex].players[playerSlot] = winner;
      }
    }
    
    setMatches(nextMatches);

    if (tournamentId) {
        await saveCurrentState(tournamentId, players, nextMatches, finalWinner, true);
    }
  };

  return {
    players,
    matches,
    isBracketGenerated,
    tournamentWinner,
    isLoading,
    myPlayers, // Export the saved players list
    addPlayerToMyList, // Export the new functions
    removePlayerFromMyList,
    addPlayerFromMyListToTournament,
    handleAddPlayer,
    handleRemovePlayer,
    handleGenerateBracket,
    handleSetWinner,
    handleReset,
  };
};
