"use server"

import {cookies} from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose"
import {JwtPayload, UserPermissionGroup} from "@/app/utils/interfaces";

const JKU_URL = process.env.NEXT_PUBLIC_JKU_URL
// Domain added to the username to build the user's email, e.g. hospital.org. Email is blank when not set
const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN

if (!JKU_URL) {
    console.log('JKU_URL', JKU_URL)
    throw new Error("JKU_URL is not set")
}

const JWKS = createRemoteJWKSet(new URL(JKU_URL))

// This function checks if a JWT token is still valid. It uses a JKU URL defined in API to do this
export async function jwtCheck(jwt: string) {
    try {
        const { payload } = await jwtVerify(jwt, JWKS, {
            algorithms: ["RS384"], // Adjust this if a different algorithm is used
        })

        const currentTimestamp = Math.floor(Date.now() / 1000)

        return !(payload.exp && payload.exp < currentTimestamp);
    } catch (error) {
        console.error("Error verifying token1:", error)
        // If there's an error verifying the token, consider it invalid
        return false
    }
}

// Alternate way to get user permissions in a client component
export async function getUserPermissions(): Promise<UserPermissionGroup> {
    const cookieStore = await cookies();
    const cookie = cookieStore.get("user-permissions");
    if(cookie == null || cookie.value == null) {
        return {Routes: [], Permissions: []};
    }
    return JSON.parse(cookie.value);
}

// Verifies the JWT Token and returns the payload if it's valid. Claims are defined in the API using the Microsoft Identity Platform names
export async function jwtPayload(): Promise<JwtPayload|null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("X-Access-Token")
    const jwt = token == null ? "" : token.value
    if(jwt === "") {
        return null;
    }
    try {
        const { payload } = await jwtVerify(jwt, JWKS, {
            algorithms: ["RS384"], // Adjust this if a different algorithm is used
        })
        const username = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string
        const name = payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"] as string
        let roles: string[] | string = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] as string[] | string
        const authentication_method = payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/authenticationmethod"] as string
        if (!Array.isArray(roles)) {
            roles = [roles]
        }
        roles = roles.sort((a: string) => a === 'Administrator' ? -1 : 1)
        return {
            username,
            name,
            email: EMAIL_DOMAIN ? `${username}@${EMAIL_DOMAIN}` : "",
            roles,
            // Primary role should be the highest role in the list
            primary_role: roles[0],
            authentication_method,
        }
    } catch (error) {
        console.error("Error verifying token2:", error)
        // If there's an error verifying the token, consider it invalid
        return null
    }
}

// Verifies the JWT Refresh Token and returns the username if it's valid.
export async function jwtRefreshUsername(): Promise<string|null> {
    const cookieStore = await cookies()
    const token = cookieStore.get("X-Refresh-Token")
    const jwt = token == null ? "" : token.value
    try {
        const { payload } = await jwtVerify(jwt, JWKS, {
            algorithms: ["RS384"], // Adjust this if a different algorithm is used
        })
        return payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"] as string
    } catch (error) {
        console.error("Error verifying token3:", error)
        // If there's an error verifying the token, consider it invalid
        return null
    }
}

// Used in middleware to check if the refresh token is still valid
export async function refreshTokenInit() {
    // console.log("refreshTokenInit")
    const cookieStore = await cookies()
    // console.log("getting cookie", cookieStore)
    const refreshToken = cookieStore.get("X-Refresh-Token")
    // console.log("tokenVal", refreshToken)

    if (!refreshToken?.value) {
        return false
    }

    if(await jwtCheck(refreshToken.value)) {
        return true
    } else {
        // If there's an error verifying the token, consider it invalid
        await logout()
        return false
    }
}

// Logs the user out by deleting the cookies
export async function logout() {
    const cookieStore = await cookies();
    cookieStore.delete('X-Access-Token');
    cookieStore.delete('X-Refresh-Token');
    cookieStore.delete('X-Username');
    cookieStore.delete('disclaimer_agreement');
    cookieStore.delete('user-permissions');
    return false
}