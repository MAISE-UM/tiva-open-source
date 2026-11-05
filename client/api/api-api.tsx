'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {DataResponseRaw} from "@/app/utils/interfaces";

export async function getDBEndpoints() {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/GetDBEndpoints`,
            {},
            {},
            true,
            'no-store',
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

export async function getApplicationLists(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/GetApplicationLists`,
            {},
            {...obj},
            true,
            'no-store',
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

export async function getCurrentAPIEndpoints() {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `Admin/GetCurrentEndpoints`,
            {},
            {},
            true,
            'no-store',
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

export async function reloadDBEndpoints() {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `Admin/ReloadEndpoints`,
            {},
            {},
            true,
            'no-store',
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