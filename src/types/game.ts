export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Player {
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  isAttacking: boolean;
  isDucking: boolean;
  isKnockedDown: boolean;
  attackFrame: number;
  facingRight: boolean;
  isInvincible: boolean;
  invincibilityEndTime: number;
}

export interface Projectile {
  id: number;
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  ownerId: number;
}

export interface Enemy {
  id: number;
  position: Position;
  velocity: Velocity;
  width: number;
  height: number;
  hp: number;
  direction: number;
  platformIndex: number;
  isDying?: boolean;
  dyingFrame?: number;
  type: 'red' | 'blue' | 'purple';
  lastShootTime?: number;
  nextShootTime?: number;
  isCharging?: boolean;
  chargeStartTime?: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  platforms: Platform[];
  score: number;
  camera: { x: number; y: number };
  keys: { [key: string]: boolean };
  killCount: number;
  isGameEnded?: boolean;
  windowLightTime: number;
  windowLightStates: boolean[];
}
