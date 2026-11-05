'use client'
import React, {useEffect, useState} from "react";
import html2canvas from "html2canvas";
import {DoseTable, MedicationModalContext, TCI} from "@/app/utils/interfaces";
import {initTCI} from "@/model/initTCI";
import processTCI from "@/model/processTCI";
import { getMinDiff } from "@/lib/med-helpers";
import {saveGraphLog} from "@/api/logs-api";
import {SplitBySides} from "@/app/admin/api-edit/sub-components/General";
import {DateTimePicker} from "@/components/shared/DateTimePicker";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {usePermissions} from "@/app/contexts/PermissionContext";
import Cookies from "js-cookie";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";
import {isMoment, Moment} from "moment/moment";
import Graph from "@/components/dashboard/subComponents/Graph";
import DoseTableComponent from "@/components/dashboard/subComponents/DoseTableComponent";

interface MedicationGraphModalProps {
    isOpen: boolean;
    onCancelAction: () => void;
    medicationContext: MedicationModalContext;
    concentrationTarget: string;
    mpogCaseID: string;
    locked: boolean;
    fromEhr: boolean;
}

export const MedicationGraphModal: React.FC<MedicationGraphModalProps> = ({
    isOpen,
    onCancelAction,
    medicationContext,
    concentrationTarget,
    locked,
    mpogCaseID,
    fromEhr
}) => {
    const {userPayload} = usePermissions();
    const [loading] = useState<boolean>(false);
    const [medTableLocal, setMedTableLocal] = useState<DoseTable>()
    const [tciLocal, setTciLocal] = useState<TCI>()
    const [refresh, setRefresh] = useState(false)
    const [localReferenceTime, setLocalReferenceTime] = useState<Date|null>(null)

    const ref = React.createRef<HTMLDivElement>();

    const {
        drug,
        tci,
        tci_unit,
        drugModels,
        medsList,
        effectSiteStyle,
        plasmaStyle,
        modelName,
        medTable,
        listData,
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
    } = structuredClone(medicationContext);

    useEffect(() => {
        if(medTableLocal == null || tciLocal == null) {
            console.log('LOAD', medicationContext)
            setMedTableLocal(medTable)
            setTciLocal(tci)
            setRefresh(true)
            setLocalReferenceTime(medicationContext.referenceTime)
        }
    }, [medTable, medTableLocal, medicationContext, tci, tciLocal]);

    useEffect(() => {
        if(refresh) {
            console.log('REFRESHING GRAPH')
            setRefresh(false)
            refreshData()
        }
    }, [refresh, setRefresh]);
    
    const refreshData = () => {
        if(medTableLocal == null || tciLocal == null || localReferenceTime == null) {
            return;
        }
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

        console.log('med table', medTableLocal)

        const localMedTable = structuredClone(medTableLocal);
        localMedTable.rows = localMedTable.rows.filter(row => row.event !== '-- Choose Event --')
        const hasFailedTable = medTableLocal.failure_reason != null;
        console.log('hasFailedTable', hasFailedTable)

        localMedTable.tci = initTCI(medTable.model);
        
        let newTci = { ...tciLocal };

        if (hasFailedTable) {
            console.log('newTciMap', newTci)
            setTciLocal(undefined);
            // setLoading(false);
            return;
        }

        if (anesthesiaStart == null) {
            console.log('aneStartNull')
            newTci = processTCI(localMedTable, pDemographics, maxTime, 0, localReferenceTime);
            setTciLocal(newTci);
            return
        }

        let missingTime: number;
        if(anesthesiaEnd != null) {
            const lastEventTime = localMedTable.rows[localMedTable.rows.length - 1].time;
            missingTime = getMinDiff(anesthesiaEnd, lastEventTime);
            console.log('missingTime', missingTime)
        } else {
            // num of min since reference time
            const currentTime = new Date();
            const lastEventTime =  localMedTable.rows[localMedTable.rows.length - 1].time

            const endTime = (lastEventTime === null || lastEventTime < currentTime) ? currentTime : lastEventTime;

            // num of min between referenceTime and endTime
            missingTime = getMinDiff(endTime, lastEventTime)
            console.log('missingTime', missingTime, getMinDiff(endTime, lastEventTime))
        }

        console.log('localMedTable', localMedTable, maxTime, missingTime, 0);
        newTci = processTCI(structuredClone(localMedTable), pDemographics, maxTime, missingTime, localReferenceTime);

        console.log('newTci', newTci)
        setTciLocal(newTci);
    }

    const onSave = (newReferenceTime: Date) => {
        console.log('onSave', newReferenceTime)
        if(medTableLocal != null) {
            const newMedTable = structuredClone(medTableLocal)

            newMedTable.tci = initTCI(newMedTable.model)
            newMedTable.rows = newMedTable.rows.sort((a, b) => {
                if(a.time == null || b.time == null) {
                    return 0;
                }
                return a.time < b.time ? -1 : 1;
            });

            // Do Validation
            let failed = false;
            let failedReason: null | string = null;
            // CHECK 1: Check to see if multiple start infusion events
            let infusionRunning = false;
            // console.log('checking Table', med, medTablesLocal[med])
            newMedTable.rows.forEach((row) => {
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
            if (failedReason !== null) {
                newMedTable.failure_reason = failedReason;
                failed = true;
            } else {
                newMedTable.failure_reason = null;
            }

            console.log('failed', failed)

            // const newLocalReferenceTime = newReferenceTime != null ? newReferenceTime : localReferenceTime;

            // for updating reference time
            // Reset every table tci to initTCI
            for (const row of newMedTable.rows) {
                row.timeSinceFirstEvent = getMinDiff(row.time, newMedTable.rows[0].time);
            }
            newMedTable.tci = initTCI(newMedTable.model);

            const logObject = {
                "provider": userPayload == null ? 'Unknown' : userPayload.username,
                "age": parseFloat(ageValue),
                "age_unit": ageUnit,
                "weight": parseFloat(weightValue),
                "weight_unit": weightUnit,
                "height": parseFloat(heightValue),
                "height_unit": heightUnit,
                "sex": 'male' === sex ? 'm' : 'f',
                "med_tables": JSON.stringify(newMedTable),
                "med_data": null,
                "case_id": mpogCaseID != null && mpogCaseID !== '' ? mpogCaseID : fromEhr ? Cookies.get('X-SurgicalID') : null,
                "reference_time": localReferenceTime == null ? '' : localReferenceTime.toLocaleString(),
                "max_time": maxTime,
                "failure_reason": failedReason
            }

            saveGraphLog(logObject).then((res) => {
                if(res.bSuccess) {
                    console.log('Log Saved')
                }
            });

            setMedTableLocal(newMedTable)
            console.log('refreshSet')
            setRefresh(true);
        }
    }

    const setMedTable = (medTable: DoseTable) => {
        const newMedTable = {...medTable}
        setMedTableLocal(newMedTable)
    }

    const updateReferenceTime = (time: string|Moment|FocusEvent) => {
        if(isMoment(time)) {
            setLocalReferenceTime(time.toDate())
            onSave(time.toDate());
        } else if (typeof time === 'string') {
            setLocalReferenceTime(new Date(time))
            onSave(new Date(time));
        }
    }

    const saveAsImage = (drug: string) => {
        if(ref != null && ref.current != null) {
            html2canvas(ref.current).then(canvas => {
                const image = canvas.toDataURL('image/png', 1.0);

                // Create a link to download the image
                const downloadLink = document.createElement('a');
                // date in form of yyyy-mm-dd
                const dateStr = new Date().toISOString().split('T')[0];
                downloadLink.href = image;
                downloadLink.download = `${drug}-${dateStr}.png`;
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }).catch(err => {
                console.error('Error capturing render as image:', err);
            });
        }
    }

    const onOpenChange = (open: boolean) => {
        if(!open)
            onCancelAction();
    }

    return (
        <Dialog
            open={isOpen}
            onOpenChange={onOpenChange}
        >
            {/*Dialogs focus first element on page by default this causes the time picker to open*/}
            <DialogContent className='max-w-[90%] max-h-[90vh] overflow-y-auto' onOpenAutoFocus={(e: Event) => e.preventDefault()}>
                {
                    loading &&
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                }
                <DialogHeader>
                    <DialogTitle>{drug} Model</DialogTitle>
                </DialogHeader>
                {
                    localReferenceTime !== null && <div ref={ref}>
                        <div ref={ref} className="space-y-4">
                            <div className="w-full">
                                {tciLocal != null && (
                                    <Graph
                                        tci={tciLocal}
                                        tci_enabled_count={1}
                                        tci_unit={tci_unit}
                                        drug={drug}
                                        drugModels={drugModels}
                                        medsList={medsList}
                                        referenceTime={localReferenceTime}
                                        effectSiteStyle={effectSiteStyle}
                                        plasmaStyle={plasmaStyle}
                                        modelName={modelName}
                                        expandGraphAction={() => {}}
                                        fullSize={true}
                                        concentrationTarget={concentrationTarget}
                                        maxTime={maxTime}
                                    />
                                )}
                            </div>
                            <Card className="w-full md:w-1/2 mx-auto">
                                <CardContent className="flex justify-center items-center space-x-2 py-4">
                                    <span className="text-sm font-medium">Graph Start Time:</span>
                                    <DateTimePicker
                                        disabled={locked}
                                        value={localReferenceTime}
                                        onChange={(date: string|Moment|FocusEvent) => updateReferenceTime(date)}
                                    />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Dose History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {medTableLocal && (
                                        <DoseTableComponent
                                            medTable={medTableLocal}
                                            listData={listData}
                                            setMedTable={setMedTable}
                                            referenceTime={localReferenceTime}
                                            onSave={() => onSave(localReferenceTime)}
                                            onRemoveMed={() => {}}
                                            medsList={medsList}
                                            index={0}
                                            lockedDoseTable={locked}
                                            startWithNewRow={!locked}
                                            showDelete={!locked}
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                }
                <DialogFooter>
                    <SplitBySides style={{justifyContent: 'right'}}>
                        <div className={'right'}>
                            <Button
                                color={'success'}
                                onClick={() => saveAsImage(drug)}
                                className='btn btn-primary'
                                style={{marginRight: '10px'}}
                            >
                                Save Image
                            </Button>
                            <Button
                                color={'primary'}
                                onClick={onCancelAction}
                                className='btn btn-primary'
                            >
                                Close
                            </Button>
                        </div>
                    </SplitBySides>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}