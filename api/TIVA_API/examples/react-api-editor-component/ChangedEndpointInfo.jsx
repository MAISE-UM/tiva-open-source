import {Card, CardBody, CardHeader} from "reactstrap";
import React from "react";

const ChangedEndpointInfo = (props) => {
    return (
        <Card key={`changed-${props.endpointID}`} className={'orange-border'}>
            <CardHeader key={`changed-head-${props.endpointID}`} style={{backgroundColor: "#00274c", color: 'white'}}>
                {props.endpointID < 0 ? 'Created New' : 'Edited Existing'} Endpoint {props.endpoint['Endpoint_Name']}
            </CardHeader>
            <CardBody key={`changed-body-${props.endpointID}`}>
                <h2>Endpoint Details</h2>
                <div className={"box-row"}>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>ID</div>
                        <div className={"text-center box-body"}> {props.endpointID >= 0 ? props.endpointID : 'generate'}</div>
                    </div>
                    <div
                        className={`large-box ${props.endpointChanges.hasOwnProperty('Description') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Description</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('Description')
                            ? `${props.endpointOriginalCache['Description']} -> ${props.endpointChanges["Description"]}`
                            : props.endpoint["Description"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div className={`small-box ${props.endpointChanges.hasOwnProperty('Request_Type') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Request Type</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('Request_Type')
                            ? `${props.endpointOriginalCache['Request_Type']} -> ${props.endpointChanges["Request_Type"]}`
                            : props.endpoint["Request_Type"]}
                        </div>
                    </div>
                    <div className={`medium-box ${props.endpointChanges.hasOwnProperty('Connection_Name') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Data Source</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('Connection_Name')
                            ? `${props.endpointOriginalCache['Connection_Name']} -> ${props.endpointChanges["Connection_Name"]}`
                            : props.endpoint["Connection_Name"]}
                        </div>
                    </div>
                    <div className={`large-box ${props.endpointChanges.hasOwnProperty('Stored_Procedure') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Stored Procedure</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('Stored_Procedure')
                            ? `${props.endpointOriginalCache['Stored_Procedure']} -> ${props.endpointChanges["Stored_Procedure"]}`
                            : props.endpoint["Stored_Procedure"]}
                        </div>
                    </div>
                </div>
                <div className={"box-row"}>
                    <div className={`small-box ${props.endpointChanges.hasOwnProperty('Result_Type') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Result Type</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('Result_Type')
                            ? `${props.endpointOriginalCache['Result_Type']} -> ${props.endpointChanges["Result_Type"]}`
                            : props.endpoint["Result_Type"]}
                        </div>
                    </div>
                    <div className={`large-box ${props.endpointChanges.hasOwnProperty('DataSet_Table_Names') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>DataSet Table Names</div>
                        <div className={'text-center box-body'}>{props.endpointChanges.hasOwnProperty('DataSet_Table_Names')
                            ? `${props.endpointOriginalCache['DataSet_Table_Names']} -> ${props.endpointChanges["DataSet_Table_Names"]}`
                            : props.endpoint["DataSet_Table_Names"]}
                        </div>
                    </div>
                </div>
                <hr/>
                <h2>Parameter Details</h2>
                {
                    !props.endpoint.hasOwnProperty('parameters') &&
                    <h4>No Parameters Defined</h4>
                }
                {props.endpointParameters.concat(
                    props.endpointChanges.hasOwnProperty('parameters') ? Object.values(Object.fromEntries(Object.entries(props.endpointChanges['parameters']).filter(([key])=>key < 0))) : []
                ).map(parameter =>
                    <>
                        {parameter['Parameter_ID'] >= 0 &&
                            <div key={`${props.endpointID}-${parameter['Parameter_ID']}`}
                                 className={`
                            box-row 
                            ${parameter['Parameter_ID'] <= 0 ? 'orange-border' : ''} 
                            ${props.endpointChanges.hasOwnProperty('parameters')
                                 && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                 && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('app_mark_param_deletion')
                                     ? ' line-through orange-border' : ''}
                         `}>
                                <div className={`small-box black-border`}>
                                    <div className={"text-center box-header"}>Param ID</div>
                                    <div
                                        className={"text-center box-body"}> {parameter['Parameter_ID'] >= 0 ? parameter['Parameter_ID'] : 'generated'}</div>
                                </div>
                                <div className={`param-name-box ${props.endpointChanges.hasOwnProperty('parameters')
                                && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Parameter_Name')
                                    ? `orange-border` : `black-border`}`}>
                                    <div className={"text-center box-header"}>Parameter Name</div>
                                    <div className={"text-center box-body"}>
                                        {`${props.endpointChanges.hasOwnProperty('parameters')
                                        && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                        && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Parameter_Name')
                                            ? `${props.endpointOriginalCache['parameters'][parameter['Parameter_ID']]['Parameter_Name']} -> `
                                            : ''}${parameter['Parameter_Name']}`}
                                    </div>
                                </div>
                                <div className={`small-box ${props.endpointChanges.hasOwnProperty('parameters')
                                && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Parameter_Type')
                                    ? `orange-border` : `black-border`}`}>
                                    <div className={"text-center box-header"}>Parameter Type</div>
                                    <div
                                        className={"text-center box-body"}> {`${props.endpointChanges.hasOwnProperty('parameters')
                                    && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                    && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Parameter_Type')
                                        ? `${props.endpointOriginalCache['parameters'][parameter['Parameter_ID']]['Parameter_Type']} -> `
                                        : ''}${parameter['Parameter_Type']}`}
                                    </div>
                                </div>
                                <div className={`small-box ${props.endpointChanges.hasOwnProperty('parameters')
                                && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Null_Value')
                                    ? `orange-border` : `black-border`}`}>
                                    <div className={"text-center box-header"}>Null Value</div>
                                    <div
                                        className={"text-center box-body"}> {`${props.endpointChanges.hasOwnProperty('parameters')
                                    && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                    && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Null_Value')
                                        ? `${props.endpointOriginalCache['parameters'][parameter['Parameter_ID']]['Null_Value']} -> `
                                        : ''}${parameter['Null_Value']}`}
                                    </div>
                                </div>
                                <div className={`small-box ${props.endpointChanges.hasOwnProperty('parameters')
                                && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Is_Optional')
                                    ? `orange-border` : `black-border`}`}>
                                    <div className={"text-center box-header"}>Is Optional</div>
                                    <div
                                        className={"text-center box-body"}> {`${props.endpointChanges.hasOwnProperty('parameters')
                                    && props.endpointChanges['parameters'].hasOwnProperty(parameter['Parameter_ID'])
                                    && props.endpointChanges['parameters'][parameter['Parameter_ID']].hasOwnProperty('Is_Optional')
                                        ? `${props.endpointOriginalCache['parameters'][parameter['Parameter_ID']]['Is_Optional'].toString()} -> `
                                        : ''}${parameter['Is_Optional'].toString()}`}
                                    </div>
                                </div>
                            </div>
                        }
                        {parameter['Parameter_ID'] < 0 &&
                            <div key={`${parameter['Parameter_ID']}`}
                                 className={`box-row`}>
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
                                    <div className={"text-center box-header"}>Null Value </div>
                                    <div className={"text-center box-body"}> {parameter['Null_Value']}</div>
                                </div>
                                <div className={`small-box black-border`}>
                                    <div className={"text-center box-header"}>Is Optional </div>
                                    <div className={"text-center box-body"}> {parameter['Is_Optional'].toString()}</div>
                                </div>
                            </div>
                        }
                    </>
                )}
                <hr/>
                <h2>Security Details</h2>
                <div className={"box-row"}>
                    <div className={`large-box ${props.endpointChanges.hasOwnProperty('securityValue') ? 'orange-border' : 'black-border'}`}>
                        <div className={"text-center box-header"}>Allowed Roles</div>
                        {props.endpointOriginalCache.hasOwnProperty('securityValue') &&
                            <div className={'text-center '}
                                 style={{display: 'flex'}}>{`
                             ${props.endpointOriginalCache.hasOwnProperty('securityValue')
                                ? props.processRoleList(props.endpointOriginalCache['securityValue'])
                                : props.endpoint['securityValue'] == null ? '' : props.endpoint['securityValue']
                            } -> ${
                                props.endpointChanges.hasOwnProperty('securityValue')
                                    ? props.processRoleList(props.endpointSecurity)
                                    : ''
                            }`}
                            </div>
                        }
                        {!props.endpointOriginalCache.hasOwnProperty('securityValue') &&
                            <div className={'text-center '} style={{display: 'flex'}}>
                                No Roles Have Access
                            </div>
                        }
                    </div>
                </div>
            </CardBody>
        </Card>
    );
}

export default ChangedEndpointInfo;