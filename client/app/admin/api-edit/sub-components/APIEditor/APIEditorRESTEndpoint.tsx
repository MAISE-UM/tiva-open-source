import {FaArrowDown, FaArrowUp} from "react-icons/fa";
import React from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import APIEditorRESTEndpointDetails from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorRESTEndpointDetails";
import APIEditorRESTEndpointParameters
    from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorRESTEndpontParameters";
import APIEditorEndpointSecurity from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorEndpointSecurity";

interface APIEditorEndpointProps {
    controller: string;
    endpoint: ApiEndpoint;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    toggleEndpoint: (endpoint: ApiEndpoint) => void;
    markEndpointDelete: (clickEvent: React.MouseEvent, controllerName: string, endpointID: number) => void;
    changeEndpointValue: (value: unknown, endpointID: number, controllerName: string, endpointVarName: string) => void;
    paramTypes: DropdownOption[];
    paramDestinations: DropdownOption[];
    requestTypes: DropdownOption[];
    yesNo: DropdownOption[];
    credentialTypes: DropdownOption[];
    urlBases: DropdownOption[]
    credentialKeys: DropdownOption[];
    addParameter: (endpointID: number, controllerName: string) => void;
    changeParameterValue: (value: unknown, controllerName: string, endpointID: number, parameterID: number, parameterVarName: string) => void;
    markParamDelete: (endpointID: number, parameterID: number, controllerName: string) => void;
    changeSecurityValue: (endpointID: number, controllerName: string, securityValue: DropdownOption[]) => void;
    userRolesList: DropdownOption[];
}

export default function APIEditorRESTEndpoint({
    controller,
    endpoint,
    controllersToModify,
    toggleEndpoint,
    markEndpointDelete,
    changeEndpointValue,
    paramTypes,
    paramDestinations,
    requestTypes,
    yesNo,
    credentialTypes,
    urlBases,
    credentialKeys,
    addParameter,
    changeParameterValue,
    markParamDelete,
    changeSecurityValue,
    userRolesList
}: APIEditorEndpointProps) {
    const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;

    const isModified = controllersToModify[controller]?.[endpointID]
    const isMarkedForDeletion = controllersToModify[controller]?.[endpointID]?.App_Mark_Endpoint_Deletion

    return (
        <div
            className={`mb-6 rounded-lg ${
                isModified ? "border-2 border-orange-500" : "border border-gray-300"
            } ${isMarkedForDeletion ? "line-through" : ""}`}
        >
            <div
                className="bg-[#00274c] text-white p-4 flex justify-between items-center cursor-pointer"
                onClick={() => {
                    toggleEndpoint(endpoint)
                }}
            >
                <span>Endpoint {endpoint["Endpoint_Name"]}</span>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            markEndpointDelete(e, controller, endpointID)
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
                    >
                        Delete Endpoint
                    </button>
                    {endpoint.Open ? <FaArrowDown /> : <FaArrowUp />}
                </div>
            </div>
            {endpoint.Open && (
                <div className={`p-4 ${isMarkedForDeletion ? "opacity-50" : ""}`}>
                    <APIEditorRESTEndpointDetails
                        endpoint={endpoint}
                        controller={controller}
                        controllersToModify={controllersToModify}
                        changeEndpointValue={changeEndpointValue}
                        requestTypes={requestTypes}
                        yesNo={yesNo}
                        credentialTypes={credentialTypes}
                        urlBases={urlBases}
                        credentialKeys={credentialKeys}
                    />
                    <hr className="my-4" />
                    <APIEditorRESTEndpointParameters
                        addParameter={addParameter}
                        changeParameterValue={changeParameterValue}
                        markParamDelete={markParamDelete}
                        controllersToModify={controllersToModify}
                        controller={controller}
                        endpoint={endpoint}
                        paramTypes={paramTypes}
                        paramDestinations={paramDestinations}
                    />
                    <hr className="my-4" />
                    <APIEditorEndpointSecurity
                        endpoint={endpoint}
                        controller={controller}
                        controllersToModify={controllersToModify}
                        changeSecurityValue={changeSecurityValue}
                        userRolesList={userRolesList}
                    />
                </div>
            )}
        </div>
    )
}