import React, {Fragment} from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";

interface APIReviewNewEndpointInfoProps {
    endpointID: number;
    endpoint: ApiEndpoint;
    processRoleList: (roleList: DropdownOption[]) => string;
}

export default function APIReviewNewRESTEndpointInfo({
     endpointID,
     endpoint,
     processRoleList
 }: APIReviewNewEndpointInfoProps) {

    return (
        <Section  key={`new-${endpointID}`} style={{padding: 0}} className={`bg-white shadow-md rounded-lg overflow-hidden mb-6 ${endpointID < 0 ? "border-2 border-orange-500" : "border border-gray-300"}`}>
            <div  className="bg-[#00274c] text-white p-4">
                {endpointID < 0 ? 'New' : 'Existing'} REST Endpoint {endpoint['Endpoint_Name']}
            </div>
            <div>
                <h2>REST Based Endpoint Details</h2>
                <div className={"box-row"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>ID</div>
                        <div className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                    </div>
                    <div
                        className={`large-box black-border`}>
                        <div className={"text-center box-header"}>Credential Source</div>
                        <div className={'text-center box-body'}>{endpoint["Credential_Source"]}</div>
                    </div>
                    <div
                        className={`large-box black-border`}>
                        <div className={"text-center box-header"}>Credential Key</div>
                        <div className={'text-center box-body'}>{endpoint["Credential_Key"]}</div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Request Type</div>
                        <div className={'text-center box-body'}>{endpoint["Request_Type"]}</div>
                    </div>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>URL Base</div>
                        <div className={'text-center box-body'}>{endpoint["URL_Base"]}</div>
                    </div>
                    <div className={`large-box black-border`}>
                        <div className={"text-center box-header"}>URL Path</div>
                        <div className={'text-center box-body'}>{endpoint["URL"]}</div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Allow Anonymous</div>
                        <div className={'text-center box-body'}>{endpoint["Allow_Anonymous"] ? endpoint["Allow_Anonymous"].toString() : ''}</div>
                    </div>
                    <div className={`large-box black-border`}>
                        <div className={"text-center box-header"}>Description </div>
                        <div className={'text-center box-body'}>{endpoint["Description"]}</div>
                    </div>
                </div>
                <hr/>
                <h2>Parameter Details</h2>
                {
                    (!endpoint.Parameters || Object.keys(endpoint.Parameters).length === 0) &&
                    <h4>No Parameters Defined</h4>
                }
                {Object.values(endpoint.Parameters ? endpoint.Parameters : []).map(parameter => {
                    const parameterID = parameter["Parameter_ID"] ? parameter["Parameter_ID"] : NaN;
                    return (
                    <Fragment key={`${endpointID}-${parameterID}`}>
                        <div className={`box-row`}>
                            <div className={'small-box black-border'}>
                                <div className={"text-center box-header"}>Param ID</div>
                                <div className={"text-center box-body"}> {parameterID >= 0 ? parameterID : 'generated'}</div>
                            </div>
                            <div className={`param-name-box black-border`}>
                                <div className={"text-center box-header"}>Parameter Name</div>
                                <div className={"text-center box-body"}> {parameter['Parameter_Name']}</div>
                            </div>
                            <div className={`small-box black-border`}>
                                <div className={"text-center box-header"}>Parameter Type</div>
                                <div className={"text-center box-body"}> {parameter['Parameter_Type']}</div>
                            </div>
                            <div className={`param-name-box black-border`}>
                                <div className={"text-center box-header"}>Parameter Destination</div>
                                <div className={"text-center box-body"}> {parameter['Parameter_Destination']}</div>
                            </div>
                        </div>
                        <div className={`box-row2`}>
                            <div className={'medium-box black-border'}>
                                <div className={"text-center box-header"}>Template / System Value</div>
                                <div className={"text-center box-body"}> {parameter['Template']}</div>
                            </div>
                            <div className={`small-box black-border`}>
                                <div className={"text-center box-header"}>List Values</div>
                                <div className={"text-center box-body"}> {parameter['Null_Value']}</div>
                            </div>
                            <div className={`small-box black-border`}>
                                <div className={"text-center box-header"}>List Delimiter</div>
                                <div className={"text-center box-body"}> {parameter['Delimiter']}</div>
                            </div>
                            <div className={`small-box black-border`}>
                                <div className={"text-center box-header"}>System Provided</div>
                                <div className={"text-center box-body"}> {parameter['System_Provided'] ? parameter['System_Provided'].toString() : ''}</div>
                            </div>
                            <div className={`small-box black-border`}>
                                <div className={"text-center box-header"}>User Pass</div>
                                <div className={"text-center box-body"}> {parameter['Is_User_Pass'] ? parameter['Is_User_Pass'].toString(): ''}</div>
                            </div>
                        </div>
                    </Fragment>
                    )}
                )}
                <hr/>
                <h2>Security Details</h2>
                <div className={"box-row"}>
                    <div className={`large-box black-border`}>
                        <div className={"text-center box-header"}>Allowed Roles </div>
                        <div className={'text-center '} style={{display: 'flex'}}>{(endpoint.SecurityValue && endpoint.SecurityValue.length > 0) ? processRoleList(endpoint.SecurityValue) : 'No allowed roles'}</div>
                    </div>
                </div>
            </div>
        </Section>
    );
}