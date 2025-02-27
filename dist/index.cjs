'use strict';

const index = require('./shared/sponsorkit.eb79912d.cjs');
require('unconfig');
require('dotenv');
require('ohmyfetch');
require('node-html-parser');
require('image-data-uri');
require('sharp');



exports.GitHubProvider = index.GitHubProvider;
exports.ProvidersMap = index.ProvidersMap;
exports.SvgComposer = index.SvgComposer;
exports.defaultConfig = index.defaultConfig;
exports.defaultInlineCSS = index.defaultInlineCSS;
exports.defaultTiers = index.defaultTiers;
exports.defineConfig = index.defineConfig;
exports.fetchGitHubSponsors = index.fetchGitHubSponsors;
exports.genSvgImage = index.genSvgImage;
exports.generateBadge = index.generateBadge;
exports.guessProviders = index.guessProviders;
exports.loadConfig = index.loadConfig;
exports.makeQuery = index.makeQuery;
exports.presets = index.presets;
exports.resolveAvatars = index.resolveAvatars;
exports.resolveProviders = index.resolveProviders;
exports.round = index.round;
exports.svgToPng = index.svgToPng;
