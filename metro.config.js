const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add SQL files to source extensions for Drizzle migrations
config.resolver.sourceExts.push("sql");

// Ensure asset extensions include common file types
config.resolver.assetExts.push("db", "sqlite", "sqlite3");

module.exports = config; 