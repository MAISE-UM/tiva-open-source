'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {DataResponseRaw} from "@/app/utils/interfaces";

export async function setErrorLog(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Logs/SaveErrorLog',
            {},
            {...obj},
            true,
            'force-cache',
            false
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

export async function saveUserLog(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Logs/SaveUserLog',
            {},
            {...obj},
            true,
            'force-cache',
            false
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

export async function saveDebugLog(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Logs/SaveDebugLog',
            {},
            {...obj},
            true,
            'force-cache',
            false
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

export async function sendEmail(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Logs/SendEmail',
            {},
            {...obj},
            true,
            'force-cache',
            false
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

export async function saveGraphLog(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Logs/SaveGraphLog',
            {},
            {...obj},
            true,
            'force-cache',
            false
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