'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {UserReportRow, DataResponseRaw} from "@/app/utils/interfaces";
import {processResponse} from "@/lib/utils";

export async function getUserReportRows(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Report/InternalUser',
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<UserReportRow[]>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<UserReportRow[]>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<UserReportRow[]>(dataResponse)
    }
}