/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { BrowserWindow } from "electron";

import { addInstance } from "./instanceManager";
import { loadView } from "./vesktopStatic";

export function openAddServerDialog(parentWin: BrowserWindow) {
    const dialog = new BrowserWindow({
        parent: parentWin,
        modal: true,
        width: 420,
        height: 260,
        resizable: false,
        center: true,
        autoHideMenuBar: true,
        frame: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
    });

    loadView(dialog, "add-server.html");

    dialog.webContents.addListener("console-message", async (_e, _l, msg) => {
        if (msg === "cancel") {
            dialog.close();
            return;
        }
        if (!msg.startsWith("form:")) return;

        const { name, url } = JSON.parse(msg.slice(5)) as { name: string; url: string };
        await addInstance(parentWin, { name, url, type: "spacebar" });
        dialog.close();
    });
}
