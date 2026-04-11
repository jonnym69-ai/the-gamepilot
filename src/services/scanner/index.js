const { scanSteamLibrary } = require('./steamScanner');
const { scanEALibrary } = require('./eaScanner');
const { scanRockstarLibrary } = require('./rockstarScanner');

module.exports = {
  scanSteamLibrary,
  scanEALibrary,
  scanRockstarLibrary
};
