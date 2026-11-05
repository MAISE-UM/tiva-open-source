'use server'

import {cookies} from "next/headers";
import axios from "axios";

async function handleMakeRequest(makeRequest: (arg0: string) => Promise<unknown>, token: string|undefined) {
    try {
        // Try the API call with the current access token, if it fails then we'll catch it and try to refresh token
        const data = await makeRequest(token || '');
        return { data };
    } catch (err) {
        const cookieStore = await cookies();
        if ((err as Error).message === 'TokenExpired') {
            // If the token is expired, try to refresh it
            console.log('Token expired, attempting to refresh');
            const refreshToken = cookieStore.get('X-Refresh-Token')?.value;

            if (!refreshToken) {
                throw new Error('UnableToRefreshToken');
            }

            // include credentials is necessary to set the cookies in the browser
            // refresh token is sent in the Authorization header and the api will validate it.
            const refreshResponse = await fetch(
                `${process.env.NEXT_PUBLIC_API_BASE_URL}/Auth/RefreshTokenUser`,
                {
                    method: 'POST',
                    credentials: 'include',
                    body: '{}',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${refreshToken}`,
                    },
                }
            );

            // 401 is returned if the refresh token is expired 403 is returned if the user doesn't have access
            if(refreshResponse.status === 401 || refreshResponse.status === 403) {
                throw new Error('UnableToRefreshToken');
            }

            // Next.js acts as a proxy and will need to forward the cookies to the client
            const setCookieHeader = refreshResponse.headers.get("set-cookie");
            if (setCookieHeader) {
                const cookieList = setCookieHeader.split(",");

                for (const cookie of cookieList) {
                    const cookieParts = cookie.split(";").map(part => part.trim());
                    const [cookieKeyValue, ...attributes] = cookieParts;

                    const [cookieName, cookieValue] = cookieKeyValue.split("=");

                    // Extract cookie attributes
                    const options: {
                        httpOnly: boolean;
                        secure: boolean;
                        sameSite: "strict" | "lax" | "none";
                        path: string
                    } = {
                        httpOnly: attributes.some(attr => attr.toLowerCase() === "httponly"),
                        secure: attributes.some(attr => attr.toLowerCase() === "secure"),
                        sameSite: (attributes.find(attr => attr.toLowerCase().startsWith("samesite="))?.split("=")[1]?.toLowerCase() as "strict" | "lax" | "none") || "lax",
                        path: attributes.find(attr => attr.toLowerCase().startsWith("path="))?.split("=")[1] || "/",
                    };

                    console.log(`Setting cookie: ${cookieName} with options`, options);

                    // Set the cookie in Next.js
                    cookieStore.set(cookieName.trim(), cookieValue.trim(), options);
                }
            }

            if (!refreshResponse.ok) {
                throw new Error('UnableToRefreshToken');
            }

            token = cookieStore.get('X-Access-Token')?.value;
            // console.log('new token', token);

            if(token === undefined) {
                throw new Error('UnableToRefreshToken');
            }

            // Retry the original request with the new access token
            const data = await makeRequest(token);
            return { data };
        } else {
            throw err; // Rethrow other errors
        }
    }
}

// wrapper allows dynamic definition of the request type, path, parameters, body, and whether the request needs authentication
export async function fetch_api_wrapper(
    type: string,
    path: string,
    parameters: { [key: string]: unknown },
    body: { [key: string]: unknown },
    needsAuth: boolean,
    cacheType: RequestCache,
    includeCredentials: boolean
) {
    const cookieStore = await cookies();
    try {
        const token = cookieStore.get('X-Access-Token')?.value;

        const makeRequest = async (accessToken: string) => {
            const headers: {[key: string]: string} = {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            }

            if(needsAuth) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            let requestURL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${path}`;

            if(Object.keys(parameters).length > 0) {
                const searchParams = new URLSearchParams();
                for (const [key, value] of Object.entries(parameters)) {
                    searchParams.append(key, value as string);
                }
                requestURL += `?${searchParams.toString()}`;
            }

            const options: {[key: string]: unknown} = {
                method: type,
                headers: headers,
                cache: cacheType,
            }

            if(includeCredentials) {
                options['credentials'] = 'include';
            }

            if(type === 'POST') {
                options['body'] = JSON.stringify(body);
            }


            const response = await fetch(
                requestURL,
                {
                    ...options
                }
            );

            // Next.js acts as a proxy and will need to forward the cookies to the client
            if(includeCredentials) {
                const setCookieHeader = response.headers.get("set-cookie");
                if (setCookieHeader) {
                    const cookieList = setCookieHeader.split(",");

                    for (const cookie of cookieList) {
                        const cookieParts = cookie.split(";").map(part => part.trim());
                        const [cookieKeyValue, ...attributes] = cookieParts;

                        const [cookieName, cookieValue] = cookieKeyValue.split("=");

                        // Extract cookie attributes
                        const options: {
                            httpOnly: boolean;
                            secure: boolean;
                            sameSite: "strict" | "lax" | "none";
                            path: string
                        } = {
                            httpOnly: attributes.some(attr => attr.toLowerCase() === "httponly"),
                            secure: attributes.some(attr => attr.toLowerCase() === "secure"),
                            sameSite: (attributes.find(attr => attr.toLowerCase().startsWith("samesite="))?.split("=")[1]?.toLowerCase() as "strict" | "lax" | "none") || "lax",
                            path: attributes.find(attr => attr.toLowerCase().startsWith("path="))?.split("=")[1] || "/",
                        };

                        console.log(`Setting cookie: ${cookieName} with options`, options);

                        // Set the cookie in Next.js
                        cookieStore.set(cookieName.trim(), cookieValue.trim(), options);
                    }
                }
            }

            if (response.status === 401) {
                throw new Error('TokenExpired');
            }

            if (!response.ok) {
                console.log('response', response);
                throw new Error('RequestFailed');
            }

            return response.json();
        };

        return await handleMakeRequest(makeRequest, token);
    } catch (error) {
        if (error instanceof Error) {
            return { error: error.message };
        }
        return { error: 'An error occurred while processing the request.' };
    }
}

export async function axios_post_api_wrapper(path: string, parameters: { [key: string]: unknown },
                                             body: FormData, needsAuth: boolean) {
    const cookieStore = await cookies();
    try {
        const token = cookieStore.get('X-Access-Token')?.value;

        const makeRequest = async (accessToken: string) => {
            const headers: {[key: string]: string} = {
                'Content-Type': 'multipart/form-data',
            }

            if(needsAuth) {
                headers['Authorization'] = `Bearer ${accessToken}`;
            }

            let requestURL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${path}`;

            if(Object.keys(parameters).length > 0) {
                const searchParams = new URLSearchParams();
                for (const [key, value] of Object.entries(parameters)) {
                    searchParams.append(key, value as string);
                }
                requestURL += `?${searchParams.toString()}`;
            }

            const response = await axios.post(
                requestURL,
                body,
                {
                    headers: headers,
                }
            );

            if (response.status === 401) {
                throw new Error('TokenExpired');
            }

            if (response.status !== 200) {
                // console.log('response', response);
                throw new Error('RequestFailed');
            }

            return response.data.data;
        };

        return await handleMakeRequest(makeRequest, token);
    } catch (error) {
        console.error('Error:', error);
        return { error: 'An error occurred while processing the request.' };
    }
}