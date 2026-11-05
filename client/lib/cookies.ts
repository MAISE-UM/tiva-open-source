'use server'

import {cookies} from "next/headers";

export async function setDisclaimerCookie(state: string, hours: number) {
    const cookieStore = await cookies();
    const options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict" | "lax" | "none";
        path: string
        maxAge: number
    } = {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: hours * 60 * 60
    };
    cookieStore.set('disclaimer_agreement', state, options);
}

export async function setCaptchaCookie(token: string, hours: number) {
    const cookieStore = await cookies();
    const options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict" | "lax" | "none";
        path: string
        maxAge: number
    } = {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        path: "/",
        maxAge: hours * 60 * 60
    };
    cookieStore.set('CAPTCHA_VALUE', token, options);
}

export async function getDisclaimerCookie() {
    const cookieStore = await cookies();
    return cookieStore.get('disclaimer_agreement')?.value;
}

export async function getCaptchaCookie() {
    const cookieStore = await cookies();
    return cookieStore.get('CAPTCHA_VALUE')?.value;
}

export async function getSurgicalID() {
    const cookieStore = await cookies();
    return cookieStore.get('X-SurgicalID')?.value;
}

export async function getRedirectPath() {
    const cookieStore = await cookies();
    return cookieStore.get('redirectPath')?.value;
}

export async function setRedirectPath(path: string|null) {
    const cookieStore = await cookies();

    if(path == null) {
        cookieStore.delete('redirectPath');
        return;
    }
    const options: {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "strict" | "lax" | "none";
        path: string
    } = {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        path: "/",
    };
    cookieStore.set('redirectPath', path, options);
}