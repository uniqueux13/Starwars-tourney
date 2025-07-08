// src/hooks/useTournament.ts
import { useState, useEffect, useCallback } from 'react';
import { Player, Match } from '../types';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  increment // Import the increment utility
} from 'firebase/firestore';
import { UserProfile } from './useUserProfile';
import { TournamentRules } from '../components/TournamentSettings/TournamentSettings';

export interface Tournament {
  id: string;
  name: string;
  organizerId: string;
  organizerUsername: string;
  createdAt: Date;
  status: 'setup' | 'in_progress' | 'completed';
  players: Player[];
  matches: Match[];
  isBracketGenerated: boolean;
  tournamentWinner: Player | null;
  inviteToken?: string;
  rules?: TournamentRules;
}

export const useTournament = (user: User | null, userProfile: UserProfile | null, db: Firestore | null, inviteToken: string | null) => {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
  const [myPlayers, setMyPlayers] = useState<Player[]>([]); // Re-added this state
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isKickingPlayerId, setIsKickingPlayerId] = useState<string | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const joinTournament = useCallback(async (id: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining(id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', id);
      const playerToAdd: Player = { id: user.uid, name: userProfile.username, userId: user.uid };
      await updateDoc(tournamentDocRef, { players: arrayUnion(playerToAdd) });
      await fetchOpenTournaments();
    } catch (error) {
      console.error("Error joining tournament:", error);
    } finally {
      setIsJoining(null);
    }
  }, [db, user, userProfile]);

  const joinTournamentByInvite = useCallback(async (token: string) => {
    if (!db || !user || !userProfile) return;
    setIsJoining('invite');
    try {
        const tournamentsCol = collection(db, 'tournaments');
        const q = query(tournamentsCol, where("inviteToken", "==", token), where("status", "==", "setup"));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            alert("This invitation is invalid or has expired.");
            return;
        }
        const tournamentDoc = querySnapshot.docs[0];
        await joinTournament(tournamentDoc.id);
    } catch (error) {
        console.error("Error joining by invite:", error);
    } finally {
        setIsJoining(null);
    }
  }, [db, user, userProfile, joinTournament]);

  const fetchOpenTournaments = useCallback(async () => {
    if (!db) return;
    const tournamentsCol = collection(db, 'tournaments');
    const q = query(tournamentsCol, where("status", "==", "setup"));
    const querySnapshot = await getDocs(q);
    const tournaments: Tournament[] = [];
    querySnapshot.forEach((doc) => {
      tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
    });
    setOpenTournaments(tournaments);
  }, [db]);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        if (!user || !db || !userProfile) return;
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        await fetchOpenTournaments();
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setMyPlayers(userData.myPlayers || []); // Re-added this line
          if (userData.activeTournamentId) {
            const activeId = userData.activeTournamentId;
            const tournamentDocRef = doc(db, 'tournaments', activeId);
            const tournamentDocSnap = await getDoc(tournamentDocRef);
            if (tournamentDocSnap.exists()) {
              setActiveTournament({ id: activeId, ...tournamentDocSnap.data() } as Tournament);
            }
          } else {
            setActiveTournament(null);
          }
        }
        if (inviteToken) {
            await joinTournamentByInvite(inviteToken);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadUserData();
  }, [user, db, userProfile, fetchOpenTournaments, inviteToken, joinTournamentByInvite]);

  // --- Re-added "My Players" List Logic ---
  const addPlayerToMyList = async (name: string) => {
    if (!db || !user) return;
    if (myPlayers.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      alert("This player is already in your list.");
      return;
    }
    const newPlayer: Player = { id: crypto.randomUUID(), name };
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { myPlayers: arrayUnion(newPlayer) });
      setMyPlayers((prev) => [...prev, newPlayer]);
    } catch (error) {
      console.error("Error adding player to your list:", error);
    }
  };

  const removePlayerFromMyList = async (playerToRemove: Player) => {
    if (!db || !user) return;
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, { myPlayers: arrayRemove(playerToRemove) });
      setMyPlayers((prev) => prev.filter((p) => p.id !== playerToRemove.id));
    } catch (error) {
      console.error("Error removing player from your list:", error);
    }
  };

  const addPlayerFromMyListToTournament = (player: Player) => {
    if (activeTournament?.players.some((p) => p.name.toLowerCase() === player.name.toLowerCase())) {
      alert("This player is already in the tournament.");
      return;
    }
    // This function should now update the activeTournament state
    setActiveTournament(prev => {
        if (!prev) return null;
        return { ...prev, players: [...prev.players, player] };
    });
  };

  const saveTournamentSettings = async (settings: TournamentRules) => {
    if (!db || !activeTournament) return;
    setIsSavingSettings(true);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { rules: settings });
      setActiveTournament(prev => prev ? { ...prev, rules: settings } : null);
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const generateInviteLink = async (): Promise<string | null> => {
    if (!db || !activeTournament) return null;
    try {
        const token = crypto.randomUUID().slice(0, 8);
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        await updateDoc(tournamentDocRef, { inviteToken: token });
        setActiveTournament(prev => prev ? { ...prev, inviteToken: token } : null);
        return `${window.location.origin}?invite=${token}`;
    } catch (error) {
        console.error("Error generating invite link:", error);
        return null;
    }
  };

  const kickPlayer = async (playerToKick: Player) => {
    if (!db || !activeTournament || activeTournament.status !== 'setup') return;
    setIsKickingPlayerId(playerToKick.id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { players: arrayRemove(playerToKick) });
      setActiveTournament(prev => prev ? { ...prev, players: prev.players.filter(p => p.id !== playerToKick.id) } : null);
      const kickedUserDocRef = doc(db, 'users', playerToKick.id);
      const kickedUserDocSnap = await getDoc(kickedUserDocRef);
      if (kickedUserDocSnap.exists() && kickedUserDocSnap.data().activeTournamentId === activeTournament.id) {
          await updateDoc(kickedUserDocRef, { activeTournamentId: null });
      }
    } catch (error) {
      console.error("Error kicking player:", error);
    } finally {
      setIsKickingPlayerId(null);
    }
  };

  const startTournament = async () => {
    if (!activeTournament || activeTournament.players.length < 2 || !db) return;
    setIsStarting(true);
    try {
      const { players, id: tournamentId } = activeTournament;
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
        allMatches.push({ id: matchIdCounter++, round: 1, matchInRound: i / 2, players: [p1, p2], winner: p2.id === 'BYE' ? p1 : null });
      }
      let currentRound = 1;
      let matchesInCurrentRound = allMatches.length;
      while (matchesInCurrentRound > 1) {
        const matchesInNextRound = matchesInCurrentRound / 2;
        for (let i = 0; i < matchesInNextRound; i++) {
          allMatches.push({ id: matchIdCounter++, round: currentRound + 1, matchInRound: i, players: [null, null], winner: null });
        }
        matchesInCurrentRound = matchesInNextRound;
        currentRound++;
      }
      const finalMatches = [...allMatches];
      finalMatches.filter((m) => m.round === 1 && m.winner).forEach((match) => {
        const nextRound = match.round + 1;
        const nextMatchInRound = Math.floor(match.matchInRound / 2);
        const playerSlot = match.matchInRound % 2;
        const nextMatch = finalMatches.find((m) => m.round === nextRound && m.matchInRound === nextMatchInRound);
        if (nextMatch) {
          nextMatch.players[playerSlot] = match.winner;
        }
      });
      const tournamentDocRef = doc(db, 'tournaments', tournamentId);
      const batch = writeBatch(db);
      batch.update(tournamentDocRef, { matches: finalMatches, isBracketGenerated: true, status: 'in_progress' });
      players.forEach(player => {
        const playerDocRef = doc(db, 'users', player.id);
        batch.update(playerDocRef, { activeTournamentId: tournamentId });
      });
      await batch.commit();
      setActiveTournament(prev => prev ? { ...prev, matches: finalMatches, isBracketGenerated: true, status: 'in_progress' } : null);
    } catch (error) {
      console.error("Error starting tournament:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const deleteTournament = async () => {
    if (!db || !user || !activeTournament) return;
    setIsDeleting(true);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      const userDocRef = doc(db, 'users', user.uid);
      const batch = writeBatch(db);
      batch.delete(tournamentDocRef);
      batch.update(userDocRef, { activeTournamentId: null });
      await batch.commit();
      setActiveTournament(null);
      await fetchOpenTournaments();
    } catch (error) {
      console.error("Error deleting tournament:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const manageTournament = async (id: string) => {
    if (!db || !user) return;
    const tournamentDocRef = doc(db, 'tournaments', id);
    const userDocRef = doc(db, 'users', user.uid);
    const batch = writeBatch(db);
    batch.update(userDocRef, { activeTournamentId: id });
    await batch.commit();
    const tournamentDocSnap = await getDoc(tournamentDocRef);
    if (tournamentDocSnap.exists()) {
      setActiveTournament({ id, ...tournamentDocSnap.data() } as Tournament);
    }
  };

  const createTournament = async (name: string) => {
    if (!db || !user || !userProfile) return;
    setIsLoading(true);
    const newTournamentId = crypto.randomUUID();
    const tournamentDocRef = doc(db, 'tournaments', newTournamentId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const organizerAsPlayer: Player = { id: user.uid, name: userProfile.username, userId: user.uid };
      const newTournamentData: Omit<Tournament, 'id'> = {
        name: name,
        organizerId: user.uid,
        organizerUsername: userProfile.username,
        createdAt: new Date(),
        status: 'setup',
        players: [organizerAsPlayer],
        matches: [],
        isBracketGenerated: false,
        tournamentWinner: null,
        rules: { description: '', schedule: '', bannedItems: [] }
      };
      const batch = writeBatch(db);
      batch.set(tournamentDocRef, newTournamentData);
      batch.set(userDocRef, { activeTournamentId: newTournamentId }, { merge: true });
      batch.update(userDocRef, { 'stats.tournamentsHosted': increment(1) });
      await batch.commit();
      setActiveTournament({ id: newTournamentId, ...newTournamentData });
    } catch (error) {
      console.error("Error creating tournament:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const setWinner = async (matchId: number, winner: Player) => {
    if (!activeTournament || !db) return;
    let nextMatches = [...activeTournament.matches];
    const matchIndex = nextMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;
    nextMatches[matchIndex].winner = winner;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(activeTournament.players.length)));
    const totalRounds = Math.log2(bracketSize);
    const currentMatch = nextMatches[matchIndex];
    let finalWinner: Player | null = null;
    let newStatus = activeTournament.status;
    if (currentMatch.round === totalRounds) {
      finalWinner = winner;
      newStatus = 'completed';
      const batch = writeBatch(db);
      const winnerStatsRef = doc(db, 'users', winner.id);
      batch.update(winnerStatsRef, { 'stats.tournamentsWon': increment(1) });
      activeTournament.players.forEach(player => {
        if (player) {
            const playerStatsRef = doc(db, 'users', player.id);
            batch.update(playerStatsRef, { 'stats.tournamentsPlayed': increment(1) });
        }
      });
      await batch.commit();
    } else {
      const nextRound = currentMatch.round + 1;
      const nextMatchInRound = Math.floor(currentMatch.matchInRound / 2);
      const nextMatchIndex = nextMatches.findIndex((m) => m.round === nextRound && m.matchInRound === nextMatchInRound);
      if (nextMatchIndex !== -1) {
        const playerSlot = currentMatch.matchInRound % 2;
        nextMatches[nextMatchIndex].players[playerSlot] = winner;
      }
    }
    setActiveTournament(prev => prev ? { ...prev, matches: nextMatches, tournamentWinner: finalWinner, status: newStatus } : null);
    const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
    await updateDoc(tournamentDocRef, {
        matches: nextMatches,
        tournamentWinner: finalWinner,
        status: newStatus
    });
  };

  const leaveTournament = async () => {
    if (!db || !user || !activeTournament) return;
    if (activeTournament.status === 'setup' && activeTournament.players.some(p => p.id === user.uid)) {
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        const playerToRemove = activeTournament.players.find(p => p.id === user.uid);
        if (playerToRemove) {
            await updateDoc(tournamentDocRef, { players: arrayRemove(playerToRemove) });
        }
    }
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { activeTournamentId: null });
    setActiveTournament(null);
    await fetchOpenTournaments();
  };

  return {
    activeTournament,
    openTournaments,
    myPlayers, // Re-added this
    isLoading,
    isJoining,
    isStarting,
    isDeleting,
    isKickingPlayerId,
    isSavingSettings,
    createTournament,
    joinTournament,
    startTournament,
    deleteTournament,
    kickPlayer,
    manageTournament,
    generateInviteLink,
    saveTournamentSettings,
    addPlayerToMyList, // Re-added this
    removePlayerFromMyList, // Re-added this
    addPlayerFromMyListToTournament, // Re-added this
    setWinner,
    leaveTournament
  };
};
