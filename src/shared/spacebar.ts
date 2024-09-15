/*
 * SPDX-License-Identifier: GPL-3.0
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

export interface GlobalEnv {
    API_ENDPOINT: string;
    API_VERSION: number;
    GATEWAY_ENDPOINT: string;
    WEBAPP_ENDPOINT: string;
    CDN_HOST: string;
    // ASSET_ENDPOINT: string;
    MEDIA_PROXY_ENDPOINT: string;
    // WIDGET_ENDPOINT: string;
    // INVITE_HOST: string;
    // GUILD_TEMPLATE_HOST: string;
    // GIFT_CODE_HOST: string;
    RELEASE_CHANNEL: ReleaseChannel;
    // DEVELOPERS_ENDPOINT: string;
    // MARKETING_ENDPOINT: string;
    // BRAINTREE_KEY: string;
    // STRIPE_KEY: string;
    // ADYEN_KEY: string;
    // NETWORKING_ENDPOINT: string;
    // RTC_LATENCY_ENDPOINT: string;
    // ACTIVITY_APPLICATION_HOST: string;
    // PROJECT_ENV: string;
    // REMOTE_AUTH_ENDPOINT: string;
    // SENTRY_TAGS: { buildId: string; buildType: string };
    // MIGRATION_SOURCE_ORIGIN: string;
    // MIGRATION_DESTINATION_ORIGIN: string;
    // HTML_TIMESTAMP: string;
    // ALGOLIA_KEY: string;
    // PUBLIC_PATH: string;
    // STATIC_ENDPOINT: string;
}

export enum ReleaseChannel {
    STABLE = "stable",
    PTB = "ptb",
    CANARY = "canary",
    STAGING = "staging"
}

export async function findSpacebarEnv(url: string | undefined): Promise<GlobalEnv | undefined> {
    console.log("URL", url);
    if (!url) return;

    const result = await getSpacebarEnv(url + "/api");
    if (result) {
        return result;
    }

    const wellknown = url + "/.well-known/spacebar";
    try {
        const response = await fetch(wellknown);
        if (response.status === 200) {
            const json = await response.json();
            const { api } = json;
            return await getSpacebarEnv(api);
        }
    } catch (err: unknown) {
        console.log("Could not find well known");
    }
}

async function getSpacebarEnv(url: string): Promise<GlobalEnv | undefined> {
    const domainsEndpoint = url + "/policies/instance/domains";
    try {
        const response = await fetch(domainsEndpoint);
        if (response.status === 200) {
            const { cdn, gateway, defaultApiVersion, apiEndpoint } = await response.json();
            return {
                API_ENDPOINT: apiEndpoint.slice(apiEndpoint.indexOf("//")),
                API_VERSION: parseInt(defaultApiVersion),
                GATEWAY_ENDPOINT: gateway,
                WEBAPP_ENDPOINT: "//app.spacebar.chat",
                CDN_HOST: cdn.slice(cdn.indexOf("//")),
                MEDIA_PROXY_ENDPOINT: cdn.slice(cdn.indexOf("//")),
                RELEASE_CHANNEL: ReleaseChannel.STABLE
            };
        }
    } catch (err: unknown) {
        console.log("Could not find spacebar env");
    }
}
