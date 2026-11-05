'use client'

import {getFHIRMedicationStatements, getFHIRVitalSigns,
    getMedicationAdministrations, getEhrSurgicalCase, getEhrClientConfig } from "@/api/ehr-api";
import { initTCI } from "@/model/initTCI";
import {
    VitalEntry,
    Medication,
    StatementBundleEntry,
    MedData,
    MedAdministrations,
    PKDrugModel,
    DoseTable,
    DoseTableRow, TCI, MPOGMedEvent, mpogAdministration
} from "@/app/utils/interfaces";
import {getSurgicalID} from "@/lib/cookies";
import processTCI from "@/model/processTCI";

export function matchMedication(medName: string, medsListVal: Medication[] | null): Medication|null {
    let foundMed: Medication|null = null;
    if (medsListVal == null) {
        return foundMed;
    }
    medsListVal.forEach((tivaMed) => {
        let foundCount = 0;
        const toFind = tivaMed.Medication_Search_Terms.split(',').length;
        if (!foundMed) {
            tivaMed.Medication_Search_Terms.split(',').forEach((term: string) => {
                if (term[0] === '!') {
                    // blacklisted terms
                    if (medName.toLowerCase().indexOf(term.substring(1).toLowerCase()) === -1) {
                        foundCount += 1;
                    }
                } else {
                    // whitelisted terms
                    if (medName.toLowerCase().indexOf(term.toLowerCase()) !== -1) {
                        foundCount += 1;
                    }
                }
                if (foundCount === toFind) {
                    foundMed = tivaMed;
                }
            });
        }
    });
    return foundMed;
}

export async function searchFHIR(medsListVal: Medication[] | null): Promise<MedData|null> {
    // console.log('medsListVal', medsListVal, medsListLocal)
    // console.log('meds', medsList)
    // get cookie X-SurgicalID split into two variables SurgicalRecordID and PatientID. cookie is in format <surgicalID>||<patientID>
    const surgicalID = await getSurgicalID();
    if (surgicalID == null) {
        console.log('no surgicalID')
        return null;
    }
    const [surgeryID, patientID] = surgicalID.split('||');
    console.log('lookupFHIR', surgeryID, patientID)

    // Labels used by the site's EHR (Ehr:DataMapping in the API settings)
    const {DataMapping: mapping} = await getEhrClientConfig();

    const medDataObj: MedData = {
        ageUnit: "",
        ageValue: "",
        anesthesiaEnd: null,
        anesthesiaStart: null,
        heightValue: "",
        heightUnit: "",
        medDataValue: [],
        sexValue: "",
        surgicalLog: null,
        weightValue: "",
        weightUnit: "",
        procedureLocation: '',
        procedureName: '',
        patientName: ''
    };

    const patientVitalsResponse = await getFHIRVitalSigns({patient: patientID});
    console.log('patientVitalsResponse', patientVitalsResponse)
    if(patientVitalsResponse == null || !patientVitalsResponse.bSuccess || patientVitalsResponse.oReturnObject == null) {
        return medDataObj;
    }
    const patientVitals = patientVitalsResponse.oReturnObject.entry.filter(vital => vital.resource.resourceType === 'Observation');
    console.log('patientVitals', patientVitals)

    let weightRaw: VitalEntry[] = [];
    try {
        weightRaw = patientVitals.filter((vital) => vital.resource.code.text === mapping.WeightLabel)
    } catch (error) {
        console.log('failed to parse weight', error)
    }
    if(weightRaw.length === 0 || weightRaw[0].resource.valueQuantity == null || weightRaw[0].resource.valueQuantity.value == null) {
        return medDataObj;
    }
    const weight = weightRaw.length === 0 ? -1 : weightRaw[0].resource.valueQuantity.value
    const weightUnit = weightRaw.length === 0 ? '' : weightRaw[0].resource.valueQuantity.unit
    console.log('weight', weight, weightUnit)
    medDataObj.weightValue = weight.toString();
    medDataObj.weightUnit = weightUnit === 'kg' ? 'kg' : 'lbs';

    let heightRaw: VitalEntry[] = [];
    try {
        heightRaw = patientVitals.filter((vital) => vital.resource.code.text === mapping.HeightLabel)
    } catch (error) {
        console.log('failed to parse height', error)
    }
    if(heightRaw.length === 0 || heightRaw[0].resource.valueQuantity == null || heightRaw[0].resource.valueQuantity.value == null) {
        return medDataObj;
    }
    const height = heightRaw.length === 0 ? -1 : heightRaw[0].resource.valueQuantity.value
    const heightUnit = heightRaw.length === 0 ? '' : heightRaw[0].resource.valueQuantity.unit
    console.log('height', height, heightUnit)
    medDataObj.heightValue = height.toString();
    medDataObj.heightUnit = heightUnit === 'cm' ? 'cms' : 'inches';

    const surgicalResponse = await getEhrSurgicalCase({ SurgicalRecordID: surgeryID })
    if(surgicalResponse == null || !surgicalResponse.bSuccess || surgicalResponse.oReturnObject == null) {
        return medDataObj;
    }
    medDataObj.surgicalLog = surgicalResponse.oReturnObject.SurgicalRecord;
    // console.log('resp', resp)
    if (medDataObj.surgicalLog != null && medDataObj.surgicalLog.Actual != null && medDataObj.surgicalLog.PAFValues != null) {
        if(medDataObj.surgicalLog.Patient == null || medDataObj.surgicalLog.Patient.DateOfBirth == null) {
            return medDataObj;
        }
        const mrn = medDataObj.surgicalLog.Patient.MRN;
        const csn = medDataObj.surgicalLog.Actual.VisitContactNumber.toString();

        const birthday = new Date(medDataObj.surgicalLog.Patient.DateOfBirth);
        const sex = medDataObj.surgicalLog.Patient['Sex'];
        const patientName = medDataObj.surgicalLog.Patient['Name'];
        const procedureName = medDataObj.surgicalLog.PAFValues[mapping.ProcedurePafIndex]?.Value;
        const procedureLocation = medDataObj.surgicalLog.Actual.OperatingRoom?.Name;

        if(patientName == null || procedureName == null || procedureLocation == null) {
            return medDataObj;
        }

        medDataObj.patientName = patientName;
        medDataObj.procedureName = procedureName.join(', ');
        medDataObj.procedureLocation = procedureLocation;

        if (sex === 'Male') {
            medDataObj.sexValue = 'male'
        } else {
            medDataObj.sexValue = 'female'
        }

        const age = Math.floor((new Date().getTime() - birthday.getTime()) / 31536000000);
        if (age < 1) {
            medDataObj.ageUnit = 'months';
            medDataObj.ageValue = Math.floor((new Date().getTime() - birthday.getTime()) / 2592000000).toString();
        } else {
            medDataObj.ageUnit = 'years';
            medDataObj.ageValue = age.toString();
        }

        if(medDataObj.surgicalLog.Actual.TimingEvents == null) {
            return medDataObj;
        }

        // A missing event leaves the time null (Anesthesia Start not detected message on the dashboard)
        const timingEvents = medDataObj.surgicalLog.Actual.TimingEvents;
        const anesStartEvent = timingEvents.find((event) => event['Title'] === mapping.AnesthesiaStartEvent)?.['StartDateTime'];
        const anesEndEvent = timingEvents.find((event) => event['Title'] === mapping.AnesthesiaStopEvent)?.['StartDateTime'];
        // if no anesEnd present, use discharge datetime instead to avoid old cases graphing till present day
        const dischargeEvent = medDataObj.surgicalLog.DischargeDateTime;
        const anesStartDate = anesStartEvent != null ? new Date(anesStartEvent) : null;
        const anesEndDate = anesEndEvent != null ? new Date(anesEndEvent) : (dischargeEvent != null ? new Date(dischargeEvent) : null);
        console.log('anesEvents', anesStartDate, anesEndDate)
        medDataObj.anesthesiaStart = anesStartDate;
        medDataObj.anesthesiaEnd = anesEndDate;

        const effectiveDate = new Date(anesStartDate ?? new Date());
        effectiveDate.setDate(effectiveDate.getDate() - 3);
        const formattedDate = effectiveDate.toISOString().split('T')[0];

        const medicationStatementResponse = await getFHIRMedicationStatements({
            patient: patientID,
            effective: formattedDate
        });
        console.log(patientID, formattedDate, medicationStatementResponse)

        if(medicationStatementResponse == null || !medicationStatementResponse.bSuccess || medicationStatementResponse.oReturnObject == null) {
            return medDataObj;
        }
        const medicationStatements = medicationStatementResponse.oReturnObject;

        const filteredMeds: StatementBundleEntry[] = []
        const rejectedMeds: StatementBundleEntry[] = []

        medicationStatements.entry.forEach((fhirMed) => {
            const fhirMedName = fhirMed.resource.medicationReference.display.toLowerCase();
            const foundMed = matchMedication(fhirMedName, medsListVal) !== null;

            if (foundMed) {
                filteredMeds.push(fhirMed)
            } else {
                rejectedMeds.push(fhirMed)
            }
        });

        console.log('timeFilteredMeds', filteredMeds.length, filteredMeds)
        console.log('EHR meds', filteredMeds, rejectedMeds);

        if (filteredMeds.length === 0) {
            return medDataObj;
        }

        const orderIDs: string[] = [];

        filteredMeds.forEach(med => {
            // const segments = med.resource.medicationReference.reference.split('/');
            // const medicationID = segments[segments.length - 1];
            if(med.resource.identifier == null || med.resource.identifier.length === 0) {
                return;
            }
            orderIDs.push(med.resource.identifier[0].value)
            console.log('orderID', med.resource.identifier[0].value)
        })

        // console.log('patient', mrn,csn)
        const administrationResponse = await getMedicationAdministrations({ PatientID: mrn, ContactID: csn, OrderIDs: orderIDs.join('|') })
        if(administrationResponse == null || !administrationResponse.bSuccess || administrationResponse.oReturnObject == null) {
            return medDataObj;
        }
        const administrations = administrationResponse.oReturnObject.Orders;
        // const administrations = resps.map((adminResponse: any) => processResponse(adminResponse)['oReturnObject']);
        console.log('administrations', administrations);
        // console.log('allData', filteredMeds, surgicalLog, responses)

        const medData = filteredMeds.map((med) => {
            // const matchedMed = medicationResponses[medicationResponses.findIndex((medication) =>
            //     med.resource.medicationReference.reference.search(medication.id) >= 0)];
            if(med.resource == null || med.resource.medicationReference == null || med.resource.identifier == null || med.resource.identifier.length === 0) {
                return null;
            }
            const tivaMed = matchMedication(med.resource.medicationReference.display, medsListVal);
            if(tivaMed == null) {
                return null;
            }

            const identifier = med.resource.identifier[0].value;
            const matchedAdministration = administrations[administrations.findIndex((administration) =>
                administration['OrderID']['ID'] === identifier)];
            console.log('matchedAdministration', matchedAdministration);
            if(matchedAdministration == null) {
                return null;
            }
            const medData: MedAdministrations = {
                medicationReference: med.resource.medicationReference,
                basedOn: med.resource.basedOn,
                // extensions: med.resource.extension,
                informationSource: med.resource.informationSource,
                status: med.resource.status,
                matchedMed: null,
                medConcentration: null,
                tivaMed,
                isActive: matchedAdministration['IsActive'],
                MedicationAdministrations: matchedAdministration['MedicationAdministrations'].filter((admin) =>
                    (anesStartDate === null || new Date(admin['AdministrationInstant']) >= anesStartDate) && (anesEndDate === null || new Date(admin['AdministrationInstant']) <= anesEndDate)
                ).sort((a, b) => new Date(a['AdministrationInstant']).getTime() - new Date(b['AdministrationInstant']).getTime())
            }
            return medData;
        }).filter((med) => med != null).sort((a, b) => a.tivaMed.Med_Order - b.tivaMed.Med_Order);
        console.log('medData', medDataObj);
        medDataObj.medDataValue = medData.filter(med => med != null && med.MedicationAdministrations.length > 0);
    }

    const mergedMedData: MedAdministrations[] = []
    if(medDataObj.medDataValue == null) {
        return medDataObj;
    }
    medDataObj.medDataValue.forEach((med) => {
        const foundMed = mergedMedData.find((m) => m.tivaMed.Med_ID === med.tivaMed.Med_ID)
        if (foundMed) {
            foundMed.MedicationAdministrations = foundMed.MedicationAdministrations.concat(med.MedicationAdministrations)
        } else {
            mergedMedData.push(med)
        }
    })

    medDataObj.medDataValue = mergedMedData;

    return medDataObj;
}

export function createDoseTableEntries(med: MedAdministrations, medsList: Medication[], drugModels: PKDrugModel[],
                                       anesthesiaEnd: Date|null): DoseTable|null {
    const { tivaMed: foundMed } = med;

    const medName = foundMed.Medication_Name;

    // Step 2b: Create DoseTable entry
    if (med['MedicationAdministrations'].length === 0) {
        return null;
    }

    const model = drugModels.find((model: PKDrugModel) => model.default_model && model.Medication_Name === medName);
    if (!model) {
        console.log('model not found', medName)
        return null;
    }

    const rows: DoseTableRow[] = [];

    let infusionRunning = false;
    med['MedicationAdministrations'].forEach((admin) => {
        let event: string = ''
        const startEvent = admin['Action'] === 'New Bag' || admin['Action'] === 'Infusion Continued' || admin['Action'] === 'Restarted';
        if (!infusionRunning && startEvent) {
            event = 'Start Infusion';
            infusionRunning = true;
        } else if ((infusionRunning && startEvent) || (admin['Action'].search('Change') >= 0)) {
            event = 'Dose Change';
        } else if (admin['Action'] === 'Stopped') {
            event = 'Stop Infusion';
            infusionRunning = false;
        } else if (admin['Action'] === 'Bolus' || admin['Action'] === 'Given') {
            event = 'Bolus';
        }

        if (event === '') {
            console.log('event not found', admin)
            return;
        }

        const adminInstant = new Date(admin['AdministrationInstant']);

        const time: Date = new Date(adminInstant);

        // Num minutes between adminInstant and anesthesiaStart
        let timeSinceFirstEvent = 0;
        if(rows.length > 0 && rows[0].time != null) {
            timeSinceFirstEvent = Math.floor((adminInstant.getTime() - rows[0].time.getTime()) / 60000);
        }

        if(admin['Dose'] != null) {
            rows.push({
                event,
                time,
                timeSinceFirstEvent,
                timeToRun: event === 'Bolus' ? 10.0 / 60.0 : 0,
                dose: parseFloat(admin['Dose']['Value'] as string),
                unit: admin['Dose']['Unit']
            });
        }
    });

    if(infusionRunning && anesthesiaEnd != null) {
        rows.push({
            event: 'Stop Infusion',
            time: anesthesiaEnd,
            timeSinceFirstEvent: Math.floor((anesthesiaEnd.getTime() - rows[0].time.getTime()) / 60000),
            timeToRun: 0,
            dose: 0,
            unit: rows[rows.length - 1].unit
        });
    }

    const newMedTable: DoseTable = {
        med: medName,
        model_id: model.Model_ID,
        model_name: model.Model_Name,
        model: model,
        rows,
        tci: initTCI(model),
        failure_reason: null
    }
    console.log('newMedTable', newMedTable)
    return newMedTable;
}

export function refreshData(
    sex: string,
    weightValue: string,
    weightUnit: string,
    heightValue: string,
    heightUnit: string,
    ageValue: string,
    ageUnit: string,
    medTables: { [index: string]: DoseTable },
    tciMap: { [index: string]: TCI },
    fromEhr: boolean,
    anesthesiaStart: Date|null,
    anesthesiaEnd: Date|null,
    maxTime: number,
    referenceTime: Date,
    mpogCaseID: string
): { [index: string]: TCI}|null {
    let sexVal: 'm' | 'f' = 'm';
    if (sex.toLowerCase() === 'female') {
        sexVal = 'f';
    }
    const pDemographics = {
        weight: parseFloat(weightValue),
        weightUnit,
        height: parseFloat(heightValue),
        heightUnit,
        age: parseFloat(ageValue),
        ageUnit,
        sex: sexVal
    }

    console.log('med table', medTables)

    const localMedTables: {[index: string]: DoseTable} = {};
    // We want to remove tables in a failed state
    Object.keys(medTables).forEach((med) => {
        if(medTables[med].failure_reason === null) {
            localMedTables[med] = medTables[med];
        }
    });

    Object.keys(localMedTables).forEach((med) => {
        // Temporarily Wipe all TCI upon save
        // TODO after save only refresh data after the earliest changed event
        const medTable = localMedTables[med];
        medTable.tci = initTCI(medTable.model);
    });

    const newTciMap = { ...tciMap };

    console.log('localMedTables', localMedTables)
    Object.keys(localMedTables).forEach((med) => {
        console.log('processingMed', med, localMedTables[med])
        if (fromEhr || mpogCaseID !== '') {
            if (anesthesiaStart == null) {
                newTciMap[med] = processTCI(localMedTables[med], pDemographics, maxTime, 0, referenceTime);
                return newTciMap;
            }
            let missingTime: number;
            if(anesthesiaEnd != null && localMedTables[med].rows.length > 0) {
                const lastEventTime = localMedTables[med].rows[localMedTables[med].rows.length - 1].time;
                missingTime = getMinDiff(anesthesiaEnd, lastEventTime);
                console.log('missingTime', missingTime)
            } else {
                // num of min since reference time
                const currentTime = new Date();
                const lastEventTime =  localMedTables[med].rows[ localMedTables[med].rows.length - 1].time

                const endTime = (lastEventTime === null || lastEventTime < currentTime) ? currentTime : lastEventTime;

                // num of min between referenceTime and endTime
                missingTime = getMinDiff(endTime, lastEventTime)
                console.log('missingTime', missingTime, getMinDiff(endTime, lastEventTime))
            }

            console.log('localMedTable', localMedTables[med], maxTime, missingTime);
            const newTci = processTCI(structuredClone(localMedTables[med]), pDemographics, maxTime, missingTime, referenceTime);
            console.log('newTci', newTci)
            newTciMap[med] = newTci;
        } else {
            newTciMap[med] = processTCI(localMedTables[med], pDemographics, maxTime, 0, referenceTime);
        }
    });

    return newTciMap;
}

export function getMinDiff(time1: Date, time2: Date) {
    console.log('time', time1, time2)
    return (time1.getTime() - time2.getTime()) / 60000;
}

export function prepareMPOGData(mpogData: MPOGMedEvent[], medsList: Medication[]): MedData|null {
    const medDataObj: MedData = {
        ageUnit: "",
        ageValue: "",
        anesthesiaEnd: null,
        anesthesiaStart: null,
        heightValue: "",
        heightUnit: "",
        medDataValue: [],
        sexValue: "",
        surgicalLog: null,
        weightValue: "",
        weightUnit: "",
        procedureLocation: '',
        procedureName: '',
        patientName: ''
    };

    if(mpogData.length === 0) {
        return null;
    }

    const weight = mpogData[0].weight_kg;
    const weightUnit = 'kg';
    medDataObj.weightValue = weight.toString();
    medDataObj.weightUnit = weightUnit;

    const height = mpogData[0].height_cm;
    const heightUnit = 'cms';
    medDataObj.heightValue = height.toString();
    medDataObj.heightUnit = heightUnit

    medDataObj.sexValue = mpogData[0].aims_sex === 'M' ? 'male' : 'female';

    medDataObj.ageValue = mpogData[0].aims_patient_age_years.toString();
    medDataObj.ageUnit = 'years';

    medDataObj.procedureLocation = mpogData[0].aims_procedure_room_name;
    medDataObj.procedureName = mpogData[0].aims_actual_procedure_text;

    const filteredMeds: MPOGMedEvent[] = [];
    const rejectedMeds: MPOGMedEvent[] = [];

    mpogData.forEach((med: MPOGMedEvent) => {
        const foundMed = matchMedication(med.medication.toLowerCase(), medsList);
        if (foundMed) {
            filteredMeds.push({ ...med, tivaMed: foundMed });
        } else {
            rejectedMeds.push({ ...med, tivaMed: null })
        }
    });

    const medOrg: { [index: string]: MPOGMedEvent[] } = {};

    filteredMeds.forEach((med: MPOGMedEvent) => {
        if(med.tivaMed != null) {
            if (!medOrg.hasOwnProperty(med.tivaMed.Medication_Name)) {
                medOrg[med.tivaMed['Medication_Name']] = [];
            }
            medOrg[med.tivaMed['Medication_Name']].push(med);
        }
    });

    const anesStart = new Date(filteredMeds[0].anesStart);
    const anesEnd = new Date(filteredMeds[0].anesEnd);
    medDataObj.anesthesiaStart = anesStart;
    medDataObj.anesthesiaEnd = anesEnd;

    console.log('anes', anesStart, anesEnd)

    const medData = Object.keys(medOrg).map((med) => {
        const tivaMed = medOrg[med][0].tivaMed;

        console.log('med', med, tivaMed, medOrg[med])

        const expandedAdministrations: mpogAdministration[] = [];
        medOrg[med].forEach((med: MPOGMedEvent) => {
            const aimsUnit = med.AIMS_Med_UOM.toLowerCase().replace('hour', 'hr').replace('minute', 'min');
            if (aimsUnit.search('hr') < 0
                && aimsUnit.search('min') < 0 ) {
                console.log('newBolus', med)
                const bolusEvent: mpogAdministration = {
                    Action: 'Bolus',
                    // remove the ms component of the datetime
                    AdministrationInstant: med.aims_dose_start_dt,
                    Dose: {
                        Value: med.aims_med_dose,
                        Unit: aimsUnit
                    }
                }
                expandedAdministrations.push(bolusEvent);
            } else {
                console.log('newBolus', med)
                const startEvent: mpogAdministration = {
                    Action: 'New Bag',
                    AdministrationInstant: med.aims_dose_start_dt,
                    Dose: {
                        Value: med.aims_med_dose,
                        Unit: aimsUnit
                    }
                }
                const endEvent: mpogAdministration = {
                    Action: 'Stopped',
                    AdministrationInstant: med.aims_dose_end_dt,
                    Dose: {
                        Value: 0,
                        Unit: aimsUnit
                    }
                }
                expandedAdministrations.push(startEvent);
                expandedAdministrations.push(endEvent);
            }
        });
        console.log('expandedAdministrations', expandedAdministrations)

        const filteredAdministrations = expandedAdministrations.filter((admin) => {
            return (anesStart === null || new Date(admin['AdministrationInstant']) >= anesStart)
                && (anesEnd === null || new Date(admin['AdministrationInstant']) <= anesEnd)
        });

        const expandedRateChangeFix: mpogAdministration[] = [];
        let ignoreFlag = false;
        let infusionRunning = false;
        filteredAdministrations.sort((a, b) => {
            if(a['AdministrationInstant'] === b['AdministrationInstant']) {
                if(a['Action'] === 'New Bag') {
                    return -1;
                } else if(b['Action'] === 'New Bag') {
                    return 1;
                }
            }
            return new Date(a['AdministrationInstant']).getTime() - new Date(b['AdministrationInstant']).getTime()
        }).forEach((admin, index: number) => {
            console.log('admin', index, admin, index < filteredAdministrations.length ? filteredAdministrations[index + 1] : null, ignoreFlag)
            // We want to add if it is last element or is new bag
            console.log('test',index === filteredAdministrations.length - 1, (admin.Action !== 'New Bag' && !ignoreFlag), admin.Action !== 'New Bag', !ignoreFlag)
            if(!infusionRunning && admin.Action === 'New Bag') {
                infusionRunning = true;
                expandedRateChangeFix.push(admin);
                console.log('0')
            } else if(infusionRunning && admin.Action === 'New Bag'
                && admin.AdministrationInstant === filteredAdministrations[index + 1].AdministrationInstant
            ) {
                ignoreFlag = true;
                admin.Action = 'Dose Change';
                expandedRateChangeFix.push(admin);
                console.log('1')
            } else if(ignoreFlag && admin.Action === 'Stopped') { // && admin.AdministrationInstant === filteredAdministrations[index + 1].AdministrationInstant) {
                console.log('2')
                ignoreFlag = false;
            } else if(admin.Action === 'Stopped') {
                console.log('3')
                infusionRunning = false;
                expandedRateChangeFix.push(admin);
            } else {
                console.log('4')
                expandedRateChangeFix.push(admin);
            }
        });

        if(infusionRunning) {
            console.log('infusionRunning', expandedRateChangeFix)
            const endEvent: mpogAdministration = {
                Action: 'Stopped',
                AdministrationInstant: filteredMeds[0].anesEnd,
                Dose: {
                    Value: 0,
                    Unit: expandedRateChangeFix[expandedRateChangeFix.length - 1].Dose.Unit              }
            }
            expandedRateChangeFix.push(endEvent);
            console.log('withAnesEnd', expandedRateChangeFix)
        }

        console.log('expandedRateChangeFix', expandedRateChangeFix)

        if(tivaMed == null) {
            return null;
        }

        const medData: MedAdministrations = {
            medicationReference: null,
            basedOn: null,
            informationSource: null,
            status: null,
            matchedMed: { code: { text: tivaMed['Medication_Name'] }},
            medConcentration : null,
            tivaMed: tivaMed,
            isActive: null,
            MedicationAdministrations: expandedRateChangeFix.filter((admin) =>
                    (
                        anesStart === null
                        || new Date(admin['AdministrationInstant']) >= anesStart)
                    && (anesEnd === null || new Date(admin['AdministrationInstant']) <= anesEnd
                    )
            ).sort((a, b) => new Date(a['AdministrationInstant']).getTime() - new Date(b['AdministrationInstant']).getTime())
        }

        return medData
    });
    console.log('medData', medDataObj);

    medDataObj.medDataValue = medData.filter(med => med != null && med.MedicationAdministrations.length > 0).filter((med) => med != null);
    console.log('filteredMeds', filteredMeds, rejectedMeds);

    return medDataObj;
}
