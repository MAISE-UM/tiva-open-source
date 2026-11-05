'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {DataResponseRaw} from "@/app/utils/interfaces";

export async function login(username: string, password: string) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'Auth/AuthenticateUser',
            {},
            {userId: username, password: password},
            true,
            'no-store',
            true
        )
        const responseData = await response

        if('data' in responseData) {
            return responseData.data as DataResponseRaw
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            console.error('Response does not contain data:', responseData);
            return dataResponse
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return dataResponse
    }
}

export async function VerifyRecaptcha(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'recaptcha/verify/',
            {},
            {...obj},
            true,
            'no-store',
            true
        )
        const responseData = await response

        if('data' in responseData) {
            return responseData.data as DataResponseRaw
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            console.error('Response does not contain data:', responseData);
            return dataResponse
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return dataResponse
    }
}