'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {DataResponseRaw, UserPermission, UserPermissionGroup} from "@/app/utils/interfaces";
import {processResponse} from "@/lib/utils";

export async function getUserRoles() {
    try {
        const response = fetch_api_wrapper(
            'GET',
            'API/Admin/GetUserRoles',
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

export async function getUsersByRole(Role_Name: string) {
    try {
        const response = fetch_api_wrapper(
            'GET',
            `API/Admin/GetUsersByRole?Role_Name=${Role_Name}`,
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

export async function editUser(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/EditUser`,
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

export async function deleteUser(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/DeleteUser`,
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

export async function addEndpoint(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/AddEndpoint`,
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if ('data' in responseData) {
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

export async function updateEndpoint(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/UpdateEndpoint`,
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if ('data' in responseData) {
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

export async function addParameter(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/AddParameter`,
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if ('data' in responseData) {
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

export async function updateParameter(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/UpdateParameter`,
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if ('data' in responseData) {
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

export async function addSecurityRole(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/AddSecurityRole`,
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if ('data' in responseData) {
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

export async function updateSecurityRole(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            `API/Admin/UpdateSecurityRole`,
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

export async function getUserPermissions(user: string) {
    try {
        // console.log('getUserPermissions', user)
        const response = fetch_api_wrapper(
            'GET',
            `API/Admin/GetUserPermissions/${user}`,
            {},
            {},
            true,
            'force-cache',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            // console.log('responseData', responseData)
            const dataResponseRaw = responseData.data as DataResponseRaw;
            const dataResponseAll = processResponse<UserPermission[]>(dataResponseRaw)
            // console.log('dataResponseAll', dataResponseAll)
            let permissions: UserPermissionGroup|null = null;
            if(dataResponseAll.bSuccess && dataResponseAll.oReturnObject) {
                permissions = {Routes: [], Permissions: []}
                permissions.Routes = dataResponseAll.oReturnObject?.filter((permission) => permission.Type.toUpperCase() === 'ROUTE')
                permissions.Permissions = dataResponseAll.oReturnObject?.filter((permission) => permission.Type.toUpperCase() !== 'ROUTE')
            }
            return permissions
        } else {
            const permissions: UserPermissionGroup|null = null;
            return permissions
        }
    } catch (error) {
        console.error('Error:', error);
        const permissions: UserPermissionGroup|null = null;
        return permissions;
    }
}