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
    ctx.fillStyle = '#0d0616';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    if (state.stage === 1) {
      // Stage 1: Night city background
      const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      gradient.addColorStop(0, '#0d0616');
      gradient.addColorStop(1, '#1a0d2e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

      // Draw stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 100; i++) {
        const x = (i * 137) % SCREEN_WIDTH;
        const y = (i * 73) % (SCREEN_HEIGHT * 0.6);
        const size = (i % 3) + 1;
        ctx.fillRect(x, y, size, size);
      }

      // Draw crescent moon
      const moonX = SCREEN_WIDTH - 150;
      const moonY = 100;
      const moonRadius = 50;
      
      ctx.fillStyle = '#f0f0f0';
      ctx.shadowColor = '#f0f0f0';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonRadius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#0d0616';
      ctx.beginPath();
      ctx.arc(moonX + 25, moonY - 8, moonRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    } else if (state.stage === 2) {
      // Stage 2: Airplane interior
      const gradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT);
      gradient.addColorStop(0, '#1a0d2e');
      gradient.addColorStop(1, '#0d0616');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // Save context and apply camera transform
    ctx.save();
    ctx.translate(-state.camera.x, 0);

    if (state.stage === 1) {
      // Stage 1: Buildings
      const groundY = 900;
      for (let i = 1; i < state.platforms.length; i++) {
        const platform = state.platforms[i];
        const buildingHeight = groundY - (platform.y + platform.height);
        
        if (buildingHeight > 0) {
          ctx.fillStyle = '#555555';
          ctx.fillRect(platform.x, platform.y + platform.height, platform.width, buildingHeight);
          
          const windowRows = Math.floor(buildingHeight / 30);
          const windowCols = Math.floor(platform.width / 40);
          for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
              const windowIndex = (i * 100 + row * 10 + col) % state.windowLightStates.length;
              const isLit = state.windowLightStates[windowIndex];
              ctx.fillStyle = isLit ? '#fbbf24' : '#1a1a1a';
              const wx = platform.x + 10 + col * 40;
              const wy = platform.y + platform.height + 10 + row * 30;
              ctx.fillRect(wx, wy, 20, 15);
            }
          }
          
          ctx.strokeStyle = '#333333';
          ctx.lineWidth = 2;
          ctx.strokeRect(platform.x, platform.y + platform.height, platform.width, buildingHeight);
        }
      }
    } else if (state.stage === 2) {
      // Stage 2: Airplane interior
      // Draw airplane floor/ceiling (white interior)
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, state.stageWidth, 80); // Ceiling
      ctx.fillRect(0, 480, state.stageWidth, 60); // Floor
      
      // Draw airplane seats (rows of seats)
      for (let x = 100; x < state.stageWidth; x += 200) {
        // Left seats
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x, 200, 60, 200);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x, 200, 60, 40); // Headrest
        
        // Right seats
        ctx.fillRect(x + 80, 200, 60, 200);
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x + 80, 200, 60, 40); // Headrest
      }
      
      // Draw airplane windows (showing night sky)
      for (let i = 0; i < 20; i++) {
        const x = 200 + i * 250;
        const y = 100;
        
        // Window frame
        ctx.fillStyle = '#e5e7eb';
        ctx.fillRect(x, y, 80, 60);
        
        // Window (night sky)
        const windowGradient = ctx.createLinearGradient(x, y, x, y + 60);
        windowGradient.addColorStop(0, '#0d0616');
        windowGradient.addColorStop(1, '#1a0d2e');
        ctx.fillStyle = windowGradient;
        ctx.fillRect(x + 5, y + 5, 70, 50);
        
        // Random stars in window
        const windowIndex = i % state.windowLightStates.length;
        if (state.windowLightStates[windowIndex]) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 20 + (i % 3) * 15, y + 15 + (i % 2) * 15, 2, 2);
        }
      }
    }

    // Draw platforms
    for (const platform of state.platforms) {
      ctx.fillStyle = '#3d2f4d';
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
      ctx.strokeStyle = '#e91e63';
      ctx.lineWidth = 2;
      ctx.strokeRect(platform.x, platform.y, platform.width, platform.height);
    }

    // Draw gate/portal at the end
    if (state.stage === 1) {
      const gateX = state.stageWidth - 100;
      const gateY = 900 - 200;
      ctx.fillStyle = '#000000';
      ctx.fillRect(gateX, gateY, 80, 200);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 4;
      ctx.strokeRect(gateX, gateY, 80, 200);
      
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 20;
      ctx.strokeRect(gateX, gateY, 80, 200);
      ctx.shadowBlur = 0;
    } else if (state.stage === 2) {
      // Exit portal (airplane door)
      const portalX = state.stageWidth - 100;
      const portalY = 280;
      ctx.fillStyle = '#000000';
      ctx.fillRect(portalX, portalY, 80, 200);
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 4;
      ctx.strokeRect(portalX, portalY, 80, 200);
      
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur = 20;
      ctx.strokeRect(portalX, portalY, 80, 200);
      ctx.shadowBlur = 0;
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
        const opacity = 1 - (frame / 20);
        const scale = 1 + (frame / 20) * 0.5;
        
        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(enemy.position.x + enemy.width / 2, enemy.position.y + enemy.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-enemy.width / 2, -enemy.height / 2);
        
        // Fading demon
        ctx.fillStyle = bodyColor;
        ctx.fillRect(0, 0, enemy.width, enemy.height);
        
        // Smoke particles
        for (let i = 0; i < 5; i++) {
          const px = Math.random() * enemy.width;
          const py = -frame * 2 + Math.random() * 20;
          const particleColor = isBlue ? 'rgba(37, 99, 235, ' : 'rgba(220, 38, 38, ';
          ctx.fillStyle = particleColor + (opacity * 0.5) + ')';
          ctx.fillRect(px, py, 4, 4);
        }
        
        ctx.restore();
      } else {
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
        
        // Horns
        ctx.fillStyle = hornColor;
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
        
        // Canines/Fangs
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(enemy.position.x + 18, enemy.position.y + 35);
        ctx.lineTo(enemy.position.x + 20, enemy.position.y + 30);
        ctx.lineTo(enemy.position.x + 22, enemy.position.y + 35);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(enemy.position.x + 28, enemy.position.y + 35);
        ctx.lineTo(enemy.position.x + 30, enemy.position.y + 30);
        ctx.lineTo(enemy.position.x + 32, enemy.position.y + 35);
        ctx.fill();
        
        // Glow effect
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(enemy.position.x, enemy.position.y, enemy.width, enemy.height);
      }
    }

    // Draw projectiles (knives)
    for (const proj of state.projectiles) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(proj.position.x, proj.position.y, proj.width, proj.height);
      
      // Knife edge highlight
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(proj.position.x, proj.position.y, proj.width * 0.3, proj.height);
      
      // Slight glow
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(proj.position.x, proj.position.y, proj.width, proj.height);
    }

    // Draw player (Rumi)
    const player = state.player;
    
    // Apply flashing effect if invincible
    if (player.isInvincible) {
      const flashSpeed = 8;
      const flashFrame = Math.floor(Date.now() / 100) % flashSpeed;
      if (flashFrame < flashSpeed / 2) {
        ctx.globalAlpha = 0.5;
      }
    }
    
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
      
      // Ponytail (extends backwards based on direction)
      const ponytailX = player.facingRight ? player.position.x - 15 : player.position.x + player.width - 10;
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
      
      // Character glow (yellow or white if invincible)
      ctx.strokeStyle = player.isInvincible ? '#ffffff' : '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(player.position.x, player.position.y, player.width, player.height);
    }
    
    // Reset alpha
    ctx.globalAlpha = 1.0;

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

    // The End screen
    if (state.isGameEnded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
      
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 96px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('THE END', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 - 50);
      
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px Arial';
      ctx.fillText(`Final Score: ${state.score}`, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 30);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.fillText('Refresh to play again', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 80);
      ctx.textAlign = 'left';
    }

    // Controls hint
    if (state.score === 0 && !state.player.isKnockedDown) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(SCREEN_WIDTH / 2 - 200, SCREEN_HEIGHT - 150, 400, 100);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('W: Jump | A/D: Move | S: Duck | Space/Enter/.: Attack', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 100);
      ctx.textAlign = 'left';
    }

    // Minimap (bottom-left)
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
