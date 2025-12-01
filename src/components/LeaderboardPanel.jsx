import React, { useEffect, useMemo, useState } from 'react';
import useBlastHistory from '../hooks/useBlastHistory';
import './LeaderboardPanel.css';

const LeaderboardPanel = ({ onBack, playerName = 'Anonymous Miner' }) => {
  const { history, sessionStats, refresh, store, clearLeaderboardStorage } = useBlastHistory();
  const [sortMode, setSortMode] = useState('score'); // 'score' | 'recent'
  const [isResetDialogOpen, setResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [renderedEntries, setRenderedEntries] = useState([]);

    useEffect(() => {
      refresh();
      const intervalId = setInterval(() => {
        refresh();
      }, 8000);
      return () => clearInterval(intervalId);
    }, [refresh]);

  const formattedEntries = useMemo(() => {
    const source = Array.isArray(history) ? history : [];
    return source
      .filter(isValidScoreEntry)
      .map((record, index) => formatRecord(record, index, playerName));
  }, [history, playerName]);
  const sortedEntries = useMemo(() => {
    const entries = [...formattedEntries];

    if (sortMode === 'recent') {
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    }

    return entries.sort((a, b) => b.score - a.score);
  }, [formattedEntries, sortMode]);

  const displayEntries = useMemo(() => {
    if (sortMode === 'recent') {
      return sortedEntries.slice(0, 10);
    }

    return sortedEntries;
  }, [sortedEntries, sortMode, playerName]);

  const medalMap = useMemo(() => {
    const podium = [...formattedEntries]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    const medals = ['gold', 'silver', 'bronze'];
    return podium.reduce((map, entry, index) => {
      map.set(entry.id, medals[index]);
      return map;
    }, new Map());
  }, [formattedEntries]);

  const highlightId = displayEntries.find((entry) =>
    entry.playerName.toLowerCase() === playerName.toLowerCase()
  )?.id;

  const summary = useMemo(() => buildSummary(sessionStats, formattedEntries), [sessionStats, formattedEntries]);

  useEffect(() => {
    setRenderedEntries((prev) => {
      const prevMap = new Map(prev.map((entry) => [entry.id, entry]));
      const nextEntries = displayEntries.map((entry, index) => {
        const prevEntry = prevMap.get(entry.id);
        const rankPosition = index + 1;
        const motion = !prevEntry
          ? 'enter'
          : prevEntry.score !== entry.score
            ? 'updated'
            : prevEntry.rankPosition !== rankPosition
              ? 'reordered'
              : 'stable';

        return {
          ...entry,
          rankPosition,
          _motion: motion,
          _order: rankPosition
        };
      });

      const nextIds = new Set(displayEntries.map((entry) => entry.id));

      const exitingEntries = prev
        .filter((entry) => !nextIds.has(entry.id) && entry._motion !== 'exit')
        .map((entry) => ({
          ...entry,
          _motion: 'exit',
          _order: entry.rankPosition ?? entry._order ?? Number.MAX_SAFE_INTEGER
        }));

      return [...nextEntries, ...exitingEntries]
        .sort((a, b) => (a._order ?? Number.MAX_SAFE_INTEGER) - (b._order ?? Number.MAX_SAFE_INTEGER));
    });
  }, [displayEntries]);

  const handleRowAnimationEnd = (entryId, motion, event) => {
    if (event?.target !== event?.currentTarget) {
      return;
    }

    if (motion === 'exit') {
      setRenderedEntries((prev) => prev.filter((entry) => !(entry.id === entryId && entry._motion === 'exit')));
      return;
    }

    if (motion !== 'stable') {
      setRenderedEntries((prev) => prev.map((entry) => (
        entry.id === entryId
          ? { ...entry, _motion: 'stable' }
          : entry
      )));
    }
  };

  const handleManualRefresh = async () => {
    if (isRefreshing) {
      return;
    }
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="leaderboard-screen blast-sim-container">
      <header className="leaderboard-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to previous view">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>

        <div className="leaderboard-heading">
          <h1>Leaderboard</h1>
        </div>

        <button
          className={`icon-button ${isRefreshing ? 'refreshing' : ''}`}
          type="button"
          onClick={handleManualRefresh}
          aria-label="Refresh leaderboard"
          disabled={isRefreshing}
        >
          <span className="material-symbols-outlined" aria-live="polite">
            {isRefreshing ? 'progress_activity' : 'refresh'}
          </span>
        </button>
      </header>

      <section className="leaderboard-tabs">
        <div className="sort-toolbar">
          <label className="select-field" aria-label="Sort leaderboard">
            <div className="select-wrapper">
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
                <option value="score">Highest Score</option>
                <option value="recent">Most Recent</option>
              </select>
              <span className="select-caret" aria-hidden="true">▼</span>
            </div>
          </label>

          <button
            type="button"
            className="reset-button"
            onClick={() => setResetDialogOpen(true)}
          >
            Reset Leaderboard
          </button>
        </div>
      </section>

      <section className="leaderboard-list">
        {displayEntries.length === 0 && (
          <div className="leaderboard-empty">
            <p>No runs logged yet. Play a round to populate the board.</p>
          </div>
        )}

        <ul>
          {renderedEntries.map((entry, index) => {
            const medal = entry._motion === 'exit' ? null : medalMap.get(entry.id);
            const rankValue = entry.rankPosition ?? entry._order ?? index + 1;
            const motionClass = getMotionClass(entry._motion);
            const isActiveRow = entry._motion !== 'exit' && highlightId === entry.id;
            return (
            <li
              key={`${entry.id}-${entry._motion === 'exit' ? 'exit' : 'live'}`}
              className={`leaderboard-row ${isActiveRow ? 'is-active' : ''} ${motionClass}`}
              onAnimationEnd={(event) => handleRowAnimationEnd(entry.id, entry._motion, event)}
            >
              <div className="row-main">
                <div className="row-left">
                  <span className="rank">{rankValue}</span>
                  {medal && (
                    <span className={`medal-badge medal-${medal}`} aria-label={`${medal} medal`}>
                      <img src={medalImages[medal]} alt={`${medal} medal`} loading="lazy" />
                    </span>
                  )}
                  <div className="avatar-circle">
                    <img src={getAvatarForName(entry.playerName)} alt={`${entry.playerName} avatar`} loading="lazy" />
                  </div>

                  <div className="player-column">
                    <p className="player-name">{entry.playerName}</p>
                    <p className="player-meta">{entry.absoluteTime} · {entry.relativeTime}</p>
                  </div>
                </div>

                <div className="score-column">
                  <p className="player-score">{formatScore(entry.score)} pts</p>
                  <p className="score-label">Score</p>
                </div>
              </div>

              <div className="stat-grid">
                <div className="stat-card">
                  <p className="stat-value">{entry.recovered.toLocaleString('en-US')}</p>
                  <p className="stat-label">Recovered</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{entry.diluted.toLocaleString('en-US')}</p>
                  <p className="stat-label">Diluted</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{entry.destroyed.toLocaleString('en-US')}</p>
                  <p className="stat-label">Destroyed</p>
                </div>
                <div className="stat-card">
                  <p className="stat-value">{entry.recoveryRate}%</p>
                  <p className="stat-label">Recovery Rate</p>
                </div>
              </div>
            </li>
          );})}
        </ul>
      </section>

      {isResetDialogOpen && (
        <div className="leaderboard-modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm leaderboard reset">
          <div className="leaderboard-modal">
            <h2>Reset Leaderboard?</h2>
            <p>This will remove all locally stored scores. This action cannot be undone.</p>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setResetDialogOpen(false)} disabled={isResetting}>
                Cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => handleResetConfirm({
                  resetLeaderboard: clearLeaderboardStorage,
                  store,
                  refresh,
                  setResetDialogOpen,
                  setIsResetting,
                  setSortMode
                })}
                disabled={isResetting}
              >
                {isResetting ? 'Clearing…' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const formatRecord = (record, index, fallbackPlayer) => {
  const timestamp = record.timestamp ? new Date(record.timestamp) : new Date(Date.now() - index * 3600000);
  const metricsScore = typeof record.scoreMetrics?.totalScore === 'number' ? record.scoreMetrics.totalScore : undefined;
  const score = typeof record.totalScore === 'number'
    ? record.totalScore
    : typeof record.score === 'number'
      ? record.score
      : typeof metricsScore === 'number'
        ? metricsScore
        : 0;

  const recoveryRate = Number(
    record.recovery ??
    record.recoveryRate ??
    record.scoreMetrics?.recoveryRate ??
    record.performance?.recovery ??
    0
  );

  const dilutionRate = Number(
    record.dilution ??
    record.dilutionRate ??
    record.scoreMetrics?.dilutionRate ??
    record.performance?.dilution ??
    0
  );

  const blastTotals = record.blastResult?.totals || {};
  const destroyedFromTotals = [
    blastTotals.totalOresRecovered,
    blastTotals.totalOresLost,
    blastTotals.totalWasteInZone
  ].reduce((sum, value) => sum + (Number(value) || 0), 0);

  const destroyed = record.cellsDestroyed
    ?? record.cellsAffected
    ?? (destroyedFromTotals > 0 ? destroyedFromTotals : undefined)
    ?? sumMaterialBreakdown(record.materialBreakdown)
    ?? sumMaterialBreakdown(record.blastResult?.materialBreakdown)
    ?? Math.max(1, Math.round(score / 1200));

  const recovered = record.oresRecovered
    ?? blastTotals.totalOresRecovered
    ?? Math.max(1, Math.round((recoveryRate / 100) * destroyed));

  const diluted = record.wasteCollected
    ?? blastTotals.totalOresLost
    ?? blastTotals.totalWasteInZone
    ?? Math.max(0, Math.round((dilutionRate / 100) * destroyed));

  const grade = record.grade || record.scoreMetrics?.grade || calculateGrade(score);
  const entryId = record.blastHash || record.sessionId || `session-${index + 1}`;
  const playerLabel = record.playerID || record.playerName || fallbackPlayer || 'Anonymous Miner';

  return {
    id: entryId,
    playerName: playerLabel,
    round: record.round || index + 1,
    score: Math.round(score),
    recovered,
    diluted,
    destroyed,
    recoveryRate: Math.max(0, Math.round(recoveryRate)),
    dilutionRate: Math.max(0, Math.round(dilutionRate)),
    grade,
    timestamp,
    absoluteTime: formatAbsoluteTime(timestamp),
    relativeTime: formatRelativeTime(timestamp)
  };
};

const avatarSprites = buildAvatarSprites();
const medalImages = buildMedalImages();

const MOTION_CLASS_MAP = {
  enter: 'is-entering',
  updated: 'is-updated',
  reordered: 'is-reordered',
  exit: 'is-exiting'
};

const getMotionClass = (motion) => MOTION_CLASS_MAP[motion] || '';

const formatScore = (value = 0) => Number(value || 0).toLocaleString('en-US');

const formatAbsoluteTime = (date) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.format(date);
};

const formatRelativeTime = (date) => {
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const calculateGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
};

const buildSummary = (sessionStats, entries) => {
  if (sessionStats && sessionStats.totalRounds > 0) {
    return {
      title: 'Live Session',
      subtitle: `${sessionStats.totalRounds} rounds logged`,
      totalScore: sessionStats.totalScore || entries[0]?.score || 0,
      totalRounds: sessionStats.totalRounds,
      averageRecovery: sessionStats.averageRecovery,
      averageDilution: sessionStats.averageDilution,
      totalRecovered: (sessionStats.totalOresRecovered || 0).toLocaleString('en-US')
    };
  }

  const rounds = entries.length;

  if (rounds > 0) {
    const averageRecovery = Math.round(entries.reduce((sum, entry) => sum + entry.recoveryRate, 0) / rounds);
    const averageDilution = Math.round(entries.reduce((sum, entry) => sum + entry.dilutionRate, 0) / rounds);
    const totalRecovered = entries.reduce((sum, entry) => sum + (Number(entry.recovered) || 0), 0);

    return {
      title: 'Recorded History',
      subtitle: `${rounds} stored rounds`,
      totalScore: entries[0]?.score || 0,
      totalRounds: rounds,
      averageRecovery,
      averageDilution,
      totalRecovered: totalRecovered.toLocaleString('en-US')
    };
  }

  return {
    title: 'No Results Yet',
    subtitle: 'Play a round to populate the leaderboard',
    totalScore: 0,
    totalRounds: 0,
    averageRecovery: 0,
    averageDilution: 0,
    totalRecovered: '0'
  };
};

const sumMaterialBreakdown = (breakdown) => {
  if (!breakdown || typeof breakdown !== 'object') return 0;
  return Object.values(breakdown).reduce((sum, value) => sum + (Number(value) || 0), 0);
};

const isValidScoreEntry = (entry) => {
  if (!entry) {
    return false;
  }
  const score = entry.scoreMetrics?.totalScore ?? entry.totalScore ?? entry.score;
  return typeof score === 'number' && !Number.isNaN(score);
};

function getAvatarForName(name = '') {
  if (avatarSprites.length === 0) return '';
  const hash = Array.from(name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarSprites[hash % avatarSprites.length];
}

function buildAvatarSprites() {
  const configs = [
    { bg: '#0c3b2e', skin: '#f4d7c8', hair: '#5b3b2f', shirt: '#3a785c' },
    { bg: '#14324a', skin: '#f6d1b1', hair: '#2f1b10', shirt: '#2f6da1' },
    { bg: '#3b1d3a', skin: '#f4c9a5', hair: '#1f2c38', shirt: '#94497d' },
    { bg: '#2d2b19', skin: '#f2d2b8', hair: '#402218', shirt: '#c77932' }
  ];

  return configs.map(({ bg, skin, hair, shirt }) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="32" fill="${bg}" />
        <circle cx="32" cy="28" r="16" fill="${skin}" />
        <path d="M16 48c4-6 12-9 16-9s12 3 16 9v8H16z" fill="${shirt}" />
        <path d="M16 28c2-8 8-14 16-14s14 6 16 14c-4-2-8-3-16-3s-12 1-16 3z" fill="${hair}" />
        <circle cx="24" cy="30" r="2" fill="#1b1b1b" />
        <circle cx="40" cy="30" r="2" fill="#1b1b1b" />
        <path d="M26 38c2 2 8 2 12 0" stroke="#c28466" stroke-width="2" stroke-linecap="round" fill="none" />
      </svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  });
}

const handleResetConfirm = async ({ resetLeaderboard, store, refresh, setResetDialogOpen, setIsResetting, setSortMode }) => {
  setIsResetting(true);
  try {
    if (typeof resetLeaderboard === 'function') {
      await resetLeaderboard();
    } else {
      await store?.clearHistory?.();
    }
    refresh();
    setSortMode('score');
  } finally {
    setIsResetting(false);
    setResetDialogOpen(false);
  }
};

function buildMedalImages() {
  const encode = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  const gold = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
      <defs>
        <linearGradient id="goldRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#1c3374" />
          <stop offset="100%" stop-color="#0f1e4c" />
        </linearGradient>
        <radialGradient id="goldMedal" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#ffe9a7" />
          <stop offset="45%" stop-color="#f6c859" />
          <stop offset="100%" stop-color="#c38b1f" />
        </radialGradient>
      </defs>
      <rect x="26" y="6" width="68" height="70" rx="6" fill="url(#goldRibbon)" />
      <circle cx="60" cy="110" r="50" fill="url(#goldMedal)" />
      <circle cx="60" cy="110" r="38" fill="none" stroke="#fdf2c2" stroke-width="4" />
      <path d="M60 70 v20" stroke="#d4a235" stroke-width="10" stroke-linecap="round" />
      <path d="M32 112 a28 28 0 0 1 56 0" fill="none" stroke="#d8a02e" stroke-width="6" stroke-linecap="round" />
      <text x="60" y="122" text-anchor="middle" font-size="30" font-weight="700" fill="#fff8d8">Z1</text>
    </svg>`;

  const silver = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
      <defs>
        <linearGradient id="silverRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#283d98" />
          <stop offset="100%" stop-color="#14255d" />
        </linearGradient>
        <radialGradient id="silverMedal" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#f5f6fc" />
          <stop offset="50%" stop-color="#c6ccd9" />
          <stop offset="100%" stop-color="#8c93a3" />
        </radialGradient>
      </defs>
      <rect x="28" y="6" width="64" height="70" rx="6" fill="url(#silverRibbon)" />
      <circle cx="60" cy="110" r="50" fill="url(#silverMedal)" />
      <circle cx="60" cy="110" r="38" fill="none" stroke="#f0f2ff" stroke-width="4" />
      <path d="M35 108 c10-18 40-18 50 0" fill="none" stroke="#b6bccb" stroke-width="6" stroke-linecap="round" />
      <path d="M45 88 q15-12 30 0" fill="none" stroke="#babfca" stroke-width="4" />
      <text x="60" y="124" text-anchor="middle" font-size="38" font-weight="600" fill="#f6f7fb">★</text>
    </svg>`;

  const bronze = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
      <defs>
        <linearGradient id="bronzeRibbon" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#6f2b12" />
          <stop offset="100%" stop-color="#3b1406" />
        </linearGradient>
        <radialGradient id="bronzeMedal" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stop-color="#ffd0a3" />
          <stop offset="50%" stop-color="#d38346" />
          <stop offset="100%" stop-color="#8d4c20" />
        </radialGradient>
      </defs>
      <rect x="30" y="6" width="60" height="70" rx="6" fill="url(#bronzeRibbon)" />
      <circle cx="60" cy="110" r="50" fill="url(#bronzeMedal)" />
      <circle cx="60" cy="110" r="38" fill="none" stroke="#ffd9bd" stroke-width="4" />
      <path d="M34 115 a32 32 0 0 1 52 0" fill="none" stroke="#bd6b30" stroke-width="6" stroke-linecap="round" />
      <text x="60" y="120" text-anchor="middle" font-size="22" font-weight="600" fill="#fff3e9">Natural</text>
    </svg>`;

  return {
    gold: encode(gold),
    silver: encode(silver),
    bronze: encode(bronze)
  };
}

export default LeaderboardPanel;
