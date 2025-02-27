'use strict';

const yargs = require('yargs');
const path = require('path');
const fs = require('fs-extra');
const consola = require('consola');
const c = require('picocolors');
const index = require('./shared/sponsorkit.eb79912d.cjs');
require('unconfig');
require('dotenv');
require('ohmyfetch');
require('node-html-parser');
require('image-data-uri');
require('sharp');

const version = "0.6.1";

function r(path$1) {
  return `./${path.relative(process.cwd(), path$1)}`;
}
async function run(inlineConfig, t = consola) {
  t.log(`
${c.magenta(c.bold("SponsorKit"))} ${c.dim(`v${version}`)}
`);
  const config = await index.loadConfig(inlineConfig);
  const dir = path.resolve(process.cwd(), config.outputDir);
  const cacheFile = path.resolve(dir, config.cacheFile);
  const providers = index.resolveProviders(config.providers || index.guessProviders(config));
  let allSponsors = [];
  if (!fs.existsSync(cacheFile) || config.force) {
    for (const i of providers) {
      t.info(`Fetching sponsorships from ${i.name}...`);
      let sponsors = await i.fetchSponsors(config);
      sponsors.forEach((s) => s.provider = i.name);
      sponsors = await config.onSponsorsFetched?.(sponsors, i.name) || sponsors;
      t.success(`${sponsors.length} sponsorships fetched from ${i.name}`);
      allSponsors.push(...sponsors);
    }
    t.info("Resolving avatars...");
    await index.resolveAvatars(allSponsors, config.fallbackAvatar);
    t.success("Avatars resolved");
    await fs.ensureDir(path.dirname(cacheFile));
    await fs.writeJSON(cacheFile, allSponsors, { spaces: 2 });
  } else {
    allSponsors = await fs.readJSON(cacheFile);
    t.success(`Loaded from cache ${r(cacheFile)}`);
  }
  await fs.ensureDir(dir);
  if (config.formats?.includes("json")) {
    const path$1 = path.join(dir, `${config.name}.json`);
    await fs.writeJSON(path$1, allSponsors, { spaces: 2 });
    t.success(`Wrote to ${r(path$1)}`);
  }
  allSponsors = await config.onSponsorsReady?.(allSponsors) || allSponsors;
  if (config.filter)
    allSponsors = allSponsors.filter((s) => config.filter(s, allSponsors) !== false);
  if (!config.includePrivate)
    allSponsors = allSponsors.filter((s) => s.privacyLevel !== "PRIVATE");
  t.info("Composing SVG...");
  const composer = new index.SvgComposer(config);
  await (config.customComposer || defaultComposer)(composer, allSponsors, config);
  let svg = composer.generateSvg();
  svg = await config.onSvgGenerated?.(svg) || svg;
  if (config.formats?.includes("svg")) {
    const path$1 = path.join(dir, `${config.name}.svg`);
    await fs.writeFile(path$1, svg, "utf-8");
    t.success(`Wrote to ${r(path$1)}`);
  }
  if (config.formats?.includes("png")) {
    const path$1 = path.join(dir, `${config.name}.png`);
    await fs.writeFile(path$1, await index.svgToPng(svg));
    t.success(`Wrote to ${r(path$1)}`);
  }
}
async function defaultComposer(composer, sponsors, config) {
  const now = Date.now();
  const tiers = config.tiers.sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0));
  const finalSponsors = config.tiers.filter((i) => i.duration == null || i.duration === 0);
  if (finalSponsors.length !== 1)
    throw new Error(`There should be exactly one tier with no \`duration\`, but got ${finalSponsors.length}`);
  const partitions = Array.from({ length: tiers.length }, () => []);
  sponsors.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).forEach((i) => {
    if (i.createdAt === "past sponsor") {
      partitions[tiers.length - 1].push(i);
      return;
    }
    let dur = (now - Date.parse(i.createdAt)) / 1e3;
    let index = tiers.findIndex((t) => dur >= (t.duration || 0)) || 0;
    if (index === -1)
      index = 0;
    partitions[index].push(i);
  });
  composer.addSpan(config.padding?.top ?? 20);
  tiers.forEach((t, i) => {
    const sponsors2 = partitions[i];
    t.composeBefore?.(composer, sponsors2, config);
    if (t.compose) {
      t.compose(composer, sponsors2, config);
    } else {
      const preset = t.preset || index.presets.base;
      if (sponsors2.length && preset.avatar.size) {
        const paddingTop = t.padding?.top ?? 20;
        const paddingBottom = t.padding?.bottom ?? 10;
        if (paddingTop)
          composer.addSpan(paddingTop);
        if (t.title) {
          composer.addTitle(t.title).addSpan(5);
        }
        composer.addSponsorGrid(sponsors2, preset);
        if (paddingBottom)
          composer.addSpan(paddingBottom);
      }
    }
    t.composeAfter?.(composer, sponsors2, config);
  });
  composer.addSpan(config.padding?.bottom ?? 20);
}

const cli = yargs.scriptName("sponsors-svg").usage("$0 [args]").version(version).strict().showHelpOnFail(false).alias("h", "help").alias("v", "version");
cli.command(
  "*",
  "Generate",
  (args) => args.option("width", {
    alias: "w",
    type: "number",
    default: 800
  }).option("fallbackAvatar", {
    type: "string",
    alias: "fallback"
  }).option("force", {
    alias: "f",
    default: false,
    type: "boolean"
  }).option("name", {
    type: "string"
  }).option("filter", {
    type: "string"
  }).option("outputDir", {
    type: "string",
    alias: ["o", "dir"]
  }).strict().help(),
  async (options) => {
    const config = options;
    if (options._[0])
      config.outputDir = options._[0];
    if (options.filter)
      config.filter = createFilterFromString(options.filter);
    await run(config);
  }
);
cli.help().parse();
function createFilterFromString(template) {
  const [_, op, value] = template.split(/([<>=]+)/);
  const num = parseInt(value);
  if (op === "<")
    return (s) => s.monthlyDollars < num;
  if (op === "<=")
    return (s) => s.monthlyDollars <= num;
  if (op === ">")
    return (s) => s.monthlyDollars > num;
  if (op === ">=")
    return (s) => s.monthlyDollars >= num;
  throw new Error(`Unable to parse filter template ${template}`);
}
