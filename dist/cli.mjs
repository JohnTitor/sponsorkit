import { scriptName } from 'yargs';
import { resolve, dirname, join, relative } from 'path';
import fs from 'fs-extra';
import consola from 'consola';
import c from 'picocolors';
import { l as loadConfig, i as resolveProviders, h as guessProviders, r as resolveAvatars, S as SvgComposer, s as svgToPng, p as presets } from './shared/sponsorkit.2e3dd6ad.mjs';
import 'unconfig';
import 'dotenv';
import 'ohmyfetch';
import 'node-html-parser';
import 'image-data-uri';
import 'sharp';

const version = "0.6.1";

function r(path) {
  return `./${relative(process.cwd(), path)}`;
}
async function run(inlineConfig, t = consola) {
  t.log(`
${c.magenta(c.bold("SponsorKit"))} ${c.dim(`v${version}`)}
`);
  const config = await loadConfig(inlineConfig);
  const dir = resolve(process.cwd(), config.outputDir);
  const cacheFile = resolve(dir, config.cacheFile);
  const providers = resolveProviders(config.providers || guessProviders(config));
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
    await resolveAvatars(allSponsors, config.fallbackAvatar);
    t.success("Avatars resolved");
    await fs.ensureDir(dirname(cacheFile));
    await fs.writeJSON(cacheFile, allSponsors, { spaces: 2 });
  } else {
    allSponsors = await fs.readJSON(cacheFile);
    t.success(`Loaded from cache ${r(cacheFile)}`);
  }
  await fs.ensureDir(dir);
  if (config.formats?.includes("json")) {
    const path = join(dir, `${config.name}.json`);
    await fs.writeJSON(path, allSponsors, { spaces: 2 });
    t.success(`Wrote to ${r(path)}`);
  }
  allSponsors = await config.onSponsorsReady?.(allSponsors) || allSponsors;
  if (config.filter)
    allSponsors = allSponsors.filter((s) => config.filter(s, allSponsors) !== false);
  if (!config.includePrivate)
    allSponsors = allSponsors.filter((s) => s.privacyLevel !== "PRIVATE");
  t.info("Composing SVG...");
  const composer = new SvgComposer(config);
  await (config.customComposer || defaultComposer)(composer, allSponsors, config);
  let svg = composer.generateSvg();
  svg = await config.onSvgGenerated?.(svg) || svg;
  if (config.formats?.includes("svg")) {
    const path = join(dir, `${config.name}.svg`);
    await fs.writeFile(path, svg, "utf-8");
    t.success(`Wrote to ${r(path)}`);
  }
  if (config.formats?.includes("png")) {
    const path = join(dir, `${config.name}.png`);
    await fs.writeFile(path, await svgToPng(svg));
    t.success(`Wrote to ${r(path)}`);
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
      const preset = t.preset || presets.base;
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

const cli = scriptName("sponsors-svg").usage("$0 [args]").version(version).strict().showHelpOnFail(false).alias("h", "help").alias("v", "version");
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
