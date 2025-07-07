import React, { useState, useMemo, CSSProperties } from 'react';

// --- TYPE DEFINITIONS ---
// Using interfaces for clear type-checking with TypeScript
interface Player {
  id: string;
  name:string;
}

interface Match {
  id: number;
  round: number;
  matchInRound: number;
  players: (Player | null)[];
  winner: Player | null;
}

// --- SVG ICONS ---
// Using inline SVGs for icons to keep it self-contained and styleable
const RebelIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <path d="M12 2a5 5 0 0 0-5 5c0 1.66 1.34 3 3 3s3-1.34 3-3a5 5 0 0 0-5-5zM2 12h5m10 0h5m-7.5 5.5c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"></path>
  </svg>
);

const EmpireIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"></circle>
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v4M12 18v4M22 12h-4M6 12H2M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" strokeWidth="2"></path>
  </svg>
);


// --- STYLES ---
// Simulating CSS Modules with style objects for a self-contained component.
const styles: { [key: string]: CSSProperties } = {
  // Main App Styles
  app: {
    fontFamily: "'Orbitron', sans-serif",
    backgroundColor: '#0a0a12',
    color: '#c0c0ff',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  // Header Styles
  header: {
    width: '100%',
    maxWidth: '1200px',
    textAlign: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #4a4a88',
    paddingBottom: '20px',
  },
  mainTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#feda4a',
    textShadow: '0 0 5px #feda4a, 0 0 10px #feda4a',
    margin: '0 0 10px 0',
    letterSpacing: '2px',
  },
  subTitle: {
    fontSize: '1.2rem',
    color: '#9a9ae0',
    textTransform: 'uppercase',
    letterSpacing: '4px',
  },
  // Control Panel Styles
  controls: {
    backgroundColor: '#1a1a2e',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #3a3a6a',
    boxShadow: '0 0 15px rgba(74, 74, 136, 0.5)',
    width: '100%',
    maxWidth: '900px',
    marginBottom: '30px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  inputGroup: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flexGrow: 1,
    backgroundColor: '#0a0a12',
    border: '1px solid #4a4a88',
    color: '#e0e0ff',
    padding: '10px 15px',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: "'Exo 2', sans-serif",
  },
  button: {
    fontFamily: "'Orbitron', sans-serif",
    backgroundColor: '#3a3a6a',
    color: '#e0e0ff',
    border: '1px solid #6a6aff',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: 'inset 0 0 5px rgba(170, 170, 255, 0.3)',
  },
  buttonPrimary: {
    backgroundColor: '#feda4a',
    color: '#0a0a12',
    fontWeight: 'bold',
    border: '1px solid #ffff8d',
    boxShadow: '0 0 10px #feda4a',
  },
  // Player List Styles
  playerList: {
    listStyle: 'none',
    padding: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
  },
  playerTag: {
    backgroundColor: '#2a2a4e',
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #4a4a88',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  playerDelete: {
    background: 'none',
    border: 'none',
    color: '#ff4a4a',
    cursor: 'pointer',
    padding: '0',
    marginLeft: '5px',
  },
  // Tournament Bracket Styles
  bracketContainer: {
    width: '100%',
    overflowX: 'auto',
    padding: '20px 0',
  },
  bracket: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '50px',
  },
  round: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-around',
    gap: '30px',
    minWidth: '250px',
  },
  roundTitle: {
    textAlign: 'center',
    color: '#feda4a',
    fontSize: '1.5rem',
    marginBottom: '20px',
    textTransform: 'uppercase',
  },
  // Match Card Styles
  matchCard: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #3a3a6a',
    borderRadius: '8px',
    padding: '15px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    boxShadow: '0 0 10px rgba(74, 74, 136, 0.3)',
  },
  playerSlot: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    borderRadius: '4px',
    transition: 'background-color 0.3s ease',
  },
  playerName: {
    flexGrow: 1,
  },
  winner: {
    backgroundColor: '#3a6a3a',
    border: '1px solid #6aff6a',
    boxShadow: '0 0 8px #6aff6a',
  },
  bye: {
    color: '#888',
    fontStyle: 'italic',
  },
  tbd: {
    color: '#888',
    fontStyle: 'italic',
  },
  winButton: {
    backgroundColor: '#2a4a2a',
    border: '1px solid #4a8a4a',
    color: '#aaffaa',
    padding: '5px 8px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  // Winner Display Styles
  winnerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(10, 10, 18, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.5s ease-in-out',
  },
  winnerModal: {
    backgroundColor: '#1a1a2e',
    padding: '40px',
    borderRadius: '10px',
    border: '2px solid #feda4a',
    boxShadow: '0 0 25px #feda4a, inset 0 0 15px rgba(254, 218, 74, 0.5)',
    textAlign: 'center',
    animation: 'scaleIn 0.5s 0.2s ease-in-out backwards',
  },
  victoryTitle: {
    fontSize: '4rem',
    color: '#feda4a',
    textShadow: '0 0 10px #feda4a, 0 0 20px #feda4a',
    margin: '0 0 10px 0',
    textTransform: 'uppercase',
  },
  winnerName: {
    fontSize: '2rem',
    color: '#e0e0ff',
    margin: '0 0 30px 0',
  },
};


// --- SUB-COMPONENTS ---

const Header = () => (
  <header style={styles.header}>
    <h1 style={styles.mainTitle}>KYBER TOURNAMENT HUB</h1>
    <h2 style={styles.subTitle}>Star Wars: Battlefront II</h2>
  </header>
);

const PlayerManager = ({ players, onAddPlayer, onRemovePlayer, onGenerate, onReset }) => {
  const [newPlayerName, setNewPlayerName] = useState('');

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      onAddPlayer(newPlayerName.trim());
      setNewPlayerName('');
    }
  };

  return (
    <div style={styles.controls}>
      <div style={styles.inputGroup}>
        <input
          type="text"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
          placeholder="Enter player name..."
          style={styles.input}
        />
        <button onClick={handleAddPlayer} style={styles.button}>Add Player</button>
      </div>
      {players.length > 0 && (
         <ul style={styles.playerList}>
          {players.map(p => (
            <li key={p.id} style={styles.playerTag}>
              <span>{p.name}</span>
              <button onClick={() => onRemovePlayer(p.id)} style={styles.playerDelete}>&times;</button>
            </li>
          ))}
        </ul>
      )}
      <div style={{...styles.inputGroup, justifyContent: 'center'}}>
        <button onClick={onGenerate} disabled={players.length < 2} style={{...styles.button, ...styles.buttonPrimary}}>
          Generate Bracket
        </button>
        <button onClick={onReset} style={styles.button}>Reset All</button>
      </div>
    </div>
  );
};

const MatchCard = ({ match, onSetWinner }) => {
    const canSetWinner = match.players.every(p => p && p.id !== 'BYE') && !match.winner;

    const PlayerDisplay = ({ player, isWinner }) => {
        if (!player) return <div style={{...styles.playerSlot, ...styles.tbd}}>TBD</div>;
        if (player.id === 'BYE') return <div style={{...styles.playerSlot, ...styles.bye}}>BYE</div>;

        return (
            <div style={{...styles.playerSlot, ...(isWinner ? styles.winner : {})}}>
                <span style={styles.playerName}>{player.name}</span>
                {canSetWinner && (
                    <button style={styles.winButton} onClick={() => onSetWinner(match.id, player)}>Declare Winner</button>
                )}
            </div>
        );
    };

    return (
        <div style={styles.matchCard}>
            <PlayerDisplay player={match.players[0]} isWinner={match.winner?.id === match.players[0]?.id} />
            <div style={{textAlign: 'center', color: '#6a6aff', fontWeight: 'bold'}}>VS</div>
            <PlayerDisplay player={match.players[1]} isWinner={match.winner?.id === match.players[1]?.id} />
        </div>
    );
};


const TournamentBracket = ({ matches, onSetWinner }) => {
  const rounds = useMemo<Match[][]>(() => {
    if (!matches.length) return [];
    const groupedByRound = matches.reduce((acc: Record<number, Match[]>, match) => {
      (acc[match.round] = acc[match.round] || []).push(match);
      return acc;
    }, {} as Record<number, Match[]>);
    return Object.values(groupedByRound).map(round => round.sort((a, b) => a.matchInRound - b.matchInRound));
  }, [matches]);

  if (!rounds.length) {
    return null;
  }

  return (
    <div style={styles.bracketContainer}>
      <div style={styles.bracket}>
        {rounds.map((roundMatches, roundIndex) => (
          <div key={roundIndex} style={styles.round}>
            <h3 style={styles.roundTitle}>Round {roundIndex + 1}</h3>
            {roundMatches.map(match => (
              <MatchCard key={match.id} match={match} onSetWinner={onSetWinner} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

const WinnerDisplay = ({ winner, onClose }) => (
    <div style={styles.winnerOverlay}>
        <div style={styles.winnerModal}>
            <h1 style={styles.victoryTitle}>VICTORY</h1>
            <h2 style={styles.winnerName}>{winner.name}</h2>
            <button onClick={onClose} style={{...styles.button, ...styles.buttonPrimary}}>
                New Tournament
            </button>
        </div>
    </div>
);


// --- MAIN APP COMPONENT ---

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isBracketGenerated, setIsBracketGenerated] = useState(false);
  const [tournamentWinner, setTournamentWinner] = useState<Player | null>(null);

  const handleAddPlayer = (name: string) => {
    if (isBracketGenerated) {
        alert("Cannot add players after the bracket has been generated. Please reset first.");
        return;
    }
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        alert("Player with this name already exists.");
        return;
    }
    const newPlayer: Player = { id: crypto.randomUUID(), name };
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
    
    // Create a list of players for the first round, inserting byes (null)
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
    
    // Create Round 1 matches
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

    // Create placeholder matches for subsequent rounds
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

    // Immediately advance winners of bye matches
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

    // Set winner for the current match
    nextMatches[matchIndex].winner = winner;

    // Check if this is the final match
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const totalRounds = Math.log2(bracketSize);
    const currentMatch = nextMatches[matchIndex];

    if (currentMatch.round === totalRounds) {
        setMatches(nextMatches);
        setTournamentWinner(winner); // Set the tournament winner!
        return;
    }
    
    // Advance winner to the next round
    const nextRound = currentMatch.round + 1;
    const nextMatchInRound = Math.floor(currentMatch.matchInRound / 2);
    const nextMatchIndex = nextMatches.findIndex(m => m.round === nextRound && m.matchInRound === nextMatchInRound);

    if (nextMatchIndex !== -1) {
        const playerSlot = currentMatch.matchInRound % 2; // 0 for top, 1 for bottom
        nextMatches[nextMatchIndex].players[playerSlot] = winner;
    }

    setMatches(nextMatches);
  };


  return (
    <>
      {/* Adding Google Fonts and Keyframe Animations */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@400;700&display=swap');
          body { margin: 0; }
          button:hover { filter: brightness(1.2); }
          button:disabled { cursor: not-allowed; filter: grayscale(0.7); }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes scaleIn {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <div style={styles.app}>
        <Header />
        
        {!isBracketGenerated ? (
            <PlayerManager 
                players={players}
                onAddPlayer={handleAddPlayer}
                onRemovePlayer={handleRemovePlayer}
                onGenerate={handleGenerateBracket}
                onReset={handleReset}
            />
        ) : (
             <div style={{marginBottom: '20px'}}>
                <button onClick={handleReset} style={styles.button}>Reset Tournament</button>
            </div>
        )}

        <TournamentBracket matches={matches} onSetWinner={handleSetWinner} />
        
        {tournamentWinner && <WinnerDisplay winner={tournamentWinner} onClose={handleReset} />}
      </div>
    </>
  );
}
