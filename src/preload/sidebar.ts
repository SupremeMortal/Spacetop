/*
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2026 Vendicated and Vesktop contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { contextBridge, ipcRenderer } from "electron";
import { IpcEvents } from "shared/IpcEvents";
import { ServerInstance } from "shared/settings";

contextBridge.exposeInMainWorld("SidebarNative", {
    getInstances: (): Promise<{ instances: ServerInstance[]; activeId: string | undefined }> =>
        ipcRenderer.invoke(IpcEvents.GET_INSTANCES),

    switchInstance: (id: string): Promise<void> => ipcRenderer.invoke(IpcEvents.SWITCH_INSTANCE, id),

    addInstance: (config: { name: string; url?: string; type: "discord" | "spacebar" }): Promise<ServerInstance> =>
        ipcRenderer.invoke(IpcEvents.ADD_INSTANCE, config),

    removeInstance: (id: string): Promise<void> => ipcRenderer.invoke(IpcEvents.REMOVE_INSTANCE, id),

    onInstancesUpdated: (cb: (data: { instances: ServerInstance[]; activeId: string }) => void) => {
        ipcRenderer.on(IpcEvents.INSTANCES_UPDATED, (_, data) => cb(data));
    },

    openAddServerDialog: (): Promise<void> => ipcRenderer.invoke(IpcEvents.OPEN_ADD_SERVER_DIALOG)
});
