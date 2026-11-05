import {FaPlus, FaTrash} from "react-icons/fa";
import React, { Fragment } from "react";
import Select, {SingleValue} from "react-select";
import {ApiEndpoint} from "@/app/admin/api-edit/sub-components/api-interfaces";
import {DropdownOption} from "@/app/utils/interfaces";
import {Button} from "@/components/ui/button";

interface APIEditorEndpointParametersProps {
    addParameter: (endpointID: number, controllerName: string) => void;
    changeParameterValue: (value: unknown, controllerName: string, endpointID: number, parameterID: number, parameterVarName: string) => void;
    markParamDelete: (endpointID: number, parameterID: number, controllerName: string) => void;
    controllersToModify: { [key: string]: {[key: number]: ApiEndpoint }};
    controller: string;
    endpoint: ApiEndpoint;
    paramTypes: DropdownOption[];
}

export default function APIEditorSPEndpointParameters({
    addParameter,
    changeParameterValue,
    markParamDelete,
    controllersToModify,
    controller,
    endpoint,
    paramTypes
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
                ).sort((a, b) => (a.Parameter_Order && typeof a.Parameter_Order === 'number' ? a.Parameter_Order : 0)
                                - (b.Parameter_Order && typeof b.Parameter_Order === 'number' ? b.Parameter_Order : 0))
                    .map((parameter, index2) => {
                            const parameterID = parameter["Parameter_ID"] ? parameter["Parameter_ID"] : NaN;
                            return (
                                <div
                                    key={`${endpointID}-${parameterID}-${index2}`}
                                    className={`box-row${
                                        (controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion) || parameterID < 0
                                            ? ' orange-border' : ''
                                    }${
                                        controllersToModify.hasOwnProperty(controller) &&
                                        controllersToModify[controller].hasOwnProperty(endpointID) &&
                                        controllersToModify[controller][endpointID].Parameters &&
                                        controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                        controllersToModify[controller][endpointID].Parameters[parameterID].App_Mark_Parameter_Deletion
                                            ? ' line-through' : ''
                                    }`}>
                                    <div
                                        className={'mini-box black-border'}>
                                        <div
                                            className={"text-center box-header"}>Param
                                            ID
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
                                            className={"text-center box-header"}>Parameter
                                            Name
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
                                        className={`mini-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Parameter_Order') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Parameter Order
                                        </div>
                                        <input
                                            className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:border-blue-500 text-center"
                                            value={parameter?.Parameter_Order ?? ""}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                changeParameterValue(e.target.value, controller, endpointID, parameterID, "Parameter_Order")
                                            }
                                        />
                                    </div>
                                    <div
                                        className={`mini-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Null_Value') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Null Value
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
                                        className={`mini-box ${
                                            controllersToModify.hasOwnProperty(controller) &&
                                            controllersToModify[controller].hasOwnProperty(endpointID) &&
                                            controllersToModify[controller][endpointID].Parameters &&
                                            controllersToModify[controller][endpointID].Parameters.hasOwnProperty(parameterID) &&
                                            controllersToModify[controller][endpointID].Parameters[parameterID].hasOwnProperty('Is_Optional') &&
                                            parameterID >= 0
                                                ? 'orange-border' : 'black-border'}`}>
                                        <div
                                            className={"text-center box-header"}>Is Optional
                                        </div>
                                        <div
                                            className={"text-center box-body"}>
                                            <Button
                                                onClick={() => changeParameterValue(
                                                    !parameter["Is_Optional"],
                                                    controller,
                                                    endpointID,
                                                    parameterID,
                                                    "Is_Optional")}
                                                style={{
                                                    margin: '0 auto',
                                                    padding: '0rem 0.75rem'
                                                }}
                                                className={"btn btn-primary"}>
                                                {parameter["Is_Optional"] == null ? 'null' : parameter["Is_Optional"] ? 'true' : 'false'}
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
                            )
                        }
                    )
            }
        </Fragment>
    )
}