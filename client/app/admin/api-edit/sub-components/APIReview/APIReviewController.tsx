import React, {Fragment} from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";
import APIReviewNewRESTEndpointInfo from "@/app/admin/api-edit/sub-components/APIReview/APIReviewNewRESTEndpointInfo";
import APIReviewChangedSPEndpointInfo
    from "@/app/admin/api-edit/sub-components/APIReview/APIReviewChangedSPEndpointInfo";
import APIReviewChangedRESTEndpointInfo
    from "@/app/admin/api-edit/sub-components/APIReview/APIReviewChangedRESTEndpointInfo";
import APIReviewNewSPEndpointInfo from "@/app/admin/api-edit/sub-components/APIReview/APIReviewNewSPEndpointInfo";

interface APIReviewControllerProps {
    controller: string;
    controllersToModify: { [key: string]: { [key: number]: ApiEndpoint } };
    controllersToAdd: Set<string>;
    controllersToDelete: Set<string>;
    controllersOriginalCache: { [key: string]: { [key: number]: ApiEndpoint } };
    controllerEndpointMapping: { [key: string]: { [key: number]: ApiEndpoint } };
}

export default function APIReviewController({
    controller,
    controllersToModify,
    controllersToAdd,
    controllersToDelete,
    controllersOriginalCache,
    controllerEndpointMapping
}: APIReviewControllerProps) {
    const processRoleList = (roleList: DropdownOption[]) => {
        if (roleList == null) return 'None';
        let roleString = '';
        roleList.forEach(role => roleString += roleString === '' ? role.label : `, ${role.label}`)
        return roleString;
    }

    if (controllersToDelete.has(controller)) {
        return (
            <Section className="py-8">
                <div className="w-3/5 mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4">{controller} Controller Deleted</h2>
                    {Object.values(controllerEndpointMapping[controller]).map((deletedEndpoint) => (
                        <div key={deletedEndpoint.Endpoint_ID} className="bg-white shadow-md rounded-lg overflow-hidden mb-4">
                            <div className="bg-[#00274c] text-white p-4">Deleted Endpoint {deletedEndpoint.Endpoint_Name}</div>
                        </div>
                    ))}
                </div>
            </Section>
        )
    }

    if (!controllersToDelete.has(controller)) {
        return (
            <section className="py-8">
                <div className="w-3/5 mx-auto text-center">
                    <h2 className="text-2xl font-bold mb-4">
                        {controller} Controller {controllersToAdd.has(controller) ? "Definition" : "Changes"}
                    </h2>
                    {controllersToModify[controller] &&
                        Object.keys(controllersToModify[controller]).map((endpointIDStr) => {
                            const endpointID = parseInt(endpointIDStr)
                            const endpoint = controllersToModify[controller][endpointID]
                            const fullEndpoint = controllerEndpointMapping[controller][endpointID]
                            return (
                                <Fragment key={`e-${endpointID}`}>
                                    {controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion && endpointID >= 0 && (
                                        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-4">
                                            <div className="bg-[#00274c] text-white p-4">Deleted Endpoint {endpoint.Endpoint_Name}</div>
                                        </div>
                                    )}
                                    {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion &&
                                        endpointID < 0 &&
                                        fullEndpoint["Call_Type"] === "StoredProcedure" && (
                                            <APIReviewNewSPEndpointInfo
                                                key={`new-1-${endpointID}`}
                                                endpoint={controllersToModify[controller][endpointID]}
                                                endpointID={endpointID}
                                                processRoleList={processRoleList}
                                            />
                                        )}
                                    {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion &&
                                        endpointID < 0 &&
                                        fullEndpoint["Call_Type"] === "REST" && (
                                            <APIReviewNewRESTEndpointInfo
                                                key={`new-2-${endpointID}`}
                                                endpoint={controllersToModify[controller][endpointID]}
                                                endpointID={endpointID}
                                                processRoleList={processRoleList}
                                            />
                                        )}
                                    {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion &&
                                        endpointID >= 0 &&
                                        fullEndpoint["Call_Type"] === "StoredProcedure" && (
                                            <APIReviewChangedSPEndpointInfo
                                                key={`changed-2-${endpointID}`}
                                                endpoint={fullEndpoint}
                                                endpointChanges={controllersToModify[controller][endpointID]}
                                                endpointOriginalCache={controllersOriginalCache[controller]?.[endpointID] ?? {}}
                                                endpointID={endpointID}
                                                processRoleList={processRoleList}
                                            />
                                        )}
                                    {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion &&
                                        endpointID >= 0 &&
                                        fullEndpoint["Call_Type"] === "REST" && (
                                            <APIReviewChangedRESTEndpointInfo
                                                key={`changed-1-${endpointID}`}
                                                endpoint={fullEndpoint}
                                                endpointChanges={controllersToModify[controller][endpointID]}
                                                endpointOriginalCache={controllersOriginalCache[controller]?.[endpointID] ?? {}}
                                                endpointID={endpointID}
                                                processRoleList={processRoleList}
                                            />
                                        )}
                                </Fragment>
                            )
                        })}
                    {!controllersToModify[controller] && (
                        <div className="bg-red-500 text-white p-4 mt-4 rounded">
                            No endpoints were defined for this new endpoint. It will not be saved to the API
                        </div>
                    )}
                </div>
            </section>
        )
    }

    return null

    // return (
    //     <>
    //         {!controllersToDelete.has(controller) &&
    //             <Section key={controller}>
    //                 <div key={controller} style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
    //                     <h2>{controller} Controller {controllersToAdd.has(controller) ? 'Definition' : 'Changes'}</h2>
    //                     {controllersToModify.hasOwnProperty(controller) &&
    //                         Object.values(controllersToModify[controller]).map((endpoint) => {
    //                                 const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;
    //                                 return (
    //                                     <Fragment key={`e-${endpointID}`}>
    //                                         {controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion && endpointID >= 0 &&
    //                                             <Card key={`deleted-${endpointID}`} className={'black-border'}>
    //                                                 <CardHeader
    //                                                     style={{backgroundColor: "#00274c", color: 'white'}}>
    //                                                     {`Deleted Endpoint ${endpoint.Endpoint_Name}`}
    //                                                 </CardHeader>
    //                                             </Card>
    //                                         }
    //                                         {/*New Endpoint, doesn't need comparisons*/}
    //                                         {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion
    //                                             && endpointID < 0 && endpoint['Call_Type'] === 'StoredProcedure' &&
    //                                             <APIReviewNewSPEndpointInfo
    //                                                 key={`new-${endpointID}`}
    //                                                 endpoint={controllersToModify[controller][endpointID]}
    //                                                 endpointID={endpointID}
    //                                                 processRoleList={processRoleList}
    //                                             />
    //                                         }
    //                                         {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion
    //                                             && endpointID < 0 && endpoint['Call_Type'] === 'REST' &&
    //                                             <APIReviewNewRESTEndpointInfo
    //                                                 key={`new-${endpointID}`}
    //                                                 endpoint={controllersToModify[controller][endpointID]}
    //                                                 endpointID={endpointID}
    //                                                 processRoleList={processRoleList}
    //                                             />
    //                                         }
    //                                         {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion
    //                                             && endpointID >= 0 && endpoint['Call_Type'] === 'StoredProcedure' &&
    //                                             <APIReviewChangedSPEndpointInfo
    //                                                 key={`changed-e-${endpointID}`}
    //                                                 endpoint={endpoint}
    //                                                 endpointChanges={controllersToModify[controller][endpointID]}
    //                                                 endpointOriginalCache={controllersOriginalCache[controller] == null || controllersOriginalCache[controller][endpointID] == null ? {} : controllersOriginalCache[controller][endpointID]}
    //                                                 endpointID={endpointID}
    //                                                 processRoleList={processRoleList}
    //                                             />
    //                                         }
    //                                         {!controllersToModify[controller][endpointID].App_Mark_Endpoint_Deletion
    //                                             && endpointID >= 0 && endpoint['Call_Type'] === 'REST' &&
    //                                             <APIReviewChangedRESTEndpointInfo
    //                                                 key={`changed-e-${endpointID}`}
    //                                                 endpoint={endpoint}
    //                                                 endpointChanges={controllersToModify[controller][endpointID]}
    //                                                 endpointOriginalCache={controllersOriginalCache[controller] == null || controllersOriginalCache[controller][endpointID] == null ? {} : controllersOriginalCache[controller][endpointID]}
    //                                                 endpointID={endpointID}
    //                                                 processRoleList={processRoleList}
    //                                             />
    //                                         }
    //                                     </Fragment>
    //                                 )
    //                             }
    //                         )
    //                     }
    //                     {!controllersToModify.hasOwnProperty(controller)
    //                         && <div style={{backgroundColor: 'red', marginTop: '1rem'}}>No endpoints were
    //                             defined for this new endpoint. It will not be saved to the API</div>
    //                     }
    //                 </div>
    //             </Section>
    //         }
    //         {controllersToDelete.has(controller) &&
    //             <Section key={controller}>
    //                 <div key={controller} style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
    //                     <h2>{controller} Controller Deleted</h2>
    //                     {controllersToDelete.values().map((controller) =>
    //                         <Card key={controller} className={'black-border'}>
    //                             <CardHeader
    //                                 style={{backgroundColor: "#00274c", color: 'white'}}>
    //                                 {`Deleted Endpoint ${controller}`}
    //                             </CardHeader>
    //                         </Card>
    //                     )}
    //                 </div>
    //             </Section>
    //         }
    //     </>
    // )
}