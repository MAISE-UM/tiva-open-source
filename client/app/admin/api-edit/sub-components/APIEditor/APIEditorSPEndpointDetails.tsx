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
    dataSources: DropdownOption[];
    resultTypes: DropdownOption[];
    yesNo: DropdownOption[];
}

export default function APIEditorSPEndpointDetails({
    endpoint,
    controller,
    controllersToModify,
    changeEndpointValue,
    requestTypes,
    dataSources,
    resultTypes,
    yesNo
}: APIEditorEndpointDetailsProps) {
    const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;

    return (
        <Fragment>
            <h2>Endpoint Details</h2>
            <div className={"box-row"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>ID</div>
                    <div className={"text-center box-body"}> {endpointID >= 0 ? endpointID : 'generate'}</div>
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Description")
                            ? 'orange-border' : 'black-border'}`}>
                    <div className={"text-center box-header"}>Description</div>
                    <input
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                        value={endpoint?.Description ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            changeEndpointValue(e.target.value, endpointID, controller, "Description")
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
                    className={`medium-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Connection_Name")
                            ? 'orange-border' : 'black-border'}`}>
                    <div className={"text-center box-header"}>Data Source</div>
                    <Select
                        options={dataSources}
                        defaultValue={dataSources.filter((param) => param.value === endpoint.Connection_Name)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : '', endpointID, controller, "Connection_Name")}
                    />
                </div>
                <div
                    className={`large-box ${
                        endpointID > 0 &&
                        controllersToModify.hasOwnProperty(controller) &&
                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                        controllersToModify[controller][endpointID].hasOwnProperty("Stored_Procedure")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div className={"text-center box-header"}>Stored Procedure
                    </div>
                    <input
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                        value={endpoint?.Stored_Procedure ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            changeEndpointValue(e.target.value, endpointID, controller, "Stored_Procedure")
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
                        controllersToModify[controller][endpointID].hasOwnProperty("Result_Type")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div
                        className={"text-center box-header"}>Result
                        Type
                    </div>
                    <Select
                        options={resultTypes}
                        defaultValue={resultTypes.filter((param) => param.value === endpoint.Result_Type)}
                        onChange={(e: SingleValue<DropdownOption>) => changeEndpointValue(e ? e.value : false, endpointID, controller, "Result_Type")}
                    />
                </div>
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
                        controllersToModify[controller][endpointID].hasOwnProperty("DataSet_Table_Names")
                            ? 'orange-border' : 'black-border'}`
                    }>
                    <div
                        className={"text-center box-header"}>DataSet
                        Table Names
                    </div>
                    <input
                        className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                        value={endpoint?.DataSet_Table_Names ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            changeEndpointValue(e.target.value, endpointID, controller, "DataSet_Table_Names")
                        }
                    />
                </div>
            </div>
        </Fragment>
    )
}