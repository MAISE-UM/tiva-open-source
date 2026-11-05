import React from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";

interface APIReviewChangedEndpointInfoProps {
    endpoint: ApiEndpoint;
    endpointID: number;
    endpointChanges: ApiEndpoint;
    endpointOriginalCache: ApiEndpoint;
    processRoleList: (roleList: DropdownOption[]) => string;
}

export default function APIReviewChangedSPEndpointInfo({
       endpoint,
       endpointID,
       endpointChanges,
       endpointOriginalCache,
       processRoleList
   }: APIReviewChangedEndpointInfoProps) {
    // console.log('endpoint', endpoint);
    return (
        <Section key={`changed-c-${endpointID}`} className={`bg-white shadow-md rounded-lg overflow-hidden mb-6 border-2 border-orange-500`}>
            <div key={`changed-head-${endpointID}`} className="bg-[#00274c] text-white p-4">
                {endpointID < 0 ? 'Created New' : 'Edited Existing'} StoredProcedure Endpoint {endpoint['Endpoint_Name']}
            </div>
            <div key={`changed-body-${endpointID}`}>
                <h2>Stored Procedure Based Endpoint Details</h2>
                <div className={"box-row-sp"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>ID</div>
                        <div className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                    </div>
                    <div
                        className={`large-box ${endpointChanges.hasOwnProperty('Description') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Description</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Description')
                            ? `${endpointOriginalCache['Description']} -> ${endpointChanges["Description"]}`
                            : endpoint["Description"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row-sp"}>
                    <div
                        className={`small-box ${endpointChanges.hasOwnProperty('Request_Type') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Request Type</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Request_Type')
                            ? `${endpointOriginalCache['Request_Type']} -> ${endpointChanges["Request_Type"]}`
                            : endpoint["Request_Type"]}
                        </div>
                    </div>
                    <div
                        className={`medium-box ${endpointChanges.hasOwnProperty('Connection_Name') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Data Source</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Connection_Name')
                            ? `${endpointOriginalCache['Connection_Name']} -> ${endpointChanges["Connection_Name"]}`
                            : endpoint["Connection_Name"]}
                        </div>
                    </div>
                    <div
                        className={`large-box ${endpointChanges.hasOwnProperty('Stored_Procedure') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Stored Procedure</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Stored_Procedure')
                            ? `${endpointOriginalCache['Stored_Procedure']} -> ${endpointChanges["Stored_Procedure"]}`
                            : endpoint["Stored_Procedure"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row-sp"}>
                    <div
                        className={`small-box ${endpointChanges.hasOwnProperty('Result_Type') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Result Type</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Result_Type')
                            ? `${endpointOriginalCache['Result_Type']} -> ${endpointChanges["Result_Type"]}`
                            : endpoint["Result_Type"]}
                        </div>
                    </div>
                    <div
                        className={`small-box ${endpointChanges.hasOwnProperty('Allow_Anonymous') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Allow Anonymous</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Allow_Anonymous')
                            ? `${endpointOriginalCache['Allow_Anonymous']} -> ${endpointChanges["Allow_Anonymous"]}`
                            : endpoint["Allow_Anonymous"]}
                        </div>
                    </div>
                    <div
                        className={`small-box ${endpointChanges.hasOwnProperty('UseParam0UserPass') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>@User First Param</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('UseParam0UserPass')
                            ? `${endpointOriginalCache['UseParam0UserPass']} -> ${endpointChanges["UseParam0UserPass"]}`
                            : endpoint["UseParam0UserPass"]}
                        </div>
                    </div>
                    <div
                        className={`large-box ${endpointChanges.hasOwnProperty('DataSet_Table_Names') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>DataSet Table Names</div>
                        <div
                            className={'text-center box-body'}>{endpointChanges.hasOwnProperty('DataSet_Table_Names')
                            ? `${endpointOriginalCache['DataSet_Table_Names']} -> ${endpointChanges["DataSet_Table_Names"]}`
                            : endpoint["DataSet_Table_Names"]}
                        </div>
                    </div>
                </div>
                <hr/>
                <h2>Parameter Details</h2>
                {
                    !endpoint.Parameters &&
                    <h4>No Parameters Defined</h4>
                }
                {endpoint.Parameters && Object.values(endpoint.Parameters)
                    .map((parameter) => {
                        const parameterID = parameter['Parameter_ID'] ? parameter['Parameter_ID'] : NaN;
                        return (
                            <>
                                {parameterID >= 0 &&
                                    <div key={`${endpointID}-${parameterID}`}
                                         className={`
                                            box-row-sp
                                            ${parameterID <= 0 ? 'border-2 border-orange-500' : ''}
                                            ${endpointChanges.Parameters
                                         && endpointChanges.Parameters
                                         && endpointChanges.Parameters[parameterID]
                                         && endpointChanges.Parameters[parameterID].App_Mark_Parameter_Deletion
                                             ? ' line-through border-2 border-orange-500' : ''}
                                    `}>
                                        <div className={`small-box black-border`}>
                                            <div className={"text-center box-header"}>Param ID</div>
                                            <div
                                                className={"text-center box-body"}> {parameterID >= 0 ? parameterID : 'generated'}</div>
                                        </div>
                                        <div className={`param-name-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters[parameterID]
                                        && endpointChanges.Parameters[parameterID].Parameter_Name
                                            ? `border-2 border-orange-500` : `black-border`}`}>
                                            <div className={"text-center box-header"}>Parameter Name</div>
                                            <div className={"text-center box-body"}>
                                                {`${endpointChanges.Parameters && endpointOriginalCache.Parameters
                                                && endpointChanges.Parameters[parameterID]
                                                && endpointChanges.Parameters[parameterID].Parameter_Name
                                                    ? `${endpointOriginalCache.Parameters[parameterID]['Parameter_Name']} -> `
                                                    : ''}${parameter['Parameter_Name']}`}
                                            </div>
                                        </div>
                                        <div className={`small-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters[parameterID]
                                        && endpointChanges.Parameters[parameterID].Parameter_Type
                                            ? `border-2 border-orange-500` : `black-border`}`}>
                                            <div className={"text-center box-header"}>Parameter Type</div>
                                            <div
                                                className={"text-center box-body"}> {`${endpointChanges.Parameters && endpointOriginalCache.Parameters
                                            && endpointChanges.Parameters[parameterID]
                                            && endpointChanges.Parameters[parameterID].Parameter_Type
                                                ? `${endpointOriginalCache.Parameters[parameterID]['Parameter_Type']} -> `
                                                : ''}${parameter['Parameter_Type']}`}
                                            </div>
                                        </div>
                                        <div className={`small-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters[parameterID]
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Null_Value')
                                            ? `border-2 border-orange-500` : `black-border`}`}>
                                            <div className={"text-center box-header"}>Null Value</div>
                                            <div
                                                className={"text-center box-body"}> {`${endpointChanges.Parameters && endpointOriginalCache.Parameters
                                            && endpointChanges.Parameters[parameterID]
                                            && endpointChanges.Parameters[parameterID].hasOwnProperty('Null_Value')
                                                ? `${endpointOriginalCache.Parameters[parameterID]['Null_Value']} -> `
                                                : ''}${parameter['Null_Value']}`}
                                            </div>
                                        </div>
                                        <div className={`small-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters[parameterID]
                                        && endpointChanges.Parameters[parameterID].Is_Optional
                                            ? `border-2 border-orange-500` : `black-border`}`}>
                                            <div className={"text-center box-header"}>Is Optional</div>
                                            <div
                                                className={"text-center box-body"}> {`${endpointChanges.Parameters && endpointOriginalCache.Parameters
                                            && endpointChanges.Parameters[parameterID]
                                            && endpointChanges.Parameters[parameterID].Is_Optional
                                            && endpointOriginalCache.Parameters[parameterID]
                                            && endpointOriginalCache.Parameters[parameterID].Is_Optional
                                                ? `${endpointOriginalCache.Parameters[parameterID]['Is_Optional'].toString()} -> `
                                                : ''}${parameter['Is_Optional'] ? parameter['Is_Optional'].toString() : ''}`}
                                            </div>
                                        </div>
                                    </div>
                                }
                                {parameterID < 0 &&
                                    <div key={`2${endpointID}-${parameterID}`}
                                         className={`box-row-sp border-2 border-orange-500`}>
                                        <div className={'small-box black-border'}>
                                            <div className={"text-center box-header"}>Param ID</div>
                                            <div className={"text-center box-body"}> {'generated'}</div>
                                        </div>
                                        <div className={`param-name-box black-border`}>
                                            <div className={"text-center box-header"}>Parameter Name</div>
                                            <div className={"text-center box-body"}> {parameter['Parameter_Name']}</div>
                                        </div>
                                        <div className={`small-box black-border`}>
                                            <div className={"text-center box-header"}>Parameter Type</div>
                                            <div className={"text-center box-body"}> {parameter['Parameter_Type']}</div>
                                        </div>
                                        <div className={`small-box black-border`}>
                                            <div className={"text-center box-header"}>Null Value</div>
                                            <div className={"text-center box-body"}> {parameter['Null_Value']}</div>
                                        </div>
                                        <div className={`small-box black-border`}>
                                            <div className={"text-center box-header"}>Is Optional</div>
                                            <div
                                                className={"text-center box-body"}> {parameter['Is_Optional'] ? parameter['Is_Optional'].toString() : ''}</div>
                                        </div>
                                    </div>
                                }
                            </>
                        )
                        }
                    )}
                <hr/>
                <h2>Security Details</h2>
                <div className={"box-row-sp"}>
                    <div
                        className={`large-box ${endpointChanges.SecurityValue ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Allowed Roles</div>
                        {endpointOriginalCache.SecurityValue &&
                            <div className={'text-center '}
                                 style={{display: 'flex'}}>{`
                             ${endpointOriginalCache.SecurityValue
                                ? processRoleList(endpointOriginalCache.SecurityValue)
                                : endpoint.SecurityValue == null ? '' : endpoint.SecurityValue
                            } ${endpointChanges.SecurityValue ? ' -> ' : ''} ${
                                endpointChanges.SecurityValue
                                    ? processRoleList(endpointChanges.SecurityValue)
                                    : ''
                            }`}
                            </div>
                        }
                        {!endpointOriginalCache.SecurityValue &&
                            <div className={'text-center '} style={{display: 'flex'}}>
                                No Roles Have Access
                            </div>
                        }
                    </div>
                </div>
            </div>
        </Section>
    );
}