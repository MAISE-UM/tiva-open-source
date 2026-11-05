import React from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";

interface APIReviewChangedRESTEndpointInfoProps {
    endpoint: ApiEndpoint;
    endpointID: number;
    endpointChanges: ApiEndpoint;
    endpointOriginalCache: ApiEndpoint;
    processRoleList: (roleList: DropdownOption[]) => string;
}

export default function APIReviewChangedRESTEndpointInfo({
     endpoint,
     endpointID,
     endpointChanges,
     endpointOriginalCache,
     processRoleList
 }: APIReviewChangedRESTEndpointInfoProps) {
    // console.log('endpoint', endpoint);
    return (
        <Section key={`changed-c-${endpointID}`} className={`bg-white shadow-md rounded-lg overflow-hidden mb-6 border-2 border-orange-500`}>
            <div key={`changed-head-${endpointID}`} className="bg-[#00274c] text-white p-4">
                {endpointID < 0 ? 'Created New' : 'Edited Existing'} REST Endpoint {endpoint['Endpoint_Name']}
            </div>
            <div key={`changed-body-${endpointID}`}>
                <h2>REST Based Endpoint Details</h2>
                <div className={"box-row"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>ID</div>
                        <div className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                    </div>
                    <div
                        className={`large-box ${endpointChanges.hasOwnProperty('Credential_Source') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Credential Source</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Credential_Source')
                            ? `${endpointOriginalCache['Credential_Source']} -> ${endpointChanges["Credential_Source"]}`
                            : endpoint["Credential_Source"]}
                        </div>
                    </div>
                    <div
                        className={`large-box ${endpointChanges.hasOwnProperty('Credential_Key') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Credential Key</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Credential_Key')
                            ? `${endpointOriginalCache['Credential_Key']} -> ${endpointChanges["Credential_Key"]}`
                            : endpoint["Credential_Key"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div className={`small-box ${endpointChanges.hasOwnProperty('Request_Type') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Request Type</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Request_Type')
                            ? `${endpointOriginalCache['Request_Type']} -> ${endpointChanges["Request_Type"]}`
                            : endpoint["Request_Type"]}
                        </div>
                    </div>
                    <div className={`medium-box ${endpointChanges.hasOwnProperty('URL_Base') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>URL Base</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('URL_Base')
                            ? `${endpointOriginalCache['URL_Base']} -> ${endpointChanges["URL_Base"]}`
                            : endpoint["URL_Base"]}
                        </div>
                    </div>
                    <div className={`large-box ${endpointChanges.hasOwnProperty('URL') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>URL Path</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('URL')
                            ? `${endpointOriginalCache['URL']} -> ${endpointChanges["URL"]}`
                            : endpoint["URL"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div
                        className={`small-box ${endpointChanges.hasOwnProperty('Allow_Anonymous') ? 'border-2 border-orange-500' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Allow Anonymous</div>
                        <div className={'text-center box-body'}>{endpointChanges.hasOwnProperty('Allow_Anonymous')
                            ? `${endpointOriginalCache['Allow_Anonymous']} -> ${endpointChanges["Allow_Anonymous"]}`
                            : endpoint["Allow_Anonymous"] ? endpoint["Allow_Anonymous"].toString() : ''}
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
                {endpoint.Parameters && Object.values(endpoint.Parameters).filter(parameter => (parameter.Parameter_ID ? parameter.Parameter_ID : 1) > 0)
                    .map((parameter) => {
                        const parameterID = parameter['Parameter_ID'] ? parameter['Parameter_ID'] : NaN;
                    return (
                    <>
                        {parameterID >= 0 &&
                            <div key={`${endpointID}-${parameterID}`}
                                 className={`${parameterID <= 0 ? 'border-2 border-orange-500' : ''}
                                        ${endpointChanges.Parameters
                                 && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                 && endpointChanges.Parameters[parameterID].App_Mark_Parameter_Deletion
                                     ? ' line-through border-2 border-orange-500' : ''}`}
                            >
                                <div className={'box-row'}>
                                    <div className={`mini-box black-border`}>
                                        <div className={"text-center box-header"}>Param ID</div>
                                        <div className={"text-center box-body"}> {parameterID >= 0 ? parameterID : 'generated'}</div>
                                    </div>
                                    <div className={`medium-box ${endpointChanges.Parameters
                                    && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                    && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Name')
                                        ? `border-2 border-orange-500` : `black-border`}`}>
                                        <div className={"text-center box-header"}>Parameter Name</div>
                                        <div className={"text-center box-body"}>
                                            {`${endpointChanges.Parameters
                                            && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                            && endpointOriginalCache.Parameters
                                            && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Name')

                                                ? `${endpointOriginalCache.Parameters[parameterID]['Parameter_Name']} -> `
                                                : ''}${parameter['Parameter_Name']}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                    && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                    && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Type')
                                        ? `border-2 border-orange-500` : `black-border`}`}>
                                        <div className={"text-center box-header"}>Parameter Type</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Type')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['Parameter_Type']} -> `
                                            : ''}${parameter['Parameter_Type']}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                    && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                    && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Destination')
                                        ? `border-2 border-orange-500` : `black-border`}`}>
                                        <div className={"text-center box-header"}>Parameter Destination</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Parameter_Destination')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['Parameter_Destination']} -> `
                                            : ''}${parameter['Parameter_Destination']}`}
                                        </div>
                                    </div>
                                </div>
                                <div className={'box-row2'}>
                                    <div className={`medium-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Template')
                                        ? `border-2 border-orange-500` : `black-border`}`}
                                    >
                                        <div className={"text-center box-header"}>Template / System Value</div>
                                        <div className={"text-center box-body"}>
                                            {`${endpointChanges.Parameters
                                            && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                            && endpointOriginalCache.Parameters
                                            && endpointChanges.Parameters[parameterID].hasOwnProperty('Template')
                                                ? `${endpointOriginalCache.Parameters[parameterID]['Template']} -> `
                                                : ''}${parameter['Template']}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                    && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                    && endpointChanges.Parameters[parameterID].hasOwnProperty('Null_Value')
                                        ? `border-2 border-orange-500` : `black-border`}`}>
                                        <div className={"text-center box-header"}>List Values</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Null_Value')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['Null_Value']} -> `
                                            : ''}${parameter['Null_Value']}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                    && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                    && endpointChanges.Parameters[parameterID].hasOwnProperty('Delimiter')
                                        ? `border-2 border-orange-500` : `black-border`}`}>
                                        <div className={"text-center box-header"}>List Delimiter</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Delimiter')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['Delimiter']} -> `
                                            : ''}${parameter['Delimiter']}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('System_Provided')
                                            ? `border-2 border-orange-500` : `black-border`}`}
                                    >
                                        <div className={"text-center box-header"}>System Provided</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('System_Provided')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['System_Provided'] ?
                                                endpointOriginalCache.Parameters[parameterID]['System_Provided'].toString() : ''} -> `
                                            : ''}${parameter['System_Provided'] ? parameter['System_Provided'].toString(): ''}`}
                                        </div>
                                    </div>
                                    <div className={`small-box ${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Is_User_Pass')
                                            ? `border-2 border-orange-500` : `black-border`}`}
                                    >
                                        <div className={"text-center box-header"}>User Pass</div>
                                        <div
                                            className={"text-center box-body"}> {`${endpointChanges.Parameters
                                        && endpointChanges.Parameters.hasOwnProperty(parameterID)
                                        && endpointOriginalCache.Parameters
                                        && endpointChanges.Parameters[parameterID].hasOwnProperty('Is_User_Pass')
                                            ? `${endpointOriginalCache.Parameters[parameterID]['Is_User_Pass'] ?
                                                endpointOriginalCache.Parameters[parameterID]['Is_User_Pass'].toString() : ''} -> `
                                            : ''}${parameter['Is_User_Pass'] ? parameter['Is_User_Pass'].toString() : ''}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }
                        {parameterID < 0 &&
                            <div key={`${parameterID}`} className={'border-2 border-orange-500'}>
                                <div className={`box-row`}>
                                    <div className={'small-box black-border'}>
                                        <div className={"text-center box-header"}>Param ID </div>
                                        <div className={"text-center box-body"}> {'generated'}</div>
                                    </div>
                                    <div className={`param-name-box black-border`}>
                                        <div className={"text-center box-header"}>Parameter Name </div>
                                        <div className={"text-center box-body"}> {parameter['Parameter_Name']}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>Parameter Type </div>
                                        <div className={"text-center box-body"}> {parameter['Parameter_Type']}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>Parameter Destination </div>
                                        <div className={"text-center box-body"}> {parameter['Parameter_Destination']}</div>
                                    </div>
                                </div>
                                <div className={`box-row2`}>
                                    <div className={`param-name-box black-border`}>
                                        <div className={"text-center box-header"}>Template / System Value </div>
                                        <div className={"text-center box-body"}> {parameter['Template']}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>List Values </div>
                                        <div className={"text-center box-body"}> {parameter['Null_Value']}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>List Delimiter </div>
                                        <div className={"text-center box-body"}> {parameter['Delimiter']}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>System Provided </div>
                                        <div className={"text-center box-body"}> {parameter['System_Provided'] ? parameter['System_Provided'].toString() : ''}</div>
                                    </div>
                                    <div className={`small-box black-border`}>
                                        <div className={"text-center box-header"}>User Pass </div>
                                        <div className={"text-center box-body"}> {parameter['Is_User_Pass'] ? parameter['Is_User_Pass'].toString() : ''}</div>
                                    </div>
                                </div>
                            </div>
                        }
                    </>)}
                )}
                <hr/>
                <h2>Security Details</h2>
                <div className={"box-row"}>
                    <div className={`large-box ${endpointChanges.SecurityValue ? 'border-2 border-orange-500' : 'black-border'}`}>
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