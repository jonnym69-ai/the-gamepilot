export const LibraryExportService = {
  toJSON(library) {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: '1.0',
      totalGames: library.length,
      games: library.map(game => ({
        name: game.name || game.appname,
        platform: game.platform,
        genres: game.genres || [],
        mood: game.mood,
        timePlayed: game.time_played || 0,
        lastPlayed: game.last_played,
        userRating: game.userRating,
        completed: game.completed || false,
        installPath: game.path || game.installPath,
        appId: game.appid || game.steamAppId
      }))
    }, null, 2);
  },

  toCSV(library) {
    const headers = [
      'Name', 'Platform', 'Genres', 'Mood', 'Time Played (min)',
      'Last Played', 'Rating', 'Completed', 'App ID'
    ];

    const rows = library.map(game => [
      `"${(game.name || game.appname || '').replace(/"/g, '""')}"`,
      game.platform || 'Unknown',
      `"${(game.genres || []).join('; ')}"`,
      game.mood || '',
      game.time_played || 0,
      game.last_played ? new Date(game.last_played).toLocaleDateString() : '',
      game.userRating || '',
      game.completed ? 'Yes' : 'No',
      game.appid || game.steamAppId || ''
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  },

  toMarkdown(library) {
    const lines = [
      '# GamePilot Library Export',
      '',
      `*Generated on ${new Date().toLocaleDateString()}*`,
      `*${library.length} games tracked*`,
      '',
      '## Summary',
      '',
      `- **Total Games:** ${library.length}`,
      `- **Platforms:** ${[...new Set(library.map(g => g.platform).filter(Boolean))].join(', ')}`,
      ''
    ];

    // Group by platform
    const byPlatform = {};
    library.forEach(game => {
      const p = game.platform || 'Unknown';
      if (!byPlatform[p]) byPlatform[p] = [];
      byPlatform[p].push(game);
    });

    Object.entries(byPlatform).forEach(([platform, games]) => {
      lines.push(`## ${platform} (${games.length})`, '');
      games.forEach(game => {
        const name = game.name || game.appname || 'Unknown';
        const hours = game.time_played ? Math.round((game.time_played / 60) * 10) / 10 : 0;
        const rating = game.userRating ? ` ⭐ ${game.userRating}/10` : '';
        const completed = game.completed ? ' ✅ Completed' : '';
        lines.push(`- **${name}**${rating}${completed}`);
        if (hours > 0) lines.push(`  - ${hours}h played`);
        if (game.genres?.length) lines.push(`  - ${game.genres.join(', ')}`);
        lines.push('');
      });
    });

    return lines.join('\n');
  },

  download(content, filename, mimeType = 'application/json') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  exportLibrary(library, format = 'json') {
    const timestamp = new Date().toISOString().split('T')[0];
    switch (format) {
      case 'json':
        this.download(this.toJSON(library), `gamepilot-library-${timestamp}.json`, 'application/json');
        break;
      case 'csv':
        this.download(this.toCSV(library), `gamepilot-library-${timestamp}.csv`, 'text/csv');
        break;
      case 'markdown':
        this.download(this.toMarkdown(library), `gamepilot-library-${timestamp}.md`, 'text/markdown');
        break;
      default:
        throw new Error(`Unknown export format: ${format}`);
    }
  }
};

export default LibraryExportService;
