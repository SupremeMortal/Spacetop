/*
 * SPDX-License-Identifier: GPL-3.0
 * Vesktop, a desktop app aiming to give you a snappier Discord Experience
 * Copyright (c) 2023 Vendicated and Vencord contributors
 */

import { Settings } from "../main/settings";
import { findSpacebarEnv, GlobalEnv } from "../shared/spacebar";

export function httpInterceptor(subdomain: string) {
    console.log("Spacebar server", Settings.store.spacebarServer);
    const envPromise = findSpacebarEnv(Settings.store.spacebarServer);
    return async function handleHttp(request: GlobalRequest): Promise<GlobalResponse> {
        request.headers.set("Origin", "*");
        const response = await fetch(request.url, {
            headers: request.headers,
            method: request.method,
            integrity: request.integrity,
            cache: request.cache,
            credentials: request.credentials,
            mode: request.mode,
            keepalive: request.keepalive,
            redirect: request.redirect,
            referrer: request.referrer,
            body: request.body != null ? await request.text() : undefined,
            signal: request.signal,
            referrerPolicy: request.referrerPolicy
        });
        const responseHeaders = new Headers(response.headers);
        responseHeaders["Access-Control-Allow-Origin"] = ["*"];
        responseHeaders.delete("content-security-policy");

        if (
            request.url === `https://${subdomain}discord.com/app` ||
            request.url === `https://${subdomain}discord.com/login`
        ) {
            // Modify the response to go to spacebar
            let body = await response.text();

            let spacebarEnv = await envPromise;
            if (!spacebarEnv) {
                spacebarEnv = {} as GlobalEnv;
            }

            Object.keys(spacebarEnv).map(
                e =>
                    (body = body.replaceAll(
                        new RegExp(`${e}: .[^,\n]*`, "g"),
                        `${e}: '${spacebarEnv![e as keyof GlobalEnv]}'`
                    ))
            );

            return new Response(body, {
                headers: responseHeaders,
                status: response.status,
                statusText: response.statusText
            });
        }
        return new Response(response.body, {
            headers: responseHeaders,
            status: response.status,
            statusText: response.statusText
        });
    };
}
