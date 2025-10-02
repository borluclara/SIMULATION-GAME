import React from 'react';
import Papa from 'papaparse';

const UploadScreen = ({ onDataParsed }) => {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("Parsed CSV:", results.data);
        onDataParsed(results.data);
      },
      error: (err) => {
        console.error("CSV Parse Error:", err);
      }
    });
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-white min-h-screen flex flex-col">
      <header className="flex items-center justify-between p-4">
        <div className="w-10"></div>
        <h1 className="text-2xl font-bold text-center flex-1">BlastSim</h1>
        <button className="w-10 flex items-center justify-center">
          <span className="material-symbols-outlined text-3xl">settings</span>
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center p-4 space-y-8">
        <div className="w-full max-w-sm">
          <input
            className="form-input w-full rounded-lg bg-background-dark/50 dark:bg-background-light/10 border-2 border-primary/50 focus:border-primary focus:ring-primary placeholder-white/50 text-white p-4 text-base"
            placeholder="Enter your name"
          />
        </div>

        <div className="w-full max-w-sm flex flex-col space-y-4">
          <button className="w-full rounded-lg h-14 bg-primary text-background-dark text-lg font-bold">
            Start Simulation
          </button>

          <label className="w-full rounded-lg h-14 bg-primary/20 dark:bg-primary/30 text-white text-lg font-bold flex items-center justify-center cursor-pointer">
            Load CSV Scenario
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button className="w-full rounded-lg h-14 bg-primary/20 dark:bg-primary/30 text-white text-lg font-bold">
            Leaderboard
          </button>
          <button className="w-full rounded-lg h-14 bg-primary/20 dark:bg-primary/30 text-white text-lg font-bold">
            Help
          </button>
        </div>
      </main>

      <nav className="border-t border-primary/20 bg-background-light/5 dark:bg-background-dark/20 backdrop-blur-sm sticky bottom-0">
        <div className="flex justify-around p-2">
          <a className="flex flex-col items-center gap-1 p-2 rounded-lg text-primary" href="#">
            <span className="material-symbols-outlined">home</span>
            <span className="text-xs font-medium">Home</span>
          </a>
          <a className="flex flex-col items-center gap-1 p-2 rounded-lg text-white/70 hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">gamepad</span>
            <span className="text-xs font-medium">Game</span>
          </a>
          <a className="flex flex-col items-center gap-1 p-2 rounded-lg text-white/70 hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">leaderboard</span>
            <span className="text-xs font-medium">Leaderboard</span>
          </a>
          <a className="flex flex-col items-center gap-1 p-2 rounded-lg text-white/70 hover:text-primary transition-colors" href="#">
            <span className="material-symbols-outlined">help</span>
            <span className="text-xs font-medium">Help</span>
          </a>
        </div>
      </nav>
    </div>
  );
};

export default UploadScreen;