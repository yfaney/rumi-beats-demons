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
      
      if (key === 'w') {
        setGameState((prev) => {
          const s = { ...prev, player: { ...prev.player } };
          if (!s.player.isKnockedDown) {
            handleJump(s);
          }
          return s;
        });
      }

      const isAttack =
        e.code === 'Space' ||
        e.code === 'Enter' ||
        e.code === 'NumpadEnter' ||
        e.code === 'Period' ||
        e.key === ' ' ||
        key === 'enter' ||
        key === '.';

      if (isAttack) {
        e.preventDefault();
        setGameState((prev) => {
          const s = { ...prev, player: { ...prev.player } };
          if (!s.player.isKnockedDown) {
            handleAttack(s);
          }
          return s;
        });
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
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      setGameState((prev) => {
        const withKeys = { ...prev, keys: keysRef.current };
        const newState = updateGameState(withKeys);
        render(ctx, newState);
        return newState;
      });
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
    if (state.stage === 1) {
      // Sky blue background for airplane stage
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    } else {
      // Dark night background for stage 2
      ctx.fillStyle = '#0d0616';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      gradient.addColorStop(0, '#0d0616');
      gradient.addColorStop(1, '#1a0d2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Stage 1: Draw clouds
    if (state.stage === 1 && state.cloudPositions) {
      ctx.fillStyle = '#ffffff';
      for (const cloud of state.cloudPositions) {
        // Draw fluffy clouds using overlapping circles
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(
            cloud.x + i * cloud.size * 0.5,
            cloud.y,
            cloud.size * (0.6 + i * 0.2),
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
    }

    // Stage 2: Draw stars and moon
    if (state.stage === 2) {
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 200; i++) {
        const x = (i * 123) % SCREEN_WIDTH;
        const y = (i * 456) % SCREEN_HEIGHT;
        const size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
      }

      // Draw crescent moon with halo only on visible part
      const moonX = SCREEN_WIDTH - 150;
      const moonY = 100;
      const moonRadius = 50;
      
      ctx.fillStyle = '#f0f0f0';
      ctx.shadowColor = '#f0f0f0';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // Cover part with background to create crescent (no shadow on this)
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#0d0616';
      ctx.beginPath();
      ctx.arc(moonX + 25, moonY - 8, moonRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      
      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-state.camera.x, 0);

    // Draw platforms
    if (state.stage === 1) {
      // Draw airplane
      const airplaneY = 600;
      const airplaneWidth = 2000;
      
      // Airplane body (white)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, airplaneY, airplaneWidth, 100);
      
      // Windows (dark blue with some lit)
      const windowY = airplaneY + 20;
      const windowSpacing = 150;
      for (let i = 0; i < 10; i++) {
        const isLit = state.windowLightStates[i];
        ctx.fillStyle = isLit ? '#87ceeb' : '#1e3a8a';
        ctx.fillRect(200 + i * windowSpacing, windowY, 60, 40);
        
        // Window frame
        ctx.strokeStyle = '#999999';
        ctx.lineWidth = 2;
        ctx.strokeRect(200 + i * windowSpacing, windowY, 60, 40);
      }
      
      // Broken nose cone area (jagged edge at the end)
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.moveTo(airplaneWidth - 100, airplaneY);
      ctx.lineTo(airplaneWidth - 80, airplaneY + 20);
      ctx.lineTo(airplaneWidth - 90, airplaneY + 40);
      ctx.lineTo(airplaneWidth - 70, airplaneY + 60);
      ctx.lineTo(airplaneWidth - 85, airplaneY + 80);
      ctx.lineTo(airplaneWidth - 100, airplaneY + 100);
      ctx.lineTo(airplaneWidth - 100, airplaneY);
      ctx.fill();
      
    } else {
      // Stage 2 platforms
      for (const platform of state.platforms) {
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      }
    }

    // Stage 2: Draw buildings and gate
    if (state.stage === 2) {
      const buildingCount = 100;
      for (let i = 0; i < buildingCount; i++) {
        const buildingX = i * 120;
        const buildingHeight = 300 + ((i * 73) % 400);
        const buildingY = 900 - buildingHeight;
        const buildingWidth = 100;

        // Building body
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(buildingX, buildingY, buildingWidth, buildingHeight);

        // Building outline
        ctx.strokeStyle = '#2d2d44';
        ctx.lineWidth = 2;
        ctx.strokeRect(buildingX, buildingY, buildingWidth, buildingHeight);

        // Windows in a grid
        const windowRows = Math.floor(buildingHeight / 40);
        for (let row = 0; row < windowRows; row++) {
          for (let col = 0; col < 3; col++) {
            const isLit = state.windowLightStates[(i * windowRows + row + col) % state.windowLightStates.length];
            ctx.fillStyle = isLit ? '#ffd700' : '#0d0616';
            ctx.fillRect(
              buildingX + 15 + col * 30,
              buildingY + 15 + row * 40,
              20,
              25
            );
          }
        }
      }

      // Draw gate at the end
      const gateX = 10000 - 100;
      const gateY = 900 - 200;
      ctx.fillStyle = '#8b4513';
      ctx.fillRect(gateX, gateY, 100, 200);
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 4;
      ctx.strokeRect(gateX, gateY, 100, 200);
      
      // Gate details
      ctx.fillStyle = '#000000';
      ctx.fillRect(gateX + 20, gateY + 50, 60, 150);
    }

    // Draw player (Rumi)
    const px = state.player.position.x;
    const py = state.player.position.y;
    const pw = state.player.width;
    const ph = state.player.isDucking ? state.player.height : 70;

    if (state.player.isKnockedDown) {
      // Knocked down animation
      ctx.fillStyle = '#888888';
      ctx.fillRect(px, py + ph - 20, pw, 20);
      
      // X eyes
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 10, py + ph - 35);
      ctx.lineTo(px + 20, py + ph - 25);
      ctx.moveTo(px + 20, py + ph - 35);
      ctx.lineTo(px + 10, py + ph - 25);
      ctx.moveTo(px + 30, py + ph - 35);
      ctx.lineTo(px + 40, py + ph - 25);
      ctx.moveTo(px + 40, py + ph - 35);
      ctx.lineTo(px + 30, py + ph - 25);
      ctx.stroke();
    } else {
      // Rumi's body (gray/silver)
      const bodyColor = state.player.isInvincible ? '#ffff00' : '#9ca3af';
      ctx.fillStyle = bodyColor;
      ctx.fillRect(px, py, pw, ph);

      // Outline
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.strokeRect(px, py, pw, ph);

      // Eyes (two small white rectangles)
      ctx.fillStyle = '#ffffff';
      const eyeY = py + (state.player.isDucking ? 8 : 15);
      if (state.player.facingRight) {
        ctx.fillRect(px + 30, eyeY, 8, 8);
        ctx.fillRect(px + 42, eyeY, 8, 8);
      } else {
        ctx.fillRect(px + 5, eyeY, 8, 8);
        ctx.fillRect(px + 17, eyeY, 8, 8);
      }

      // Pupils
      ctx.fillStyle = '#000000';
      if (state.player.facingRight) {
        ctx.fillRect(px + 35, eyeY + 2, 3, 4);
        ctx.fillRect(px + 47, eyeY + 2, 3, 4);
      } else {
        ctx.fillRect(px + 7, eyeY + 2, 3, 4);
        ctx.fillRect(px + 19, eyeY + 2, 3, 4);
      }

      // Attack effect
      if (state.player.isAttacking && state.player.attackFrame < 10) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        const attackX = state.player.facingRight ? px + pw : px - 40;
        ctx.beginPath();
        ctx.arc(attackX + 20, py + ph / 2, 30, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Draw enemies (demons)
    for (const enemy of state.enemies) {
      const isPurple = enemy.type === 'purple';
      const isBlue = enemy.type === 'blue';
      const bodyColor = isPurple ? '#9333ea' : isBlue ? '#2563eb' : '#dc2626';
      const hornColor = isPurple ? '#581c87' : isBlue ? '#1e3a8a' : '#7f1d1d';
      const glowColor = isPurple ? '#a855f7' : isBlue ? '#3b82f6' : '#ef4444';
      
      if (enemy.isDying) {
        // Evaporation animation
        const frame = enemy.dyingFrame || 0;
        const alpha = Math.max(0, 1 - frame / 20);
        ctx.globalAlpha = alpha;
        
        // Rising particles
        for (let i = 0; i < 5; i++) {
          const particleY = enemy.position.y - frame * 2 + i * 10;
          ctx.fillStyle = bodyColor;
          ctx.fillRect(
            enemy.position.x + i * 10,
            particleY,
            8,
            8
          );
        }
        ctx.globalAlpha = 1;
        continue;
      }

      const ex = enemy.position.x;
      const ey = enemy.position.y;

      // Charging effect for blue demons
      if (isBlue && enemy.isCharging) {
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
        ctx.strokeRect(ex - 5, ey - 5, enemy.width + 10, enemy.height + 10);
        ctx.shadowBlur = 0;
      }

      // Demon body with glow
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 10;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(ex, ey, enemy.width, enemy.height);
      ctx.shadowBlur = 0;

      // Horns
      ctx.fillStyle = hornColor;
      ctx.beginPath();
      ctx.moveTo(ex + 10, ey);
      ctx.lineTo(ex + 5, ey - 15);
      ctx.lineTo(ex + 15, ey);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(ex + 35, ey);
      ctx.lineTo(ex + 40, ey - 15);
      ctx.lineTo(ex + 45, ey);
      ctx.fill();

      // Eyes (glowing)
      ctx.fillStyle = '#ffff00';
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 5;
      ctx.fillRect(ex + 12, ey + 20, 8, 8);
      ctx.fillRect(ex + 30, ey + 20, 8, 8);
      ctx.shadowBlur = 0;
    }

    // Draw projectiles (knives from blue demons)
    for (const proj of state.projectiles) {
      ctx.fillStyle = '#cbd5e1';
      ctx.shadowColor = '#cbd5e1';
      ctx.shadowBlur = 5;
      
      // Knife shape
      ctx.save();
      ctx.translate(proj.position.x, proj.position.y);
      if (proj.velocity.x < 0) {
        ctx.scale(-1, 1);
      }
      
      // Blade
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(15, 2);
      ctx.lineTo(15, -2);
      ctx.fill();
      
      // Handle
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(-5, -1, 5, 2);
      
      ctx.restore();
      ctx.shadowBlur = 0;
    }

    // Restore context
    ctx.restore();

    // Draw HUD
    // HP Bar
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(20, 20, 300, 30);
    ctx.fillStyle = '#22c55e';
    const hpWidth = (state.player.hp / state.player.maxHp) * 300;
    ctx.fillRect(20, 20, hpWidth, 30);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 300, 30);
    
    // HP Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, 30, 42);

    // Score
    ctx.fillText(`Score: ${state.score}`, 20, 80);
    ctx.fillText(`Kills: ${state.killCount}`, 20, 110);
    ctx.fillText(`Stage: ${state.stage}`, 20, 140);

    // Game Over or Victory
    if (state.player.isKnockedDown) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.fillText('Refresh to restart', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80);
      ctx.textAlign = 'left';
    }

    if (state.isGameEnded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 100px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('VICTORY!', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.fillText(`Final Score: ${state.score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80);
      ctx.fillText(`Kills: ${state.killCount}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 130);
      ctx.textAlign = 'left';
    }

    // Minimap (only in stage 2)
    if (state.stage === 2) {
      const stageWidth = state.platforms[0]?.width ?? 10000;
      const minimapWidth = 240;
      const minimapHeight = 80;
      const mmX = 20;
      const mmY = SCREEN_HEIGHT - minimapHeight - 20;

      // Minimap background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(mmX, mmY, minimapWidth, minimapHeight);
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 2;
      ctx.strokeRect(mmX, mmY, minimapWidth, minimapHeight);

      const scaleX = minimapWidth / stageWidth;
      const scaleY = minimapHeight / SCREEN_HEIGHT;

      // Platforms on minimap
      ctx.fillStyle = '#3d2f4d';
      for (const p of state.platforms) {
        const px = mmX + p.x * scaleX;
        const py = mmY + p.y * scaleY;
        const pw = Math.max(1, p.width * scaleX);
        const ph = Math.max(2, p.height * scaleY);
        ctx.fillRect(px, py, pw, Math.max(2, ph));
      }

      // Camera viewport
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      const camX = mmX + state.camera.x * scaleX;
      const camW = SCREEN_WIDTH * scaleX;
      ctx.strokeRect(camX, mmY, camW, minimapHeight);

      // Player on minimap
      ctx.fillStyle = '#fbbf24';
      const playerX = mmX + (state.player.position.x + state.player.width / 2) * scaleX;
      const playerY = mmY + (state.player.position.y + state.player.height / 2) * scaleY;
      ctx.fillRect(playerX - 2, playerY - 2, 4, 4);

      // Enemies on minimap
      ctx.fillStyle = '#dc2626';
      for (const en of state.enemies) {
        const ex = mmX + (en.position.x + en.width / 2) * scaleX;
        const ey = mmY + (en.position.y + en.height / 2) * scaleY;
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      }
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
