
import React, {Fragment, useState} from "react";
import {DropdownOption} from "@/app/utils/interfaces";
import {ApiEndpoint, ApiParameter} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {Button} from "@/components/ui/button";
import {Section, Tab, TabContainer, TabTitle} from "@/app/admin/api-edit/sub-components/General";
import APIEditorHotButtons from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorHotButtons";
import APIEditorInstructions from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorInstructions";
import APIEditorController from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorController";

interface APIEditorProps {
    availableViews: string[];
    controllersToAdd: Set<string>;
    controllersToDelete: Set<string>;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controllersOriginalCache: { [key: string]: {[key: number]: ApiEndpoint }};
    endpointControllerMapping: { [key: number]: string };
    controllerEndpointMapping: { [key: string]: { [key: number]: ApiEndpoint } };
    setCurrentView: React.Dispatch<React.SetStateAction<string>>;
    setControllersToAdd: React.Dispatch<React.SetStateAction<Set<string>>>;
    setControllersToDelete: React.Dispatch<React.SetStateAction<Set<string>>>;
    setControllersToModify: React.Dispatch<React.SetStateAction<{ [key: string]: {[key: number]: ApiEndpoint }}>>;
    setEndpointControllerMapping: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>;
    setControllerEndpointMapping: React.Dispatch<React.SetStateAction<{ [key: string]: { [key: number]: ApiEndpoint } }>>;
    setControllerOpen: React.Dispatch<React.SetStateAction<boolean[]>>;
    paramTypes: DropdownOption[];
    paramDestinations: DropdownOption[];
    requestTypes: DropdownOption[];
    resultTypes: DropdownOption[];
    dataSources: DropdownOption[];
    yesNo: DropdownOption[];
    credentialTypes: DropdownOption[];
    urlBases: DropdownOption[];
    credentialKeys: DropdownOption[];
    userRolesList: DropdownOption[];
    triggerAPIReload: () => void;
    controllerOpen: boolean[];
    newEndpointID: number;
    setNewEndpointID: React.Dispatch<React.SetStateAction<number>>;
    newParameterID: number;
    setNewParameterID: React.Dispatch<React.SetStateAction<number>>;
    isLoading: boolean;
}

export default function APIEditorView({
    availableViews,
    controllersToAdd,
    controllersToDelete,
    controllersToModify,
    controllersOriginalCache,
    endpointControllerMapping,
    controllerEndpointMapping,
    setCurrentView,
    setControllersToAdd,
    setControllersToDelete,
    setControllersToModify,
    setEndpointControllerMapping,
    setControllerEndpointMapping,
    setControllerOpen,
    paramTypes,
    paramDestinations,
    requestTypes,
    resultTypes,
    dataSources,
    yesNo,
    credentialTypes,
    urlBases,
    credentialKeys,
    userRolesList,
    triggerAPIReload,
    controllerOpen,
    newEndpointID,
    setNewEndpointID,
    newParameterID,
    setNewParameterID,
    isLoading
}: APIEditorProps) {
    // Page State
    const [controllerAddText, setControllerAddText] = useState<string>('');
    const [endpointAddText, setEndpointAddText] = useState<{ [key: string]: string }>({});

    // Error Text
    const [controllerErrorText, setControllerErrorText] = useState<string|null>(null);
    const [endpointErrorText, setEndpointErrorText] = useState<{ [key: string]: string }>({});
    const [reviewErrorText, setReviewErrorText] = useState<string|null>(null);

    const toggleController = (controller: string, index: number) => {
        const newControllerOpen = structuredClone(controllerOpen);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        newControllerOpen[index] = !newControllerOpen[index]

        setControllerOpen(newControllerOpen);
        setControllerEndpointMapping(newControllerEndpointMapping);
    }

    const toggleEndpoint = (endpoint: ApiEndpoint) => {
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);
        if(endpoint.Endpoint_Name != null && endpoint.Endpoint_ID != null) {
            const controller = endpoint.Endpoint_Name.split('/')[0];
            newControllerEndpointMapping[controller][endpoint.Endpoint_ID].Open = !newControllerEndpointMapping[controller][endpoint.Endpoint_ID].Open;

            setControllerEndpointMapping(newControllerEndpointMapping);
        }
    }

    const changeSecurityValue = (endpointID: number, controllerName: string, securityValue: DropdownOption[]) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        securityValue = securityValue === null ? [] : securityValue;

        // Determine whether to show field is edited
        if (endpointID > 0 && JSON.stringify(controllersOriginalCache[controllerName][endpointID].SecurityValue) === JSON.stringify(securityValue)) {
            // Field if not updated
            if (newControllersToModify.hasOwnProperty(controllerName)) {
                if (newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if (newControllersToModify[controllerName][endpointID].SecurityValue) {
                        delete newControllersToModify[controllerName][endpointID].SecurityValue;
                    }
                    if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                        delete newControllersToModify[controllerName][endpointID];
                    }
                    if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                        delete newControllersToModify[controllerName];
                    }
                    // console.log('newControllersToModify', JSON.stringify(newControllersToModify))
                }
            }
        } else {
            if (!newControllersToModify.hasOwnProperty(controllerName)) {
                newControllersToModify[controllerName] = {};
            }
            if (!newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
                newControllersToModify[controllerName][endpointID] = {};
            }
            newControllersToModify[controllerName][endpointID].SecurityValue = securityValue;
        }
        newControllerEndpointMapping[controllerName][endpointID].SecurityValue = securityValue;
        // Override Current Value
        setControllersToModify(newControllersToModify);
        setControllerEndpointMapping(newControllerEndpointMapping);
    };

    const processEndpointVarChange = (oldEndpoint: ApiEndpoint, varName: string, value: unknown) => {
        const newEndpoint = structuredClone(oldEndpoint);
        switch (varName) {
            case 'Endpoint_Name':
                newEndpoint.Endpoint_Name = value as string;
                break;
            case 'Call_Type':
                newEndpoint.Call_Type = value as string;
                break;
            case 'Credential_Source':
                newEndpoint.Credential_Source = value as string;
                break;
            case 'Credential_Key':
                newEndpoint.Credential_Key = value as string;
                break;
            case 'Request_Type':
                newEndpoint.Request_Type = value as string;
                break;
            case 'URL_Base':
                newEndpoint.URL_Base = value as string;
                break;
            case 'URL':
                newEndpoint.URL = value as string;
                break;
            case 'Stored_Procedure':
                newEndpoint.Stored_Procedure = value as string;
                break;
            case 'Connection_Name':
                newEndpoint.Connection_Name = value as string;
                break;
            case 'Result_Type':
                newEndpoint.Result_Type = value as string;
                break;
            case 'Allow_Anonymous':
                newEndpoint.Allow_Anonymous = value as boolean;
                break;
            case 'DataSet_Table_Names':
                newEndpoint.DataSet_Table_Names = value as string;
                break;
            case 'UseParam0UserPass':
                newEndpoint.UseParam0UserPass = value as boolean;
                break;
            case 'Description':
                newEndpoint.Description = value as string;
                break;
            default:
                break;
        }

        return newEndpoint;
    }

    const changeEndpointValue = (value: unknown, endpointID: number, controllerName: string, endpointVarName: string) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        const endpointVarKey = endpointVarName as keyof ApiEndpoint;
        if (endpointID >= 0 && value === controllersOriginalCache[controllerName][endpointID][endpointVarKey]) {
            // Value is not changed
            if (newControllersToModify.hasOwnProperty(controllerName)) {
                if (newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if (newControllersToModify[controllerName][endpointID].hasOwnProperty(endpointVarName)) {
                        delete newControllersToModify[controllerName][endpointID][endpointVarKey];
                    }
                    if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                        delete newControllersToModify[controllerName][endpointID];
                    }
                    if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                        delete newControllersToModify[controllerName];
                    }
                }
            }
        } else {
            // Value Changed Add/Update newControllersToModify
            if (!newControllersToModify[controllerName]) {
                newControllersToModify[controllerName] = {};
            }
            if (!newControllersToModify[controllerName][endpointID]) {
                newControllersToModify[controllerName][endpointID] = {};
            }
            const oldValue: ApiEndpoint = newControllersToModify[controllerName][endpointID];
            newControllersToModify[controllerName][endpointID] = processEndpointVarChange(oldValue, endpointVarName, value)
        }

        newControllerEndpointMapping[controllerName][endpointID] = processEndpointVarChange(newControllerEndpointMapping[controllerName][endpointID], endpointVarName, value);
        setControllersToModify(newControllersToModify);
        setControllerEndpointMapping(newControllerEndpointMapping);
    }

    const addParameter = (endpointID: number, controllerName: string) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        const numParams: number = newControllerEndpointMapping[controllerName][endpointID].Parameters ?
            Object.keys(newControllerEndpointMapping[controllerName][endpointID].Parameters).length + 1 : 1;

        const paramObj: ApiParameter = {};
        paramObj.Endpoint_ID = endpointID;
        paramObj.Parameter_ID = NaN;
        paramObj.Parameter_Name = '';
        paramObj.Parameter_Type = 'string';
        paramObj.Is_Optional = false;
        paramObj.Null_Value = 'null';
        paramObj.Parameter_Destination = paramDestinations[0].value as string;
        paramObj.Template = '';
        paramObj.Parameter_Order = '';
        paramObj.Delimiter = '';
        paramObj.System_Provided = false;
        paramObj.Is_User_Pass = false;

        if (!newControllersToModify.hasOwnProperty(controllerName)) {
            newControllersToModify[controllerName] = {};
        }
        if (!newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
            newControllersToModify[controllerName][endpointID] = {};
        }
        if (!newControllersToModify[controllerName][endpointID].Parameters) {
            newControllersToModify[controllerName][endpointID].Parameters = {};
        }

        const newID = structuredClone(newParameterID);
        if(newControllersToModify[controllerName][endpointID].Parameters) {
            setNewParameterID(newID - 1);

            paramObj["Parameter_Order"] = numParams + Object.keys(newControllersToModify[controllerName][endpointID].Parameters).length
                - Object.values(newControllersToModify[controllerName][endpointID].Parameters)
                    .filter(((elem) => elem.Parameter_ID != null ? elem.Parameter_ID : 0  >= 0)).length;
            paramObj["Parameter_ID"] = newID;
            newControllersToModify[controllerName][endpointID].Parameters[newID] = paramObj;

            setControllersToModify(newControllersToModify);
        }

        if(!newControllerEndpointMapping[controllerName][endpointID].Parameters) {
            newControllerEndpointMapping[controllerName][endpointID].Parameters = {};
        }

        newControllerEndpointMapping[controllerName][endpointID].Parameters[newID] = paramObj;
        setControllerEndpointMapping(newControllerEndpointMapping);
    }

    const markControllerDelete = (clickEvent: React.MouseEvent, controllerName: string) => {
        clickEvent.stopPropagation();
        const newControllersToDelete = structuredClone(controllersToDelete);

        if(newControllersToDelete.has(controllerName)) {
            newControllersToDelete.delete(controllerName);
        } else {
            newControllersToDelete.add(controllerName);
        }

        setControllersToDelete(newControllersToDelete);
    }

    const markEndpointDelete = (clickEvent: React.MouseEvent, controllerName: string, endpointID: number) => {
        clickEvent.stopPropagation();
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        if (newControllersToModify[controllerName]) {
            if (newControllersToModify[controllerName][endpointID]) {
                delete newControllersToModify[controllerName][endpointID].App_Mark_Endpoint_Deletion;
                if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                    delete newControllersToModify[controllerName][endpointID];
                }
                if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                    delete newControllersToModify[controllerName];
                }
                setControllersToModify(newControllersToModify);
                return;
            }
        }
        if (!newControllersToModify.hasOwnProperty(controllerName)) {
            newControllersToModify[controllerName] = {};
        }
        if (!newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
            newControllersToModify[controllerName][endpointID] = {};
        }
        newControllersToModify[controllerName][endpointID].App_Mark_Endpoint_Deletion = true;
        setControllersToModify(newControllersToModify);

        newControllerEndpointMapping[controllerName][endpointID].App_Mark_Endpoint_Deletion = true;
        setControllerEndpointMapping(newControllerEndpointMapping)
    }

    const markParamDelete = (endpointID: number, parameterID: number, controllerName: string) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        // Cleanup if new Parameter
        if (parameterID < 0 && newControllersToModify[controllerName][endpointID].Parameters) {
            if (parameterID in newControllersToModify[controllerName][endpointID].Parameters) {
                delete newControllersToModify[controllerName][endpointID].Parameters[parameterID]
            }
            if (Object.keys(newControllersToModify[controllerName][endpointID].Parameters).length === 0) {
                delete newControllersToModify[controllerName][endpointID].Parameters;
            }
            if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                delete newControllersToModify[controllerName][endpointID];
            }
            if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                delete newControllersToModify[controllerName];
            }
            setControllersToModify(newControllersToModify);
        }
        if(parameterID < 0 && newControllerEndpointMapping[controllerName][endpointID].Parameters) {
            if (parameterID in newControllerEndpointMapping[controllerName][endpointID].Parameters) {
                delete newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID]
            }
            if (Object.keys(newControllerEndpointMapping[controllerName][endpointID].Parameters).length === 0) {
                delete newControllerEndpointMapping[controllerName][endpointID].Parameters;
            }
            if (Object.keys(newControllerEndpointMapping[controllerName][endpointID]).length === 0) {
                delete newControllerEndpointMapping[controllerName][endpointID];
            }
            if (Object.keys(newControllerEndpointMapping[controllerName]).length === 0) {
                delete newControllerEndpointMapping[controllerName];
            }
            setControllerEndpointMapping(newControllerEndpointMapping);
        } else {
            // Cleanup if existing Parameter
            if (newControllersToModify.hasOwnProperty(controllerName)) {
                if (newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if (newControllersToModify[controllerName][endpointID].Parameters) {
                        if (parameterID in newControllersToModify[controllerName][endpointID].Parameters) {
                            if (newControllersToModify[controllerName][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion) {
                                delete newControllersToModify[controllerName][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion;
                                if (Object.keys(newControllersToModify[controllerName][endpointID].Parameters[parameterID]).length === 0) {
                                    delete newControllersToModify[controllerName][endpointID].Parameters[parameterID];
                                }
                                if (Object.keys(newControllersToModify[controllerName][endpointID].Parameters).length === 0) {
                                    delete newControllersToModify[controllerName][endpointID].Parameters;
                                }
                                if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                                    delete newControllersToModify[controllerName][endpointID];
                                }
                                if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                                    delete newControllersToModify[controllerName];
                                }
                                // If delete undone then return else mark deleted
                                setControllersToModify(newControllersToModify);

                                if(newControllerEndpointMapping[controllerName][endpointID].Parameters && newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID]) {
                                    newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion = false;
                                    setControllerEndpointMapping(newControllerEndpointMapping);
                                }
                                return;
                            }
                        }
                    }
                }
            }

            if (!newControllersToModify.hasOwnProperty(controllerName)) {
                newControllersToModify[controllerName] = {};
            }
            if (!newControllersToModify[controllerName].hasOwnProperty(endpointID)) {
                newControllersToModify[controllerName][endpointID] = {};
            }
            if (!newControllersToModify[controllerName][endpointID].Parameters) {
                newControllersToModify[controllerName][endpointID].Parameters = {};
            }
            if(newControllersToModify[controllerName][endpointID].Parameters) {
                if (!(parameterID in newControllersToModify[controllerName][endpointID].Parameters)) {
                    newControllersToModify[controllerName][endpointID].Parameters[parameterID] = {};
                }
                newControllersToModify[controllerName][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion = true;
                setControllersToModify(newControllersToModify);
                if(newControllerEndpointMapping[controllerName][endpointID].Parameters && newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID]) {
                    newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion = true;
                    setControllerEndpointMapping(newControllerEndpointMapping);
                }
            }
        }
    }

    const processParameterVarChange = (oldParameter: ApiParameter, varName: string, value: unknown) => {
        const newParameter = structuredClone(oldParameter);

        switch (varName) {
            case 'Parameter_Name':
                newParameter.Parameter_Name = value as string;
                break;
            case 'Parameter_Type':
                newParameter.Parameter_Type = value as string;
                break;
            case 'Parameter_Destination':
                newParameter.Parameter_Destination = value as string;
                break;
            case 'Parameter_Order':
                newParameter.Parameter_Order = value as number;
                break;
            case 'Null_Value':
                newParameter.Null_Value = value as string;
                break;
            case 'Is_Optional':
                newParameter.Is_Optional = value as boolean;
                break;
            case 'System_Provided':
                newParameter.System_Provided = value as boolean;
                break;
            case 'Is_User_Pass':
                newParameter.Is_User_Pass = value as boolean;
                break;
            case 'Template':
                newParameter.Template = value as string;
                break;
            case 'Delimiter':
                newParameter.Delimiter = value as string;
                break;
            case 'Parameter_Description':
                newParameter.Parameter_Description = value as string;
                break;
            default:
                break;
        }

        return newParameter;
    }

    const changeParameterValue = (value: unknown, controllerName: string, endpointID: number,
                                  parameterID: number, parameterVarName: string) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        if (parameterID < 0) {
            // In newControllersToModify
            if(newControllersToModify[controllerName][endpointID].Parameters && newControllerEndpointMapping[controllerName][endpointID].Parameters) {
                const oldParameter = newControllersToModify[controllerName][endpointID].Parameters[parameterID];
                newControllersToModify[controllerName][endpointID].Parameters[parameterID] = processParameterVarChange(oldParameter, parameterVarName, value);
                newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID] = processParameterVarChange(oldParameter, parameterVarName, value);
                setControllersToModify(newControllersToModify);
                setControllerEndpointMapping(newControllerEndpointMapping);
            }
        } else {
            // Cache Work
            if(controllersOriginalCache[controllerName][endpointID].Parameters && newControllerEndpointMapping[controllerName][endpointID].Parameters) {
                const parameterVarKey = parameterVarName as keyof ApiParameter;
                const originalValue = controllersOriginalCache[controllerName][endpointID].Parameters[parameterID][parameterVarKey];

                if (value === originalValue) {
                    // Value Unchanged Remove from newControllersToModify if Present
                    // Value is not changed
                    if (newControllersToModify.hasOwnProperty(controllerName)) {
                        if (newControllersToModify[controllerName][endpointID]) {
                            if (newControllersToModify[controllerName][endpointID].Parameters) {
                                if (newControllersToModify[controllerName][endpointID].Parameters.hasOwnProperty(parameterID)) {
                                    if (newControllersToModify[controllerName][endpointID].Parameters[parameterID].hasOwnProperty(parameterVarName)) {
                                        delete newControllersToModify[controllerName][endpointID].Parameters[parameterID][parameterVarKey];
                                        if (Object.keys(newControllersToModify[controllerName][endpointID].Parameters[parameterID]).length === 0) {
                                            delete newControllersToModify[controllerName][endpointID].Parameters[parameterID];
                                        }
                                        if (Object.keys(newControllersToModify[controllerName][endpointID].Parameters).length === 0) {
                                            delete newControllersToModify[controllerName][endpointID].Parameters;
                                        }
                                        if (Object.keys(newControllersToModify[controllerName][endpointID]).length === 0) {
                                            delete newControllersToModify[controllerName][endpointID];
                                        }
                                        if (Object.keys(newControllersToModify[controllerName]).length === 0) {
                                            delete newControllersToModify[controllerName];
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    // Value Changed Add/Update newControllersToModify
                    if (!newControllersToModify[controllerName]) {
                        newControllersToModify[controllerName] = {};
                    }
                    if (!newControllersToModify[controllerName][endpointID]) {
                        newControllersToModify[controllerName][endpointID] = {};
                    }
                    if (!newControllersToModify[controllerName][endpointID].Parameters) {
                        newControllersToModify[controllerName][endpointID].Parameters = {};
                    }
                    if (!(parameterID in newControllersToModify[controllerName][endpointID].Parameters)) {
                        newControllersToModify[controllerName][endpointID].Parameters[parameterID] = {};
                    }
                    const oldValue = newControllersToModify[controllerName][endpointID].Parameters[parameterID];
                    const oldValue2 = newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID];
                    newControllersToModify[controllerName][endpointID].Parameters[parameterID] = processParameterVarChange(oldValue, parameterVarName, value);
                    newControllerEndpointMapping[controllerName][endpointID].Parameters[parameterID] = processParameterVarChange(oldValue2, parameterVarName, value);
                }
                setControllersToModify(newControllersToModify);
                setControllerEndpointMapping(newControllerEndpointMapping);
            }
        }
    }

    const onControllerAddChange = (newValue: React.ChangeEvent<HTMLInputElement>) => {
        setControllerAddText(newValue.target.value);
    }

    const handleControllerAdd = () => {
        const newControllersToAdd = structuredClone(controllersToAdd);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);

        if (controllerAddText === null || controllerAddText === '') {
            setControllerErrorText('endpoint name cannot be empty');
        }
        else if (controllerAddText.search(' ') >= 0 || controllerAddText === '' || controllerAddText[0] !== controllerAddText[0].toUpperCase()) {
            setControllerErrorText('Controller name must start with a capital and have no spaces');
        } else {
            if (Object.keys(newControllerEndpointMapping).filter((controller) => controllerAddText === controller)[0] === undefined) {
                newControllerEndpointMapping[controllerAddText] = {};
                newControllersToAdd.add(controllerAddText);
                setControllerEndpointMapping(newControllerEndpointMapping);
                setControllersToAdd(newControllersToAdd);
            } else {
                setControllerErrorText('Controller name must be unique');
            }
        }
    }

    const onEndpointAddChange = (newValue: React.ChangeEvent<HTMLInputElement>, controller: string) => {
        const newEndpointAddText = structuredClone(endpointAddText);
        newEndpointAddText[controller] = newValue.target.value;
        setEndpointAddText(newEndpointAddText);
    }

    const handleEndpointAdd = (event: React.MouseEvent, controller: string, type: string) => {
        const newControllersToModify = structuredClone(controllersToModify);
        const newEndpointErrorText = structuredClone(endpointErrorText);
        const newEndpointAddText = structuredClone(endpointAddText);
        const newControllerEndpointMapping = structuredClone(controllerEndpointMapping);
        const newEndpointControllerMapping = structuredClone(endpointControllerMapping);
        const endpointID = structuredClone(newEndpointID);

        if (!newEndpointAddText.hasOwnProperty(controller) || newEndpointAddText[controller].search(' ') >= 0 || newEndpointAddText[controller] === ''
            || newEndpointAddText[controller][0] !== newEndpointAddText[controller][0].toUpperCase()
            || newEndpointAddText[controller].search('/') >= 0) {
            newEndpointErrorText[controller] = 'Endpoint name must start with a capital, have no spaces, and cannot contain any /';
            setEndpointErrorText(newEndpointErrorText);
        } else {
            if(newEndpointErrorText.hasOwnProperty(controller)) {
                delete newEndpointErrorText[controller];
                setEndpointErrorText(newEndpointErrorText);
            }
            if (Object.values(newControllerEndpointMapping[controller]).filter((controllerValue) => controller + '/'
                + newEndpointAddText[controller] === controllerValue['Endpoint_Name']).length === 0) {
                const newEndpoint: ApiEndpoint = {
                    Connection_Name: dataSources[0].value as string,
                    DataSet_Table_Names: 'null',
                    Description: '',
                    Endpoint_ID: endpointID,
                    Endpoint_Name: controller + '/' + newEndpointAddText[controller],
                    Request_Type: 'POST',
                    Result_Type: 'data',
                    Stored_Procedure: '',
                    UseParam0UserPass: false,
                    Allow_Anonymous: false,
                    Call_Type: type === "REST" ? "REST" : "StoredProcedure",
                    URL: "",
                    URL_Base: type === "REST" ? urlBases[0].value as string : '',
                    Credential_Source: type === "REST" ? credentialTypes[0].value as string : '',
                    Credential_Key: type === "REST" ? credentialKeys[0].value as string : '',
                    Parameters: {},
                    SecurityValue: [],
                };
                if (!newControllersToModify.hasOwnProperty(controller)) {
                    newControllersToModify[controller] = {}
                }
                newControllerEndpointMapping[controller][endpointID] = newEndpoint;
                newEndpointControllerMapping[endpointID] = controller;
                newControllersToModify[controller][endpointID] = newEndpoint;

                // console.log('newEndpointID', endpointID)
                // console.log('newControllerEndpointMapping', newControllerEndpointMapping)
                // console.log('newEndpointControllerMapping', newEndpointControllerMapping)
                // console.log('newControllersToModify', newControllersToModify)
                setNewEndpointID(endpointID - 1);
                setEndpointControllerMapping(newEndpointControllerMapping);
                setControllerEndpointMapping(newControllerEndpointMapping);
                setControllersToModify(newControllersToModify);
            } else {
                newEndpointErrorText[controller] = 'Endpoint name must be unique to a controller';
                setEndpointErrorText(newEndpointErrorText);
            }
        }
    }

    const triggerReview = () => {
        if (Object.keys(controllersToModify).length === 0 && controllersToAdd.size === 0 && controllersToDelete.size === 0) {
            setReviewErrorText('No Changes have been made');
            return
        }

        setCurrentView(availableViews[1]);
    }

    return (
        <Fragment>
            <Section>
                <TabContainer>
                    <Tab $active={true}>
                        <TabTitle>API Editor</TabTitle>
                    </Tab>
                </TabContainer>
            </Section>
            <APIEditorHotButtons
                triggerAPIReload={triggerAPIReload}
            />
            <APIEditorInstructions/>
            <Section>
                <div style={{width: '70%', textAlign: 'center', margin: '0 auto'}}>
                    <h2>Edit API</h2>
                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
                        <input
                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                            value={controllerAddText == null ? '' : controllerAddText}
                            onChange={onControllerAddChange}
                        />
                        <Button onClick={handleControllerAdd} className={'btn btn-primary'}>Add Controller</Button>
                    </div>
                    <div style={{backgroundColor: 'red', marginBottom: '1rem'}}>{controllerErrorText}</div>
                    {
                        isLoading &&
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        </div>
                    }
                    {
                        controllerEndpointMapping != null && Object.keys(controllerEndpointMapping).map((controller, index) =>
                            <APIEditorController
                                key={index}
                                index={index}
                                controller={controller}
                                controllersToModify={controllersToModify}
                                controllersToAdd={controllersToAdd}
                                controllersToDelete={controllersToDelete}
                                controllerOpen={controllerOpen}
                                toggleController={toggleController}
                                markControllerDelete={markControllerDelete}
                                endpointAddText={endpointAddText}
                                onEndpointAddChange={onEndpointAddChange}
                                handleEndpointAdd={handleEndpointAdd}
                                endpointErrorText={endpointErrorText}
                                toggleEndpoint={toggleEndpoint}
                                markEndpointDelete={markEndpointDelete}
                                changeEndpointValue={changeEndpointValue}
                                paramTypes={paramTypes}
                                paramDestinations={paramDestinations}
                                requestTypes={requestTypes}
                                dataSources={dataSources}
                                resultTypes={resultTypes}
                                yesNo={yesNo}
                                credentialTypes={credentialTypes}
                                credentialKeys={credentialKeys}
                                urlBases={urlBases}
                                addParameter={addParameter}
                                changeParameterValue={changeParameterValue}
                                markParamDelete={markParamDelete}
                                changeSecurityValue={changeSecurityValue}
                                userRolesList={userRolesList}
                                endpointControllerMapping={endpointControllerMapping}
                                controllerEndpointMapping={controllerEndpointMapping}
                            />
                        )
                    }
                </div>
                <div style={{display: 'flex', justifyContent: 'center'}}>
                    <Button className={'btn btn-primary'} style={{margin: '0 auto'}} onClick={triggerReview}>
                        Review Changes
                    </Button>
                </div>
                <div style={{textAlign: 'center', backgroundColor: 'red', marginTop: '1rem'}}>{reviewErrorText}</div>
            </Section>
        </Fragment>
    )
}