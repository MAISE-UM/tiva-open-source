import React from "react";
import {DropdownOption} from "@/app/utils/interfaces";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {Section} from "@/app/admin/api-edit/sub-components/General";

interface APIReviewNewEndpointInfoProps {
    endpointID: number;
    endpoint: ApiEndpoint;
    processRoleList: (roleList: DropdownOption[]) => string;
}

export default function APIReviewNewSPEndpointInfo({
    endpointID,
    endpoint,
    processRoleList
}: APIReviewNewEndpointInfoProps) {
    return (
    <Section key={`new-${endpointID}`} style={{padding: 0}} className={`bg-white shadow-md rounded-lg overflow-hidden mb-6 ${endpointID < 0 ? "border-2 border-orange-500" : "border border-gray-300"}`}>
        <div className="bg-[#00274c] text-white p-4">
            {endpointID < 0 ? 'New' : 'Existing'} Endpoint {endpoint['Endpoint_Name']}
        </div>
        <div>
            <h2>Stored Procedure Based Endpoint Details</h2>
            <div className={"box-row-sp"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>ID</div>
                    <div className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                </div>
                <div
                    className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Description </div>
                    <div className={'text-center box-body'}>{endpoint["Description"]}</div>
                </div>
            </div>
            <div className={"box-row-sp"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>Request Type </div>
                    <div className={'text-center box-body'}>{endpoint["Request_Type"]}</div>
                </div>
                <div className={`medium-box black-border`}>
                    <div className={"text-center box-header"}>Data Source </div>
                    <div className={'text-center box-body'}>{endpoint["Connection_Name"]}</div>
                </div>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Stored Procedure </div>
                    <div className={'text-center box-body'}>{endpoint["Stored_Procedure"]}</div>
                </div>
            </div>
            <div className={"box-row-sp"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>Result Type </div>
                    <div className={'text-center box-body'}>{endpoint["Result_Type"]}</div>
                </div>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>Allow Anonymous </div>
                    <div className={'text-center box-body'}>{endpoint["Allow_Anonymous"] == null ? '' : endpoint['Allow_Anonymous'].toString()}</div>
                </div>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>@User First Param </div>
                    <div className={'text-center box-body'}>{endpoint["UseParam0UserPass"] == null ? '' : endpoint['UseParam0UserPass'].toString()}</div>
                </div>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>DataSet Table Names </div>
                    <div className={'text-center box-body'}>{endpoint["DataSet_Table_Names"]}</div>
                </div>
            </div>
            <hr/>
            <h2>Parameter Details</h2>
            {
                (!endpoint.Parameters || Object.keys(endpoint.Parameters).length === 0) &&
                <h4>No Parameters Defined</h4>
            }
            {(endpoint.Parameters ? Object.values(endpoint.Parameters) : []).map(parameter => {
                const parameterID = parameter['Parameter_ID'] ? parameter['Parameter_ID'] : NaN;
                return (
                <div key={`${endpointID}-${parameterID}`}
                     className={`box-row-sp`}>
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
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Null Value</div>
                        <div className={"text-center box-body"}> {parameter['Null_Value']}</div>
                    </div>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Is Optional</div>
                        <div className={"text-center box-body"}> {parameter['Is_Optional'] ? parameter['Is_Optional'].toString() : ''}</div>
                    </div>
                </div>
                )}
            )}
            <hr/>
            <h2>Security Details</h2>
            <div className={"box-row-sp"}>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Allowed Roles </div>
                    <div className={'text-center '} style={{display: 'flex'}}>{(endpoint.SecurityValue && endpoint.SecurityValue.length > 0) ? processRoleList(endpoint.SecurityValue) : 'No allowed roles'}</div>
                </div>
            </div>
        </div>
    </Section>
    );
}