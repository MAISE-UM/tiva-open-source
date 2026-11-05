'use client'
import React, {useEffect, useState} from 'react';
import Cookies from "js-cookie";
import {
    ApplicationListItem,
    DoseTable,
    DoseTables,
    MedAdministrations,
    Medication,
    PKDrugModel
} from "@/app/utils/interfaces";
import { createDoseTableEntries, getMinDiff } from '@/lib/med-helpers';
import { initTCI } from '@/model/initTCI';
import { saveGraphLog } from '@/api/logs-api';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { Button } from '@/components/ui/button';
import {Label} from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {Card, CardContent} from "@/components/ui/card";
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {isMoment, Moment} from "moment";
import DoseTableComponent from "@/components/dashboard/subComponents/DoseTableComponent";

interface DoseSectionProps {
    medTables: DoseTables;
    referenceTime: Date;
    onReferenceTimeChange: (value: Date) => void;
    onChange: (medTables: DoseTables) => void;
    listData: {[index: string]:ApplicationListItem[]};
    medsList: Medication[];
    drugModels: PKDrugModel[];
    lockedDoseTable: boolean;
    setMedicationModalContext: (drug: string) => void;
    reloadFromEhr: boolean;
    setReloadFromEhr: (reload: boolean) => void;
    medAdministrations: MedAdministrations[]|null;
    anesthesiaStart: Date | null;
    anesthesiaEnd: Date | null;
    style?: React.CSSProperties;
    ageValue: string;
    ageUnit: string;
    weightValue: string;
    weightUnit: string;
    heightValue: string;
    heightUnit: string;
    sex: string;
    maxTime: number;
    fromEhr: boolean;
    // EHR name shown in messages (Ehr:DisplayName)
    ehrName?: string;
    mpogCaseID: string;
    setSaving: (saving: boolean) => void;
}

const DoseSection: React.FC<DoseSectionProps> = ({
    medTables,
    referenceTime,
    onReferenceTimeChange,
    listData,
    medsList,
    onChange,
    drugModels,
    lockedDoseTable,
    setMedicationModalContext,
    medAdministrations,
    anesthesiaStart,
    anesthesiaEnd,
    ageValue,
    ageUnit,
    weightValue,
    weightUnit,
    heightValue,
    heightUnit,
    sex,
    maxTime,
    fromEhr,
    ehrName = 'the EHR',
    mpogCaseID,
    setSaving
}) => {
    const [activeTab, setActiveTab] = useState('');
    const [dropdownDrug, setDropdownDrug] = useState<string>('');
    const [medTablesLocal, setMedTablesLocal] = useState<DoseTables>({});
    const [medTablesEhr, setMedTablesEhr] = useState<DoseTables>({});

    useEffect(() => {
        console.log('medAdministrations', medAdministrations)
        if (medAdministrations != null) {
            console.log('check', anesthesiaStart)
            if (anesthesiaStart == null) {
                console.log('no anesthesia start')
                return;
            }

            const newMedTables: DoseTables = {};

            console.log('medData', medAdministrations)

            // Create DoseTable entries
            medAdministrations.forEach((med) => {
                const newDoseTable = createDoseTableEntries(med, medsList, drugModels, anesthesiaEnd)
                if(newDoseTable != null && newDoseTable.rows.length > 0) {
                    newMedTables[newDoseTable.med] = newDoseTable
                }
            });
            console.log('newMedTables', newMedTables)
            setMedTablesLocal(newMedTables);
            setMedTablesEhr(newMedTables);
            onSave(newMedTables);
        }
    }, [medAdministrations]);

    useEffect(() => {
        if(Object.keys(medTablesLocal).length === 0 && Object.keys(medTables).length > 0) {
            console.log('initial Set')
            setMedTablesLocal(medTables);
        }
        if(Object.keys(medTablesEhr).length === 0 && Object.keys(medTables).length > 0) {
            console.log('initial Set2')
            setMedTablesEhr(structuredClone(medTables));
        }
        if (Object.keys(medTables).length > 0 && activeTab === '') {
            setActiveTab(Object.keys(medTables)[0]);
        }
        if(medsList != null && medsList.length > 0 && dropdownDrug === '') {
            setDropdownDrug(medsList[0]['Medication_Name']);
        }
    }, [medTables, medsList]);

    const toggle = (tab: string) => {
        if (activeTab !== tab) setActiveTab(tab);
    };

    const handleAddDrugChange = (value: string) => {
        setDropdownDrug(value);
    };

    const onAddRow = () => {
        // If the active tab is not in the medTablesLocal, then add it
        if(!Object.keys(medTablesLocal).includes(dropdownDrug)) {
            const model_id_arr_default = drugModels.filter((model: PKDrugModel) => model.Medication_Name.toLowerCase() === dropdownDrug.toLowerCase() && model.default_model);
            const model_id_arr = drugModels.filter((model: PKDrugModel) => model.Medication_Name.toLowerCase() === dropdownDrug.toLowerCase());
            console.log('model_id_arr_default', model_id_arr_default);
            console.log('model_id_arr', model_id_arr);

            let model_id = -1;
            let model_name: string;
            if(model_id_arr_default.length > 0) {
                model_id = model_id_arr_default[0].Model_ID;
                model_name = model_id_arr_default[0].Model_Name;
            } else if(model_id_arr.length > 0) {
                model_id = model_id_arr[0].Model_ID;
                model_name = model_id_arr[0].Model_Name;
            } else {
                model_id = 0;
                model_name = '';
            }

            const model = drugModels.filter((model: PKDrugModel) => model.Model_ID === model_id)[0];

            setMedTablesLocal({
                ...medTablesLocal,
                [dropdownDrug]: {
                    med: dropdownDrug,
                    model_id,
                    model_name,
                    model,
                    tci: initTCI(model),
                    rows: [],
                    failure_reason: null
                }
            });
        }
        toggle(dropdownDrug);
    }

    const setMedTable = (medTable: DoseTable) => {
        const newMedTables = {
            ...medTablesLocal, // Create a shallow copy of the current state
            [activeTab]: medTable // Update the property for the active tab
        };
        // console.log('newMedTables', newMedTables);
        setMedTablesLocal(newMedTables);
    }

    const setModel = (med: string, model_name: string) => {
        const medTableCopy = medTablesLocal[med];
        medTableCopy.model_name = model_name;
        medTableCopy.model_id = drugModels.filter((model: PKDrugModel) => model.Medication_Name.toLowerCase() === med.toLowerCase() && model.Model_Name === model_name)[0].Model_ID;
        medTableCopy.model = drugModels.filter((model: PKDrugModel) => model.Medication_Name.toLowerCase() === med.toLowerCase() && model.Model_Name === model_name)[0];
        const newMedTables = {
            ...medTablesLocal, // Create a shallow copy of the current state
            [med]: medTableCopy // Update the property for the active tab
        };
        console.log('newMedTables', newMedTables);
        setMedTablesLocal(newMedTables);
        onSave(newMedTables);
    }

    const onSave = (tables: DoseTables) => {
        if(Object.keys(tables).length > 0) {
            setSaving(true);
        }
        console.log('saving Start')
        console.log('tables', tables)
        const medTablesNew = structuredClone(tables);

        // Do Cleanup
        Object.keys(medTablesNew).forEach((med) => {
            // Reset every table tci to initTCI
            medTablesNew[med].tci = initTCI(medTablesNew[med].model);
            // Sort rows based off of time in HH:mm format assume that anesRefTime is the most recent time. If a time before that is found it is the next day
            medTablesNew[med].rows = medTablesNew[med].rows.sort((a, b) => {
                if(a.time == null || b.time == null) {
                    return 0;
                }
                return a.time > b.time ? 1 : -1;
            });
        });

        // Do Validation
        let failed = false;
        Object.keys(medTablesNew).forEach((med) => {
            let failedReason: null|string = null;
            // CHECK 1: Check to see if multiple start infusion events
            let infusionRunning = false;
            // console.log('checking Table', med, medTablesNew[med])
            if(medTablesNew[med].rows.length === 0) {
                failedReason = `Inconsistent medication documentation, cannot calculate graphs`;
            }
            if(failedReason === null) {
                medTablesNew[med].rows.forEach((row) => {
                    // console.log('checking row', row, 'infusionRunning', infusionRunning, 'failedReason', failedReason)
                    if (row.event === 'Start Infusion') {
                        if (infusionRunning) {
                            failedReason = `Can only have one infusion running at a time`;
                        }
                        infusionRunning = true;
                    }
                    if (row.event === 'Stop Infusion' || row.event === 'Dose Change') {
                        if (!infusionRunning) {
                            failedReason = `Infusions must be started with a "Start Infusion" event`;
                        }
                    }
                    if (row.event === 'Stop Infusion') {
                        infusionRunning = false;
                    }
                });
            }
            if (failedReason !== null) {
                medTablesNew[med].failure_reason = failedReason;
                failed = true;
            } else {
                medTablesNew[med].failure_reason = null;
            }
        });

        console.log('failed', failed)

        // for updating reference time
        Object.keys(medTablesNew).forEach((med) => {
            // Reset every table tci to initTCI
            for (const row of medTablesNew[med].rows) {
                row.timeSinceFirstEvent = getMinDiff(row.time, medTablesNew[med].rows[0].time);
            }
            medTablesNew[med].tci = initTCI(medTablesNew[med].model);
        });
        onChange(medTablesNew);

        Object.keys(medTablesNew).forEach((med) => {
            if(medTablesNew[med].failure_reason !== null) {
                const logObject = {
                    "provider": Cookies.get('X-Username'),
                    "age": parseFloat(ageValue),
                    "age_unit": ageUnit,
                    "weight": parseFloat(weightValue),
                    "weight_unit": weightUnit,
                    "height": parseFloat(heightValue),
                    "height_unit": heightUnit,
                    "sex": 'male' === sex ? 'm' : 'f',
                    "med_tables": JSON.stringify(medTablesNew[med]),
                    "med_data": null,
                    "case_id": mpogCaseID != null && mpogCaseID !== '' ? mpogCaseID : fromEhr ? Cookies.get('X-SurgicalID') : null,
                    "reference_time": referenceTime.toLocaleString(),
                    "max_time": maxTime,
                    "failure_reason": medTablesNew[med].failure_reason
                }

                saveGraphLog(logObject).then((res) => {
                    if(res.bSuccess) {
                        console.log('Log Saved')
                    }
                });
            }
        });
        setMedTablesLocal(medTablesNew);
    }

    const onRemoveMed = (med: string) => {
        const newMedTables = medTablesLocal;
        delete newMedTables[med];
        setMedTablesLocal(newMedTables);
        setActiveTab(medTablesLocal[Object.keys(newMedTables)[Object.keys(newMedTables).length-1]].med);
    }

    const updateReferenceTime = (time: string|Moment|FocusEvent) => {
        if(isMoment(time)) {
            onReferenceTimeChange(time.toDate());
            onSave(medTablesLocal);
        } else if (typeof time === 'string') {
            console.log('TIMEVALREC', time)
            onReferenceTimeChange(new Date(time))
            onSave(medTablesLocal);
        }
    }

    return (
        <div className="bg-[#90EE90] min-h-[200px] p-5 flex-1 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Dose History</h2>
            {(medsList == null || medsList.length === 0) && (
                <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            )}
            {medsList != null && medsList.length > 0 && (
                <>
                    <div className="flex flex-col md:flex-row mb-3 gap-4">
                        <div className="flex-1">
                            <div className="flex items-center">
                                <Label htmlFor="referenceTime" className="mr-2">
                                    Graph Start Time:
                                </Label>
                                <DateTimePicker value={referenceTime} onChange={updateReferenceTime} disabled={false} />
                            </div>
                        </div>
                        <div className="flex-1 flex justify-end items-center">
                            {!lockedDoseTable ? (
                                <>
                                    <Select onValueChange={handleAddDrugChange} value={dropdownDrug}>
                                        <SelectTrigger className="w-[180px] mr-2">
                                            <SelectValue placeholder="Select medication" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {medsList?.map((drug) => (
                                                <SelectItem key={drug.Medication_Name} value={drug.Medication_Name}>
                                                    {drug.Medication_Name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={onAddRow} id="add-med-button">
                                        Add Med
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center">
                                    <span className="mr-2">History & Data Last Updated At:</span>
                                    <div className="bg-white p-2 rounded-full">
                                        <strong>
                                            {new Date().toLocaleDateString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
                                        </strong>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <Card>
                        <CardContent className="p-4">
                            {Object.keys(medTablesLocal).length === 0 ? (
                                <h1 className="text-xl font-semibold">
                                    {lockedDoseTable ? `Document Med Administrations in ${ehrName}` : "Add a med to begin"}
                                </h1>
                            ) : (
                                <Tabs value={activeTab} onValueChange={toggle}>
                                    <TabsList className="grid grid-cols-2 lg:grid-cols-4">
                                        {Object.keys(medTablesLocal).map((med) => (
                                            <TabsTrigger
                                                key={med}
                                                value={med}
                                                className={medTablesLocal[med].failure_reason !== null ? "bg-red-500 text-white" : ""}
                                            >
                                                {med}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    {Object.keys(medTablesLocal).map((med, index) => (
                                        <TabsContent key={med} value={med}>
                                            <div className="flex items-center mb-4">
                                                <Label htmlFor={`model-${med}`} className="mr-2 font-bold">
                                                    Model:
                                                </Label>
                                                <Select onValueChange={(value) => setModel(med, value)} value={medTablesLocal[med].model_name}>
                                                    <SelectTrigger id={`model-${med}`}>
                                                        <SelectValue placeholder="Select model" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {drugModels
                                                            .filter((drug) => drug.Medication_Name.toLowerCase() === med.toLowerCase())
                                                            .map((model) => (
                                                                <SelectItem key={model.Model_Name} value={model.Model_Name}>
                                                                    {model.Model_Name}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <DoseTableComponent
                                                medTable={medTablesLocal[med]}
                                                listData={listData}
                                                setMedTable={setMedTable}
                                                referenceTime={referenceTime}
                                                onSave={() => onSave(medTablesLocal)}
                                                onRemoveMed={onRemoveMed}
                                                medsList={medsList}
                                                index={index}
                                                lockedDoseTable={lockedDoseTable}
                                                showDelete={true}
                                            />
                                            {lockedDoseTable && (
                                                <Button onClick={() => setMedicationModalContext(med)} className="mt-4">
                                                    Preview Changes
                                                </Button>
                                            )}
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
            <div className="mb-5" />
        </div>
    );
};

export default DoseSection;