import { Game } from "@/components/Game";

const Index = () => {
  return (
    <main className="min-h-screen bg-gradient-to-b from-game-bg-start to-game-bg-end">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-6xl font-bold text-primary mb-2 tracking-tight">
            K-Pop Demon Hunters
          </h1>
          <p className="text-xl text-foreground/80">
            Play as Rumi and defeat the demons!
          </p>
        </header>
        <Game />
      </div>
    </main>
  );
};

export default Index;
