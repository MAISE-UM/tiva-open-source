'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {ApplicationListItem, DataResponseRaw} from "@/app/utils/interfaces";
import {processResponse} from "@/lib/utils";

export async function getLists(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Lists/GetLists',
            {},
            {...obj},
            true,
            'force-cache',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<ApplicationListItem[]>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<ApplicationListItem[]>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<ApplicationListItem[]>(dataResponse)
    }
}