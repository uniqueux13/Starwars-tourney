// src/hooks/useTournament.ts
import { useState, useEffect, useCallback } from 'react';
import { Player, Match } from '../types';
import { User } from 'firebase/auth';
import { 
  Firestore, 
  doc, 
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  increment,
  onSnapshot,
  Unsubscribe,
  FirestoreError
} from 'firebase/firestore';
import { UserProfile } from './useUserProfile';
import { TournamentRules } from '../components/TournamentSettings/TournamentSettings';
import { TournamentType } from '../components/CreateTournamentModal/CreateTournamentModal';
import { Team, TeamMember } from './useTeams';
import { generateBracket } from './useBracketLogic';

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  organizerId: string;
  organizerUsername: string;
  organizerPhotoURL?: string | null;
  createdAt: Date;
  status: 'setup' | 'in_progress' | 'completed';
  players: (Player | Team)[];
  matches: Match[];
  isBracketGenerated: boolean;
  tournamentWinner: Player | Team | null;
  inviteToken?: string;
  rules?: TournamentRules;
}

function isTeam(participant: any): participant is Team {
    return (participant as Team).members !== undefined;
}

function getParticipantId(participant: Player | TeamMember): string {
    return 'id' in participant ? participant.id : participant.uid;
}

const teamColors = ['#3b82f6', '#22c55e', '#ef4444', '#f97316', '#8b5cf6', '#ec4899', '#14b8a6', '#facc15'];

export const useTournament = (user: User | null, userProfile: UserProfile | null, db: Firestore | null, inviteToken: string | null) => {
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [openTournaments, setOpenTournaments] = useState<Tournament[]>([]);
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
      const userDocRef = doc(db, 'users', user.uid);
      
      const tournamentSnap = await getDoc(tournamentDocRef);
      if (!tournamentSnap.exists()) {
          alert("This tournament no longer exists.");
          return;
      }
      const tournamentData = tournamentSnap.data() as Tournament;
      
      if (tournamentData.players && tournamentData.players.some(p => p.id === user.uid)) {
          alert("You are already registered for this tournament.");
          return;
      }
      
      const batch = writeBatch(db);

      if (tournamentData.type === '4v4 HvV') {
        const teamName = `${userProfile.username}'s Team`;
        const teamDocRef = doc(db, 'tournaments', id, 'teams', user.uid);
        
        const captainAsMember: TeamMember = {
            uid: user.uid,
            username: userProfile.username,
            photoURL: userProfile.photoURL ?? null
        };

        const newTeam: Team = {
            id: user.uid,
            name: teamName,
            captainId: user.uid,
            members: [captainAsMember],
            tournamentId: id,
            color: teamColors[Math.floor(Math.random() * teamColors.length)]
        };

        batch.set(teamDocRef, newTeam);
        batch.update(tournamentDocRef, { players: arrayUnion(newTeam) });

      } else {
        const playerToAdd: Player = { 
          id: user.uid, 
          name: userProfile.username, 
          userId: user.uid,
          photoURL: userProfile.photoURL ?? null
        };
        batch.update(tournamentDocRef, { players: arrayUnion(playerToAdd) });
      }

      batch.update(userDocRef, { activeTournamentId: id });
      await batch.commit();

    } catch (error) {
      console.error("Error joining tournament:", error);
      if (error instanceof FirestoreError && error.code === 'permission-denied') {
        alert("You do not have permission to join this tournament.");
      } else {
        alert("An unexpected error occurred while trying to join.");
      }
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

  useEffect(() => {
    if (!db) return;
    const tournamentsCol = collection(db, 'tournaments');
    const q = query(tournamentsCol, where("status", "==", "setup"));
    const unsubscribeOpenTournaments = onSnapshot(q, (querySnapshot) => {
      const tournaments: Tournament[] = [];
      querySnapshot.forEach((doc) => {
        tournaments.push({ id: doc.id, ...doc.data() } as Tournament);
      });
      setOpenTournaments(tournaments);
    });
    return () => unsubscribeOpenTournaments();
  }, [db]);

  useEffect(() => {
    let unsubscribeUser: Unsubscribe | undefined;
    let unsubscribeActiveTournament: Unsubscribe | undefined;
    const setupListeners = async () => {
        if (!user || !db || !userProfile) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userDocRef, async (userDocSnap) => {
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const activeId = userData.activeTournamentId;
                if (activeId) {
                    const tournamentDocRef = doc(db, 'tournaments', activeId);
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();
                    unsubscribeActiveTournament = onSnapshot(tournamentDocRef, (tournamentDocSnap) => {
                        if (tournamentDocSnap.exists()) {
                            setActiveTournament({ id: activeId, ...tournamentDocSnap.data() } as Tournament);
                        } else {
                            setActiveTournament(null);
                        }
                    });
                } else {
                    if (unsubscribeActiveTournament) unsubscribeActiveTournament();
                    setActiveTournament(null);
                }
            }
        });
        if (inviteToken) {
            await joinTournamentByInvite(inviteToken);
        }
        setIsLoading(false);
    };
    setupListeners();
    return () => {
      if (unsubscribeUser) unsubscribeUser();
      if (unsubscribeActiveTournament) unsubscribeActiveTournament();
    };
  }, [user, db, userProfile, inviteToken, joinTournamentByInvite]);

  const manageTournament = async (id: string) => {
    if (!db || !user) return;
    const userDocRef = doc(db, 'users', user.uid);
    await updateDoc(userDocRef, { activeTournamentId: id });
  };

  const leaveTournament = async () => {
    if (!db || !user || !activeTournament) return;
    const batch = writeBatch(db);
    const userDocRef = doc(db, 'users', user.uid);
    if (activeTournament.organizerId === user.uid && activeTournament.status === 'completed') {
        activeTournament.players.forEach(p => {
             const participants = isTeam(p) ? p.members : [p as Player];
             participants.forEach(member => {
                 const playerDocRef = doc(db, 'users', getParticipantId(member));
                 batch.update(playerDocRef, { activeTournamentId: null });
             })
        });
    } 
    else if (activeTournament.status === 'setup' && activeTournament.players.some(p => p.id === user.uid)) {
        const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
        const playerToRemove = activeTournament.players.find(p => p.id === user.uid);
        if (playerToRemove) {
            batch.update(tournamentDocRef, { players: arrayRemove(playerToRemove) });
        }
        batch.update(userDocRef, { activeTournamentId: null });
    } 
    else {
        batch.update(userDocRef, { activeTournamentId: null });
    }
    await batch.commit();
  };

  const saveTournamentSettings = async (settings: TournamentRules) => {
    if (!db || !activeTournament) return;
    setIsSavingSettings(true);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { rules: settings });
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
        return `${window.location.origin}?invite=${token}`;
    } catch (error) {
        console.error("Error generating invite link:", error);
        return null;
    }
  };
  
  const kickPlayer = async (playerToKick: Player | Team) => {
    if (!db || !activeTournament || activeTournament.status !== 'setup') return;
    setIsKickingPlayerId(playerToKick.id);
    try {
      const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
      await updateDoc(tournamentDocRef, { players: arrayRemove(playerToKick) });

      const participants = isTeam(playerToKick) ? playerToKick.members : [playerToKick as Player];
      const batch = writeBatch(db);
      participants.forEach(member => {
        const kickedUserDocRef = doc(db, 'users', getParticipantId(member));
        batch.update(kickedUserDocRef, { activeTournamentId: null });
      });
      await batch.commit();

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
      
      const finalMatches = generateBracket(players);

      const tournamentDocRef = doc(db, 'tournaments', tournamentId);
      const batch = writeBatch(db);
      batch.update(tournamentDocRef, { matches: finalMatches, isBracketGenerated: true, status: 'in_progress' });
      
      players.forEach(p => {
        const participants = isTeam(p) ? p.members : [p as Player];
        participants.forEach(member => {
            const playerDocRef = doc(db, 'users', getParticipantId(member));
            batch.update(playerDocRef, { activeTournamentId: tournamentId });
        });
      });
      await batch.commit();
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
    } catch (error) {
      console.error("Error deleting tournament:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const createTournament = async (name: string, type: TournamentType, participate: boolean) => {
    if (!db || !user || !userProfile) return;
    setIsLoading(true);
    const newTournamentId = crypto.randomUUID();
    const tournamentDocRef = doc(db, 'tournaments', newTournamentId);
    const userDocRef = doc(db, 'users', user.uid);
    try {
      let initialPlayers: (Player | Team)[] = [];

      if (participate) {
        if (type === '4v4 HvV') {
            const captainAsMember: TeamMember = {
                uid: user.uid,
                username: userProfile.username,
                photoURL: userProfile.photoURL ?? null
            };
            initialPlayers.push({
                id: user.uid,
                name: `${userProfile.username}'s Team`,
                captainId: user.uid,
                members: [captainAsMember],
                tournamentId: newTournamentId,
                color: teamColors[Math.floor(Math.random() * teamColors.length)]
            });
        } else {
            initialPlayers.push({ 
              id: user.uid, 
              name: userProfile.username, 
              userId: user.uid,
              photoURL: userProfile.photoURL ?? null
            });
        }
      }
      
      const newTournamentData: Omit<Tournament, 'id'> = {
        name: name,
        type: type,
        organizerId: user.uid,
        organizerUsername: userProfile.username,
        organizerPhotoURL: userProfile.photoURL ?? null,
        createdAt: new Date(),
        status: 'setup',
        players: initialPlayers,
        matches: [],
        isBracketGenerated: false,
        tournamentWinner: null,
        rules: { description: '', schedule: '', bannedItems: [] }
      };
      const batch = writeBatch(db);
      batch.set(tournamentDocRef, newTournamentData);
      if (participate) {
        batch.set(userDocRef, { activeTournamentId: newTournamentId }, { merge: true });
      }
      batch.update(userDocRef, { 'stats.tournamentsHosted': increment(1) });
      await batch.commit();
    } catch (error) {
      console.error("Error creating tournament:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const setWinner = async (matchId: number, winner: Player | Team) => {
    if (!activeTournament || !db) return;
    let nextMatches = [...activeTournament.matches];
    const matchIndex = nextMatches.findIndex((m) => m.id === matchId);
    if (matchIndex === -1) return;
    nextMatches[matchIndex].winner = winner;
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(activeTournament.players.length)));
    const totalRounds = Math.log2(bracketSize);
    const currentMatch = nextMatches[matchIndex];
    let finalWinner: Player | Team | null = null;
    let newStatus = activeTournament.status;
    if (currentMatch.round === totalRounds) {
      finalWinner = winner;
      newStatus = 'completed';
      const batch = writeBatch(db);
      const winningPlayers = isTeam(winner) ? winner.members : [winner as Player];
      winningPlayers.forEach(p => {
        const winnerStatsRef = doc(db, 'users', getParticipantId(p));
        batch.update(winnerStatsRef, { 'stats.tournamentsWon': increment(1) });
      });
      activeTournament.players.forEach(p => {
        const participants = isTeam(p) ? p.members : [p as Player];
        participants.forEach(member => {
            const playerStatsRef = doc(db, 'users', getParticipantId(member));
            batch.update(playerStatsRef, { 'stats.tournamentsPlayed': increment(1) });
        });
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
    const tournamentDocRef = doc(db, 'tournaments', activeTournament.id);
    await updateDoc(tournamentDocRef, {
        matches: nextMatches,
        tournamentWinner: finalWinner,
        status: newStatus
    });
  };

  return {
    activeTournament,
    openTournaments,
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
    setWinner,
    leaveTournament
  };
};
