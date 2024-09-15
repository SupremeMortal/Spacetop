/*
 * SPDX-License-Identifier: GPL-3.0
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

import { React, TextInput } from "@vencord/types/webpack/common";
import { findSpacebarEnv } from "shared/spacebar";

import { SettingsComponent } from "./Settings";

export const SpacebarServerBox: SettingsComponent = ({ settings }) => {
    const [value, setValue] = React.useState(settings.spacebarServer ?? "");
    const [error, setError] = React.useState<string>();

    async function handleChange(url: string) {
        setValue(url);
        const res = (await findSpacebarEnv(url)) ? true : "Invalid Spacebar server";
        if (res === true) {
            setError(void 0);
            settings.spacebarServer = url;
        } else {
            setError(res);
        }
    }

    return (
        <>
            <TextInput type="text" value={value} onChange={handleChange} error={error} />
        </>
    );
};
