'use client'
import React, {useEffect, useState, useRef, Fragment, Suspense} from 'react';
import {
    ApplicationListItem,
    DoseTables, MedAdministrations,
    MedData, Medication,
    MedicationModalContext,
    PKDrugModel, TCI
} from '@/app/utils/interfaces';
import {getDrugModels, getEhrClientConfig, getGetCaseFromMPOG, getMedications} from '@/api/ehr-api';
import {getCaptchaCookie, getDisclaimerCookie, getSurgicalID, setDisclaimerCookie} from '@/lib/cookies';
import {prepareMPOGData, refreshData, searchFHIR} from '@/lib/med-helpers';
import {getLists} from "@/api/lists-api";
import {saveGraphLog} from "@/api/logs-api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {jwtPayload} from "@/app/utils/auth";
import {useSearchParams} from "next/navigation";
import PatientCovariates from "@/components/dashboard/subComponents/PatientCovariates";
import Graph from "@/components/dashboard/subComponents/Graph";
import GraphOptions from "@/components/dashboard/subComponents/GraphOptions";
import PopoutWindow from "@/components/dashboard/subComponents/PopoutWindow";
import {CaptchaDisabledList} from "@/components/shared/disclaimer-captcha";
import {DISCLAIMER_TEXT} from "@/lib/disclaimer";
import DoseSection from "@/components/dashboard/subComponents/DoseSection";
import {MPOGSearchModal} from "@/components/dashboard/subComponents/MPOGSearchModal";
import {MedicationGraphModal} from "@/components/dashboard/subComponents/MedicationGraphModal";

const Dashboard = () => {
    const searchParams = useSearchParams();
    const fromEhr = searchParams.get('fromEhr') === 'true';

    const [username, setUsername] = useState<string>('');
    // Patient Covariates
    const [ageValue, setAgeValue] = useState<string>('');
    const [ageUnit, setAgeUnit] = useState<string>('');
    const [weightValue, setWeightValue] = useState<string>('');
    const [weightUnit, setWeightUnit] = useState<string>('');
    const [heightValue, setHeightValue] = useState<string>('');
    const [heightUnit, setHeightUnit] = useState<string>('');
    const [sex, setSex] = useState<string>('');
    const [patientName, setPatientName] = useState<string>('');
    const [procedureName, setProcedureName] = useState<string>('');
    const [procedureLocation, setProcedureLocation] = useState<string>('');
    const [lockedCovariates, setLockedCovariates] = useState<boolean>(false);
    const [lockedDoseTable, setLockedDoseTable] = useState<boolean>(false);
    // Graph Options
    const [refreshTime, setRefreshTime] = useState<string>(``);
    const [updateRefreshTime, setUpdateRefreshTime] = useState<boolean>(false);
    const [maxTime, setMaxTime] = useState<number>(60);
    const [plasmaStyle, setPlasmaStyle] = useState<string>('Hide');
    const [effectSiteStyle, setEffectSiteStyle] = useState<string>('Show');
    const [concentrationTarget, setConcentrationTarget] = useState<string>('Hide');
    const [listData, setListData] = useState<{ [index: string]: ApplicationListItem[] }>({});
    const [showMPOGModal, setShowMPOGModal] = useState<boolean>(false);
    const [mpogCaseID, setMPOGCaseID] = useState<string>('');
    const [mpogOverride, setMPOGOverride] = useState<boolean>(false);
    const [showMedicationModal, setShowMedicationModal] = useState<boolean>(false);
    const [showMedicationExpandModal, setShowMedicationExpandModal] = useState<boolean>(false);
    const [medicationModalContext, setMedicationModalContext] = useState<MedicationModalContext|null>();
    const [medsList, setMedsList] = useState<Medication[]>([]);
    const [tciMap, setTciMap] = useState<{ [index: string]: TCI }>({});
    // Dose Table
    const [referenceTime, setReferenceTime] = useState<Date | null>(null);
    const [medTables, setMedTables] = useState<DoseTables>({});
    const [drugModels, setDrugModels] = useState<PKDrugModel[]>([])
    const [medData, setMedData] = useState<MedData | null>(null);
    const [medAdministrations, setMedAdministrations] = useState<MedAdministrations[] | null>(null);
    // const [_, setSurgicalLog] = useState<SurgicalLog | null>(null);
    const [anesthesiaStart, setAnesthesiaStart] = useState<Date | null>(null);
    const [anesthesiaEnd, setAnesthesiaEnd] = useState<Date | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);
    console.log('loading', loading)
    const [reloadFromEhr, setReloadFromEhr] = useState<boolean>(false);
    const [pullFromEhr, setPullFromEhr] = useState<boolean>(false);
    // EHR name shown in messages, from the API Ehr:DisplayName setting
    const [ehrName, setEhrName] = useState<string>('the EHR');

    // warning
    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [disclaimerOpen, setDisclaimerOpen] = useState<boolean>(false);

    const OnClickDisclaimerButton = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        setDisclaimerCookie("agree", 12).then(() => {
            setDisclaimerOpen(false);
        });
    }

    // reference for auto scroll down
    const scrollRef = useRef<HTMLDivElement>(null);

    // for auto generating graph
    const [graphList, setGraphList] = useState<Array<string>>([])

    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null; // Store interval reference

        console.log("dashboard");

        jwtPayload()
            .then(async (data) => {
                if (!data || !data.username) return;

                console.log("userdata", data);
                const username = data.username;
                setUsername(username);

                window.localStorage.setItem("LOGIN_USERID_FOR_ALLOWLIST", username);

                // Handle Captcha and Disclaimer Checks
                const loginUserId = window.localStorage.getItem("LOGIN_USERID_FOR_ALLOWLIST");
                const isFaculty = loginUserId?.toString().toLowerCase() === "4facultyan";
                const captchaDisabled = CaptchaDisabledList.includes(window.location.host);

                if (!captchaDisabled && !loginUserId) {
                    console.log("captchaLoginRedirect");
                    window.location.href = "/login";
                    return;
                }

                if (!isFaculty && !captchaDisabled) {
                    const disclaimerAgreement = window.localStorage.getItem("disclaimer_agreement") === "agree";
                    const disclaimerCookie = (await getDisclaimerCookie()) === "agree";
                    const captchaValue = window.localStorage.getItem("CAPTCHA_VALUE");
                    const captchaCookie = await getCaptchaCookie();

                    if (!disclaimerAgreement && !disclaimerCookie) {
                        window.location.href = "/disclaimercaptcha";
                        return;
                    } else if (!captchaValue && !captchaCookie) {
                        window.location.href = "/disclaimercaptcha";
                        return;
                    }
                }

                // Handle Disclaimer UI State
                if ((await getDisclaimerCookie()) === "agree") {
                    setDisclaimerOpen(false);
                } else {
                    setDisclaimerOpen(true);
                }

                load();
                setUpdateRefreshTime(true);

                if (fromEhr) {
                    console.log("settingInterval");

                    intervalId = setInterval(() => {
                        console.log("interval");
                        setPullFromEhr(true);
                        setUpdateRefreshTime(true);
                    }, 300000);
                }
            })
            .catch((err) => {
                console.log("error", err);
            });

        // Cleanup function to clear interval on unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, []); // Runs only on mount

    useEffect(() => {
        if (fromEhr) {
            getEhrClientConfig().then((ehrConfig) => setEhrName(ehrConfig.DisplayName));
        }
    }, [fromEhr]);

    useEffect(() => {
        console.log('pullFromEhr', pullFromEhr)
        if (pullFromEhr) {
            setPullFromEhr(false);

            console.log('Pulling new Med Data From EHR')
            loadMeds(true, false);

            setReloadFromEhr(true);
        }
    }, [pullFromEhr]);

    useEffect(() => {
        if (!mpogOverride && mpogCaseID !== '' && medsList.length !== 0) {
            getGetCaseFromMPOG({MPOG_CASE_ID: mpogCaseID}).then((res) => {
                const mpogMedList = res.oReturnObject
                console.log('CALLMPOG', mpogMedList, medsList)
                if (mpogMedList != null && mpogMedList.length === 0) {
                    console.log('No MPOG Data Found')
                    setMPOGOverride(true);
                    load(true);
                    return;
                } else if (mpogMedList != null) {
                    const medData = prepareMPOGData(mpogMedList, medsList)
                    console.log(medData)
                    if(medData != null) {
                        loadMPOGMeds(medData)
                    }
                }
            });
        }
    }, [mpogCaseID, medsList]);

    useEffect(() => {
        if (ageValue !== '' && weightValue !== '' && heightValue !== '') {
            console.log('maxTimeRefresh', maxTime)
            console.log('demographicsRefresh', ageValue, ageUnit, weightValue, weightUnit, heightValue)
            setUpdateRefreshTime(true);
            refreshDrugModels(ageValue, ageUnit, weightValue, weightUnit, heightValue, heightUnit, sex, null);
        }
    }, [maxTime]);

    useEffect(() => {
        if (drugModels != null && drugModels.length !== 0 && ageValue !== '' && weightValue !== '' && heightValue !== '') {
            console.log('drugModelsRefresh', drugModels, medTables)
            if (medTables != null && Object.keys(medTables).length !== 0) {
                console.log('drugModelsRefresh2', medTables)

                Object.keys(medTables).forEach((drug) => {
                    const modelID = medTables[drug].model_id;
                    const model = drugModels.find((model) => model.Model_ID === modelID);
                    if (model != null) {
                        medTables[drug].model = model;
                    }
                });

                setMedTables(medTables);

                refreshDataHandler();
            }
        }
    }, [drugModels]);

    useEffect(() => {
        if (medTables != null && Object.keys(medTables).length !== 0 && ageValue !== '' && weightValue !== '' && heightValue !== '') {
            console.log('medTablesRefresh', medTables)
            refreshDataHandler();
        }
    }, [medTables]);

    useEffect(() => {
        if (updateRefreshTime) {
            const time = new Date().toLocaleDateString('en-US', {hour: '2-digit', minute: '2-digit', hour12: true});
            console.log('refreshTime', time)
            setRefreshTime(time);
            setUpdateRefreshTime(false);
        }
    }, [updateRefreshTime]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [tciMap]);

    //////////////////////////////////

    const setDefaultCovariates = () => {
        setAgeValue('30');
        setAgeUnit('years');
        setWeightValue('80');
        setWeightUnit('kg');
        setHeightValue('180');
        setHeightUnit('cms');
        setSex('male');
        refreshDrugModels('30', 'years', '80', 'kg', '180', 'cms', 'male', null);
    }

    const loadMeds = (fromEhrLocal: boolean, loadAll: boolean) => {
        getMedications().then(resp => {
            const medsListRaw = resp.oReturnObject;
            console.log('medsList', medsListRaw, loadAll)

            if (medsListRaw == null) {
                console.log('No Meds Found')
                setMedsList([]);
                setLoading(false);
                return;
            }

            // Loading default loading graphs from DB
            if (graphList.length === 0) {
                setGraphList(medsListRaw.filter((med) => med.Load_Graph_Default).map((med) => med.Medication_Name));
            }
            // In DB units are all in 1 column need to split infusion vs bolus
            const processedMedsList = medsListRaw.map((med): Medication => (
                // Process which units are infusion vs bolus
                {
                    ...med,
                    Infusion_Units: med.Units.split(',').filter((unit: string) => unit.search('min') >= 0 || unit.search('hr') >= 0),
                    Bolus_Units: med.Units.split(',').filter((unit: string) => unit.search('min') <= 0 && unit.search('hr') <= 0),
                }
            ))

            console.log('processedMedsList', processedMedsList)

            setMedsList(processedMedsList);
            if (fromEhrLocal) {
                searchFHIR(processedMedsList).then((medData: MedData | null) => {
                    console.log('dashboardMedData', medData, loadAll)
                    if (medData != null) {
                        // When refreshing we need the following variables
                        console.log('metadata valid')
                        if (loadAll) {
                            console.log('loadingAll')
                            // Only need to pull these on initial page load.
                            setHeightUnit('cms');
                            setWeightUnit('kg');
                            setAgeUnit(medData.ageUnit);
                            setSex(medData.sexValue);
                            setAgeValue(medData.ageValue);
                            // Set to 1 decimal point
                            const weight = parseFloat(medData.weightValue).toFixed(1);
                            const height = parseFloat(medData.heightValue).toFixed(1);
                            setWeightValue(weight);
                            setWeightUnit(medData.weightUnit);
                            setHeightValue(height);
                            setHeightUnit(medData.heightUnit);
                            // Parse date from medData.anesthesiaStart
                            const startDate: Date = medData.anesthesiaStart !== null ? new Date(medData.anesthesiaStart) : new Date(new Date().setHours(12, 0, 0, 0));
                            //new Date().setHours(12, 0, 0, 0) how do I do this and end with a Date object?
                            setReferenceTime(startDate);
                            setProcedureName(medData.procedureName);
                            setProcedureLocation(medData.procedureLocation);
                            setPatientName(medData.patientName);
                            refreshDrugModels(medData.ageValue, medData.ageUnit, medData.weightValue, medData.weightUnit, medData.heightValue, medData.heightUnit, medData.sexValue, medData);
                        } else {
                            setMedData(medData);
                            setMedAdministrations(medData.medDataValue);
                        }
                        // setSurgicalLog(medData.surgicalLog);
                        setAnesthesiaStart(medData.anesthesiaStart);
                        setAnesthesiaEnd(medData.anesthesiaEnd);
                    } else {
                        setReferenceTime(new Date(new Date().setHours(12, 0, 0, 0)))
                    }
                    setLoading(false);
                }).catch((err) => {
                    console.log('error', err)
                });
            } else {
                setLoading(false);
            }
        });
    }

    const loadMPOGMeds = (medData: MedData | null) => {
        console.log('setting', medData)
        if (medData != null) {
            // When refreshing we need the following variables
            // setSurgicalLog(medData.surgicalLog);
            setAnesthesiaStart(medData.anesthesiaStart);
            setAnesthesiaEnd(medData.anesthesiaEnd);
            setHeightUnit('cms');
            setWeightUnit('kg');
            setAgeUnit(medData.ageUnit);
            setSex(medData.sexValue);
            setAgeValue(medData.ageValue);
            // Set to 1 decimal point
            const weight = parseFloat(medData.weightValue).toFixed(1);
            const height = parseFloat(medData.heightValue).toFixed(1);
            setWeightValue(weight);
            setWeightUnit(medData.weightUnit);
            setHeightValue(height);
            setHeightUnit(medData.heightUnit);
            const startDate: Date = medData.anesthesiaStart !== null ? new Date(medData.anesthesiaStart) : new Date(new Date().setHours(12, 0, 0, 0));
            setReferenceTime(startDate);
            setProcedureName(medData.procedureName);
            setProcedureLocation(medData.procedureLocation);
            setShowMPOGModal(false);
            setUpdateRefreshTime(true);
            refreshDrugModels(medData.ageValue, medData.ageUnit, medData.weightValue, medData.weightUnit, medData.heightValue, medData.heightUnit, medData.sexValue, medData);
        }
        setLoading(false);
    }

    const load = (override: boolean = false) => {
        setLoading(true);
        // get Query Params MPOG_CASE_ID
        const MPOG_CASE_ID = new URLSearchParams(location.search).get('MPOG_CASE_ID');
        console.log('TEST', MPOG_CASE_ID)

        if (MPOG_CASE_ID != null && !override) {
            console.log('testMPOG')
            setMPOGCaseID(MPOG_CASE_ID);
            setLockedCovariates(true);
            setLockedDoseTable(true);
        } else if (fromEhr && !override) {
            setLockedCovariates(true);
            setLockedDoseTable(true);
        } else {
            setReferenceTime(new Date(new Date().setHours(12, 0, 0, 0)));
            setDefaultCovariates();
        }

        getLists({}).then((res) => {
            console.log('res', res)
            const newData: { [index: string]: ApplicationListItem[] } = {}
            if (res != null && res.bSuccess) {
                const data = res.oReturnObject
                if (data != null && data.length > 0) {
                    data.forEach((item) => {
                        if (newData.hasOwnProperty(item.List_Group_Name)) {
                            newData[item.List_Group_Name].push(item)
                        } else {
                            newData[item.List_Group_Name] = [item]
                        }
                    });
                    setListData(newData)
                    console.log('listData', newData)
                }
            }
        })
        console.log('loadMeds', !override)
        loadMeds(fromEhr && !override, true);
    }

    const refreshDrugModels = (age: string, ageU: string, weight: string, weightU: string,
                               height: string, heightU: string, sex: string, medData: MedData|null) => {
        console.log('units', age, ageU, weight, weightU, height, heightU, sex);

        getDrugModels({
            age: parseFloat(age) / (ageU.toLowerCase() === 'years' ? 1 : 12),
            height: parseFloat(height) * (heightU.toLowerCase() === 'inches' ? 2.54 : 1),
            weight: parseFloat(weight) * (weightU.toLowerCase() === 'lb' ? 0.4535924 : 1),
            sex: sex === 'male' ? 'm' : 'f'
        }).then(resp => {
            const drugModels = resp.oReturnObject;

            if (resp.bSuccess && drugModels != null) {
                setDrugModels(drugModels);

                if (medData != null) {
                    setMedAdministrations(medData.medDataValue);
                }
            } else {
                setModalOpen(true);
                setTciMap({});
            }
        });
    }

    const refreshDataHandler = () => {
        if (referenceTime == null) {
            setLoading(false)
            return;
        }
        const newTCIMap = refreshData(
            sex, weightValue, weightUnit, heightValue, heightUnit, ageValue, ageUnit, medTables,
            tciMap, fromEhr, anesthesiaStart, anesthesiaEnd, maxTime, referenceTime, mpogCaseID
        )
        if (newTCIMap != null) {
            setTciMap(newTCIMap);
        }

        getSurgicalID().then((res) => {
            const logObject = {
                "provider": username,
                "age": ageValue,
                "age_unit": ageUnit,
                "weight": weightValue,
                "weight_unit": weightUnit,
                "height": heightValue,
                "height_unit": heightUnit,
                "sex": 'male' === sex ? 'm' : 'f',
                "med_tables": medTables != null ? JSON.stringify(medTables) : '',
                "med_data": medData != null ? JSON.stringify(medData) : '',
                "case_id": mpogCaseID != null && mpogCaseID !== '' ? mpogCaseID : fromEhr ? res : null,
                "reference_time": referenceTime.toLocaleString(),
                "max_time": maxTime,
                "failure_reason": null
            }

            saveGraphLog(logObject).then((res) => {
                if (res.bSuccess) {
                    console.log('Log Saved')
                }
            });
            setSaving(false)
            setLoading(false)
        });
    }

    const setMedicationModalContextFunc = (drug: string, expandMode: boolean = false) => {
        const medicationContext: MedicationModalContext = {
            tci: tciMap[drug],
            tci_unit: tciMap[drug].pkModel.tci_unit,
            title: refreshTime,
            drug,
            drugModels: drugModels,
            medsList: medsList,
            referenceTime: referenceTime,
            effectSiteStyle: effectSiteStyle,
            plasmaStyle: plasmaStyle,
            modelName: tciMap[drug].pkModel.Model_Name,
            medTable: medTables[drug],
            listData: listData,
            sex,
            weightValue,
            weightUnit,
            heightValue,
            heightUnit,
            ageValue,
            ageUnit,
            anesthesiaStart,
            anesthesiaEnd,
            maxTime
        };
        setMedicationModalContext(medicationContext);
        if (expandMode) {
            setShowMedicationExpandModal(true)
        } else {
            setShowMedicationModal(true);
        }
    }

    const closeMedicationModal = () => {
        setShowMedicationModal(false);
        setShowMedicationExpandModal(false);
        setMedicationModalContext(null)
    }

    const expandGraph = (med: string): void => {
        setMedicationModalContextFunc(med, true)
    }

    return (
        <>
            {
                referenceTime === null &&
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            }
            {
                referenceTime !== null &&
                <Suspense fallback={<div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>}>
                    {medicationModalContext != null &&
                        <MedicationGraphModal
                            isOpen={showMedicationModal || showMedicationExpandModal}
                            onCancelAction={closeMedicationModal}
                            medicationContext={medicationModalContext}
                            concentrationTarget={concentrationTarget}
                            mpogCaseID={mpogCaseID}
                            fromEhr={fromEhr}
                            locked={false}
                        />
                    }
                    <MPOGSearchModal
                        showMPOGModal={showMPOGModal}
                        onCancelAction={() => setShowMPOGModal(false)}
                        loadMPOGMedsAction={loadMPOGMeds}
                        medsList={medsList}
                    />

                    <div className="grid grid-cols-6 gap-2">
                        <div className="col-start-1 col-span-6">
                            <PatientCovariates
                                ageValue={ageValue}
                                setAgeValue={setAgeValue}
                                ageUnit={ageUnit}
                                setAgeUnit={setAgeUnit}
                                weightValue={weightValue}
                                setWeightValue={setWeightValue}
                                weightUnit={weightUnit}
                                setWeightUnit={setWeightUnit}
                                heightValue={heightValue}
                                setHeightValue={setHeightValue}
                                heightUnit={heightUnit}
                                setHeightUnit={setHeightUnit}
                                sex={sex}
                                setSex={setSex}
                                regenerateTitle={() => setUpdateRefreshTime(true)}
                                refreshDrugModels={refreshDrugModels}
                                disabled={lockedCovariates}
                                setDisabled={setLockedCovariates}
                                procedureName={procedureName}
                                procedureLocation={procedureLocation}
                                patientName={patientName}
                                setModalOpen={setModalOpen}
                            />

                        </div>
                        {
                            mpogOverride &&
                            <div style={{color: 'red'}} className="col-start-1 col-span-6">
                                Unable to find MPOG Case ID: {mpogCaseID}, loading default view
                            </div>
                        }
                        <div className="col-span-6">
                            {/* <div style={{ overflowY: 'auto', maxHeight: '560px' }} ref={scrollRef}> */}
                            <div ref={scrollRef}>
                                {saving &&
                                    <div className="flex justify-center items-center h-64">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                                    </div>
                                }
                                {!saving &&
                                    <div className="grid grid-cols-6 gap-2 mt-3">
                                        {tciMap != null && Object.keys(tciMap).length !== 0 && Object.keys(tciMap).map(drug => {
                                            const numEnabled = (Object.keys(tciMap).filter(med => graphList.includes(med))).length
                                            return !graphList.includes(drug) ?
                                                // show the graph only if the drug is selected in graph option
                                                // when loaded from the EHR, only dex, remi, prop, and sufen are automatically selected (if they exist)
                                                <Fragment key={drug}/> :
                                                <div
                                                    className={numEnabled === 1 ? 'col-span-6' : numEnabled === 2 ? 'col-span-3' : 'col-span-2'}
                                                    key={drug}>
                                                    <Graph
                                                        tci={tciMap[drug]}
                                                        tci_enabled_count={(Object.keys(tciMap).filter(med => graphList.includes(med))).length}
                                                        tci_unit={tciMap[drug].pkModel.tci_unit}
                                                        drug={drug}
                                                        drugModels={drugModels}
                                                        medsList={medsList}
                                                        referenceTime={referenceTime}
                                                        effectSiteStyle={effectSiteStyle}
                                                        plasmaStyle={plasmaStyle}
                                                        modelName={tciMap[drug].pkModel.Model_Name}
                                                        expandGraphAction={expandGraph}
                                                        fullSize={false}
                                                        maxTime={maxTime}
                                                        concentrationTarget={concentrationTarget}
                                                    />
                                                </div>
                                        })}

                                    </div>
                                }
                                {
                                    // If no graphs are enabled, show a message
                                    tciMap != null && Object.keys(tciMap).length !== 0 && !Object.keys(tciMap).some(graph => graphList.includes(graph)) &&
                                    <div style={{textAlign: 'center', marginTop: '200px'}}>
                                        <h1>No Graphs Enabled</h1>
                                        <h2>Go to Graph Options to enable graphs</h2>
                                    </div>
                                }
                                {
                                    (tciMap == null || Object.keys(tciMap).length === 0) &&
                                    <div className="text-center mt-5">
                                        <h3>No Data to Display</h3>
                                        <h4>{lockedDoseTable ? `Graphs will appear once administrations are documented in ${ehrName}` : 'Please enter some Medications into the Dose History'}</h4>
                                        {(lockedCovariates && anesthesiaStart == null) &&
                                            <h4>Anesthesia Start is not detected. Please relaunch from {ehrName} after
                                                documenting Anesthesia Start</h4>}
                                    </div>
                                }
                            </div>
                            {tciMap != null && Object.keys(tciMap).length !== 0 && Object.keys(tciMap).some(graph => graphList.includes(graph)) &&
                                <p className="text-sm text-slate-500 mt-2 text-center">
                                    Unvalidated pump data won&apos;t appear. If infusion data is missing, validate it in {ehrName} and refresh the TIVA Model.
                                </p>
                            }
                        </div>

                        <div className="col-start-1 col-span-4 rounded-lg bg-[#90EE90]">
                            <DoseSection
                                medTables={medTables}
                                referenceTime={referenceTime}
                                onReferenceTimeChange={setReferenceTime}
                                onChange={setMedTables}
                                listData={listData}
                                medsList={medsList}
                                drugModels={drugModels}
                                setMedicationModalContext={setMedicationModalContextFunc}
                                lockedDoseTable={lockedDoseTable}
                                reloadFromEhr={reloadFromEhr}
                                setReloadFromEhr={setReloadFromEhr}
                                medAdministrations={medAdministrations}
                                anesthesiaStart={anesthesiaStart}
                                anesthesiaEnd={anesthesiaEnd}
                                style={{flex: '1'}}
                                ageValue={ageValue}
                                ageUnit={ageUnit}
                                weightValue={weightValue}
                                weightUnit={weightUnit}
                                heightValue={heightValue}
                                heightUnit={heightUnit}
                                sex={sex}
                                maxTime={maxTime}
                                fromEhr={fromEhr}
                                ehrName={ehrName}
                                mpogCaseID={mpogCaseID}
                                setSaving={setSaving}
                            />
                        </div>

                        <div className="col-span-2 rounded-lg border-[#ADD8E6] bg-[#ADD8E6]">
                            <GraphOptions
                                maxTime={maxTime}
                                setMaxTime={setMaxTime}
                                plasmaStyle={plasmaStyle}
                                setPlasmaStyle={setPlasmaStyle}
                                effectSiteStyle={effectSiteStyle}
                                setEffectSiteStyle={setEffectSiteStyle}
                                concentrationTarget={concentrationTarget}
                                setConcentrationTarget={setConcentrationTarget}
                                listData={listData}
                                medTables={medTables}
                                graphList={graphList}
                                setGraphList={setGraphList}
                                style={{flex: '1'}}
                            />
                        </div>
                    </div>
                    {/*<Button color="primary" onClick={() => setShowMPOGModal(true)}>Search By MPOG Case</Button>*/}
                    <br/>
                    {modalOpen ? <PopoutWindow modalOpen={modalOpen} setModalOpen={setModalOpen}/> : <></>}

                    <Dialog open={disclaimerOpen} onOpenChange={setDisclaimerOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Disclaimer</DialogTitle>
                                <DialogDescription>
                                    {DISCLAIMER_TEXT}
                                </DialogDescription>
                                <DialogFooter>
                                    <Button onClick={OnClickDisclaimerButton}>I Agree</Button>
                                </DialogFooter>
                            </DialogHeader>
                        </DialogContent>
                    </Dialog>
                </Suspense>
            }
        </>
    );
};

export default Dashboard;