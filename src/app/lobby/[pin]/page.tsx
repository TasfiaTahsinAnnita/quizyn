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
    // 1. Initial Fetch of existing players
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/sessions/${pin}`);
        const data = await res.json();
        if (data.players) setPlayers(data.players);
      } catch (err) {
        console.error('Failed to fetch players:', err);
      }
    };
    fetchPlayers();

    // 2. Real-time Listen (Pusher)
    if (pusherClient && process.env.NEXT_PUBLIC_PUSHER_KEY !== 'your-pusher-key') {
      const channel = pusherClient.subscribe(`session-${pin}`);
      channel.bind('player-joined', (data: Player) => {
        setPlayers(prev => {
          if (prev.find(p => p.id === data.id)) return prev;
          return [...prev, data];
        });
      });

      channel.bind('player-left', (data: { nickname: string }) => {
        setPlayers(prev => prev.filter(p => p.nickname !== data.nickname));
      });

      return () => pusherClient.unsubscribe(`session-${pin}`);
    } else {
      // 3. Fallback Polling (Every 1 second if Pusher is disabled)
      const interval = setInterval(fetchPlayers, 1000);
      return () => clearInterval(interval);
    }
  }, [pin]);

  const handleStartGame = async () => {
    try {
      // Notify all players via Pusher
      await fetch(`/api/sessions/${pin}/start`, { method: 'POST' });
      window.location.href = `/game/${pin}`;
    } catch (err) {
      alert('Failed to start game.');
    }
  };

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
        <Button variant="secondary" className="start_game_btn" onClick={handleStartGame}>
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
