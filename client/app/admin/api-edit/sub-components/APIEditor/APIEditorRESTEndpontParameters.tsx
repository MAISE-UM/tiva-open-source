import {FaPlus, FaTrash} from "react-icons/fa";
import React, {Fragment} from "react";
import Select, {SingleValue} from "react-select";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Button} from "@/components/ui/button";

interface APIEditorEndpointParametersProps {
    addParameter: (endpointID: number, controllerName: string) => void;
    changeParameterValue: (value: unknown, controllerName: string, endpointID: number, parameterID: number, parameterVarName: string) => void;
    markParamDelete: (endpointID: number, parameterID: number, controllerName: string) => void;
    controllersToModify: { [key: string]: { [key: number]: ApiEndpoint } };
    controller: string;
    endpoint: ApiEndpoint;
    paramTypes: DropdownOption[];
    paramDestinations: DropdownOption[];
}

export default function APIEditorRESTEndpointParameters({
    addParameter,
    changeParameterValue,
    markParamDelete,
    controllersToModify,
    controller,
    endpoint,
    paramTypes,
    paramDestinations
}: APIEditorEndpointParametersProps) {
    const endpointID = endpoint["Endpoint_ID"] ? endpoint["Endpoint_ID"] : NaN;
    return (
        <Fragment>
            <h2>Parameter Details</h2>
            <div>
                <Button
                    onClick={((() => addParameter(endpointID, controller)))}
                    className={'btn btn-primary'}
                    style={{margin: '0 auto'}}>
                    <FaPlus/>Add Parameter
                </Button>
            </div>
            {
                (endpoint.Parameters ? Object.values(endpoint.Parameters).filter((param) => param.Parameter_ID ? param.Parameter_ID : 0 < 0) : []
                ).map((parameter, index2) =>
                    {
                        const parameterID = parameter["Parameter_ID"] ? parameter["Parameter_ID"] : NaN;
                        return (
                            <div
                                key={`a${endpointID}-${parameterID}-${index2}`}
                                style={{paddingBottom: '10px'}}
                                className={`${
                                    (controllersToModify.hasOwnProperty(controller) &&
                                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                                        controllersToModify[controller][endpointID].Parameters &&
                                        controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID))
                                        ? 'orange-border' : ''
                                }${
                                    controllersToModify.hasOwnProperty(controller) &&
                                    controllersToModify[controller].hasOwnProperty(endpointID) &&
                                    controllersToModify[controller][endpointID].Parameters &&
                                    controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                    controllersToModify[controller][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion
                                        ? ' line-through' : ''
                                }`}>
                                <div
                                    key={`${endpointID}-${parameterID}-${index2}`}
                                    className={`box-row`}>
                                    <div
                                        className={'mini-box black-border'}>
                                        <div
                                            className={"text-center box-header"}>Param ID
                                        </div>
                                        <div
                                            className={"text-center box-body"}> {parameterID >= 0 ? parameterID : 'generated'}</div>
                                    </div>
                                    <div
                                        className={`param-name-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Parameter_Name') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Parameter Name
                                        </div>
                                        <input
                                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                                            value={parameter?.Parameter_Name ?? ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeParameterValue(e.target.value, controller, endpointID, parameterID, "Parameter_Name")
                                            }
                                        />
                                    </div>
                                    <div
                                        className={`small-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Parameter_Type') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Param Type
                                        </div>
                                        <Select
                                            // className={'form-control'}
                                            options={paramTypes}
                                            defaultValue={paramTypes.filter((param) => param.label === parameter["Parameter_Type"])}
                                            onChange={(e: SingleValue<DropdownOption>) => changeParameterValue(e ? e.label : '', controller, endpointID, parameterID, "Parameter_Type")}
                                        />
                                    </div>
                                    <div
                                        className={`medium-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Parameter_Destination') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Param Destination
                                        </div>
                                        <Select
                                            // className={'form-control'}
                                            options={paramDestinations}
                                            defaultValue={paramDestinations.filter((param) => param.label === parameter["Parameter_Destination"])}
                                            onChange={(e: SingleValue<DropdownOption>) => changeParameterValue(e ? e.label : '', controller, endpointID, parameterID, "Parameter_Destination")}
                                        />
                                    </div>
                                </div>
                                <div
                                    key={`b${endpointID}-${parameterID}-${index2}`}
                                    className={`box-row2`}>
                                    <div
                                        className={`medium-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Template') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Template / System Value
                                        </div>
                                        <input
                                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                                            value={parameter?.Template ?? ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeParameterValue(e.target.value, controller, endpointID, parameterID, "Template")
                                            }
                                        />
                                    </div>
                                    <div
                                        className={`small-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Null_Value') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>List Values
                                        </div>
                                        <input
                                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                                            value={parameter?.Null_Value ?? ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeParameterValue(e.target.value, controller, endpointID, parameterID, "Null_Value")
                                            }
                                        />
                                    </div>
                                    <div
                                        className={`small-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Delimiter') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>List Delimiter
                                        </div>
                                        <input
                                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                                            value={parameter?.Delimiter ?? ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeParameterValue(e.target.value, controller, endpointID, parameterID, "Delimiter")
                                            }
                                        />
                                    </div>
                                    <div
                                        className={`mini-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('System_Provided') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>System Provided
                                        </div>
                                        <div
                                            className={"text-center box-body"}>
                                            <Button
                                                onClick={() => changeParameterValue(
                                                    !parameter["System_Provided"],
                                                    controller,
                                                    endpointID,
                                                    parameterID,
                                                    "System_Provided")}
                                                style={{
                                                    margin: '0 auto',
                                                    padding: '0rem 0.75rem'
                                                }}
                                                className={"btn btn-primary"}>
                                                {parameter["System_Provided"] == null ? 'null' : parameter["System_Provided"] ? 'true' : 'false'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div
                                        className={`mini-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Is_User_Pass') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>User Pass
                                        </div>
                                        <div
                                            className={"text-center box-body"}>
                                            <Button
                                                onClick={() => changeParameterValue(
                                                    !parameter["Is_User_Pass"],
                                                    controller,
                                                    endpointID,
                                                    parameterID,
                                                    "Is_User_Pass")}
                                                style={{
                                                    margin: '0 auto',
                                                    padding: '0rem 0.75rem'
                                                }}
                                                className={"btn btn-primary"}>
                                                {parameter["Is_User_Pass"] == null ? 'null' : parameter["Is_User_Pass"] ? 'true' : 'false'}
                                            </Button>
                                        </div>
                                    </div>
                                    <div
                                        className={'mini-box black-border'}>
                                        <div
                                            className={"text-center box-header"}>Delete
                                        </div>
                                        <div
                                            className={"text-center box-body"}>
                                            <Button
                                                onClick={() => markParamDelete(
                                                    endpointID,
                                                    parameterID,
                                                    controller)
                                                }
                                                style={{margin: '0 auto'}}
                                                className={"btn btn-primary"}>
                                                <FaTrash/>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    }
                )
            }
        </Fragment>
    )
}