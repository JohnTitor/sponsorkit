declare function genSvgImage(x: number, y: number, size: number, url: string): string;
declare function generateBadge(x: number, y: number, sponsor: Sponsor, preset: BadgePreset): string;
declare class SvgComposer {
    readonly config: Required<SponsorkitConfig>;
    height: number;
    body: string;
    constructor(config: Required<SponsorkitConfig>);
    addSpan(height?: number): this;
    addTitle(text: string, classes?: string): this;
    addText(text: string, classes?: string): this;
    addRaw(svg: string): this;
    addSponsorLine(sponsors: Sponsorship[], preset: BadgePreset): void;
    addSponsorGrid(sponsors: Sponsorship[], preset: BadgePreset): this;
    generateSvg(): string;
}

interface BadgePreset {
    boxWidth: number;
    boxHeight: number;
    avatar: {
        size: number;
        classes?: string;
    };
    name?: false | {
        color?: string;
        classes?: string;
        maxLength?: number;
    };
    container?: {
        sidePadding?: number;
    };
    classes?: string;
}
interface Provider {
    name: string;
    fetchSponsors: (config: SponsorkitConfig) => Promise<Sponsorship[]>;
}
interface Sponsor {
    type: 'User' | 'Organization';
    login: string;
    name: string;
    avatarUrl: string;
    avatarUrlHighRes?: string;
    avatarUrlMediumRes?: string;
    avatarUrlLowRes?: string;
    linkUrl?: string;
}
interface Sponsorship {
    sponsor: Sponsor;
    monthlyDollars: number;
    privacyLevel?: 'PUBLIC' | 'PRIVATE';
    tierName?: string;
    createdAt?: string;
    isOneTime?: boolean;
    provider?: ProviderName | string;
}
declare type OutputFormat = 'svg' | 'png' | 'json';
declare type ProviderName = 'github' | 'patreon' | 'opencollective';
interface ProvidersConfig {
    github?: {
        /**
         * User id of your GitHub account.
         *
         * Will read from `SPONSORKIT_GITHUB_LOGIN` environment variable if not set.
         */
        login?: string;
        /**
         * GitHub Token that have access to your sponsorships.
         *
         * Will read from `SPONSORKIT_GITHUB_TOKEN` environment variable if not set.
         *
         * @deprecated It's not recommended set this value directly, pass from env or use `.env` file.
         */
        token?: string;
        /**
         * The account type for sponsorships.
         *
         * Possible values are `user`(default) and `organization`.
         * Will read from `SPONSORKIT_GITHUB_TYPE` environment variable if not set.
         */
        type?: string;
    };
    patreon?: {
        /**
         * Patreon Token that have access to your sponsorships.
         *
         * Will read from `SPONSORKIT_PATREON_TOKEN` environment variable if not set.
         *
         * @deprecated It's not recommended set this value directly, pass from env or use `.env` file.
         */
        token?: string;
    };
    opencollective?: {
        /**
         * Api key of your OpenCollective account.
         *
         * Will read from `SPONSORKIT_OPENCOLLECTIVE_KEY` environment variable if not set.
         *
         * @deprecated It's not recommended set this value directly, pass from env or use `.env` file.
         */
        key?: string;
        /**
         * The id of your collective.
         *
         * Will read from `SPONSORKIT_OPENCOLLECTIVE_ID` environment variable if not set.
         */
        id?: string;
        /**
         * The slug of your collective.
         *
         * Will read from `SPONSORKIT_OPENCOLLECTIVE_SLUG` environment variable if not set.
         */
        slug?: string;
        /**
         * The GitHub handle of your collective.
         *
         * Will read from `SPONSORKIT_OPENCOLLECTIVE_GH_HANDLE` environment variable if not set.
         */
        githubHandle?: string;
    };
}
interface SponsorkitConfig extends ProvidersConfig {
    /**
     * @deprecated use `github.login` instead
     */
    login?: string;
    /**
     * @deprecated use `github.token` instead
     */
    token?: string;
    /**
     * @default auto detect based on the config provided
     */
    providers?: ProviderName[];
    /**
     * Whether to display the private sponsors
     *
     * @default false
     */
    includePrivate?: boolean;
    /**
     * Whether to display the past sponsors
     * Currently only works with GitHub provider
     *
     * @default auto detect based on tiers
     */
    includePastSponsors?: boolean;
    /**
     * By pass cache
     */
    force?: boolean;
    /**
     * Directory of output files.
     *
     * @default './sponsorkit'
     */
    outputDir?: string;
    /**
     * Name of exported files
     *
     * @default 'sponsors'
     */
    name?: string;
    /**
     * Output formats
     *
     * @default ['json', 'svg', 'png']
     */
    formats?: OutputFormat[];
    /**
     * Hook to modify sponsors data before fetching the avatars.
     */
    onSponsorsFetched?: (sponsors: Sponsorship[], provider: ProviderName | string) => PromiseLike<void | Sponsorship[]> | void | Sponsorship[];
    /**
     * Hook to modify sponsors data before rendering.
     */
    onSponsorsReady?: (sponsors: Sponsorship[]) => PromiseLike<void | Sponsorship[]> | void | Sponsorship[];
    /**
     * Hook to get or modify the SVG before writing.
     */
    onSvgGenerated?: (svg: string) => PromiseLike<string | void | undefined | null> | string | void | undefined | null;
    /**
     * Compose the SVG
     */
    customComposer?: (composer: SvgComposer, sponsors: Sponsorship[], config: SponsorkitConfig) => PromiseLike<void> | void;
    /**
     * Filter of sponsorships to render in the final image.
     */
    filter?: (sponsor: Sponsorship, all: Sponsorship[]) => boolean | void;
    /**
     * Tiers
     */
    tiers?: Tier[];
    /**
     * Width of the image.
     *
     * @default 700
     */
    width?: number;
    /**
     * Url to fallback avatar.
     * Setting false to disable fallback avatar.
     */
    fallbackAvatar?: string | false | Buffer | Promise<Buffer>;
    /**
     * Path to cache file
     *
     * @default './sponsorkit/.cache.json'
     */
    cacheFile?: string;
    /**
     * Padding of image container
     */
    padding?: {
        top?: number;
        bottom?: number;
    };
    /**
     * Inline CSS of generated SVG
     */
    svgInlineCSS?: string;
}
interface Tier {
    /**
     * The lower bound of the tier (inclusive)
     */
    monthlyDollars?: number;
    duration?: number;
    title?: string;
    preset?: BadgePreset;
    padding?: {
        top?: number;
        bottom?: number;
    };
    /**
     * Replace the default composer with your own.
     */
    compose?: (composer: SvgComposer, sponsors: Sponsorship[], config: SponsorkitConfig) => void;
    /**
     * Compose the SVG before the main composer.
     */
    composeBefore?: (composer: SvgComposer, tierSponsors: Sponsorship[], config: SponsorkitConfig) => void;
    /**
     * Compose the SVG after the main composer.
     */
    composeAfter?: (composer: SvgComposer, tierSponsors: Sponsorship[], config: SponsorkitConfig) => void;
}

declare function resolveAvatars(ships: Sponsorship[], fallbackAvatar: SponsorkitConfig['fallbackAvatar']): Promise<void[]>;
declare function round(image: string | ArrayBuffer, radius?: number, size?: number): Promise<Buffer>;
declare function svgToPng(svg: string): Promise<Buffer>;

declare const defaultTiers: Tier[];
declare const defaultInlineCSS = "\ntext {\n  font-weight: 300;\n  font-size: 14px;\n  fill: #777777;\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\n}\n.sponsorkit-link {\n  cursor: pointer;\n}\n.sponsorkit-tier-title {\n  font-weight: 500;\n  font-size: 20px;\n}\n";
declare const defaultConfig: SponsorkitConfig;
declare function defineConfig(config: SponsorkitConfig): SponsorkitConfig;
declare function loadConfig(inlineConfig?: SponsorkitConfig): Promise<Required<SponsorkitConfig>>;

declare const presets: {
    none: BadgePreset;
    xs: BadgePreset;
    small: BadgePreset;
    base: BadgePreset;
    medium: BadgePreset;
    large: BadgePreset;
    xl: BadgePreset;
};

declare const GitHubProvider: Provider;
declare function fetchGitHubSponsors(token: string, login: string, type: string, config: SponsorkitConfig): Promise<Sponsorship[]>;
declare function makeQuery(login: string, type: string, cursor?: string): string;

declare const ProvidersMap: {
    github: Provider;
    patreon: Provider;
    opencollective: Provider;
};
declare function guessProviders(config: SponsorkitConfig): ProviderName[];
declare function resolveProviders(names: (ProviderName | Provider)[]): Provider[];

export { BadgePreset, GitHubProvider, OutputFormat, Provider, ProviderName, ProvidersConfig, ProvidersMap, Sponsor, SponsorkitConfig, Sponsorship, SvgComposer, Tier, defaultConfig, defaultInlineCSS, defaultTiers, defineConfig, fetchGitHubSponsors, genSvgImage, generateBadge, guessProviders, loadConfig, makeQuery, presets, resolveAvatars, resolveProviders, round, svgToPng };
