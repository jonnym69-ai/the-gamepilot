

/* Compact Dashboard Widgets */
export function MiniStatsWidget({ weeklyPlayDays, weeklyPlaytimeHours, libraryCount }) {
  return (
    <div className="dashboard-widget mini-stats-widget">
      <div className="widget-header">
        <span className="widget-icon">📊</span>
        <span className="widget-title">Weekly</span>
      </div>
      <div className="widget-body stats-grid">
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlaytimeHours || 0}h</span>
          <span className="stat-label">Played</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlayDays || 0}</span>
          <span className="stat-label">Days</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{libraryCount || 0}</span>
          <span className="stat-label">Games</span>
        </div>
      </div>
    </div>
  );
}

export function MiniQuestWidget({ weeklyQuest, handleWeeklyQuestPinToggle }) {
  const primary = weeklyQuest?.primaryQuest;
  if (!primary) return null;
  return (
    <div className="dashboard-widget mini-quest-widget">
      <div className="widget-header">
        <span className="widget-icon">🎯</span>
        <span className="widget-title">Quest</span>
        <span className="widget-badge">{weeklyQuest?.completedCount || 0}/{weeklyQuest?.totalCount || 0}</span>
      </div>
      <div className="widget-body">
        <h4 className="widget-quest-title">{primary.icon} {primary.name}</h4>
        <p className="widget-quest-desc">{primary.desc}</p>
        <div className="widget-progress-bar">
          <span style={{ width: ${primary.progressPercent}% }} />
        </div>
        <div className="widget-quest-meta">
          <span>{primary.progressLabel}</span>
          <span className="widget-xp">+{primary.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}

export function MiniNextUpWidget({ game, entry, artwork, placeholder, platformIcons, onLaunch }) {
  if (!game) return null;
  return (
    <div className="dashboard-widget mini-nextup-widget">
      <div className="widget-header">
        <span className="widget-icon">🚀</span>
        <span className="widget-title">Next Up</span>
      </div>
      <div className="widget-body">
        <div className="widget-game-thumb">
          {artwork ? (
            <LazyImage src={artwork} alt={game.name} placeholder={placeholder} className="widget-thumb-img" />
          ) : (
            <div className="widget-thumb-placeholder">{platformIcons[game.platform] || '🎮'}</div>
          )}
        </div>
        <div className="widget-game-info">
          <h4 className="widget-game-title">{game.name}</h4>
          <p className="widget-game-reason">{entry?.reason || 'Recommended for you'}</p>
          <button className="widget-launch-btn" onClick={onLaunch}>Launch</button>
        </div>
      </div>
    </div>
  );
}

export function MiniBacklogWidget({ libraryCount, completedCount = 0 }) {
  const percent = libraryCount > 0 ? Math.round((completedCount / libraryCount) * 100) : 0;
  return (
    <div className="dashboard-widget mini-backlog-widget">
      <div className="widget-header">
        <span className="widget-icon">📚</span>
        <span className="widget-title">Library</span>
      </div>
      <div className="widget-body backlog-body">
        <MiniProgressRing percent={percent} size={56} stroke={5} color="#7ddc84" />
        <div className="backlog-stats">
          <span className="backlog-count">{libraryCount}</span>
          <span className="backlog-label">{completedCount} completed</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardWidgetGrid({ children }) {
  return (
    <div className="dashboard-widget-grid">
      {children}
    </div>
  );
}

/* Compact Dashboard Widgets */
export function MiniStatsWidget({ weeklyPlayDays, weeklyPlaytimeHours, libraryCount }) {
  return (
    <div className="dashboard-widget mini-stats-widget">
      <div className="widget-header">
        <span className="widget-icon">📊</span>
        <span className="widget-title">Weekly</span>
      </div>
      <div className="widget-body stats-grid">
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlaytimeHours || 0}h</span>
          <span className="stat-label">Played</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlayDays || 0}</span>
          <span className="stat-label">Days</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{libraryCount || 0}</span>
          <span className="stat-label">Games</span>
        </div>
      </div>
    </div>
  );
}

export function MiniQuestWidget({ weeklyQuest, handleWeeklyQuestPinToggle }) {
  const primary = weeklyQuest?.primaryQuest;
  if (!primary) return null;
  return (
    <div className="dashboard-widget mini-quest-widget">
      <div className="widget-header">
        <span className="widget-icon">🎯</span>
        <span className="widget-title">Quest</span>
        <span className="widget-badge">{weeklyQuest?.completedCount || 0}/{weeklyQuest?.totalCount || 0}</span>
      </div>
      <div className="widget-body">
        <h4 className="widget-quest-title">{primary.icon} {primary.name}</h4>
        <p className="widget-quest-desc">{primary.desc}</p>
        <div className="widget-progress-bar">
          <span style={{ width: ${primary.progressPercent}% }} />
        </div>
        <div className="widget-quest-meta">
          <span>{primary.progressLabel}</span>
          <span className="widget-xp">+{primary.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}

export function MiniNextUpWidget({ game, entry, artwork, placeholder, platformIcons, onLaunch }) {
  if (!game) return null;
  return (
    <div className="dashboard-widget mini-nextup-widget">
      <div className="widget-header">
        <span className="widget-icon">🚀</span>
        <span className="widget-title">Next Up</span>
      </div>
      <div className="widget-body">
        <div className="widget-game-thumb">
          {artwork ? (
            <LazyImage src={artwork} alt={game.name} placeholder={placeholder} className="widget-thumb-img" />
          ) : (
            <div className="widget-thumb-placeholder">{platformIcons[game.platform] || '🎮'}</div>
          )}
        </div>
        <div className="widget-game-info">
          <h4 className="widget-game-title">{game.name}</h4>
          <p className="widget-game-reason">{entry?.reason || 'Recommended for you'}</p>
          <button className="widget-launch-btn" onClick={onLaunch}>Launch</button>
        </div>
      </div>
    </div>
  );
}

export function MiniBacklogWidget({ libraryCount, completedCount = 0 }) {
  const percent = libraryCount > 0 ? Math.round((completedCount / libraryCount) * 100) : 0;
  return (
    <div className="dashboard-widget mini-backlog-widget">
      <div className="widget-header">
        <span className="widget-icon">📚</span>
        <span className="widget-title">Library</span>
      </div>
      <div className="widget-body backlog-body">
        <MiniProgressRing percent={percent} size={56} stroke={5} color="#7ddc84" />
        <div className="backlog-stats">
          <span className="backlog-count">{libraryCount}</span>
          <span className="backlog-label">{completedCount} completed</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardWidgetGrid({ children }) {
  return (
    <div className="dashboard-widget-grid">
      {children}
    </div>
  );
}

/* Compact Dashboard Widgets */
export function MiniStatsWidget({ weeklyPlayDays, weeklyPlaytimeHours, libraryCount }) {
  return (
    <div className="dashboard-widget mini-stats-widget">
      <div className="widget-header">
        <span className="widget-icon">📊</span>
        <span className="widget-title">Weekly</span>
      </div>
      <div className="widget-body stats-grid">
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlaytimeHours || 0}h</span>
          <span className="stat-label">Played</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{weeklyPlayDays || 0}</span>
          <span className="stat-label">Days</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{libraryCount || 0}</span>
          <span className="stat-label">Games</span>
        </div>
      </div>
    </div>
  );
}

export function MiniQuestWidget({ weeklyQuest }) {
  const primary = weeklyQuest?.primaryQuest;
  if (!primary) return null;
  return (
    <div className="dashboard-widget mini-quest-widget">
      <div className="widget-header">
        <span className="widget-icon">��</span>
        <span className="widget-title">Quest</span>
        <span className="widget-badge">{weeklyQuest?.completedCount || 0}/{weeklyQuest?.totalCount || 0}</span>
      </div>
      <div className="widget-body">
        <h4 className="widget-quest-title">{primary.icon} {primary.name}</h4>
        <p className="widget-quest-desc">{primary.desc}</p>
        <div className="widget-progress-bar">
          <span style={{ width: ${primary.progressPercent}% }} />
        </div>
        <div className="widget-quest-meta">
          <span>{primary.progressLabel}</span>
          <span className="widget-xp">+{primary.xpReward} XP</span>
        </div>
      </div>
    </div>
  );
}

export function MiniNextUpWidget({ game, entry, artwork, placeholder, platformIcons, onLaunch }) {
  if (!game) return null;
  return (
    <div className="dashboard-widget mini-nextup-widget">
      <div className="widget-header">
        <span className="widget-icon">🚀</span>
        <span className="widget-title">Next Up</span>
      </div>
      <div className="widget-body">
        <div className="widget-game-thumb">
          {artwork ? (
            <LazyImage src={artwork} alt={game.name} placeholder={placeholder} className="widget-thumb-img" />
          ) : (
            <div className="widget-thumb-placeholder">{platformIcons[game.platform] || '🎮'}</div>
          )}
        </div>
        <div className="widget-game-info">
          <h4 className="widget-game-title">{game.name}</h4>
          <p className="widget-game-reason">{entry?.reason || 'Recommended for you'}</p>
          <button className="widget-launch-btn" onClick={onLaunch}>Launch</button>
        </div>
      </div>
    </div>
  );
}

export function MiniBacklogWidget({ libraryCount, completedCount = 0 }) {
  const percent = libraryCount > 0 ? Math.round((completedCount / libraryCount) * 100) : 0;
  return (
    <div className="dashboard-widget mini-backlog-widget">
      <div className="widget-header">
        <span className="widget-icon">📚</span>
        <span className="widget-title">Library</span>
      </div>
      <div className="widget-body backlog-body">
        <MiniProgressRing percent={percent} size={56} stroke={5} color="#7ddc84" />
        <div className="backlog-stats">
          <span className="backlog-count">{libraryCount}</span>
          <span className="backlog-label">{completedCount} completed</span>
        </div>
      </div>
    </div>
  );
}

export function DashboardWidgetGrid({ children }) {
  return (
    <div className="dashboard-widget-grid">
      {children}
    </div>
  );
}
