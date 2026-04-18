/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow, session, WebContentsView } from "electron";
import { join } from "path";
import { IpcEvents } from "shared/IpcEvents";
import { ServerInstance } from "shared/settings";

import { httpInterceptor } from "../proxy/proxy";
import { BrowserUserAgent, DISCORD_HOSTNAMES } from "./constants";
import { AppEvents } from "./events";
import { Settings } from "./settings";
import { updateSplashMessage } from "./splash";
import { handleExternalUrl } from "./utils/makeLinksOpenExternally";
import { createOrFocusPopup, setupPopout } from "./utils/popout";
import { vencordSupportsSandboxing } from "./utils/vencordLoader";

export const SIDEBAR_WIDTH = 60;

const instanceViews = new Map<string, WebContentsView>();
let sidebarView: WebContentsView | null = null;
export let activeInstanceView: WebContentsView | null = null;
let activeInstanceId: string | null = null;
let ownerWin: BrowserWindow | null = null;

function migrateSettings() {
    if (Settings.store.serverInstances) return;

    const instances: ServerInstance[] = [{ id: "discord", name: "Discord", type: "discord" }];
    if (Settings.store.spacebarServer) {
        instances.push({
            id: crypto.randomUUID(),
            name: "Spacebar",
            url: Settings.store.spacebarServer,
            type: "spacebar"
        });
    }
    Settings.store.serverInstances = instances;
    if (!Settings.store.activeInstanceId) {
        Settings.store.activeInstanceId = instances[0].id;
    }
}

function getSubdomain(): string {
    const branch = Settings.store.discordBranch;
    return branch === "canary" || branch === "ptb" ? `${branch}.` : "";
}

const retryDelay = 1000;

function loadInstanceUrl(view: WebContentsView, subdomain: string, uri?: string, onLoaded?: () => void) {
    const path = uri ? new URL(uri).pathname.slice(1) || "app" : "app";
    view.webContents
        .loadURL(`https://${subdomain}discord.com/${path}`)
        .then(() => onLoaded?.())
        .catch(error => {
            console.log(`retrying in ${retryDelay}ms`);
            updateSplashMessage(`Failed to load: ${error.code}`);
            setTimeout(() => loadInstanceUrl(view, subdomain, undefined, onLoaded), retryDelay);
        });
}

function createInstanceView(
    win: BrowserWindow,
    instance: ServerInstance,
    isActive: boolean,
    initialUri?: string
): WebContentsView {
    const partition = `persist:instance-${instance.id}`;
    const ses = session.fromPartition(partition);
    const subdomain = getSubdomain();

    ses.protocol.handle("https", httpInterceptor(subdomain, instance.url));

    const view = new WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            sandbox: vencordSupportsSandboxing(),
            contextIsolation: true,
            devTools: true,
            preload: join(__dirname, "preload.js"),
            spellcheck: true,
            backgroundThrottling: false,
            session: ses
        }
    });

    view.webContents.setUserAgent(BrowserUserAgent);

    view.webContents.on("context-menu", (_, data) => {
        view.webContents.send(IpcEvents.SPELLCHECK_RESULT, data.misspelledWord, data.dictionarySuggestions);
    });

    view.webContents.on("devtools-opened", () => view.webContents.send(IpcEvents.DEVTOOLS_OPENED));
    view.webContents.on("devtools-closed", () => view.webContents.send(IpcEvents.DEVTOOLS_CLOSED));

    view.webContents.setWindowOpenHandler(({ url, frameName, features }) => {
        try {
            var { protocol, hostname, pathname, searchParams } = new URL(url);
        } catch {
            return { action: "deny" };
        }

        if (frameName.startsWith("DISCORD_") && pathname === "/popout" && DISCORD_HOSTNAMES.includes(hostname)) {
            return createOrFocusPopup(frameName, features);
        }

        if (url === "about:blank") return { action: "allow" };

        if (frameName === "authorize" && searchParams.get("loading") === "true") return { action: "deny" };

        return handleExternalUrl(url, protocol);
    });

    view.webContents.on("did-create-window", (popout, { frameName }) => {
        if (frameName.startsWith("DISCORD_")) setupPopout(popout, frameName);
    });

    view.webContents.on("render-process-gone", (_, details) => console.log(details));

    view.webContents.on("did-navigate", (_, url: string, responseCode: number) => {
        updateSplashMessage("");
        if (responseCode >= 300 && new URL(url).pathname !== "/app") {
            loadInstanceUrl(view, subdomain);
            console.warn(`'did-navigate': Caught bad page response: ${responseCode}, redirecting to main app`);
        }
    });

    loadInstanceUrl(
        view,
        subdomain,
        isActive ? initialUri : undefined,
        isActive ? () => AppEvents.emit("appLoaded") : undefined
    );

    instanceViews.set(instance.id, view);
    return view;
}

function createSidebarView(): WebContentsView {
    const view = new WebContentsView({
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, "sidebarPreload.js"),
            devTools: true
        }
    });

    view.webContents.loadURL("vesktop://static/views/sidebar.html");
    sidebarView = view;
    return view;
}

export function updateBounds(win: BrowserWindow) {
    const [width, height] = win.getContentSize();
    sidebarView?.setBounds({ x: 0, y: 0, width: SIDEBAR_WIDTH, height });
    if (activeInstanceView) {
        activeInstanceView.setBounds({
            x: SIDEBAR_WIDTH,
            y: 0,
            width: Math.max(0, width - SIDEBAR_WIDTH),
            height
        });
    }
}

function notifySidebar() {
    sidebarView?.webContents.send(IpcEvents.INSTANCES_UPDATED, {
        instances: Settings.store.serverInstances ?? [],
        activeId: Settings.store.activeInstanceId
    });
}

export function switchInstance(win: BrowserWindow, id: string) {
    const instances = Settings.store.serverInstances ?? [];
    const target = instances.find(i => i.id === id);
    if (!target) return;

    if (!instanceViews.has(id)) {
        const view = createInstanceView(win, target, false);
        win.contentView.addChildView(view);
        view.setVisible(false);
    }

    if (activeInstanceView) {
        activeInstanceView.setVisible(false);
    }

    const nextView = instanceViews.get(id)!;
    nextView.setVisible(true);
    activeInstanceView = nextView;
    activeInstanceId = id;
    Settings.store.activeInstanceId = id;

    updateBounds(win);
    notifySidebar();
}

export async function addInstance(
    win: BrowserWindow,
    config: { name: string; url?: string; type: "discord" | "spacebar" }
) {
    const instance: ServerInstance = {
        id: crypto.randomUUID(),
        name: config.name,
        url: config.url || undefined,
        type: config.type
    };

    const instances = Settings.store.serverInstances ?? [];
    instances.push(instance);
    Settings.store.serverInstances = instances;

    const view = createInstanceView(win, instance, false);
    win.contentView.addChildView(view);
    view.setVisible(false);

    notifySidebar();
    return instance;
}

export function removeInstance(win: BrowserWindow, id: string) {
    if (id === "discord") return;

    const instances = (Settings.store.serverInstances ?? []).filter(i => i.id !== id);
    Settings.store.serverInstances = instances;

    const view = instanceViews.get(id);
    if (view) {
        win.contentView.removeChildView(view);
        instanceViews.delete(id);
    }

    if (activeInstanceId === id) {
        const fallback = instances[0]?.id ?? "discord";
        switchInstance(win, fallback);
    }

    notifySidebar();
}

export function initInstances(win: BrowserWindow, initialUri?: string) {
    ownerWin = win;
    migrateSettings();

    const sidebar = createSidebarView();
    win.contentView.addChildView(sidebar);

    const instances = Settings.store.serverInstances ?? [];
    const activeId = Settings.store.activeInstanceId ?? instances[0]?.id;

    for (const instance of instances) {
        const isActive = instance.id === activeId;
        const view = createInstanceView(win, instance, isActive, initialUri);
        win.contentView.addChildView(view);
        view.setVisible(isActive);
        if (isActive) {
            activeInstanceView = view;
            activeInstanceId = instance.id;
        }
    }

    updateBounds(win);
}
