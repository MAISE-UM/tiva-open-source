import {FaArrowDown, FaArrowUp} from "react-icons/fa";
import React, {useEffect} from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Button} from "@/components/ui/button";
import APIEditorSPEndpoint from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorSPEndpoint";
import APIEditorRESTEndpoint from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorRESTEndpoint";

interface APIEditorControllerProps {
    index: number;
    controller: string;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controllersToAdd: Set<string>;
    controllersToDelete: Set<string>;
    controllerOpen: { [key: number]: boolean };
    toggleController: (controller: string, index: number) => void;
    markControllerDelete: (clickEvent: React.MouseEvent, controllerName: string) => void;
    endpointAddText: { [key: string]: string };
    onEndpointAddChange: (newValue: React.ChangeEvent<HTMLInputElement>, controller: string) => void;
    handleEndpointAdd: (event: React.MouseEvent, controller: string, type: string) => void;
    endpointErrorText: { [key: string]: string };
    toggleEndpoint: (endpoint: ApiEndpoint) => void;
    markEndpointDelete: (clickEvent: React.MouseEvent, controllerName: string, endpointID: number) => void;
    changeEndpointValue: (value: unknown, endpointID: number, controllerName: string, endpointVarName: string) => void;
    paramTypes: DropdownOption[];
    paramDestinations: DropdownOption[];
    requestTypes: DropdownOption[];
    dataSources: DropdownOption[];
    resultTypes: DropdownOption[];
    yesNo: DropdownOption[];
    credentialTypes: DropdownOption[];
    urlBases: DropdownOption[];
    credentialKeys: DropdownOption[];
    addParameter: (endpointID: number, controllerName: string) => void;
    changeParameterValue: (value: unknown, controllerName: string, endpointID: number, parameterID: number, parameterVarName: string) => void;
    markParamDelete: (endpointID: number, parameterID: number, controllerName: string) => void;
    changeSecurityValue: (endpointID: number, controllerName: string, securityValue: DropdownOption[]) => void;
    userRolesList: DropdownOption[];
    endpointControllerMapping: { [key: number]: string };
    controllerEndpointMapping: { [key: string]: { [key: number]: ApiEndpoint } };
}

export default function APIEditorController({
    index,
    controller,
    controllersToModify,
    controllersToAdd,
    controllersToDelete,
    controllerOpen,
    toggleController,
    markControllerDelete,
    endpointAddText,
    onEndpointAddChange,
    handleEndpointAdd,
    endpointErrorText,
    toggleEndpoint,
    markEndpointDelete,
    changeEndpointValue,
    paramTypes,
    paramDestinations,
    requestTypes,
    dataSources,
    resultTypes,
    yesNo,
    credentialTypes,
    urlBases,
    credentialKeys,
    addParameter,
    changeParameterValue,
    markParamDelete,
    changeSecurityValue,
    userRolesList,
    // endpointControllerMapping,
    controllerEndpointMapping,
}: APIEditorControllerProps) {
    const [storedProcedureEndpoints, setStoredProcedureEndpoints] = React.useState<ApiEndpoint[]>([]);
    const [restEndpoints, setRestEndpoints] = React.useState<ApiEndpoint[]>([]);

    useEffect(() => {
        if(controllerEndpointMapping != null
            && controllerEndpointMapping[controller] != null
            && Object.keys(controllerEndpointMapping[controller]).length > 0) {
            setStoredProcedureEndpoints(Object.values(controllerEndpointMapping[controller]).filter((endpoint) => endpoint.Call_Type === 'StoredProcedure'));
            setRestEndpoints(Object.values(controllerEndpointMapping[controller]).filter((endpoint) => endpoint.Call_Type === 'REST'));

            // console.log('stored procedure endpoints', storedProcedureEndpoints);
            // console.log('rest endpoints', restEndpoints);
            // console.log('endpoint controller mapping', structuredClone(endpointControllerMapping));
        }
    }, [controller, controllerEndpointMapping]);

    const isModified = controllersToModify.hasOwnProperty(controller) || controllersToAdd.has(controller);
    const isMarkedForDeletion = controllersToDelete.has(controller);

    return (
        <div
            className={`mb-6 rounded-lg ${
                isModified ? "border-2 border-orange-500" : "border border-gray-300"
            } ${isMarkedForDeletion ? "line-through" : ""}`}
        >
            <div
                className="bg-[#00274c] text-white p-4 flex justify-between items-center cursor-pointer"
                onClick={() => {
                    toggleController(controller, index)
                }}
            >
                {!controllerOpen[index] ? <FaArrowUp /> : <FaArrowDown />}
                <span>{controller} Controller</span>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            markControllerDelete(e, controller)
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-2 rounded"
                    >
                        Delete Controller
                    </button>
                    {!controllerOpen[index] ? <FaArrowUp /> : <FaArrowDown />}
                </div>
            </div>
            {controllerOpen[index] && (
                <div className={`p-4 ${isMarkedForDeletion ? "opacity-50" : ""}`}>
                    <div className="flex justify-center items-center mb-4 space-x-2">
                        <p>{controller}/</p>
                        <input
                            value={endpointAddText?.[controller] || ""}
                            onChange={(e) => onEndpointAddChange(e, controller)}
                            className="border rounded px-2 py-1"
                        />
                        <Button
                            onClick={(e) => handleEndpointAdd(e, controller, "SP")}
                        >
                            Add SP Endpoint
                        </Button>
                        <Button
                            onClick={(e) => handleEndpointAdd(e, controller, "REST")}
                        >
                            Add REST Endpoint
                        </Button>
                    </div>
                    {endpointErrorText[controller] && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {endpointErrorText[controller]}
                        </div>
                    )}
                    {storedProcedureEndpoints.length > 0 && <h2 className="text-xl font-bold mb-2">Stored Procedures</h2>}
                    {storedProcedureEndpoints.map((endpoint, index) => (
                        <APIEditorSPEndpoint
                            key={index}
                            controller={controller}
                            endpoint={endpoint}
                            controllersToModify={controllersToModify}
                            toggleEndpoint={toggleEndpoint}
                            markEndpointDelete={markEndpointDelete}
                            changeEndpointValue={changeEndpointValue}
                            paramTypes={paramTypes}
                            requestTypes={requestTypes}
                            dataSources={dataSources}
                            resultTypes={resultTypes}
                            yesNo={yesNo}
                            addParameter={addParameter}
                            changeParameterValue={changeParameterValue}
                            markParamDelete={markParamDelete}
                            changeSecurityValue={changeSecurityValue}
                            userRolesList={userRolesList}
                        />
                    ))}
                    {restEndpoints.length > 0 && <h2 className="text-xl font-bold mb-2">REST Calls</h2>}
                    {restEndpoints.map((endpoint, index) => (
                        <APIEditorRESTEndpoint
                            key={`rest-${index}`}
                            controller={controller}
                            endpoint={endpoint}
                            controllersToModify={controllersToModify}
                            toggleEndpoint={toggleEndpoint}
                            markEndpointDelete={markEndpointDelete}
                            changeEndpointValue={changeEndpointValue}
                            paramTypes={paramTypes}
                            paramDestinations={paramDestinations}
                            requestTypes={requestTypes}
                            yesNo={yesNo}
                            credentialTypes={credentialTypes}
                            urlBases={urlBases}
                            credentialKeys={credentialKeys}
                            addParameter={addParameter}
                            changeParameterValue={changeParameterValue}
                            markParamDelete={markParamDelete}
                            changeSecurityValue={changeSecurityValue}
                            userRolesList={userRolesList}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}