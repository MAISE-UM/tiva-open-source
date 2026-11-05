import React, {useEffect, useState} from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {
    addEndpoint,
    addParameter,
    addSecurityRole,
    updateEndpoint,
    updateParameter,
    updateSecurityRole
} from "@/api/admin-api";
import { getObjectsList } from "@/lib/utils";
import {Section, Tab, TabContainer, TabTitle} from "@/app/admin/api-edit/sub-components/General";
import {Button} from "@/components/ui/button";
import APIReviewChangesControllers from "@/app/admin/api-edit/sub-components/APIReview/APIReviewChangesControllers";
import APIReviewController from "@/app/admin/api-edit/sub-components/APIReview/APIReviewController";

interface APIReviewSavedProps {
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controllersToAdd: Set<string>;
    controllersToDelete: Set<string>;
    controllersOriginalCache: { [key: string]: {[key: number]: ApiEndpoint }};
    controllerEndpointMapping: { [key: string]: {[key: number]: ApiEndpoint }};
    triggerAPIEdit: () => void;
    triggerAPIReload: () => void;
    setView: (view: string) => void;
}

export default function APIReviewChanges({
    controllersToModify,
    controllersToAdd,
    controllersToDelete,
    controllersOriginalCache,
    controllerEndpointMapping,
    triggerAPIEdit,
    triggerAPIReload,
    setView
}: APIReviewSavedProps) {
    const [controllersToModifyCopy, setControllersToModifyCopy] = useState<{ [key: string]: {[key: number]: ApiEndpoint }}>(controllersToModify);

    useEffect(() => {
        if(controllersToModify !== controllersToModifyCopy) {
            setControllersToModifyCopy(controllersToModify);
        }
    }, [controllersToModify, controllersToModifyCopy]);

    const saveAPI = async () => {
        // console.log('toSave', controllersToModifyCopy)
        if(Object.keys(controllersToModifyCopy).length === 0 && controllersToDelete.size !== 0) {
            for (const controller of controllersToDelete) {
                for (const endpoint of Object.values(controllerEndpointMapping[controller])) {
                    const endpointID = endpoint.Endpoint_ID ? endpoint.Endpoint_ID : -1;
                    if(endpointID < 0) continue;
                    await deleteEndpoint(controller, endpointID)
                }
            }
            setTimeout(() => {
                triggerAPIReload();
            }, 1000);
            setView('saved')
        }
        Object.keys(controllersToModifyCopy).forEach(controller => {
            // Process Deletion of Endpoints
            if(controllersToDelete.has(controller)) {
                Object.values(controllerEndpointMapping[controller]).forEach(async (endpoint) => {
                    // TODO: ADD ERROR
                    const endpointID = endpoint.Endpoint_ID ? endpoint.Endpoint_ID : -1;
                    await deleteEndpoint(controller, endpointID)
                })
                delete controllersToModifyCopy[controller]
                return;
            }

            // Process New Endpoints
            Object.values(controllersToModifyCopy[controller]).filter(endpoint => endpoint.Endpoint_ID ? endpoint.Endpoint_ID : 1 < 0)
                    .forEach(async endpoint => {
                await addEndpoint({
                    Endpoint_Name: endpoint['Endpoint_Name'],
                    Request_Type: endpoint['Request_Type'],
                    Stored_Procedure: endpoint['Stored_Procedure'],
                    Connection_Name: endpoint['Connection_Name'],
                    Result_Type: endpoint['Result_Type'],
                    DataSet_Table_Names: endpoint['DataSet_Table_Names'],
                    UseParam0UserPass: endpoint['UseParam0UserPass'] != null && endpoint['UseParam0UserPass'],
                    Description: endpoint['Description'],
                    Activity_Notes: 'New Endpoint Created',
                    Allow_Anonymous: endpoint['Allow_Anonymous'],
                    Call_Type: endpoint['Call_Type'],
                    Credential_Source: endpoint['Credential_Source'],
                    Credential_Key: endpoint['Credential_Key'],
                    URL_Base: endpoint['URL_Base'],
                    URL: endpoint['URL']
                }).then(resp => {
                    const endpointID = getObjectsList<ApiEndpoint>(resp)[0]['Endpoint_ID'];
                    // TODO: ADD ERROR
                    if(endpointID == null || !endpoint.Parameters) return;
                    // Add Parameters
                    Object.values(endpoint.Parameters).filter(parameter => parameter.Parameter_ID ? parameter.Parameter_ID : 1 < 0)
                            .forEach(parameter => {
                        addParameter({
                            Endpoint_ID: endpointID,
                            Parameter_Name: parameter['Parameter_Name'],
                            Parameter_Type: parameter['Parameter_Type'],
                            Parameter_Order: parameter['Parameter_Order'],
                            Null_Value: parameter['Null_Value'],
                            Is_Optional: parameter['Is_Optional'],
                            Description: parameter['Parameter_Description'] == null ? '' : parameter['Parameter_Description'],
                            Activity_Notes: 'New Parameter Added',
                            Parameter_Destination: parameter['Parameter_Destination'],
                            Is_User_Pass: parameter['Is_User_Pass'],
                            System_Provided: parameter['System_Provided'],
                            Template: parameter['Template'],
                            Delimiter: parameter['Delimiter']
                        })
                    })

                    if(endpoint.SecurityValue) {
                        // Add Security
                        // @Endpoint_ID, @Role_ID
                        Object.values(endpoint.SecurityValue).forEach(securityObj => {
                            addSecurityRole({
                                Endpoint_ID: endpointID,
                                Role_ID: securityObj.value,
                                Activity_Notes: 'Added Security Role',
                                Has_Access: true
                            })
                        })
                    }
                    delete controllersToModifyCopy[controller][endpointID];
                })
            })

            // Process Old Endpoints
            Object.keys(controllersToModifyCopy[controller]).filter(endpointIDStr => parseInt(endpointIDStr) >= 0)
                    .forEach(async endpointIDStr => {
                const endpointID = parseInt(endpointIDStr);
                const endpoint = controllersToModifyCopy[controller][endpointID];
                // Delete first if needed
                if(endpoint.App_Mark_Endpoint_Deletion) {
                    await deleteEndpoint(controller, endpointID);
                    return
                }

                // Process Endpoint
                await updateEndpoint({
                    Endpoint_ID: endpointID,
                    Request_Type: endpoint['Request_Type'],
                    Stored_Procedure: endpoint['Stored_Procedure'],
                    Connection_Name: endpoint['Connection_Name'],
                    Result_Type: endpoint['Result_Type'],
                    DataSet_Table_Names: endpoint['DataSet_Table_Names'],
                    UseParam0UserPass: endpoint['UseParam0UserPass'],
                    Description: endpoint['Description'],
                    Activity_Notes: 'Updated Endpoint',
                    Allow_Anonymous: endpoint['Allow_Anonymous'],
                    Call_Type: endpoint['Call_Type'],
                    Credential_Source: endpoint['Credential_Source'],
                    Credential_Key: endpoint['Credential_Key'],
                    URL_Base: endpoint['URL_Base'],
                    URL: endpoint['URL']
                })

                // Process Parameters
                if(endpoint.Parameters) {
                    for (const parameter_id_str of Object.keys(endpoint.Parameters)) {
                        const Parameter_ID = parseInt(parameter_id_str);
                        const parameter = endpoint.Parameters[Parameter_ID];
                        if (parameter.App_Mark_Parameter_Deletion) {
                            // Delete Parameters
                            await updateParameter({
                                Parameter_ID,
                                Deleted: true,
                                Activity_Notes: 'Parameter Deleted'
                            })
                        } else if (Parameter_ID < 0) {
                            // Add Parameters
                            await addParameter({
                                Endpoint_ID: endpointID,
                                Parameter_Name: parameter['Parameter_Name'],
                                Parameter_Type: parameter['Parameter_Type'],
                                Parameter_Order: parameter['Parameter_Order'],
                                Null_Value: parameter['Null_Value'],
                                Is_Optional: parameter['Is_Optional'],
                                Description: parameter['Parameter_Description'] == null ? '' : parameter['Parameter_Description'],
                                Activity_Notes: 'New Parameter Added',
                                Parameter_Destination: parameter['Parameter_Destination'],
                                Is_User_Pass: parameter['Is_User_Pass'],
                                System_Provided: parameter['System_Provided'],
                                Template: parameter['Template'],
                                Delimiter: parameter['Delimiter']
                            });

                        } else {
                            // Change Parameters
                            const change = JSON.stringify(parameter);
                            await updateParameter({Parameter_ID, ...parameter, Activity_Notes: `Parameter Modified: ${change}`});
                        }
                    }
                }

                // Process Security
                if(endpoint.SecurityValue) {
                    const oldRoleList = controllersOriginalCache[controller][endpointID].SecurityValue ? controllersOriginalCache[controller][endpointID].SecurityValue : [];
                    const newRoleList = endpoint.SecurityValue ? endpoint.SecurityValue : [];
                    const deletedRoles: number[] = [];
                    oldRoleList.forEach((oldRole) => {
                        let found = false
                        newRoleList.forEach((newRole) => {
                            if(oldRole.value === newRole.value) {
                                found = true;
                            }
                        });
                        if(!found) deletedRoles.push(oldRole.value as number);
                    });

                    for (const Role_ID of deletedRoles) {
                        await updateSecurityRole({
                            Endpoint_ID: endpointID,
                            Role_ID,
                            Deleted: true,
                            Activity_Notes: 'Security Role Deleted'
                        })
                    }

                    const newRoles: number[] = [];
                    newRoleList.forEach((newRole) => {
                        let found = false;
                        oldRoleList.forEach((oldRole) => {
                            if(oldRole.value === newRole.value) {
                                found = true;
                            }
                        });
                        if(!found) newRoles.push(newRole.value as number);
                    });

                    for (const Role_ID of newRoles) {
                        await addSecurityRole({
                            Endpoint_ID: endpointID,
                            Role_ID,
                            Activity_Notes: 'Added Security Role',
                            Has_Access: true
                        })
                    }
                }

                delete controllersToModifyCopy[controller][endpointID];
            });
            setTimeout(() => {
                triggerAPIReload();
            }, 1000);
            setView('saved')
        })
    }

    const deleteEndpoint = async (controller: string, endpointID: number) => {
        if(endpointID < 0) return;

        const endpointParameterMapping = controllerEndpointMapping[controller][endpointID].Parameters ? Object.values(controllerEndpointMapping[controller][endpointID].Parameters) : [];
        const endpointSecurityMapping = controllerEndpointMapping[controller][endpointID].SecurityValue ? controllerEndpointMapping[controller][endpointID].SecurityValue : [];

        for (const securityMapping of endpointSecurityMapping) {
            await updateSecurityRole({
                Endpoint_ID: endpointID,
                Role_ID: securityMapping['value'],
                Deleted: true,
                Activity_Notes: 'Role Deleted'
            })
        }
        for (const parameter of endpointParameterMapping) {
            await updateParameter({
                Parameter_ID: parameter['Parameter_ID'],
                Deleted: true,
                Activity_Notes: 'Endpoint Deleted'
            })
        }
        await updateEndpoint({
            Endpoint_ID: endpointID,
            Deleted: true,
            Activity_Notes: 'Endpoint Deleted'
        })
    }

    const controllersSet: Set<string> = new Set([...controllersToAdd, ...Object.keys(controllersToModify), ...controllersToDelete]);
    const controllers: string[] = Array.from(controllersSet)

    return (
        <>
            <Section>
                <TabContainer>
                    <Tab $active={true}>
                        <TabTitle>Change Review</TabTitle>
                    </Tab>
                </TabContainer>
            </Section>
            <APIReviewChangesControllers
                controllersToAdd={controllersToAdd}
                controllersToModify={controllersToModify}
                controllersToDelete={controllersToDelete}
            />
            {
                controllers.map((controller) =>
                    <APIReviewController
                        key={controller}
                        controller={controller}
                        controllersToModify={controllersToModify}
                        controllersToAdd={controllersToAdd}
                        controllersToDelete={controllersToDelete}
                        controllersOriginalCache={controllersOriginalCache}
                        controllerEndpointMapping={controllerEndpointMapping}
                    />
                )
            }
            <div style={{display:'flex', justifyContent: 'center', paddingBottom: '2rem'}}>
                <Button className={'btn btn-primary'} onClick={triggerAPIEdit}>Back to Edit</Button>
                <Button className={'btn btn-primary'} onClick={saveAPI} style={{marginLeft: '1rem'}}>Submit Changes</Button>
            </div>
        </>
    );
}