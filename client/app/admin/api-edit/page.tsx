'use client'
import React, {useEffect, useState} from "react";
import APIReviewView from "@/app/admin/api-edit/sub-components/APIReview/APIReviewView";
import APIEditorView from "@/app/admin/api-edit/sub-components/APIEditor/APIEditorView";
import {getUserRoles} from "@/api/admin-api";
import {getApplicationLists, getDBEndpoints, reloadDBEndpoints} from "@/api/api-api";
import {getObjectsList, processResponse} from "@/lib/utils";
import {ApplicationListItem, DropdownOption, Role} from "@/app/utils/interfaces";
import {
    ApiDefinition, ApiEndpoint, ApiParameter
} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {usePermissions} from "@/app/contexts/PermissionContext";

export default function APIEdit() {
    useLayoutToggle(true, true);
    const {permissions, userPayload} = usePermissions();
    // Static Dropdowns
    const [paramTypes, setParamTypes] = useState<DropdownOption[]>([]);
    const [paramDestinations, setParamDestinations] = useState<DropdownOption[]>([]);
    const [requestTypes, setRequestTypes] = useState<DropdownOption[]>([]);
    const [resultTypes, setResultTypes] = useState<DropdownOption[]>([]);
    const [dataSources, setDataSources] = useState<DropdownOption[]>([]);
    const [yesNo, setYesNo] = useState<DropdownOption[]>([]);
    const [credentialTypes, setCredentialTypes] = useState<DropdownOption[]>([]);
    const [urlBases, setUrlBases] = useState<DropdownOption[]>([]);
    const [credentialKeys, setCredentialKeys] = useState<DropdownOption[]>([]);

    // User Roles
    const [userRolesList, setUserRolesList] = useState<DropdownOption[]>([]);

    // Page State
    const [availableViews] = useState<string[]>(['editAPI', 'previewChanges', 'saveAPI']);
    const [currentView, setCurrentView] = useState<string>('editAPI');
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // API State
    const [controllersToAdd, setControllersToAdd] = useState<Set<string>>(new Set());
    const [controllersToDelete, setControllersToDelete] = useState<Set<string>>(new Set());
    const [controllersToModify, setControllersToModify] = useState<{ [key: string]: {[key: number]: ApiEndpoint }}>({});
    const [controllersOriginalCache, setControllersOriginalCache] = useState<{ [key: string]: {[key: number]: ApiEndpoint }}>({});
    const [endpointControllerMapping, setEndpointControllerMapping] = useState<{ [key: number]: string }>({});
    const [controllerEndpointMapping, setControllerEndpointMapping] = useState<{ [key: string]: { [key: number]: ApiEndpoint } }>({});

    // Controller State
    const [controllerOpen, setControllerOpen] = useState<boolean[]>([]);

    // ID State
    const [newEndpointID, setNewEndpointID] = useState<number>(-1);
    const [newParameterID, setNewParameterID] = useState<number>(-1);

    // API Definitions
    // const [currentAPIDefinitions, setCurrentAPIDefinitions] = useState<any>(null);
    // const [dbAPIDefinitions, setDbAPIDefinitions] = useState<any>(null);

    useEffect(() => {
        const dbEndpointsPromise = getDBEndpoints();
        // const currentApiEndpointsPromise = getCurrentAPIEndpoints();
        const userRolesPromise = getUserRoles();
        const applicationListsPromise = getApplicationLists({Category: "APIEditor"});

        Promise.all([dbEndpointsPromise, userRolesPromise, applicationListsPromise]).then((responses) => {
            const [dbEndpointsResponse, userRolesResponse, applicationListsResponse] = responses;

            // console.log('Responses', responses);

            const dbEndpoints = processResponse<ApiDefinition>(dbEndpointsResponse)['oReturnObject'];
            // setDbAPIDefinitions(dbEndpoints);
            if(dbEndpoints) {
                handleDataProcessing(dbEndpoints);
            }
            // console.log('dbEndpoints', dbEndpoints);
            // setCurrentAPIDefinitions(processResponse(currentApiEndpointsResponse)['oReturnObject']);

            const applicationLists = getObjectsList<ApplicationListItem>(applicationListsResponse);

            setParamTypes(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'ParameterTypes')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setParamDestinations(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'ParameterDestinations')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setRequestTypes(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'RequestTypes')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setResultTypes(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'ResultTypes')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setDataSources(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'DataSources')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setYesNo(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'YesNo')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key === 'true',
                    label: listItem.List_Value
                }))
            );
            setCredentialTypes(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'CredentialTypes')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );
            setUrlBases(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'URLBases')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Key
                }))
            );
            setCredentialKeys(applicationLists.filter((listItem: ApplicationListItem) => listItem.Section === 'CredentialKeys')
                .map((listItem: ApplicationListItem): DropdownOption => ({
                    value: listItem.List_Key,
                    label: listItem.List_Value
                }))
            );

            const userRoles = getObjectsList<Role>(userRolesResponse)
                .map((userRole: Role): DropdownOption => ({
                    label: userRole.Role_Name,
                    value: userRole.Role_ID
                }));
            setUserRolesList(userRoles);
        })
        // Explained in middleware
        console.log('userPermissions', permissions, userPayload)
    }, []);

    const handleDataProcessing = (APIDefinitions: ApiDefinition) => {
        const controllerOpen: boolean[] = [];
        const controllerEndpointMapping: { [key: string]: { [key: number]: ApiEndpoint } } = {}
        const endpointControllerMapping: { [key: number]: string } = {};
        APIDefinitions.EndpointControllers.forEach((controller) => {
            controllerOpen.push(false);
            controllerEndpointMapping[controller.Controller_Name] = {};
        });

        APIDefinitions.Endpoints.forEach((endpoint) => {
            if (endpoint.DataSet_Table_Names === null) endpoint.DataSet_Table_Names = 'null'
            const endpointDefinition: ApiEndpoint = {
                Open: false,
                Endpoint_ID: endpoint.Endpoint_ID,
                Endpoint_Name: endpoint.Endpoint_Name,
                Call_Type: endpoint.Call_Type,
                Credential_Source: endpoint.Credential_Source,
                Credential_Key: endpoint.Credential_Key,
                Request_Type: endpoint.Request_Type,
                URL_Base: endpoint.URL_Base,
                URL: endpoint.URL,
                Stored_Procedure: endpoint.Stored_Procedure,
                Connection_Name: endpoint.Connection_Name,
                Result_Type: endpoint.Result_Type,
                Allow_Anonymous: endpoint.Allow_Anonymous,
                DataSet_Table_Names: endpoint.DataSet_Table_Names,
                UseParam0UserPass: endpoint.UseParam0UserPass,
                Description: endpoint.Description,
                SecurityValue: [],
            }

            if(endpoint.Endpoint_Name !== null && endpoint.Endpoint_ID !== null) {
                const controllerName = endpoint.Endpoint_Name.substring(0, endpoint.Endpoint_Name.indexOf('/'));
                controllerEndpointMapping[controllerName][endpoint.Endpoint_ID] = endpointDefinition;
                endpointControllerMapping[endpoint.Endpoint_ID] = controllerName;
            }
        });

        APIDefinitions["EndpointParameters"].forEach((parameter) => {
            if (parameter.Null_Value === null) parameter.Null_Value = 'null';
            parameter.Parameter_Order = parameter.Parameter_Order === null ? '' : parameter.Parameter_Order.toString();
            const parameterDefinition: ApiParameter = {
                Endpoint_ID: parameter.Endpoint_ID,
                Parameter_ID: parameter.Parameter_ID,
                Parameter_Name: parameter.Parameter_Name,
                Parameter_Type: parameter.Parameter_Type,
                Parameter_Destination: parameter.Parameter_Destination,
                Parameter_Order: parameter.Parameter_Order,
                Null_Value: parameter.Null_Value,
                Is_Optional: parameter.Is_Optional,
                System_Provided: parameter.System_Provided,
                Is_User_Pass: parameter.Is_User_Pass,
                Template: parameter.Template,
                Delimiter: parameter.Delimiter,
                Parameter_Description: parameter.Parameter_Description
            }
            const controllerName = endpointControllerMapping[parameter.Endpoint_ID];
            if(controllerEndpointMapping[controllerName][parameter.Endpoint_ID].Parameters == null) {
                const parameters: {[key: number]: ApiParameter} = {};
                parameters[parameter.Parameter_ID] = parameterDefinition;
                controllerEndpointMapping[controllerName][parameter.Endpoint_ID].Parameters = parameters;
            } else {
                const parametersCopy = controllerEndpointMapping[controllerName][parameter.Endpoint_ID].Parameters;
                if(parametersCopy != null) {
                    parametersCopy[parameter.Parameter_ID] = parameterDefinition;
                }
                controllerEndpointMapping[controllerName][parameter.Endpoint_ID].Parameters = parametersCopy;
            }
        })

        APIDefinitions["EndpointSecurity"].forEach((security) => {
            const controllerName = endpointControllerMapping[security.Endpoint_ID];
            if (security.Role_ID != null) {
                const securityDefinition: DropdownOption = {
                    label: security.Role_Name,
                    value: security.Role_ID
                }
                if(controllerEndpointMapping[controllerName][security.Endpoint_ID].SecurityValue == null) {
                    controllerEndpointMapping[controllerName][security.Endpoint_ID].SecurityValue = [securityDefinition];
                } else {
                    const securityValueCopy = controllerEndpointMapping[controllerName][security.Endpoint_ID].SecurityValue;
                    if(securityValueCopy != null) {
                        securityValueCopy.push(securityDefinition);
                    }
                    controllerEndpointMapping[controllerName][security.Endpoint_ID].SecurityValue = securityValueCopy;
                }
            }
        })

        console.log('controllerEndpointMapping', controllerEndpointMapping)

        setControllerOpen(controllerOpen);
        setEndpointControllerMapping(endpointControllerMapping);
        setControllerEndpointMapping(controllerEndpointMapping);
        setControllersOriginalCache(controllerEndpointMapping);
        setIsLoading(false);
    }

    const triggerAPIEdit = () => {
        setCurrentView(availableViews[0]);
    }

    const triggerAPIReload = () => {
        reloadDBEndpoints().then(() => {
            console.log('api reloaded')
        })
    }

    return (
        <>
            {currentView === availableViews[0] &&
                <>
                    <APIEditorView
                        availableViews={availableViews}
                        controllersToAdd={controllersToAdd}
                        controllersToDelete={controllersToDelete}
                        controllersToModify={controllersToModify}
                        controllersOriginalCache={controllersOriginalCache}
                        endpointControllerMapping={endpointControllerMapping}
                        controllerEndpointMapping={controllerEndpointMapping}
                        setCurrentView={setCurrentView}
                        setControllersToAdd={setControllersToAdd}
                        setControllersToDelete={setControllersToDelete}
                        setControllersToModify={setControllersToModify}
                        setEndpointControllerMapping={setEndpointControllerMapping}
                        setControllerEndpointMapping={setControllerEndpointMapping}
                        setControllerOpen={setControllerOpen}
                        paramTypes={paramTypes}
                        paramDestinations={paramDestinations}
                        requestTypes={requestTypes}
                        resultTypes={resultTypes}
                        dataSources={dataSources}
                        yesNo={yesNo}
                        credentialTypes={credentialTypes}
                        urlBases={urlBases}
                        credentialKeys={credentialKeys}
                        userRolesList={userRolesList}
                        triggerAPIReload={triggerAPIReload}
                        controllerOpen={controllerOpen}
                        newEndpointID={newEndpointID}
                        newParameterID={newParameterID}
                        setNewEndpointID={setNewEndpointID}
                        setNewParameterID={setNewParameterID}
                        isLoading={isLoading}
                    />
                </>
            }
            {
                currentView === availableViews[1] &&
                <APIReviewView
                    triggerAPIEdit={triggerAPIEdit}
                    triggerAPIReload={triggerAPIReload}
                    controllersToAdd={controllersToAdd}
                    controllersToDelete={controllersToDelete}
                    controllersToModify={controllersToModify}
                    controllersOriginalCache={controllersOriginalCache}
                    controllerEndpointMapping={controllerEndpointMapping}
                />
            }
        </>


    );
}