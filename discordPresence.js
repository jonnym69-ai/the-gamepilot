const DiscordRPC = require('discord-rpc');

const CLIENT_ID = '1535080448181674105';
let rpcClient = null;
let isConnected = false;
let currentActivity = null;
let reconnectTimer = null;

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const connect = () => {
  if (rpcClient) {
    return Promise.resolve();
  }

  rpcClient = new DiscordRPC.Client({ transport: 'ipc' });

  return new Promise((resolve) => {
    rpcClient.on('ready', () => {
      isConnected = true;
      if (currentActivity) {
        setActivity(currentActivity);
      }
      resolve();
    });

    rpcClient.on('disconnected', () => {
      isConnected = false;
      rpcClient = null;
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        connect().catch(() => {});
      }, 15000);
    });

    rpcClient.login({ clientId: CLIENT_ID }).catch(() => {
      isConnected = false;
      rpcClient = null;
      resolve();
    });
  });
};

const setActivity = (activity) => {
  currentActivity = activity;
  if (!rpcClient || !isConnected) {
    return;
  }

  rpcClient.setActivity(activity).catch(() => {
    isConnected = false;
  });
};

const clearActivity = () => {
  currentActivity = null;
  if (!rpcClient || !isConnected) {
    return;
  }

  rpcClient.clearActivity().catch(() => {
    isConnected = false;
  });
};

const startGamePresence = (game) => {
  const gameName = game?.name || 'a game';
  const platform = game?.platform || '';

  connect().then(() => {
    setActivity({
      details: `Playing ${gameName}`,
      state: platform ? `via ${platform}` : 'via GamePilot',
      startTimestamp: Date.now(),
      largeImageKey: 'gamepilot',
      largeImageText: 'GamePilot',
      instance: false
    });
  });
};

const stopGamePresence = () => {
  clearActivity();
};

const setIdlePresence = () => {
  connect().then(() => {
    setActivity({
      details: 'Browsing their library',
      state: 'GamePilot',
      startTimestamp: Date.now(),
      largeImageKey: 'gamepilot',
      largeImageText: 'GamePilot',
      instance: false
    });
  });
};

const disconnect = () => {
  clearReconnectTimer();
  if (rpcClient) {
    rpcClient.destroy().catch(() => {});
    rpcClient = null;
  }
  isConnected = false;
  currentActivity = null;
};

module.exports = {
  startGamePresence,
  stopGamePresence,
  setIdlePresence,
  disconnect
};
