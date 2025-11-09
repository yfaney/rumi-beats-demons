import { useEffect, useRef, useState } from "react";
import { createInitialState, updateGameState, handleJump, handleAttack } from "@/lib/gameEngine";
import { GameState } from "@/types/game";
import { toast } from "sonner";

const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;

export const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(createInitialState());
  const gameLoopRef = useRef<number>();
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      
      if (key === 'w' && !gameState.player.isKnockedDown) {
        handleJump(gameState);
      }

      const isSpace =
        e.code === 'Space' ||
        e.key === ' ' ||
        key === 'space' ||
        key === 'spacebar';

      if (isSpace && !gameState.player.isKnockedDown) {
        e.preventDefault();
        handleAttack(gameState);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      gameState.keys = keysRef.current;
      const newState = updateGameState(gameState);
      setGameState(newState);
      
      render(ctx, newState);
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    toast.success("Game Started! Use WASD to move, Space to attack!");

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  const render = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // Clear canvas
    ctx.fillStyle = '#0d0616';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
    gradient.addColorStop(0, '#0d0616');
    gradient.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-state.camera.x, 0);

    // Draw platforms
    ctx.fillStyle = '#3d2f4d';
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 2;
    for (const platform of state.platforms) {
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw enemies (demons)
    for (const enemy of state.enemies) {
      // Body
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
      
      // Horns
      ctx.fillStyle = '#7f1d1d';
      ctx.beginPath();
      ctx.moveTo(enemy.position.x + 10, enemy.position.y);
      ctx.lineTo(enemy.position.x + 15, enemy.position.y - 15);
      ctx.lineTo(enemy.position.x + 20, enemy.position.y);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(enemy.position.x + 30, enemy.position.y);
      ctx.lineTo(enemy.position.x + 35, enemy.position.y - 15);
      ctx.lineTo(enemy.position.x + 40, enemy.position.y);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(enemy.position.x + 15, enemy.position.y + 15, 8, 8);
      ctx.fillRect(enemy.position.x + 27, enemy.position.y + 15, 8, 8);
      
      // Glow effect
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
    }

    // Draw player (Rumi)
    const player = state.player;
    if (player.isKnockedDown) {
      // Knocked down animation (kneeling)
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(player.position.x, player.position.y + 30, player.width, 40);
      ctx.fillRect(player.position.x + 10, player.position.y + 50, 30, 20);
    } else {
      // Body (yellow clothes)
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(player.position.x, player.position.y, player.width, player.height);
      
      // Purple hair (ponytail base)
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(player.position.x + 5, player.position.y - 10, 40, 15);
      
      // Ponytail (extends backwards)
      const ponytailX = player.facingRight ? player.position.x - 15 : player.position.x + 20;
      ctx.fillStyle = '#7c3aed';
      ctx.fillRect(ponytailX, player.position.y - 5, 25, 10);
      ctx.fillRect(ponytailX + (player.facingRight ? -10 : 10), player.position.y, 20, 8);
      
      // Face
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(player.position.x + 10, player.position.y + 5, 30, 25);
      
      // Eyes
      ctx.fillStyle = '#1e1b4b';
      ctx.fillRect(player.position.x + 15, player.position.y + 12, 6, 6);
      ctx.fillRect(player.position.x + 29, player.position.y + 12, 6, 6);
      
      // Sword
      if (player.isAttacking) {
        const swordX = player.facingRight ? 
          player.position.x + player.width : 
          player.position.x - 50;
        
        // Sword blade (silver with animated glow)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(swordX, player.position.y + 15, 50, 10);
        
        // Sword edge highlight
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(swordX, player.position.y + 15, 50, 3);
        
        // Animated sword glow/slash effect
        const glowIntensity = Math.sin(player.attackFrame * 0.5) * 0.5 + 0.5;
        ctx.shadowColor = '#3b82f6';
        ctx.shadowBlur = 15 * glowIntensity;
        ctx.strokeStyle = `rgba(59, 130, 246, ${0.8 * glowIntensity})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(swordX, player.position.y + 15, 50, 10);
        ctx.shadowBlur = 0;
        
        // Sword handle
        ctx.fillStyle = '#78350f';
        const handleX = player.facingRight ? swordX - 8 : swordX + 50;
        ctx.fillRect(handleX, player.position.y + 12, 8, 16);
        
        // White crescent slash effect
        const crescentX = player.facingRight ? 
          player.position.x + player.width + 10 : 
          player.position.x - 60;
        const crescentY = player.position.y + 20;
        
        ctx.save();
        ctx.translate(crescentX + 30, crescentY + 15);
        if (!player.facingRight) {
          ctx.scale(-1, 1);
        }
        
        // Draw white crescent (arc shape)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 8;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, 35, -0.5, 0.5, false);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
        ctx.restore();
      }
      
      // Character glow (yellow)
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(player.position.x, player.position.y, player.width, player.height);
    }

    ctx.restore();

    // Draw UI (not affected by camera)
    drawUI(ctx, state);
  };

  const drawUI = (ctx: CanvasRenderingContext2D, state: GameState) => {
    // HP Bar
    const hpBarWidth = 300;
    const hpBarHeight = 30;
    const hpBarX = 50;
    const hpBarY = 50;

    // HP Bar background
    ctx.fillStyle = '#1f1f1f';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // HP Bar fill
    const hpPercent = state.player.hp / state.player.maxHp;
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(hpBarX, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

    // HP Bar border
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 3;
    ctx.strokeRect(hpBarX, hpBarY, hpBarWidth, hpBarHeight);

    // HP Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, hpBarX + 10, hpBarY + 21);

    // Score
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`SCORE: ${state.score}`, SCREEN_WIDTH - 300, 60);

    // Kill counter
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Demons Defeated: ${state.score / 10}`, SCREEN_WIDTH - 300, 100);

    // Next heal info
    const killsUntilHeal = 5 - (state.killCount % 5);
    ctx.fillStyle = '#22c55e';
    ctx.font = '16px Arial';
    ctx.fillText(`${killsUntilHeal} kills until +1 HP`, hpBarX, hpBarY + hpBarHeight + 25);

    // Game over
    if (state.player.isKnockedDown) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      ctx.fillStyle = '#e91e63';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('KNOCKED DOWN', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(`Final Score: ${state.score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 20);
      
      ctx.font = '24px Arial';
      ctx.fillText('Refresh to play again', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 70);
      ctx.textAlign = 'left';
    }

    // Controls hint
    if (state.score === 0 && !state.player.isKnockedDown) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(SCREEN_WIDTH / 2 - 200, SCREEN_HEIGHT - 150, 400, 100);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('W: Jump | A/D: Move | S: Duck | Space: Attack', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100);
      ctx.textAlign = 'left';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          className="border-4 border-primary shadow-2xl rounded-lg max-w-full"
          style={{ maxHeight: '90vh', width: 'auto', height: 'auto' }}
        />
      </div>
    </div>
  );
};
