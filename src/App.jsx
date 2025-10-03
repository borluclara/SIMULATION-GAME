
import React from 'react'
import './App.css'
import GridManager from './components/GridManager'

function App() {
  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col justify-between overflow-x-hidden">
      <div className="flex-grow">
        <header className="p-4">
          <div className="flex items-center justify-between">
            <button className="flex items-center justify-center size-10 text-white dark:text-white">
              <svg className="feather feather-arrow-left" fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <line x1="19" x2="5" y1="12" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-xl font-bold text-white dark:text-white text-center">Blast Simulation</h1>
            <div className="size-10"></div>
          </div>
          <p className="text-lg font-medium text-white dark:text-white mt-4">Player: Alex</p>
        </header>
        
        <main>
          <GridManager />
        </main>
      </div>
      
      <nav className="sticky bottom-0 mt-8 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-t border-white/10 dark:border-white/10">
        <div className="flex justify-around items-center h-20">
          <a className="flex flex-col items-center gap-1 text-white/60 dark:text-white/60 hover:text-white dark:hover:text-white transition-colors" href="#">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span className="text-xs font-medium">Home</span>
          </a>
          <a className="flex flex-col items-center gap-1 p-2 rounded-full bg-primary text-background-dark dark:text-background-dark" href="#">
            <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 5a1 1 0 00-1 1v1.586l-1.707 1.707A1 1 0 005.586 11H8v4a1 1 0 102 0v-4h2.414a1 1 0 00.707-1.707L11.414 7.586V6a1 1 0 10-2 0v1.586l-1.707-1.707A1 1 0 007 5z" fillRule="evenodd"></path>
            </svg>
            <span className="text-xs font-bold -mt-1">Game</span>
          </a>
          <a className="flex flex-col items-center gap-1 text-white/60 dark:text-white/60 hover:text-white dark:hover:text-white transition-colors" href="#">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-3-6v6m0-6V5a2 2 0 012-2h2a2 2 0 012 2v2m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span className="text-xs font-medium">Leaderboard</span>
          </a>
          <a className="flex flex-col items-center gap-1 text-white/60 dark:text-white/60 hover:text-white dark:hover:text-white transition-colors" href="#">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
            </svg>
            <span className="text-xs font-medium">Help</span>
          </a>
        </div>
        <div className="h-safe-area-bottom bg-background-light/80 dark:bg-background-dark/80"></div>
      </nav>
    </div>
  )
}

export default App