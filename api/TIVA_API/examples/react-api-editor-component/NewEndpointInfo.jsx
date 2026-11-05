import {Card, CardBody, CardHeader} from "reactstrap";
import React from "react";

const NewEndpointInfo = (props) => {
    return (
    <Card key={`new-${props.endpointID}`}
          className={props.endpointID < 0 ? 'orange-border' : 'black-border'}>
        <CardHeader style={{backgroundColor: "#00274c", color: 'white'}}>
            {props.endpointID < 0 ? 'New' : 'Existing'} Endpoint {props.endpoint['Endpoint_Name']}
        </CardHeader>
        <CardBody>
            <h2>Endpoint Details</h2>
            <div className={"box-row"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>ID</div>
                    <div
                        className={"text-center box-body"}> {props.endpointID >= 0 ? props.endpointID : 'generate'}</div>
                </div>
                <div
                    className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Description
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["Description"]}</div>
                </div>
            </div>
            <div className={"box-row"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>Request Type
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["Request_Type"]}</div>
                </div>
                <div className={`medium-box black-border`}>
                    <div className={"text-center box-header"}>Data Source
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["Connection_Name"]}</div>
                </div>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Stored
                        Procedure
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["Stored_Procedure"]}</div>
                </div>
            </div>
            <div className={"box-row"}>
                <div className={`small-box black-border`}>
                    <div className={"text-center box-header"}>Result Type
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["Result_Type"]}</div>
                </div>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>DataSet Table
                        Names
                    </div>
                    <div
                        className={'text-center box-body'}>{props.endpoint["DataSet_Table_Names"]}</div>
                </div>
            </div>
            <hr/>
            <h2>Parameter Details</h2>
            {
                !props.endpoint.hasOwnProperty('parameters') &&
                <h4>No Parameters Defined</h4>
            }
            {Object.keys(props.endpoint.hasOwnProperty('parameters') ? props.endpoint['parameters'] : []).map(parameterID =>
                <div key={`${props.endpointID}-${parameterID}`}
                     className={`box-row`}>
                    <div className={'small-box black-border'}>
                        <div className={"text-center box-header"}>Param ID</div>
                        <div className={"text-center box-body"}> {parameterID >= 0 ? parameterID : 'generated'}</div>
                    </div>
                    <div className={`param-name-box black-border`}>
                        <div className={"text-center box-header"}>Parameter Name</div>
                        <div className={"text-center box-body"}> {props.endpoint['parameters'][parameterID]['Parameter_Name']}</div>
                    </div>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Parameter Type</div>
                        <div className={"text-center box-body"}> {props.endpoint['parameters'][parameterID]['Parameter_Type']}</div>
                    </div>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Null Value</div>
                        <div className={"text-center box-body"}> {props.endpoint['parameters'][parameterID]['Null_Value']}</div>
                    </div>
                    <div className={`small-box black-border`}>
                        <div className={"text-center box-header"}>Is Optional</div>
                        <div className={"text-center box-body"}> {props.endpoint['parameters'][parameterID]['Is_Optional'].toString()}</div>
                    </div>
                </div>
            )}
            <hr/>
            <h2>Security Details</h2>
            <div className={"box-row"}>
                <div className={`large-box black-border`}>
                    <div className={"text-center box-header"}>Allowed Roles
                    </div>
                    <div className={'text-center '}
                         style={{display: 'flex'}}>{props.processRoleList(props.endpoint["securityValue"])}</div>
                </div>
            </div>
        </CardBody>
    </Card>
    );
}

export default NewEndpointInfo;