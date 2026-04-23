'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { pusherClient } from '@/lib/pusher';
import { Button } from '@/components/Button';
import './lobby.css';

interface Player {
  id: string;
  nickname: string;
}

export default function HostLobby() {
  const { pin } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Subscribe to the session channel
    const channel = pusherClient.subscribe(`session-${pin}`);

    // Listen for players joining
    channel.bind('player-joined', (data: Player) => {
      setPlayers(prev => {
        // Prevent duplicates
        if (prev.find(p => p.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      pusherClient.unsubscribe(`session-${pin}`);
    };
  }, [pin]);

  return (
    <div className="lobby_wrapper">
      <div className="lobby_header">
        <h1>Join at <strong>localhost:3000</strong></h1>
        <div className="pin_display">{pin}</div>
        <div className="player_count">
          {players.length} {players.length === 1 ? 'Player' : 'Players'} Joined
        </div>
      </div>

      <div className="player_grid">
        {players.length === 0 ? (
          <p className="animate-fade-in" style={{ opacity: 0.6 }}>Waiting for players to join...</p>
        ) : (
          players.map(player => (
            <div key={player.id} className="player_name">
              {player.nickname}
            </div>
          ))
        )}
      </div>

      {players.length > 0 && (
        <Button variant="secondary" className="start_game_btn">
          Start Game
        </Button>
      )}

      {/* Decorative background shapes */}
      <div className="bg_shapes">
        {/* Placeholder for SVG shapes */}
      </div>
    </div>
  );
}
