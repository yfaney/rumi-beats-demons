import { GameState, Player, Enemy, Platform, Position } from "@/types/game";

const GRAVITY = 0.5;
const JUMP_FORCE = -18;
const MOVE_SPEED = 7.5;
const STAGE_WIDTH = 10000;
const STAGE_HEIGHT = 1080;
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;

export const createInitialState = (): GameState => {
  const platforms: Platform[] = [];
  // Ground
  platforms.push({ x: 0, y: 900, width: STAGE_WIDTH, height: 100 });
  
  // Procedurally generate floating platforms
  let xPos = 400;
  while (xPos < STAGE_WIDTH - 800) {
    const width = 300 + Math.floor(Math.random() * 200); // 300-500
    const y = 520 + Math.floor(Math.random() * 260); // 520-780
    platforms.push({ x: xPos, y, width, height: 30 });
    // Advance with random gaps 200-600
    xPos += width + 200 + Math.floor(Math.random() * 400);
  }

  const enemies: Enemy[] = [];
  for (let i = 0; i < 15; i++) {
    const platformIndex = Math.floor(Math.random() * (platforms.length - 1)) + 1;
    const platform = platforms[platformIndex];
    enemies.push({
      id: i,
      position: {
        x: platform.x + Math.random() * (platform.width - 60),
        y: platform.y - 60,
      },
      velocity: { x: 0, y: 0 },
      width: 50,
      height: 60,
      hp: 1,
      direction: Math.random() > 0.5 ? 1 : -1,
      platformIndex,
      type: 'red',
    });
  }

  return {
    player: {
      position: { x: 100, y: 800 },
      velocity: { x: 0, y: 0 },
      width: 50,
      height: 70,
      hp: 10,
      maxHp: 10,
      isAttacking: false,
      isDucking: false,
      isKnockedDown: false,
      attackFrame: 0,
      facingRight: true,
      isInvincible: false,
      invincibilityEndTime: 0,
    },
    enemies: [
      ...enemies,
      // Add 10 ground red demons
      ...Array.from({ length: 8 }, (_, i) => ({
        id: 1000 + i,
        position: { x: 1500 + i * 1000, y: 840 },
        velocity: { x: 0, y: 0 },
        width: 50,
        height: 60,
        hp: 1,
        direction: Math.random() > 0.5 ? 1 : -1,
        platformIndex: 0,
        type: 'red' as const,
      })),
      // Add 2 ground blue demons (1:5 ratio)
      ...Array.from({ length: 2 }, (_, i) => ({
        id: 2000 + i,
        position: { x: 3000 + i * 3000, y: 840 },
        velocity: { x: 0, y: 0 },
        width: 50,
        height: 60,
        hp: 1,
        direction: Math.random() > 0.5 ? 1 : -1,
        platformIndex: 0,
        type: 'blue' as const,
        lastShootTime: 0,
        nextShootTime: 5000 + Math.random() * 5000,
      }))
    ],
    projectiles: [],
    platforms,
    score: 0,
    camera: { x: 0, y: 0 },
    keys: {},
    killCount: 0,
    isGameEnded: false,
    windowLightTime: Date.now(),
    windowLightStates: Array.from({ length: 100 }, () => Math.random() > 0.3),
  };
};

export const updateGameState = (state: GameState): GameState => {
  if (state.player.isKnockedDown || state.isGameEnded) return state;

  const newState = { ...state };
  
  // Update invincibility state
  const currentTime = Date.now();
  if (newState.player.isInvincible && currentTime > newState.player.invincibilityEndTime) {
    newState.player.isInvincible = false;
  }
  
  // Update window lights every 5 seconds
  if (currentTime - newState.windowLightTime > 5000) {
    newState.windowLightTime = currentTime;
    newState.windowLightStates = Array.from({ length: 100 }, () => Math.random() > 0.3);
  }
  
  // Check if player reached the gate (end of map)
  const gateX = STAGE_WIDTH - 100;
  const gateY = 900 - 200;
  const gateHeight = 200;
  if (
    newState.player.position.x + newState.player.width > gateX &&
    newState.player.position.y + newState.player.height > gateY &&
    newState.player.position.y < gateY + gateHeight
  ) {
    newState.isGameEnded = true;
    return newState;
  }
  
  // Update player
  newState.player = updatePlayer(state.player, state.keys, state.platforms);
  
  // Update enemies
  newState.enemies = state.enemies
    .map(enemy => {
      if (enemy.isDying) {
        const updatedEnemy = { ...enemy, dyingFrame: (enemy.dyingFrame || 0) + 1 };
        return updatedEnemy;
      }
      return updateEnemy(enemy, state.platforms, currentTime, newState.projectiles);
    })
    .filter(enemy => !enemy.isDying || (enemy.dyingFrame || 0) < 20); // Remove after evaporation

  // Update projectiles
  newState.projectiles = state.projectiles
    .map(proj => ({
      ...proj,
      position: {
        x: proj.position.x + proj.velocity.x,
        y: proj.position.y + proj.velocity.y,
      },
    }))
    .filter(proj => 
      proj.position.x > -100 && 
      proj.position.x < STAGE_WIDTH + 100 &&
      proj.position.y > -100 &&
      proj.position.y < STAGE_HEIGHT + 100
    );

  // Check projectile collisions with player
  newState.projectiles = newState.projectiles.filter(proj => {
    if (checkCollision(proj.position, proj, newState.player.position, newState.player)) {
      if (!newState.player.isInvincible) {
        // Check if player is ducking - projectiles fly over ducked player
        const playerTop = newState.player.position.y;
        const playerBottom = newState.player.position.y + newState.player.height;
        const projTop = proj.position.y;
        const projBottom = proj.position.y + proj.height;
        
        const isDuckingLowEnough = newState.player.isDucking && playerTop > projBottom - 15;
        
        if (!isDuckingLowEnough) {
          newState.player.hp = Math.max(0, newState.player.hp - 1);
          newState.player.isInvincible = true;
          newState.player.invincibilityEndTime = Date.now() + 3000;
          // Knockback
          newState.player.velocity.x = proj.velocity.x > 0 ? 10 : -10;
          newState.player.velocity.y = -8;
          return false; // Remove projectile after hitting
        }
      }
    }
    return true; // Keep projectile if it didn't hit or was dodged
  });

  // Check attack collisions
  if (newState.player.isAttacking && newState.player.attackFrame < 10) {
    const attackRange = 80;
    newState.enemies = newState.enemies.filter(enemy => {
      const distance = Math.abs(
        (enemy.position.x + enemy.width / 2) - 
        (newState.player.position.x + newState.player.width / 2)
      );
      const verticalDistance = Math.abs(
        (enemy.position.y + enemy.height / 2) - 
        (newState.player.position.y + newState.player.height / 2)
      );
      
      const inRange = distance < attackRange && verticalDistance < 80;
      const facingEnemy = newState.player.facingRight ? 
        enemy.position.x > newState.player.position.x :
        enemy.position.x < newState.player.position.x;

      if (inRange && facingEnemy && !enemy.isDying) {
        newState.score += 10;
        newState.killCount += 1;
        
        // Heal every 5 kills
        if (newState.killCount % 5 === 0 && newState.player.hp < newState.player.maxHp) {
          newState.player.hp = Math.min(newState.player.hp + 1, newState.player.maxHp);
        }
        
        enemy.isDying = true;
        enemy.dyingFrame = 0;
      }
      return true;
    });
  }

  // Check enemy collisions with player
  for (const enemy of newState.enemies) {
    if (!enemy.isDying && checkCollision(newState.player.position, newState.player, enemy.position, enemy)) {
      if (!newState.player.isInvincible) {
        newState.player.hp = Math.max(0, newState.player.hp - 1);
        newState.player.isInvincible = true;
        newState.player.invincibilityEndTime = Date.now() + 3000; // 3 seconds
        // Knockback
        newState.player.velocity.x = enemy.position.x < newState.player.position.x ? 10 : -10;
        newState.player.velocity.y = -8;
      }
    }
  }

  if (newState.player.hp <= 0) {
    newState.player.isKnockedDown = true;
  }

  // Update camera
  newState.camera.x = Math.max(0, Math.min(
    newState.player.position.x - SCREEN_WIDTH / 2,
    STAGE_WIDTH - SCREEN_WIDTH
  ));

  // Spawn new enemies if needed
  if (newState.enemies.length < 5) {
    const platformIndex = Math.floor(Math.random() * (state.platforms.length - 1)) + 1;
    const platform = state.platforms[platformIndex];
    const isBlue = Math.random() < 0.16; // ~1:5 ratio for blue demons
    newState.enemies.push({
      id: Date.now(),
      position: {
        x: platform.x + Math.random() * (platform.width - 60),
        y: platform.y - 60,
      },
      velocity: { x: 0, y: 0 },
      width: 50,
      height: 60,
      hp: 1,
      direction: Math.random() > 0.5 ? 1 : -1,
      platformIndex,
      type: isBlue ? 'blue' : 'red',
      lastShootTime: isBlue ? Date.now() : undefined,
      nextShootTime: isBlue ? Date.now() + 5000 + Math.random() * 5000 : undefined,
    });
  }

  return newState;
};

const updatePlayer = (player: Player, keys: { [key: string]: boolean }, platforms: Platform[]): Player => {
  const newPlayer = { ...player };

  // Handle ducking
  if (keys['s'] || keys['S']) {
    newPlayer.isDucking = true;
    newPlayer.height = 35; // Shorter ducking height
  } else {
    newPlayer.isDucking = false;
    newPlayer.height = 70;
  }

  // Horizontal movement
  if (!newPlayer.isAttacking) {
    if (keys['a'] || keys['A']) {
      newPlayer.velocity.x = -MOVE_SPEED;
      newPlayer.facingRight = false;
    } else if (keys['d'] || keys['D']) {
      newPlayer.velocity.x = MOVE_SPEED;
      newPlayer.facingRight = true;
    } else {
      newPlayer.velocity.x = 0;
    }
  }

  // Apply gravity
  newPlayer.velocity.y += GRAVITY;

  // Apply velocity
  newPlayer.position.x += newPlayer.velocity.x;
  newPlayer.position.y += newPlayer.velocity.y;

  // Bounds checking
  newPlayer.position.x = Math.max(0, Math.min(newPlayer.position.x, STAGE_WIDTH - newPlayer.width));

  // Platform collision
  for (const platform of platforms) {
    if (
      newPlayer.position.x + newPlayer.width > platform.x &&
      newPlayer.position.x < platform.x + platform.width &&
      newPlayer.position.y + newPlayer.height > platform.y &&
      newPlayer.position.y + newPlayer.height < platform.y + platform.height + 20 &&
      newPlayer.velocity.y > 0
    ) {
      newPlayer.position.y = platform.y - newPlayer.height;
      newPlayer.velocity.y = 0;
    }
  }

  // Attack frame counter
  if (newPlayer.isAttacking) {
    newPlayer.attackFrame++;
    if (newPlayer.attackFrame > 15) {
      newPlayer.isAttacking = false;
      newPlayer.attackFrame = 0;
    }
  }

  return newPlayer;
};

const updateEnemy = (enemy: Enemy, platforms: Platform[], currentTime: number, projectiles: any[]): Enemy => {
  const newEnemy = { ...enemy };
  const platform = platforms[enemy.platformIndex];

  // Simple AI: move back and forth on platform (unless charging)
  if (!newEnemy.isCharging) {
    newEnemy.velocity.x = newEnemy.direction * 2;
    newEnemy.position.x += newEnemy.velocity.x;
  }

  // Turn around at platform edges and clamp within bounds
  const leftBound = platform.x;
  const rightBound = platform.x + platform.width - newEnemy.width;
  if (newEnemy.position.x <= leftBound || newEnemy.position.x >= rightBound) {
    newEnemy.direction *= -1;
  }
  newEnemy.position.x = Math.max(leftBound, Math.min(newEnemy.position.x, rightBound));

  // Apply gravity
  newEnemy.velocity.y += GRAVITY;
  newEnemy.position.y += newEnemy.velocity.y;

  // Platform collision
  if (
    newEnemy.position.x + newEnemy.width > platform.x &&
    newEnemy.position.x < platform.x + platform.width &&
    newEnemy.position.y + newEnemy.height > platform.y &&
    newEnemy.position.y + newEnemy.height < platform.y + platform.height + 20 &&
    newEnemy.velocity.y > 0
  ) {
    newEnemy.position.y = platform.y - newEnemy.height;
    newEnemy.velocity.y = 0;
  }

  // Blue demons shoot knives
  if (newEnemy.type === 'blue') {
    // Initialize next shoot time if not set
    if (!newEnemy.nextShootTime) {
      newEnemy.nextShootTime = currentTime + 5000 + Math.random() * 5000; // 5-10 seconds
    }
    
    // Check if it's time to start charging
    if (!newEnemy.isCharging && currentTime >= newEnemy.nextShootTime - 1000) {
      newEnemy.isCharging = true;
      newEnemy.chargeStartTime = currentTime;
    }
    
    // If charging, stop movement
    if (newEnemy.isCharging) {
      const chargeDuration = currentTime - (newEnemy.chargeStartTime || currentTime);
      
      if (chargeDuration < 1000) {
        // Stop moving during charge
        newEnemy.velocity.x = 0;
        newEnemy.position.x = newEnemy.position.x; // Hold position
      } else {
        // Charge complete, shoot knife
        newEnemy.isCharging = false;
        newEnemy.lastShootTime = currentTime;
        newEnemy.nextShootTime = currentTime + 5000 + Math.random() * 5000; // Next shoot in 5-10 seconds
        
        // Create projectile - fly at upper body height
        const knifeSpeed = 2.4; // 1.2x mob speed
        projectiles.push({
          id: Date.now() + Math.random(),
          position: {
            x: newEnemy.position.x + (newEnemy.direction > 0 ? newEnemy.width : 0),
            y: newEnemy.position.y + newEnemy.height / 3, // Higher position (upper third of enemy)
          },
          velocity: {
            x: newEnemy.direction * knifeSpeed,
            y: 0,
          },
          width: 20,
          height: 4,
          ownerId: newEnemy.id,
        });
      }
    }
  }

  return newEnemy;
};

const checkCollision = (pos1: Position, obj1: { width: number; height: number }, pos2: Position, obj2: { width: number; height: number }): boolean => {
  return (
    pos1.x < pos2.x + obj2.width &&
    pos1.x + obj1.width > pos2.x &&
    pos1.y < pos2.y + obj2.height &&
    pos1.y + obj1.height > pos2.y
  );
};

export const handleJump = (state: GameState): void => {
  if (state.player.isKnockedDown) return;
  
  // Check if on ground or platform
  for (const platform of state.platforms) {
    if (
      state.player.position.x + state.player.width > platform.x &&
      state.player.position.x < platform.x + platform.width &&
      Math.abs(state.player.position.y + state.player.height - platform.y) < 10
    ) {
      state.player.velocity.y = JUMP_FORCE;
      break;
    }
  }
};

export const handleAttack = (state: GameState): void => {
  if (state.player.isKnockedDown) return;
  if (!state.player.isAttacking) {
    state.player.isAttacking = true;
    state.player.attackFrame = 0;
  }
};
