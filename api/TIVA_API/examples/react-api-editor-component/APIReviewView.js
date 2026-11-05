import React from "react";
import {Section, Tab, TabContainer, TabTitle} from "../../../style/General";
import NewEndpointInfo from "./NewEndpointInfo";
import ChangedEndpointInfo from "./ChangedEndpointInfo";
import {Card, CardHeader} from "reactstrap";
import {
    addEndpoint,
    addParameter,
    addSecurityRole,
    updateEndpoint,
    updateParameter,
    updateSecurityRole
} from "../../../api/api-api";
import {getObjectsList} from "../../../helpers/helpers";

class APIReviewView extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            // Not sure why this is needed, but without tricking js into deep copy it breaks the page
            controllersToModifyCopy: JSON.parse(JSON.stringify(this.props.controllersToModify)),
            view: 'review'
        }
    }

    processRoleList = (roleList) => {
        if(roleList == null) return 'None';
        let roleString = '';
        roleList.forEach(role => roleString += roleString === '' ? role.label : `, ${role.label}`)
        return roleString;
    }

    saveAPI = async () => {
        let {activeEndpointControllerMapping, controllersOriginalCache} = this.props;
        let {controllersToModifyCopy} = this.state;
        Object.keys(controllersToModifyCopy).forEach(controller => {
            // Process Deletion of Endpoints
            if(controllersToModifyCopy[controller].hasOwnProperty('app_mark_controller_deletion')) {
                activeEndpointControllerMapping[controller].forEach(async endpoint => {
                    await this.deleteEndpoint(controller, endpoint['Endpoint_ID'])
                })
                delete controllersToModifyCopy[controller]
                return;
            }

            // Process New Endpoints
            Object.keys(controllersToModifyCopy[controller]).filter(endpointID => endpointID < 0).forEach(async endpointID => {
                const endpoint = controllersToModifyCopy[controller][endpointID];
                await addEndpoint(endpoint).then(resp => {
                    let endpointID = getObjectsList(resp)[0]['Endpoint_ID'];
                    if(endpoint.hasOwnProperty('parameters')) {
                        // Add Parameters
                        Object.keys(endpoint['parameters']).filter(paramID => paramID < 0).forEach(paramID => {
                            endpoint['parameters'][paramID]['Endpoint_ID'] = endpointID
                            addParameter(endpoint['parameters'][paramID]);
                        })
                    }
                    if(endpoint.hasOwnProperty('securityValue')) {
                        // Add Security
                        // @Endpoint_ID, @Role_ID
                        Object.keys(endpoint['securityValue']).forEach(securityID => {
                            addSecurityRole({Endpoint_ID: endpointID, Role_ID: endpoint['securityValue'][securityID]['value']})
                        })
                    }
                    delete controllersToModifyCopy[controller][endpointID];
                })
            })

            // Process Old Endpoints
            Object.keys(controllersToModifyCopy[controller]).filter(endpointID => endpointID >= 0).forEach(async endpointID => {
                const endpoint = controllersToModifyCopy[controller][endpointID];

                // Delete first if needed
                if(endpoint.hasOwnProperty('app_mark_endpoint_deletion')) {
                    await this.deleteEndpoint(controller, endpointID);
                    return
                }

                // Process Endpoint

                let changes = {}
                let activeEndpoint = activeEndpointControllerMapping[controller].filter(endpoint => endpoint.Endpoint_ID === parseInt(endpointID))[0]
                if(endpoint.hasOwnProperty('Connection_Name') || endpoint.hasOwnProperty('DataSet_Table_Names')
                    || endpoint.hasOwnProperty('Description') || endpoint.hasOwnProperty('Request_Type')
                    || endpoint.hasOwnProperty('Result_Type') || endpoint.hasOwnProperty('Stored_Procedure')) {
                    await updateEndpoint({
                        Endpoint_ID: activeEndpoint['Endpoint_ID'],
                        Request_Type: activeEndpoint['Request_Type'],
                        Stored_Procedure: activeEndpoint['Stored_Procedure'],
                        Connection_Name: activeEndpoint['Connection_Name'],
                        Result_Type: activeEndpoint['Result_Type'],
                        DataSet_Table_Names: activeEndpoint['DataSet_Table_Names'],
                        Description: activeEndpoint['Description'],
                        Activity_Notes: 'Updated Endpoint'
                    })
                }

                // Process Parameters
                if(endpoint.hasOwnProperty('parameters')) {
                    for (const Parameter_ID of Object.keys(endpoint['parameters'])) {
                        let parameter = endpoint['parameters'][Parameter_ID]
                        if (parameter.hasOwnProperty('app_mark_param_deletion')) {
                            // Delete Parameters
                            await updateParameter({
                                Parameter_ID,
                                Deleted: true,
                                Activity_Notes: 'Parameter Deleted'
                            })
                        } else if (Parameter_ID < 0) {
                            // Add Parameters
                            let change = JSON.stringify(parameter);
                            parameter['Endpoint_ID'] = endpointID
                            parameter['Activity_Notes'] = `Parameter Added`
                            await addParameter(parameter);
                        } else {
                            // Change Parameters
                            let change = JSON.stringify(parameter);
                            parameter['Parameter_ID'] = Parameter_ID
                            parameter['Endpoint_ID'] = endpointID
                            parameter['Activity_Notes'] = `Parameter Modified: ${change}`
                            await updateParameter(parameter);
                        }
                    }
                }

                // Process Security
                if(endpoint.hasOwnProperty('securityValue')) {
                    let oldRoleList = controllersOriginalCache[controller][endpointID]['securityValue']
                    let newRoleList = endpoint['securityValue']
                    let deletedRoles = [];
                    oldRoleList.forEach(oldRole => {
                        let found = false
                        newRoleList.forEach(newRole => {
                            if(oldRole.value === newRole.value) {
                                found = true;
                            }
                        });
                        if(!found) deletedRoles.push(oldRole.value);
                    });

                    for (const Role_ID of deletedRoles) {
                        await updateSecurityRole({
                            Endpoint_ID: parseInt(endpointID),
                            Role_ID,
                            Deleted: true,
                            Activity_Notes: 'Security Role Deleted'
                        })
                    }

                    let newRoles = [];
                    newRoleList.forEach(newRole => {
                        let found = false;
                        oldRoleList.forEach(oldRole => {
                            if(oldRole.value === newRole.value) {
                                found = true;
                            }
                        });
                        if(!found) newRoles.push(newRole.value);
                    });

                    for (const Role_ID of newRoles) {
                        await addSecurityRole({
                            Endpoint_ID: endpointID,
                            Role_ID,
                        })
                    }
                }

                delete controllersToModifyCopy[controller][endpointID];
            });
            this.props.triggerAPIReload();
            this.setState({view: 'saved'})
            // delete controllersToModifyCopy[controller]
        })
    }

    deleteEndpoint = async (controller, endpointID) => {
        if(endpointID < 0) return;
        let {endpointSecurityMapping, endpointParameterMapping} = this.props

        for (const securityMapping of endpointSecurityMapping[endpointID]) {
            await updateSecurityRole({
                Security_ID: securityMapping['value'],
                Deleted: true,
                Activity_Notes: 'Endpoint Deleted'
            })
        }
        for (const parameter of endpointParameterMapping[endpointID]) {
            await updateParameter({
                Parameter_ID: parameter['Parameter_ID'],
                Deleted: true,
                Activity_Notes: 'Endpoint Deleted'
            })
        }
        await updateEndpoint({
            Endpoint_ID: endpointID,
            Deleted: true,
            Activity_Notes: 'Endpoint Deleted'
        })
    }

    render() {
        const {controllersToAdd, controllersToModify, controllersOriginalCache, activeEndpointControllerMapping,
            endpointParameterMapping, endpointSecurityMapping} = this.props;
        const {view} = this.state
        const controllers = [...new Set([...controllersToAdd, ...Object.keys(controllersToModify)])];

        let deletedControllers = [];
        Object.keys(controllersToModify).forEach(controller => {
          if(controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion')) {
              deletedControllers.push(controller)
          }
        })

        return (
          <>
              {view === 'review' &&
              <>
              <Section>
                  <TabContainer>
                      <Tab active={'true'}>
                          <TabTitle>Change Review</TabTitle>
                      </Tab>
                  </TabContainer>
              </Section>
              {
                  controllersToAdd.size !== 0 &&
                  <Section>
                      <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                          <h2>New Controllers</h2>
                          {[...controllersToAdd].map((controller) => <p key={controller}>{controller}</p>)}
                      </div>
                  </Section>
              }
              {
                  Object.keys(controllersToModify).filter((controller) => !controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion')).length > 0 &&
                  <Section>
                      <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                          <h2>Modified Controllers</h2>
                          {Object.keys(controllersToModify).filter((controller) => !controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion')).map((controller) => controllersToAdd.has(controller) ?
                              <div/> : <p key={controller}>{controller}</p>)}
                      </div>
                  </Section>
              }
              {
                  deletedControllers.length > 0 &&
                  <Section>
                      <div style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                          <h2>Deleted Controllers</h2>
                          {deletedControllers.map((controller) => <p key={controller}>{controller}</p>)}
                      </div>
                  </Section>
              }
              {
                  controllers.map(controller =>
                      <>
                          {!controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion') &&
                              <Section key={controller}>
                                  <div key={controller} style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                                      <h2>{controller} Controller {controllersToAdd.has(controller) ? 'Definition' : 'Changes'}</h2>
                                      {controllersToModify.hasOwnProperty(controller) &&
                                          Object.keys(controllersToModify[controller]).map(endpointID =>
                                              <>
                                                  {controllersToModify[controller][endpointID].hasOwnProperty('app_mark_endpoint_deletion') && endpointID >= 0 &&
                                                      <Card key={`deleted-${endpointID}`} className={'black-border'}>
                                                          <CardHeader
                                                              style={{backgroundColor: "#00274c", color: 'white'}}>
                                                              {`Deleted Endpoint ${activeEndpointControllerMapping[controller].filter(endpoint => endpoint["Endpoint_ID"] === parseInt(endpointID))[0]['Endpoint_Name']}`}
                                                          </CardHeader>
                                                      </Card>
                                                  }
                                                  {/*New Endpoint, doesn't need comparisons*/}
                                                  {!controllersToModify[controller][endpointID].hasOwnProperty('app_mark_endpoint_deletion') && endpointID < 0 &&
                                                      <NewEndpointInfo
                                                          key={`new-${endpointID}`}
                                                          endpoint={controllersToModify[controller][endpointID]}
                                                          endpointID={endpointID}
                                                          processRoleList={this.processRoleList}
                                                      />
                                                  }
                                                  {!controllersToModify[controller][endpointID].hasOwnProperty('app_mark_endpoint_deletion') && endpointID >= 0 &&
                                                      <ChangedEndpointInfo
                                                          key={`changed-${endpointID}`}
                                                          endpoint={activeEndpointControllerMapping[controller].filter(endpoint => endpoint["Endpoint_ID"] === parseInt(endpointID))[0]}
                                                          endpointParameters={endpointParameterMapping[parseInt(endpointID)]}
                                                          endpointSecurity={endpointSecurityMapping[parseInt(endpointID)]}
                                                          endpointChanges={controllersToModify[controller][endpointID]}
                                                          endpointOriginalCache={controllersOriginalCache[controller] == null || controllersOriginalCache[controller][endpointID] == null ? {} : controllersOriginalCache[controller][endpointID]}
                                                          endpointID={endpointID}
                                                          processRoleList={this.processRoleList}
                                                      />
                                                  }
                                              </>
                                          )
                                      }
                                      {!controllersToModify.hasOwnProperty(controller)
                                          && <div style={{backgroundColor: 'red', marginTop: '1rem'}}>No endpoints were
                                              defined for this new endpoint. It will not be saved to the API</div>
                                      }
                                  </div>
                              </Section>
                          }
                          {controllersToModify[controller].hasOwnProperty('app_mark_controller_deletion') &&
                              <Section key={controller}>
                                  <div key={controller} style={{width: '60%', textAlign: 'center', margin: '0 auto'}}>
                                      <h2>{controller} Controller Deleted</h2>
                                      {activeEndpointControllerMapping[controller].map(endpoint =>
                                          <Card key={endpoint['Endpoint_ID']} className={'black-border'}>
                                              <CardHeader
                                                  style={{backgroundColor: "#00274c", color: 'white'}}>
                                                  {`Deleted Endpoint ${activeEndpointControllerMapping[controller].filter(endpointMap => endpointMap["Endpoint_ID"] === endpoint['Endpoint_ID'])[0]['Endpoint_Name']}`}
                                              </CardHeader>
                                          </Card>
                                      )}
                                  </div>
                              </Section>
                          }
                      </>
                  )
              }
              <div style={{display:'flex', justifyContent: 'center', paddingBottom: '2rem'}}>
                <button className={'btn btn-primary'} onClick={this.props.triggerAPIEdit}>Back to Edit</button>
                <button className={'btn btn-primary'} onClick={this.saveAPI} style={{marginLeft: '1rem'}}>Submit Changes</button>
              </div>
              </>
              }
              {
                  view === 'saved' &&
                  <Section>
                      <h1 style={{textAlign: 'center'}}>API Changes Successfully Saved</h1>
                      <button style={{margin: '0 auto'}} onClick={() => window.location.reload()} className={'btn btn-primary'}>Reload Page</button>
                  </Section>
              }
          </>
        );
    }
}

export default APIReviewView;