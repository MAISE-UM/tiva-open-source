import React from "react";
import Select from "react-select";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";

interface APIEditorEndpointSecurityProps {
    endpoint: ApiEndpoint;
    controller: string;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    changeSecurityValue: (endpointID: number, controllerName: string, securityValue: DropdownOption[]) => void;
    userRolesList: DropdownOption[];
}

export default function APIEditorEndpointSecurity({
    endpoint,
    controller,
    controllersToModify,
    changeSecurityValue,
    userRolesList
}: APIEditorEndpointSecurityProps) {
    const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;

    const isModified = controllersToModify[controller]?.[endpointID]?.SecurityValue !== undefined

    return (
        <>
            <h2 className="text-xl font-bold mb-4">Security Details</h2>
            {endpoint.SecurityValue && (
                <div className="flex flex-wrap -mx-2">
                    <div
                        className={`w-full p-2 ${isModified ? "border-2 border-orange-500" : "border border-gray-300"} rounded-lg`}
                    >
                        <div className="bg-[#00274c] text-white text-center py-2 font-semibold mb-2">Roles with Access</div>
                        <Select
                            isMulti
                            options={userRolesList}
                            name="userRolesList"
                            onChange={(selectedOptions) => changeSecurityValue(endpointID, controller, [...selectedOptions])}
                            placeholder="Select roles that apply..."
                            value={endpoint.SecurityValue}
                            className="react-select-container"
                            classNamePrefix="react-select"
                        />
                    </div>
                </div>
            )}
        </>
    )
}