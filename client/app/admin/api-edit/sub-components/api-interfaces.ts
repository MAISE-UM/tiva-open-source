'use server'

import {DropdownOption} from "@/app/utils/interfaces";

export interface ApiDefinition {
    Endpoints: Endpoint[];
    EndpointParameters: Parameter[];
    EndpointSecurity: Security[];
    EndpointControllers: Controller[];
}

export interface Endpoint {
    Endpoint_ID: number;
    Endpoint_Name: string|null;
    Call_Type: string|null;
    Credential_Source: string|null;
    Credential_Key: string|null;
    Request_Type: string|null;
    URL_Base: string|null;
    URL: string|null;
    Stored_Procedure: string|null;
    Connection_Name: string|null;
    Result_Type: string|null;
    Allow_Anonymous: boolean|null;
    DataSet_Table_Names: string|null;
    UseParam0UserPass: boolean|null;
    Description: string|null;
}

export interface Parameter {
    Endpoint_ID: number;
    Parameter_ID: number;
    Parameter_Name: string|null;
    Parameter_Type: string|null;
    Parameter_Destination: string|null;
    Parameter_Order: number|string|null;
    Null_Value: string|null;
    Is_Optional: boolean|null;
    System_Provided: boolean|null;
    Is_User_Pass: boolean|null;
    Template: string|null;
    Delimiter: string|null;
    Parameter_Description: string|null;
}

export interface Security {
    Endpoint_ID: number;
    Security_ID: number;
    Role_ID: number|null;
    Role_Name: string;
}

export interface Controller {
    Controller_Name: string;
    Num_Endpoints: number;
}

export interface ApiEndpoint {
    Open?: boolean;
    Endpoint_ID?: number;
    Endpoint_Name?: string|null;
    Call_Type?: string|null;
    Credential_Source?: string|null;
    Credential_Key?: string|null;
    Request_Type?: string|null;
    URL_Base?: string|null;
    URL?: string|null;
    Stored_Procedure?: string|null;
    Connection_Name?: string|null;
    Result_Type?: string|null;
    Allow_Anonymous?: boolean|null;
    DataSet_Table_Names?: string|null;
    UseParam0UserPass?: boolean|null;
    Description?: string|null;
    Parameters?: {[key: number]: ApiParameter};
    SecurityValue?: DropdownOption[];
    App_Mark_Endpoint_Deletion?: boolean;
}

export interface ApiParameter {
    Endpoint_ID?: number;
    Parameter_ID?: number;
    Parameter_Name?: string|null;
    Parameter_Type?: string|null;
    Parameter_Destination?: string|null;
    Parameter_Order?: number|string|null;
    Null_Value?: string|null;
    Is_Optional?: boolean|null;
    System_Provided?: boolean|null;
    Is_User_Pass?: boolean|null;
    Template?: string|null;
    Delimiter?: string|null;
    Parameter_Description?: string|null;
    App_Mark_Parameter_Deletion?: boolean;
}