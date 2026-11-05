import React, { Fragment } from "react";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import Select, {SingleValue} from "react-select";

interface APIEditorEndpointDetailsProps {
    endpoint: ApiEndpoint;
    controller: string;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    changeEndpointValue: (value: unknown, endpointID: number, controllerName: string, endpointVarName: string) => void;
    requestTypes: DropdownOption[];
    yesNo: DropdownOption[];
    credentialTypes: DropdownOption[];
    urlBases: DropdownOption[];
    credentialKeys: DropdownOption[];
}

export default function APIEditorRESTEndpointDetails({
    endpoint,
    controller,
    controllersToModify,
    changeEndpointValue,
    requestTypes,
    yesNo,
    credentialTypes,
    urlBases,
    credentialKeys
}: APIEditorEndpointDetailsProps) {
    const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;
    return (
        <Fragment>
            <h2>Endpoint Details</h2>
            <div className={"box-row"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>ID</div>
                    <div
                        className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Credential_Source")
                            ? 'orange-border' : 'black-border'}`}
                    style={{marginRight: '0'}}
                >
                    <div className={"text-center box-header"}>Credential Source</div>

                    <Select
                        options={credentialTypes}
                        defaultValue={credentialTypes.filter((param) => param.value === endpoint.Credential_Source)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "Credential_Source")}
                    />
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Credential_Key")
                            ? 'orange-border' : 'black-border'}`}>
                    <div className={"text-center box-header"}>Credential Key</div>

                    <Select
                        options={credentialKeys}
                        defaultValue={credentialKeys.filter((param) => param.value === endpoint.Credential_Key)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "Credential_Key")}
                    />
                </div>
            </div>
            <div className={"box-row"}>
                <div
                    className={`small-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Request_Type")
                            ? 'orange-border' : 'black-border'}`}>
                    <div className={"text-center box-header"}>Request Type</div>

                    <Select
                        options={requestTypes}
                        defaultValue={requestTypes.filter((param) => param.value === endpoint.Request_Type)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "Request_Type")}
                    />
                </div>
                <div
                    className={`small-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("URL_Base")
                            ? 'orange-border' : 'black-border'}`}>
                    <div className={"text-center box-header"}>URL Base</div>

                    <Select
                        options={urlBases}
                        defaultValue={urlBases.filter((param) => param.label === endpoint.URL_Base)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.label : '', endpointID, controller, "URL_Base")}
                    />
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("URL")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div className={"text-center box-header"}>
                        URL Path
                    </div>
                    <input
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                        value={endpoint?.URL ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            changeEndpointValue(e.target.value, endpointID, controller, "URL")
                        }
                    />
                </div>
            </div>
            <div className={"box-row"}>
                <div
                    className={`small-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Allow_Anonymous")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div className={"text-center box-header"}>
                        Allow Anonymous
                    </div>
                    <Select
                        options={yesNo}
                        defaultValue={yesNo.filter((param) => param.value === endpoint.Allow_Anonymous)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "Allow_Anonymous")}
                    />
                </div>
                <div
                    className={`small-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("UseParam0UserPass")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div className={"text-center box-header"}>
                        @User First Param
                    </div>
                    <Select
                        options={yesNo}
                        defaultValue={yesNo.filter((param) => param.value === endpoint.UseParam0UserPass)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "UseParam0UserPass")}
                    />
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Description")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div
                        className={"text-center box-header"}> Description
                    </div>
                    <input
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                        value={endpoint?.Description ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            changeEndpointValue(e.target.value, endpointID, controller, "Description")
                        }
                    />
                </div>
            </div>
        </Fragment>
    )
}