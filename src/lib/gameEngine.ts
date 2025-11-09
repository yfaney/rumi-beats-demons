import { GameState, Player, Enemy, Platform, Position } from "@/types/game";

const GRAVITY = 0.5;
const JUMP_FORCE = -12;
const MOVE_SPEED = 5;
const STAGE_WIDTH = 19200;
const STAGE_HEIGHT = 1080;
const SCREEN_WIDTH = 1920;
const SCREEN_HEIGHT = 1080;

export const createInitialState = (): GameState => {
  const platforms: Platform[] = [
    // Ground
    { x: 0, y: 900, width: STAGE_WIDTH, height: 100 },
    // Floating platforms
    { x: 500, y: 700, width: 400, height: 30 },
    { x: 1200, y: 550, width: 400, height: 30 },
    { x: 1900, y: 700, width: 400, height: 30 },
    { x: 2600, y: 550, width: 400, height: 30 },
    { x: 3300, y: 700, width: 400, height: 30 },
    { x: 4000, y: 550, width: 400, height: 30 },
    { x: 4700, y: 700, width: 400, height: 30 },
    { x: 5400, y: 550, width: 400, height: 30 },
    { x: 6100, y: 700, width: 400, height: 30 },
    { x: 6800, y: 550, width: 400, height: 30 },
    { x: 7500, y: 700, width: 400, height: 30 },
    { x: 8200, y: 550, width: 400, height: 30 },
    { x: 8900, y: 700, width: 400, height: 30 },
    { x: 9600, y: 550, width: 400, height: 30 },
  ];

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
    },
    enemies,
    platforms,
    score: 0,
    camera: { x: 0, y: 0 },
    keys: {},
    killCount: 0,
  };
};

export const updateGameState = (state: GameState): GameState => {
  if (state.player.isKnockedDown) return state;

  const newState = { ...state };
  
  // Update player
  newState.player = updatePlayer(state.player, state.keys, state.platforms);
  
  // Update enemies
  newState.enemies = state.enemies
    .map(enemy => updateEnemy(enemy, state.platforms))
    .filter(enemy => enemy.hp > 0);

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

      if (inRange && facingEnemy) {
        newState.score += 10;
        newState.killCount += 1;
        
        // Heal every 5 kills
        if (newState.killCount % 5 === 0 && newState.player.hp < newState.player.maxHp) {
          newState.player.hp = Math.min(newState.player.hp + 1, newState.player.maxHp);
        }
        
        return false; // Remove enemy
      }
      return true;
    });
  }

  // Check enemy collisions with player
  for (const enemy of newState.enemies) {
    if (checkCollision(newState.player.position, newState.player, enemy.position, enemy)) {
      newState.player.hp = Math.max(0, newState.player.hp - 1);
      // Knockback
      newState.player.velocity.x = enemy.position.x < newState.player.position.x ? 10 : -10;
      newState.player.velocity.y = -8;
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
    });
  }

  return newState;
};

const updatePlayer = (player: Player, keys: { [key: string]: boolean }, platforms: Platform[]): Player => {
  const newPlayer = { ...player };

  // Handle ducking
  if (keys['s'] || keys['S']) {
    newPlayer.isDucking = true;
    newPlayer.height = 40;
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

const updateEnemy = (enemy: Enemy, platforms: Platform[]): Enemy => {
  const newEnemy = { ...enemy };
  const platform = platforms[enemy.platformIndex];

  // Simple AI: move back and forth on platform
  newEnemy.velocity.x = newEnemy.direction * 2;
  newEnemy.position.x += newEnemy.velocity.x;

  // Turn around at platform edges
  if (newEnemy.position.x < platform.x || newEnemy.position.x + newEnemy.width > platform.x + platform.width) {
    newEnemy.direction *= -1;
  }

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
