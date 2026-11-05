import React from 'react';
import ViewManager from "../../layouts/ViewManager";
import {getCurrentAPIEndpoints, getDBEndpoints, reloadDBEndpoints} from "../../../api/api-api";
import {getObjectsList, processResponse} from "../../../helpers/helpers";
import {Section, Tab, TabContainer, TabTitle} from "../../../style/General";
import {Card, CardBody, CardHeader, Collapse, Input} from "reactstrap";
import {FaArrowDown, FaArrowUp, FaTrash} from "react-icons/fa";
import "./APIEdit.css"
import Select from "react-select";
import {getUserRoles} from "../../../api/lists-api";
import {FaPlus} from "react-icons/fa";
import APIReviewView from "./APIReviewView";

class APIEditView extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            // Static Dropdowns
            paramTypes: [
                {value: 'int', label: 'int'},
                {value: 'double', label: 'double'},
                {value: 'string', label: 'string'},
                {value: 'date', label: 'date'},
                {value: 'datetime', label: 'datetime'},
            ],
            requestTypes: [
                {value: 'POST', label: 'POST'},
                {value: 'GET', label: 'GET'},
            ],
            resultTypes: [
                {value: 'data', label: 'data'},
                {value: 'dataset', label: 'dataset'},
            ],
            dataSources : [
                {value: 'DEFAULT', label: 'DEFAULT'},
            ],

            controllerErrorText: null,
            endpointErrorText: {},
            reviewErrorText: null,

            userRolesList: [],
            userRolesSelectedList: [],
            // Page State
            availableViews: ['editAPI', 'previewChanges', 'saveAPI'],
            currentView: 'editAPI', // Index of availableViews
            controllerAddText: '',
            endpointAddText: {},

            // API Definitions
            currentAPIDefinitions: null,
            dbAPIDefinitions: null,

            // Controller State
            controllerOpen: [],
            controllerMap: {},
            controllersToAdd: new Set(),
            controllersToModify: {},
            controllersOriginalCache: {},


            // Endpoint State
            endpointOpen: {},
            endpointMap: {},
            activeEndpointMap: {},
            endpointNameToIDMap: {},
            endpointControllerMapping: {},
            activeEndpointControllerMapping: {},
            newEndpointID: -1,


            // Parameter State
            endpointParameterMapping: {},
            newParameterID: -1,

            // Security State
            endpointSecurityMapping: {},

        };
    }

    async componentDidMount() {
        await getDBEndpoints().then((response) => {
            response = processResponse(response);
            const {oReturnObject: dbAPIDefinitions} = response;
            this.setState({dbAPIDefinitions, dbAPIDefinitionsMaster: dbAPIDefinitions});
            this.handleDataProcessing(dbAPIDefinitions);
        })
        await getCurrentAPIEndpoints().then((response) => {
            response = processResponse(response);
            const {oReturnObject: currentAPIDefinitions} = response;
            this.setState({currentAPIDefinitions});
        })

        await getUserRoles().then((response) => {
            response = processResponse(response);
            const userRolesList = getObjectsList(response).map((userRole) => {
                return { label: userRole.Role_Name, value: userRole.Role_ID };
            });
            this.setState({userRolesList});
        });
    }

    handleDataProcessing = (APIDefinitions) => {
        let controllerOpen = [];
        let controllerMap = {};
        let endpointControllerMapping = {}
        APIDefinitions["EndpointControllers"].forEach((controller, index) => {
            controllerOpen.push(false);
            controllerMap[controller["Controller_Name"]] = index;
            endpointControllerMapping[controller["Controller_Name"]] = [];
        });

        let endpointOpen = {};
        let endpointMap = {};
        let endpointNameToIDMap = {};
        let endpointParameterMapping = {};
        let endpointSecurityMapping = {};
        APIDefinitions["Endpoints"].forEach((endpoint, index) => {
            if(endpoint["DataSet_Table_Names"] === null) endpoint["DataSet_Table_Names"] = 'null'
            endpointOpen[index] = (false);
            endpointMap[endpoint["Endpoint_Name"]] = index;
            const controllerName = endpoint["Endpoint_Name"].substring(0, endpoint["Endpoint_Name"].indexOf('/'));
            endpointControllerMapping[controllerName].push(endpoint);
            endpointNameToIDMap[endpoint["Endpoint_Name"]] = endpoint["Endpoint_ID"];
            endpointParameterMapping[endpoint["Endpoint_ID"]] = [];
            endpointSecurityMapping[endpoint["Endpoint_ID"]] = [];
        });

        APIDefinitions["EndpointParameters"].forEach((parameter) => {
            if(parameter["Null_Value"] === null) parameter["Null_Value"] = 'null';
            endpointParameterMapping[parameter["Endpoint_ID"]].push(parameter);
        })

        APIDefinitions["EndpointSecurity"].forEach((security) => {
            endpointSecurityMapping[security["Endpoint_ID"]].push({label: security["Role_Name"], value: security["Role_ID"]})
        })

        this.setState({controllerOpen, endpointOpen, controllerMap, endpointMap, endpointNameToIDMap,
            endpointControllerMapping, endpointParameterMapping, endpointSecurityMapping});
    }

    toggleController = (controller, index) => {
        let {controllerOpen, endpointControllerMapping, activeEndpointControllerMapping} = this.state;
        controllerOpen[index] = !controllerOpen[index]

        if(!controllerOpen[index] && activeEndpointControllerMapping.hasOwnProperty(controller)) {
            endpointControllerMapping[controller] = activeEndpointControllerMapping[controller];
            delete activeEndpointControllerMapping[controller];
        } else {
            activeEndpointControllerMapping[controller] = endpointControllerMapping[controller];
        }

        this.setState({controllerOpen, endpointControllerMapping, activeEndpointControllerMapping});
    }

    toggleEndpoint = (endpoint) => {
        let {endpointOpen, endpointMap, activeEndpointMap} = this.state;
        endpointOpen[endpointMap[endpoint["Endpoint_Name"]]] = !endpointOpen[endpointMap[endpoint["Endpoint_Name"]]]

        if(!endpointOpen[endpointMap[endpoint["Endpoint_Name"]]] && activeEndpointMap.hasOwnProperty(endpoint["Endpoint_Name"])) {
            endpointMap[endpoint["Endpoint_Name"]] = activeEndpointMap[endpoint["Endpoint_Name"]];
            delete activeEndpointMap[endpoint["Endpoint_Name"]];
        } else {
            activeEndpointMap[endpoint["Endpoint_Name"]] = endpointMap[endpoint["Endpoint_Name"]];
        }

        this.setState({endpointOpen, endpointMap, activeEndpointMap});
    }

    changeSecurityValue = (endpointID, controllerName, securityValue) => {
        securityValue = securityValue === null ? [] : securityValue;
        let {endpointSecurityMapping, controllersToAdd, controllersToModify, controllersOriginalCache} = this.state;

        if (!controllersOriginalCache.hasOwnProperty(controllerName)) {
            controllersOriginalCache[controllerName] = {}
        }

        if (!controllersOriginalCache[controllerName].hasOwnProperty(endpointID)) {
            (controllersOriginalCache[controllerName])[endpointID] = {}
        }

        // Cache Original Value for Comparison
        if (!controllersOriginalCache[controllerName][endpointID].hasOwnProperty('securityValue')) {
            controllersOriginalCache[controllerName][endpointID]['securityValue'] = endpointSecurityMapping[endpointID];
        }

        // Determine whether to show field is edited
        if (JSON.stringify(controllersOriginalCache[controllerName][endpointID]['securityValue']) === JSON.stringify(securityValue)) {
            // Field if not updated
            if (controllersToModify.hasOwnProperty(controllerName)) {
                if (controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if (controllersToModify[controllerName][endpointID].hasOwnProperty('securityValue')) {
                        delete controllersToModify[controllerName][endpointID]['securityValue'];
                    }
                    if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                        delete controllersToModify[controllerName][endpointID];
                    }
                    if (Object.keys(controllersToModify[controllerName]).length === 0) {
                        delete controllersToModify[controllerName];
                    }
                }
            }
        } else {
            if (!controllersToModify.hasOwnProperty(controllerName)) {
                controllersToModify[controllerName] = {};
            }
            if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                controllersToModify[controllerName][endpointID] = {};
            }
            controllersToModify[controllerName][endpointID]['securityValue'] = securityValue;
        }
        // Override Current Value
        endpointSecurityMapping[endpointID] = securityValue;

        this.setState({ endpointSecurityMapping, controllersOriginalCache, controllersToModify, controllersToAdd });
    };

    changeEndpointValue = (value, endpointID, controllerName, endpointVarName) => {
        let {activeEndpointControllerMapping, controllersToAdd, controllersToModify, controllersOriginalCache} = this.state;

        let index = activeEndpointControllerMapping[controllerName].findIndex(elem => endpointID === elem["Endpoint_ID"]);

        // Cache Original Value for Comparison
        if (!controllersOriginalCache.hasOwnProperty(controllerName)) {
            controllersOriginalCache[controllerName] = {}
        }
        if (!controllersOriginalCache[controllerName].hasOwnProperty(endpointID)) {
            (controllersOriginalCache[controllerName])[endpointID] = {}
        }
        if (!controllersOriginalCache[controllerName][endpointID].hasOwnProperty(endpointVarName)) {
            controllersOriginalCache[controllerName][endpointID][endpointVarName] = ((activeEndpointControllerMapping[controllerName])[index])[endpointVarName];
        }

        let originalValue = controllersOriginalCache[controllerName][endpointID][endpointVarName];

        if(value === originalValue) {
            // Value is not changed
            if (controllersToModify.hasOwnProperty(controllerName)) {
                if (controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if (controllersToModify[controllerName][endpointID].hasOwnProperty(endpointVarName)) {
                        delete controllersToModify[controllerName][endpointID][endpointVarName];
                    }
                    if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                        delete controllersToModify[controllerName][endpointID];
                    }
                    if (Object.keys(controllersToModify[controllerName]).length === 0) {
                        delete controllersToModify[controllerName];
                    }
                }
            }
        } else {
            // Value Changed Add/Update controllersToModify
            if (!controllersToModify.hasOwnProperty(controllerName)) {
                controllersToModify[controllerName] = {};
            }
            if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                controllersToModify[controllerName][endpointID] = {};
            }
            controllersToModify[controllerName][endpointID][endpointVarName] = value;
        }

        ((activeEndpointControllerMapping[controllerName])[index])[endpointVarName] = value;
        this.setState({activeEndpointControllerMapping, controllersToAdd, controllersToModify, controllersOriginalCache});
    }

    addParameter = (endpointID, controllerName) => {
        // Endpoint Already Exists
        let {controllersToModify, endpointParameterMapping, newParameterID} = this.state;

        let numParams = endpointParameterMapping[endpointID].length + 1;

        let paramObj = {};
        paramObj["Endpoint_ID"] = endpointID;
        paramObj["Parameter_ID"] = "generate";
        paramObj["Parameter_Name"] = '';
        paramObj["Parameter_Type"] = 'string';
        paramObj["Is_Optional"] = false;
        paramObj["Null_Value"] = 'null';

        if (!controllersToModify.hasOwnProperty(controllerName)) {
            controllersToModify[controllerName] = {};
        }
        if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
            controllersToModify[controllerName][endpointID] = {};
        }
        if (!controllersToModify[controllerName][endpointID].hasOwnProperty('parameters')) {
            controllersToModify[controllerName][endpointID]['parameters'] = {};
        }

        let newID = newParameterID;
        --newParameterID;

        paramObj["Parameter_Order"] = numParams + Object.keys(controllersToModify[controllerName][endpointID]['parameters']).filter((elem=> elem["Parameter_ID"] < 0)).length;
        paramObj["Parameter_ID"] = newID;
        controllersToModify[controllerName][endpointID]['parameters'][newID] = paramObj;

        this.setState({controllersToModify, newParameterID})

    }

    markControllerDelete = (clickEvent, controllerName) => {
        clickEvent.stopPropagation();
        let {controllersToModify, endpointControllerMapping} = this.state;

        if(Object.keys(endpointControllerMapping).some(elem => elem === controllerName)) {
            if(controllersToModify.hasOwnProperty(controllerName)) {
                if(controllersToModify[controllerName].hasOwnProperty('app_mark_controller_deletion')) {
                    delete controllersToModify[controllerName]['app_mark_controller_deletion'];
                    if (Object.keys(controllersToModify[controllerName]).length === 0) {
                        delete controllersToModify[controllerName];
                    }
                    this.setState({controllersToModify});
                    return;
                }
            }
            if (!controllersToModify.hasOwnProperty(controllerName)) {
                controllersToModify[controllerName] = {};
            }
            controllersToModify[controllerName]['app_mark_controller_deletion'] = {};
            this.setState({controllersToModify});
        }
    }

    markEndpointDelete = (clickEvent, controllerName, endpointID) => {
        clickEvent.stopPropagation();
        let {controllersToModify, dbAPIDefinitions} = this.state;

        if(controllersToModify.hasOwnProperty(controllerName)) {
            if(controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                if(controllersToModify[controllerName][endpointID].hasOwnProperty('app_mark_endpoint_deletion')) {
                    delete controllersToModify[controllerName][endpointID]['app_mark_endpoint_deletion'];
                    if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                        delete controllersToModify[controllerName][endpointID];
                    }
                    if (Object.keys(controllersToModify[controllerName]).length === 0) {
                        delete controllersToModify[controllerName];
                    }
                    this.setState({controllersToModify});
                    return;
                }
            }
        }
        if (!controllersToModify.hasOwnProperty(controllerName)) {
            controllersToModify[controllerName] = {};
        }
        if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
            controllersToModify[controllerName][endpointID] = {};
        }
        controllersToModify[controllerName][endpointID]['app_mark_endpoint_deletion'] = {};
        this.setState({controllersToModify});
    }

    markParamDelete = (endpointID, parameterID, controllerName) => {
        if(parameterID < 0) {
            let {controllersToModify} = this.state;
            if(controllersToModify[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                delete controllersToModify[controllerName][endpointID]['parameters'][parameterID]
            }
            if (Object.keys(controllersToModify[controllerName][endpointID]['parameters']).length === 0) {
                delete controllersToModify[controllerName][endpointID]['parameters'];
            }
            if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                delete controllersToModify[controllerName][endpointID];
            }
            if (Object.keys(controllersToModify[controllerName]).length === 0) {
                delete controllersToModify[controllerName];
            }
            this.setState({controllersToModify});
        } else {
            let {controllersToModify} = this.state;

            if(controllersToModify.hasOwnProperty(controllerName)) {
                if(controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    if(controllersToModify[controllerName][endpointID].hasOwnProperty('parameters')) {
                        if(controllersToModify[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                            if(controllersToModify[controllerName][endpointID]['parameters'][parameterID].hasOwnProperty('app_mark_param_deletion')) {
                                delete controllersToModify[controllerName][endpointID]['parameters'][parameterID]['app_mark_param_deletion'];
                                if (Object.keys(controllersToModify[controllerName][endpointID]['parameters'][parameterID]).length === 0) {
                                    delete controllersToModify[controllerName][endpointID]['parameters'][parameterID];
                                }
                                if (Object.keys(controllersToModify[controllerName][endpointID]['parameters']).length === 0) {
                                    delete controllersToModify[controllerName][endpointID]['parameters'];
                                }
                                if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                                    delete controllersToModify[controllerName][endpointID];
                                }
                                if (Object.keys(controllersToModify[controllerName]).length === 0) {
                                    delete controllersToModify[controllerName];
                                }
                                // If delete undone then return else mark deleted
                                this.setState({controllersToModify});
                                return;
                            }
                        }
                    }
                }
            }

            if (!controllersToModify.hasOwnProperty(controllerName)) {
                controllersToModify[controllerName] = {};
            }
            if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                controllersToModify[controllerName][endpointID] = {};
            }
            if (!controllersToModify[controllerName][endpointID].hasOwnProperty('parameters')) {
                controllersToModify[controllerName][endpointID]['parameters'] = {};
            }
            if (!controllersToModify[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                controllersToModify[controllerName][endpointID]['parameters'][parameterID] = {};
            }
            controllersToModify[controllerName][endpointID]['parameters'][parameterID]['app_mark_param_deletion'] = true;
            this.setState({controllersToModify});
        }
    }

    changeParameterValue = (value, controllerName, endpointID, parameterID, parameterVarName) => {
        let {endpointParameterMapping, controllersToAdd, controllersToModify, controllersOriginalCache} = this.state;

        if(parameterID < 0) {
            // In controllersToModify
            controllersToModify[controllerName][endpointID]['parameters'][parameterID][parameterVarName] = value;
            this.setState({controllersToModify});
        } else {
            let index = endpointParameterMapping[endpointID].findIndex(elem => parameterID === elem["Parameter_ID"]);

            // Cache Work
            if (!controllersOriginalCache.hasOwnProperty(controllerName)) {
                controllersOriginalCache[controllerName] = {}
            }
            if (!controllersOriginalCache[controllerName].hasOwnProperty(endpointID)) {
                controllersOriginalCache[controllerName][endpointID] = {}
            }
            if (!controllersOriginalCache[controllerName][endpointID].hasOwnProperty('parameters')) {
                controllersOriginalCache[controllerName][endpointID]['parameters'] = {}
            }
            if (!controllersOriginalCache[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                controllersOriginalCache[controllerName][endpointID]['parameters'][parameterID] = {}
            }
            if (!controllersOriginalCache[controllerName][endpointID]['parameters'][parameterID].hasOwnProperty(parameterVarName)) {
                controllersOriginalCache[controllerName][endpointID]['parameters'][parameterID][parameterVarName] = ((endpointParameterMapping[endpointID])[index])[parameterVarName];
            }
            let originalValue = controllersOriginalCache[controllerName][endpointID]['parameters'][parameterID][parameterVarName];

            if(value === originalValue) {
                // Value Unchanged Remove from controllersToModify if Present
                // Value is not changed
                if (controllersToModify.hasOwnProperty(controllerName)) {
                    if (controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                        if (controllersToModify[controllerName][endpointID].hasOwnProperty('parameters')) {
                            if (controllersToModify[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                                if (controllersToModify[controllerName][endpointID]['parameters'][parameterID].hasOwnProperty(parameterVarName)) {
                                    delete controllersToModify[controllerName][endpointID]['parameters'][parameterID][parameterVarName];
                                    if (Object.keys(controllersToModify[controllerName][endpointID]['parameters'][parameterID]).length === 0) {
                                        delete controllersToModify[controllerName][endpointID]['parameters'][parameterID];
                                    }
                                    if (Object.keys(controllersToModify[controllerName][endpointID]['parameters']).length === 0) {
                                        delete controllersToModify[controllerName][endpointID]['parameters'];
                                    }
                                    if (Object.keys(controllersToModify[controllerName][endpointID]).length === 0) {
                                        delete controllersToModify[controllerName][endpointID];
                                    }
                                    if (Object.keys(controllersToModify[controllerName]).length === 0) {
                                        delete controllersToModify[controllerName];
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                // Value Changed Add/Update controllersToModify
                if (!controllersToModify.hasOwnProperty(controllerName)) {
                    controllersToModify[controllerName] = {};
                }
                if (!controllersToModify[controllerName].hasOwnProperty(endpointID)) {
                    controllersToModify[controllerName][endpointID] = {};
                }
                if (!controllersToModify[controllerName][endpointID].hasOwnProperty('parameters')) {
                    controllersToModify[controllerName][endpointID]['parameters'] = {};
                }
                if (!controllersToModify[controllerName][endpointID]['parameters'].hasOwnProperty(parameterID)) {
                    controllersToModify[controllerName][endpointID]['parameters'][parameterID] = {};
                }
                controllersToModify[controllerName][endpointID]['parameters'][parameterID][parameterVarName] = value;
            }

            ((endpointParameterMapping[endpointID])[index])[parameterVarName] = value;
            this.setState({endpointParameterMapping, controllersToAdd, controllersToModify, controllersOriginalCache});
        }
    }

    onControllerAddChange = (newValue) => {
        this.setState({controllerAddText: newValue.target.value})
    }

    handleControllerAdd = () => {
        const {controllerAddText, endpointControllerMapping, controllersToAdd} = this.state;
        if(controllerAddText.search(' ') >= 0 || controllerAddText === '' || controllerAddText[0] !== controllerAddText[0].toUpperCase()) {
            this.setState({controllerErrorText: 'Controller name must start with a capital and have no spaces'})
        } else {
            if(Object.keys(endpointControllerMapping).filter((controller)=>controllerAddText===controller)[0] === undefined) {
                endpointControllerMapping[controllerAddText] = [];
                controllersToAdd.add(controllerAddText);
                this.setState({endpointControllerMapping, controllersToAdd})
            } else {
                this.setState({controllerErrorText: 'Controller name must be unique'});
            }
        }
    }

    onEndpointAddChange = (newValue, controller) => {
        let {endpointAddText} = this.state;
        endpointAddText[controller] = newValue.target.value;
        this.setState({endpointAddText});
    }

    handleEndpointAdd = (event, controller) => {
        let {endpointAddText, endpointControllerMapping, endpointParameterMapping, endpointSecurityMapping,
            newEndpointID, controllersToModify, endpointErrorText, endpointOpen, endpointMap} = this.state;
        if(endpointAddText[controller].search(' ') >= 0 || endpointAddText[controller] === ''
                || endpointAddText[controller][0] !== endpointAddText[controller][0].toUpperCase()
                || endpointAddText[controller].search('/') >= 0) {
            endpointErrorText[controller] = 'Endpoint name must start with a capital, have no spaces, and cannot contain any /';
            this.setState({endpointErrorText})
        } else {
            if(Object.values(endpointControllerMapping[controller]).filter((controllerValue)=>controller + '/'
                                + endpointAddText[controller]===controllerValue['Endpoint_Name']).length === 0) {
                const newEndpoint = {
                    Connection_Name: 'DEFAULT',
                    DataSet_Table_Names: 'null',
                    Description: '',
                    Endpoint_ID: newEndpointID,
                    Endpoint_Name: controller + '/' + endpointAddText[controller],
                    Request_Type: 'POST',
                    Result_Type: 'data',
                    Stored_Procedure: ''
                };
                if(!controllersToModify.hasOwnProperty(controller)) {
                    controllersToModify[controller] = {}
                }
                endpointControllerMapping[controller].push(newEndpoint);
                controllersToModify[controller][newEndpointID] = newEndpoint;
                endpointParameterMapping[newEndpointID] = [];
                endpointSecurityMapping[newEndpointID] = [];
                endpointOpen[newEndpointID] = true;
                endpointMap[newEndpoint['Endpoint_Name']] = newEndpointID
                --newEndpointID;
                this.setState({endpointControllerMapping, newEndpointID, controllersToModify,
                    endpointParameterMapping, endpointSecurityMapping, endpointOpen, endpointMap});
            } else {
                endpointErrorText[controller] = 'Endpoint name must be unique to a controller';
                this.setState({endpointErrorText})
            }
        }
    }

    triggerReview = () => {
        const {controllersToModify, controllersToAdd, activeEndpointControllerMapping,
            endpointControllerMapping, availableViews} = this.state;
        if(Object.keys(controllersToModify).length === 0 && controllersToAdd.size === 0) {
            this.setState({reviewErrorText: 'No Changes have been made'});
            return
        }

        Object.keys(activeEndpointControllerMapping).forEach(controller => {
            endpointControllerMapping[controller] = activeEndpointControllerMapping[controller];
        })

        this.setState({currentView: availableViews[1], endpointControllerMapping});
    }

    triggerAPIEdit = () => {
        const {availableViews} = this.state;
        this.setState({currentView: availableViews[0]});
    }

    triggerAPISave = () => {
        const {availableViews} = this.state;
        this.setState({currentView: availableViews[0]});
    }

    triggerAPIReload = () => {
        reloadDBEndpoints().then(() => {console.log('api reloaded')})
    }

    render() {
        const {controllerOpen, endpointOpen, endpointMap, activeEndpointControllerMapping, endpointControllerMapping,
            endpointParameterMapping, endpointSecurityMapping, userRolesList, controllersToModify, controllersToAdd,
            paramTypes, resultTypes, requestTypes, dataSources, controllerAddText, endpointAddText, controllerErrorText,
            endpointErrorText, reviewErrorText, availableViews, currentView, controllersOriginalCache
        } = this.state;

        return (
            <ViewManager
                viewContent={
                    <>
                        { currentView === availableViews[0] &&
                            <>
                            <Section>
                                <TabContainer>
                                    <Tab active={'true'}>
                                        <TabTitle>API Editor</TabTitle>
                                    </Tab>
                                </TabContainer>
                            </Section>
                            <Section>
                                <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                                    <h2>Hot Buttons</h2>
                                    <div style={{display: 'flex', justifyContent: 'center'}}>
                                        <button className={'btn btn-primary'} onClick={this.triggerAPIReload}>Reload API From DB</button>
                                        <button style={{marginLeft : '1rem'}} onClick={() => window.location.reload()} className={'btn btn-primary'}>Reload Page From DB</button>
                                    </div>
                                </div>
                            </Section>
                            <Section>
                                <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                                    <h2>Instructions</h2>
                                    <p style={{textAlign: "left"}}>
                                        Edit the API by expanding a given controller and either modifying a given endpoint
                                        inside the controller or adding a new one. An object with a orange border implies
                                        that it has been changed, red implies that it has been changed in an incorrect way.
                                        When done editing click the Review button to review changes.
                                    </p>
                                </div>
                            </Section>
                            <Section>
                                <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                                    <h2>Edit API</h2>
                                    <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
                                        <input value={controllerAddText} onChange={this.onControllerAddChange} style={{marginRight: '1rem'}}/>
                                        <button onClick={this.handleControllerAdd} className={'btn btn-primary'}>Add Controller</button>
                                    </div>
                                    <div style={{backgroundColor: 'red', marginBottom: '1rem'}}>{controllerErrorText}</div>
                                    {
                                        endpointControllerMapping != null && Object.keys(endpointControllerMapping).map((controller, index) =>
                                            <Card
                                                key={index}
                                                className={ `${controllersToModify.hasOwnProperty(controller) || controllersToAdd.has(controller) ?  'orange-border ' : 'black-border ' }
                                                    ${controllersToModify.hasOwnProperty(controller) && controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion') ? 'line-through' : ''}
                                                `}
                                                style={{marginBottom: '1.5rem'}}
                                            >
                                                <CardHeader onClick={() => this.toggleController(controller, index)} style={{backgroundColor: "#00274c", color: 'white'}}>
                                                    {controller} Controller
                                                    {controllerOpen[index] &&
                                                    <>
                                                        <div style={{float: 'left'}}>
                                                            <FaArrowDown />
                                                            <FaArrowDown />
                                                        </div>
                                                        <div style={{float: 'right'}}>
                                                            <button
                                                                onClick={(clickEvent) => this.markControllerDelete(clickEvent, controller)}
                                                                className={'btn btn-danger delete-button'}
                                                            >
                                                                Delete Controller
                                                            </button>
                                                            <FaArrowDown />
                                                            <FaArrowDown />
                                                        </div>
                                                    </>
                                                    }
                                                    {!controllerOpen[index] &&
                                                    <>

                                                        <div style={{float: 'left'}}>
                                                            <FaArrowUp />
                                                            <FaArrowUp />
                                                        </div>
                                                        <div style={{float: 'right'}}>
                                                            <button
                                                                onClick={(clickEvent) => this.markControllerDelete(clickEvent, controller)}
                                                                className={'btn btn-danger delete-button'}
                                                            >
                                                                Delete Controller
                                                            </button>
                                                            <FaArrowUp />
                                                            <FaArrowUp />
                                                        </div>
                                                    </>
                                                    }
                                                </CardHeader>
                                                <Collapse isOpen={controllerOpen[index]}>
                                                    <CardBody className={controllersToModify.hasOwnProperty(controller) && controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion') ? 'line-through-disable' : ''}>
                                                        <div style={{display: 'flex', justifyContent: 'center', marginBottom: '1rem'}}>
                                                            <p style={{margin: 'auto 0', marginRight: '0.2rem'}}>{controller + '/'}</p>
                                                            <input value={endpointAddText[controller]} onChange={(e) => this.onEndpointAddChange(e, controller)} style={{marginRight: '1rem'}}/>
                                                            <button onClick={(e) => this.handleEndpointAdd(e, controller)} className={'btn btn-primary'}>Add Endpoint</button>
                                                        </div>
                                                        <div style={{backgroundColor: 'red', marginBottom: '1rem'}}>{endpointErrorText[controller]}</div>
                                                        {
                                                            activeEndpointControllerMapping[controller] !== undefined && activeEndpointControllerMapping[controller].map((endpoint) =>
                                                                <Card
                                                                    key={endpoint["Endpoint_Name"]}
                                                                    className={`${
                                                                        controllersToModify.hasOwnProperty(controller) &&
                                                                        controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"])
                                                                            ?  'orange-border ' : 'black-border '}
                                                                        ${
                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('app_mark_endpoint_deletion') 
                                                                                ? 'line-through' : ''}`}
                                                                    style={{marginBottom: '1.5rem'}}>
                                                                    <CardHeader
                                                                        onClick={() => this.toggleEndpoint(endpoint)}
                                                                        style={{backgroundColor: "#00274c", color: 'white'}}>
                                                                        Endpoint {endpoint["Endpoint_Name"]}
                                                                        { endpointOpen[endpointMap[endpoint["Endpoint_Name"]]] &&
                                                                        <>
                                                                            <div style={{float: 'left'}}><FaArrowDown /><FaArrowDown /></div>
                                                                            <div style={{float: 'right'}}>
                                                                                <button
                                                                                    onClick={(clickEvent) => this.markEndpointDelete(clickEvent, controller, endpoint['Endpoint_ID'])}
                                                                                    className={'btn btn-danger delete-button'}
                                                                                >
                                                                                    Delete Endpoint
                                                                                </button>
                                                                                <FaArrowDown />
                                                                                <FaArrowDown />
                                                                            </div>
                                                                        </>
                                                                        }
                                                                        {!endpointOpen[endpointMap[endpoint["Endpoint_Name"]]] &&
                                                                        <>
                                                                            <div style={{float: 'left'}}><FaArrowUp /><FaArrowUp /></div>
                                                                            <div style={{float: 'right'}}>
                                                                                <button
                                                                                    onClick={(clickEvent) => this.markEndpointDelete(clickEvent, controller, endpoint['Endpoint_ID'])}
                                                                                    className={'btn btn-danger delete-button'}
                                                                                >
                                                                                    Delete Endpoint
                                                                                </button>
                                                                                <FaArrowUp />
                                                                                <FaArrowUp />
                                                                            </div>
                                                                        </>
                                                                        }
                                                                    </CardHeader>
                                                                    <Collapse isOpen={endpointOpen[endpointMap[endpoint["Endpoint_Name"]]]}>
                                                                        <Card>
                                                                            <CardBody className={controllersToModify.hasOwnProperty(controller) && controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) && controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('app_mark_endpoint_deletion') ? 'line-through-disable' : ''}>
                                                                                <h2>Endpoint Details</h2>
                                                                                <div className={"box-row"}>
                                                                                    <div className={`small-box black-border`}>
                                                                                        <div className={"text-center box-header"}>ID</div>
                                                                                        <div className={"text-center box-body"}> {endpoint["Endpoint_ID"] >= 0 ? endpoint["Endpoint_ID"] : 'generate'}</div>
                                                                                    </div>
                                                                                    <div
                                                                                        className={`large-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("Description") 
                                                                                                ? 'orange-border' : 'black-border'}`}>
                                                                                        <div className={"text-center box-header"}>Description</div>
                                                                                        <Input className={'input-center'} value={endpoint["Description"]} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "Description")}/>
                                                                                    </div>
                                                                                </div>
                                                                                <div className={"box-row"}>
                                                                                    <div
                                                                                        className={`small-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("Request_Type") 
                                                                                                ? 'orange-border' : 'black-border'}`}>
                                                                                        <div className={"text-center box-header"}>Request Type</div>
                                                                                        <select className={'form-control'} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "Request_Type")}>
                                                                                            {requestTypes.map((param) => <option key={param.value} className={'input-center'} selected={param.value===endpoint["Request_Type"]} value={param.value}>{param.label}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                    <div
                                                                                        className={`medium-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("Connection_Name")
                                                                                                ? 'orange-border' : 'black-border'}`}>
                                                                                        <div className={"text-center box-header"}>Data Source</div>
                                                                                        <select className={'form-control'} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "Connection_Name")}>
                                                                                            {dataSources.map((param) => <option key={param.value} className={'input-center'} selected={param.value===endpoint["Connection_Name"]} value={param.value}>{param.label}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                    <div
                                                                                        className={`large-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("Stored_Procedure") 
                                                                                                ? 'orange-border' : 'black-border'}`
                                                                                        }>
                                                                                        <div className={"text-center box-header"}>Stored Procedure</div>
                                                                                        <Input className={'input-center'} value={endpoint["Stored_Procedure"]} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "Stored_Procedure")}/>
                                                                                    </div>
                                                                                </div>
                                                                                <div className={"box-row"}>
                                                                                    <div
                                                                                        className={`small-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("Result_Type")
                                                                                                ? 'orange-border' : 'black-border'}`
                                                                                        }>
                                                                                        <div className={"text-center box-header"}>Result Type</div>
                                                                                        <select className={'form-control'} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "Result_Type")}>
                                                                                            {resultTypes.map((param) => <option key={param.value} className={'input-center'} selected={param.value===endpoint["Result_Type"]} value={param.value}>{param.label}</option>)}
                                                                                        </select>
                                                                                    </div>
                                                                                    <div
                                                                                        className={`large-box ${
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty("DataSet_Table_Names") 
                                                                                                ? 'orange-border' : 'black-border'}`
                                                                                        }>
                                                                                        <div className={"text-center box-header"}>DataSet Table Names</div>
                                                                                        <Input className={'input-center'} value={endpoint["DataSet_Table_Names"]} onChange={(e) => this.changeEndpointValue(e.target.value, endpoint["Endpoint_ID"], controller, "DataSet_Table_Names")}/>
                                                                                    </div>
                                                                                </div>
                                                                                <hr />
                                                                                <h2>Parameter Details</h2>
                                                                                <div><button onClick={((() => this.addParameter(endpoint["Endpoint_ID"], controller)))} className={'btn btn-primary'} style={{margin: '0 auto'}}><FaPlus />Add Parameter</button></div>
                                                                                {
                                                                                    endpointParameterMapping[endpoint["Endpoint_ID"]] != null &&
                                                                                    endpointParameterMapping[endpoint["Endpoint_ID"]].concat(
                                                                                        controllersToModify.hasOwnProperty(controller) &&
                                                                                        controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                        controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters')
                                                                                            ? Object.values(Object.fromEntries(Object.entries(controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters']).filter(([key])=>key < 0))) : []
                                                                                        ).sort((a,b)=>a["Parameter_Order"]-b["Parameter_Order"])
                                                                                        .map((parameter, index2) =>
                                                                                            <div key={`${endpoint["Endpoint_ID"]}-${parameter["Parameter_ID"]}-${index2}`} className={`box-row${
                                                                                                (controllersToModify.hasOwnProperty(controller) &&
                                                                                                controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('app_mark_param_deletion')) || parameter["Parameter_ID"] < 0
                                                                                                    ? ' orange-border' : ''
                                                                                            }${
                                                                                                controllersToModify.hasOwnProperty(controller) &&
                                                                                                controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('app_mark_param_deletion')
                                                                                                    ? ' line-through' : ''
                                                                                            }`}>
                                                                                                <div className={'mini-box black-border'}>
                                                                                                    <div className={"text-center box-header"}>Param ID</div>
                                                                                                    <div className={"text-center box-body"}> {parameter["Parameter_ID"] >= 0 ? parameter["Parameter_ID"] : 'generated'}</div>
                                                                                                </div>
                                                                                                <div className={`param-name-box ${
                                                                                                    controllersToModify.hasOwnProperty(controller) &&
                                                                                                    controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('Parameter_Name') &&
                                                                                                    parameter["Parameter_ID"] >= 0
                                                                                                        ? 'orange-border' : 'black-border'}`}>
                                                                                                    <div className={"text-center box-header"}>Parameter Name</div>
                                                                                                    <Input className={'input-center'} value={parameter["Parameter_Name"]} onChange={(e) => this.changeParameterValue(e.target.value, controller, endpoint["Endpoint_ID"], parameter["Parameter_ID"], "Parameter_Name")}/>
                                                                                                </div>
                                                                                                <div className={`small-box ${
                                                                                                    controllersToModify.hasOwnProperty(controller) &&
                                                                                                    controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('Parameter_Type') &&
                                                                                                    parameter["Parameter_ID"] >= 0
                                                                                                        ? 'orange-border' : 'black-border'}`}>
                                                                                                    <div className={"text-center box-header"}>Param Type</div>
                                                                                                    <select className={'form-control'} onChange={(e) => this.changeParameterValue(e.target.value, controller, endpoint["Endpoint_ID"], parameter["Parameter_ID"], "Parameter_Type")}>
                                                                                                        {paramTypes.map((param) => <option key={param.value} className={'input-center'} selected={param.value===parameter["Parameter_Type"]} value={param.value}>{param.label}</option>)}
                                                                                                    </select>
                                                                                                </div>
                                                                                                <div className={`mini-box ${
                                                                                                    controllersToModify.hasOwnProperty(controller) &&
                                                                                                    controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('Null_Value') &&
                                                                                                    parameter["Parameter_ID"] >= 0
                                                                                                        ? 'orange-border' : 'black-border'}`}>
                                                                                                    <div className={"text-center box-header"}>Null Value</div>
                                                                                                    <Input className={'input-center'} value={parameter["Null_Value"]} onChange={(e) => this.changeParameterValue(e.target.value, controller, endpoint["Endpoint_ID"], parameter["Parameter_ID"], "Null_Value")}/>
                                                                                                </div>
                                                                                                <div className={`mini-box ${
                                                                                                    controllersToModify.hasOwnProperty(controller) &&
                                                                                                    controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('parameters') &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'].hasOwnProperty(parameter["Parameter_ID"]) &&
                                                                                                    controllersToModify[controller][endpoint["Endpoint_ID"]]['parameters'][parameter["Parameter_ID"]].hasOwnProperty('Is_Optional') &&
                                                                                                    parameter["Parameter_ID"] >= 0
                                                                                                        ? 'orange-border' : 'black-border'}`}>
                                                                                                    <div className={"text-center box-header"}>Is Optional</div>
                                                                                                    <div className={"text-center box-body"}>
                                                                                                        <button
                                                                                                            onClick={() => this.changeParameterValue(
                                                                                                                !parameter["Is_Optional"],
                                                                                                                controller,
                                                                                                                endpoint["Endpoint_ID"],
                                                                                                                parameter["Parameter_ID"],
                                                                                                                "Is_Optional")}
                                                                                                            style={{margin: '0 auto', padding: '0rem 0.75rem'}}
                                                                                                            className={"btn btn-primary"}>
                                                                                                            {parameter["Is_Optional"] == null ? 'null' : parameter["Is_Optional"] ? 'true' : 'false'}
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className={'mini-box black-border'}>
                                                                                                    <div className={"text-center box-header"}>Delete</div>
                                                                                                    <div className={"text-center box-body"}>
                                                                                                        <button
                                                                                                            onClick={() => this.markParamDelete(
                                                                                                                endpoint["Endpoint_ID"],
                                                                                                                parameter["Parameter_ID"],
                                                                                                                controller)
                                                                                                            }
                                                                                                            style={{margin: '0 auto'}}
                                                                                                            className={"btn btn-primary"}>
                                                                                                            <FaTrash />
                                                                                                        </button>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                }
                                                                                <hr />
                                                                                <h2>Security Details</h2>
                                                                                {
                                                                                    endpointSecurityMapping[endpoint["Endpoint_ID"]] != null &&
                                                                                    <div className={"box-row"}>
                                                                                        <div className={
                                                                                            controllersToModify.hasOwnProperty(controller) &&
                                                                                            controllersToModify[controller].hasOwnProperty(endpoint["Endpoint_ID"]) &&
                                                                                            controllersToModify[controller][endpoint["Endpoint_ID"]].hasOwnProperty('securityValue')
                                                                                                ? 'security-box orange-border' : 'security-box black-border'
                                                                                        }>
                                                                                            <div className={"text-center box-header"}>Roles with Access</div>
                                                                                            <Select
                                                                                                isMulti
                                                                                                options={userRolesList}
                                                                                                name='userRolesList'
                                                                                                onChange={this.changeSecurityValue.bind(
                                                                                                    null,
                                                                                                    endpoint["Endpoint_ID"],
                                                                                                    controller)
                                                                                                }
                                                                                                placeholder='Select roles that apply...'
                                                                                                value={endpointSecurityMapping[endpoint["Endpoint_ID"]]}/>
                                                                                        </div>

                                                                                    </div>

                                                                                }
                                                                            </CardBody>
                                                                        </Card>
                                                                    </Collapse>
                                                                </Card>
                                                            )
                                                        }
                                                    </CardBody>
                                                </Collapse>
                                            </Card>)
                                    }
                                </div>
                                <div style={{display: 'flex', justifyContent: 'center'}}>
                                    <button className={'btn btn-primary'} style={{margin: '0 auto'}} onClick={this.triggerReview}>Review Changes</button>
                                </div>
                                <div style={{textAlign: 'center', backgroundColor: 'red', marginTop: '1rem'}}>{reviewErrorText}</div>
                            </Section>
                            </>
                        }
                        {
                            currentView === availableViews[1] &&
                                <APIReviewView
                                    triggerAPIEdit={this.triggerAPIEdit}
                                    triggerAPIReload={this.triggerAPIReload}
                                    controllersToAdd={controllersToAdd}
                                    controllersToModify={controllersToModify}
                                    controllersOriginalCache={controllersOriginalCache}
                                    activeEndpointControllerMapping={endpointControllerMapping}
                                    endpointParameterMapping={endpointParameterMapping}
                                    endpointSecurityMapping={endpointSecurityMapping}
                                />
                        }
                    </>
                }
            />
        );
    }
}

export default APIEditView;