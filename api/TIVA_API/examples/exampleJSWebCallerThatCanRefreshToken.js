import {AUTHENTICATION_LINK_URL} from "./routes-api";
import {getHeadersAuth, headers} from "./headers";
import {getCookie, processResponse, setCookie} from "../helpers/helpers";

let isRefreshingToken = false;

export async function callApiWithJwtToken(definition) {
    if(definition['needsAuth'] && getValue(process.env.REACT_APP_JWT) == null) {
        setValue(process.env.REACT_APP_REFRESH, null);
        setValue(process.env.REACT_APP_JWT, null);
        window.location.href = '/login';
    }

    let options = {
        method: definition['method'] === "POST" ? 'POST' : 'GET',
        headers: definition['needsAuth'] ? getHeadersAuth() : headers,
        body: definition['body'] != null ? JSON.stringify(definition['body']) : undefined,
    };

    // console.log(options, JSON.stringify(options.headers));
    const response = await fetch(definition['url'], options).then(resp => {
        return {
            response: resp,
            json: resp.json()
        }
    }).catch(err => {
        setValue(process.env.REACT_APP_REFRESH, null);
        setValue(process.env.REACT_APP_JWT, null);
        window.location.href = '/login';
    });

    // console.log('response', definition, response.response)

    const refreshToken = getValue(process.env.REACT_APP_REFRESH);
    if (response.response.status === 403 && refreshToken != null) {
        if (isRefreshingToken) {
            // Another call is already refreshing the token, wait for it to finish
            await new Promise(resolve => setTimeout(resolve, 1000));
            return callApiWithJwtToken(definition);
        } else {
            isRefreshingToken = true;
        }

        try {
            // Attempt to refresh the JWT token using the refresh token
            const refreshResponse = await fetch(`${AUTHENTICATION_LINK_URL}RefreshToken`, {
                method: 'POST',
                headers: getHeadersAuth(),
                body: JSON.stringify({refreshToken: refreshToken}),
            }).then(resp => {
                return {
                    response: resp,
                    json: resp.json()
                }
            });

            if (refreshResponse.response.ok) {
                // Update the JWT token and retry the original API call
                const modifiedRefreshResponse = processResponse(await refreshResponse.json);
                // console.log('modifiedRefreshResponse', modifiedRefreshResponse)
                const {oReturnObject} = modifiedRefreshResponse;
                const {generatedToken: jwtToken, refreshToken} = oReturnObject;
                setValue(process.env.REACT_APP_JWT, jwtToken);
                setValue(process.env.REACT_APP_REFRESH, refreshToken);
                options = {
                    method: definition['method'] === "POST" ? 'POST' : 'GET',
                    headers: definition['needsAuth'] ? getHeadersAuth() : headers,
                    body: definition['body'] != null ? JSON.stringify(definition['body']) : undefined,
                };
                // console.log('options2', options)
                // console.log('403')
                return await fetch(definition['url'], options).then(resp => resp.json());
            } else {
                //navigate to login page and wipe out the refresh and jwt token
                setValue(process.env.REACT_APP_REFRESH, null);
                setValue(process.env.REACT_APP_JWT, null);
                window.location.href = '/login';
                // console.log('could not refresh token')
            }
        } finally {
            isRefreshingToken = false;
        }
    } else {
        // console.log('no403')
        return await response.json;
    }
}

const setValue = (keyName, newValue) => {
    try {
        setCookie(keyName, newValue, true);
    } catch (err) {}
    return newValue;
};
const getValue = (keyName, defaultValue=null) => {
    try {
        const value = getCookie(keyName, false);
        if (value) {
            return JSON.parse(value);
        } else {
            setCookie(keyName, defaultValue, true);
            return defaultValue;
        }
    } catch (err) {
        return defaultValue;
    }
}