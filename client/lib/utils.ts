import {clsx, type ClassValue} from "clsx"
import {twMerge} from "tailwind-merge"
import {DataResponse, DataResponseRaw, User} from "@/app/utils/interfaces";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Casts a DataResponseRaw object into a DataResponse<T> object. T object should have same structure as oReturnObject
export function processResponse<T>(response: DataResponseRaw): DataResponse<T> {
    const processedResponse = {
        bSuccess: response.bSuccess,
        oReturnObject: null,
        sErrorInfo: response.sErrorInfo
    };
    if (response.oReturnObject != null && response.oReturnObject !== "") {
        processedResponse.oReturnObject = JSON.parse(response.oReturnObject);
    }
    return processedResponse;
}

// Turns a DataResponseRaw oReturnObject into a list of T objects. Discards bSuccess and sErrorInfo
export function getObjectsList<T>(response: DataResponseRaw): T[] {
    const func = (response: DataResponseRaw): T[] => {
        const processedResponse = processResponse(response)
        const {oReturnObject} = processedResponse;
        return oReturnObject as T[];
    };
    return func(response);
}

// Processes a users roles and returns a list of User objects from the API userListResponse
export function processUserResponse(userListResponse: DataResponseRaw, userRolesList: {
    label: string,
    value: number
}[]): User[] {
    return getObjectsList<User>(userListResponse).map((user: User) => {
        const roles = user.Roles.split("|")
            .map((role: string) => {
                const matchedRole = userRolesList.find((userRole) => userRole.label === role)
                if (matchedRole) {
                    return matchedRole
                }
            })
            .filter((role) => role !== undefined)
        return {
            User_ID: user.User_ID,
            Name: user.First_Name + " " + user.Last_Name,
            First_Name: user.First_Name,
            Last_Name: user.Last_Name,
            UserName: user.UserName,
            Is_Active: user.Is_Active,
            Roles: user.Roles,
            ProcessedRoles: roles,
        }
    });
}