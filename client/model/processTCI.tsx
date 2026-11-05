'use client'
import {DoseTable, DoseTableRow, PatientDemographics, TCI} from "@/app/utils/interfaces";
import {getMinDiff} from "@/lib/med-helpers";
import getTPeak from "@/model/getTPeak";
import {getAmountInfused} from "@/model/getAmountInfused";
import cnvtTCIUnits from "@/model/cnvtTCIUnits";
import convertInfUnits from "@/model/cnvtInfUnits";
import tciEfctIterate from "@/model/tciEfctIterate";
import tciPlasmaIterate from "@/model/tciPlasmaIterate";
import {cnvBolusRate} from "@/model/cnvBolusRate";
import cnvtMgPerMl from "@/model/cnvtMgPerMl";
import pkSimIterate from "@/model/PKSimIterate";

export default function processTCI(doseTable: DoseTable, pDemographics: PatientDemographics, maxTime: number, minMissing: number, refTime: Date): TCI {
    // if pDemographics weight in lb then convert to kg
    if(pDemographics.weightUnit === 'lb') {
        pDemographics.weight = pDemographics.weight / 2.20462;
    }
    // if pDemographics height in inches then convert to cm
    if(pDemographics.heightUnit === 'inches') {
        pDemographics.height = pDemographics.height * 2.54;
    }
    // if pDemographics age in months then convert to years
    if(pDemographics.ageUnit === 'months') {
        pDemographics.age = pDemographics.age / 12;
    }

    const EFFECT_VOL_FACTOR = 10000;
    const incrMillis = 1000;
    const MAX_TIME = maxTime;

    const localDoseTable = { ...doseTable };
    let localRows = [...localDoseTable.rows];
    console.log('DEBUG: ', localRows, localDoseTable)

    const {tci} = localDoseTable;

    console.log('pk', tci.pkModel)

    tci.pkModel.tpeak = getTPeak(tci.pkModel);

    const verbose = false;

    const tPeak = tci.pkModel.tpeak.length;

    if(verbose) {
        console.log(`  Vc: ${tci.pkModel.Vc} (liters)\\n  k01: ${tci.pkModel.k01} (1/min)\\n k10: ${tci.pkModel.k10} (1/min)\\n  k12: ${tci.pkModel.k12} (1/min)\\n  k21: ${tci.pkModel.k21} (1/min)\\n`)

        console.log(`  k13: ${tci.pkModel.k13} (1/min)\\n  k31: ${tci.pkModel.k31} (1/min)\\n  ke0: ${tci.pkModel.ke0} (1/min)\\n`)

        console.log(`tPeak: ${tPeak} sec (${tPeak / 60} min)\\n`)
    }

    const tgtCe = -1;
    const tgtCp = -1;
    let jpeak0 = -1;
    let algoUsed = '';

    if(localRows.length > 0) {
        let infusionRunning = false;
        let infusionRate = 0;
        let infusionUnits = 'mcg/kg/min';
        let timeSinceFirstEvent = 0;

        const newLocalRows: DoseTableRow[] = [];

        const minOffset = getMinDiff(localRows[0].time, refTime);
        if(minOffset > 0) {
        // if(localRows[0].timeSinceFirstEvent !== 0) {
            // Date of localRows[0].time - minOffset
            const time: Date = new Date(localRows[0].time.getTime() - minOffset * 60000);
            const newEvent: DoseTableRow = {
                event: "Start Infusion",
                time,
                timeSinceFirstEvent: 0,
                timeToRun: minOffset,
                dose: 0,
                unit: "mcg/kg/min"
            }
            newLocalRows.push(newEvent)
        }

        // First Pass - Calculate timeToRun for infusions
        localRows.forEach((drugEvent, index) => {
            console.log(`firstPass`, drugEvent, index)
            const isLastEvent = index === localRows.length - 1;
            // let nextNonBolusEvent: DoseTableRow|null = null;
            let nextEvent: DoseTableRow|null = null;
            for(let i = index + 1; i < localRows.length; i++) {
                nextEvent = localRows[i];
                if(!isLastEvent && (nextEvent.event === 'Start Infusion' || nextEvent.event === 'Dose Change' || nextEvent.event === 'Stop Infusion' || nextEvent.event === 'Bolus')) {
                    console.log('nextEvent', nextEvent, i)
                    // nextNonBolusEvent = nextEvent;
                    break;
                }
            }
            if(drugEvent.event !== 'Bolus') {
                console.log('calculating timeToRun', drugEvent, nextEvent)
                if(nextEvent !== null) {
                    console.log('timeToRun', nextEvent.timeSinceFirstEvent - drugEvent.timeSinceFirstEvent, 'for', drugEvent.event)
                    drugEvent.timeToRun = nextEvent.timeSinceFirstEvent - drugEvent.timeSinceFirstEvent;
                } else {
                    drugEvent.timeToRun = 0 // MAX_TIME;
                }
            }
        });

        console.log('localRowsBeforeSecondPass', [...localRows])

        // Second Pass Add/Modify rows to finish missing processing logic
        localRows.forEach((drugEvent, index) => {
            console.log('beforeNewLocalRows', [...newLocalRows])
            const isLastEvent = index === localRows.length - 1;
            const nextEvent = index+1 === localRows.length ? null : localRows[index+1];
            console.log(`secondPassPush`, drugEvent, index, nextEvent, isLastEvent)
            newLocalRows.push(drugEvent);
            if (drugEvent.event === 'Start Infusion') {
                infusionRunning = true;
                infusionRate = drugEvent.dose;
                infusionUnits = drugEvent.unit;
            } else if (drugEvent.event === 'Stop Infusion') {
                infusionRunning = false;
                infusionRate = 0;
                infusionUnits = 'mcg/kg/min';
            } else if (drugEvent.event === 'Dose Change') {
                infusionRate = drugEvent.dose;
                infusionUnits = drugEvent.unit;
                // Set timeToRun
            } else if(drugEvent.event === 'Bolus') {
                // timeToRun always = bolus time in sec / 60.0. Its hardcoded to 10.0 / 60.0 for now
                drugEvent.timeToRun = 10.0/60.0;
                if(infusionRunning) {
                    // If bolus, infusion is running, and bolus is not last event then infusion needs to be ended before bolus, bolus added, and then new infusion started at old infusion rate
                    // If bolus, infusion is running, and bolus is not next event then infusion needs to be started at rate infusion was running at
                    if(!isLastEvent && nextEvent !== null) {
                        // Subtract 10 seconds from timeToRun of infusion before bolus due to running infusion during bolus
                        const timeToRun = nextEvent.timeSinceFirstEvent - drugEvent.timeSinceFirstEvent - (10.0/60.0);
                        const newEvent: DoseTableRow = {
                            event: "Start Infusion",
                            time: drugEvent.time,
                            timeSinceFirstEvent: drugEvent.timeSinceFirstEvent,
                            timeToRun,
                            dose: infusionRate,
                            unit: infusionUnits
                        }
                        newLocalRows.push(newEvent)
                        console.log('bolus detected with infusion currently running, push', newEvent)
                        timeSinceFirstEvent += timeToRun;
                    }
                } else {
                    // If bolus, infusion is not running, and bolus is not last event then an infusion needs to be started and ran until next event at 0 rate
                    if(!isLastEvent && nextEvent !== null && nextEvent.event !== 'Bolus') {
                        const timeToRun = nextEvent.timeSinceFirstEvent - drugEvent.timeSinceFirstEvent;
                        if(timeToRun > 0) {
                            const newEvent: DoseTableRow = {
                                event: "Start Infusion",
                                time: drugEvent.time,
                                timeSinceFirstEvent: drugEvent.timeSinceFirstEvent,
                                timeToRun,
                                dose: 0,
                                unit: "mcg/kg/min"
                            }
                            timeSinceFirstEvent += timeToRun;
                            console.log('bolus detected with no infusion currently running, push', newEvent)
                            newLocalRows.push(newEvent)
                            const newEventEnd: DoseTableRow = {
                                event: "Stop Infusion",
                                time: drugEvent.time,
                                timeSinceFirstEvent: drugEvent.timeSinceFirstEvent + timeToRun,
                                timeToRun: 0,
                                dose: 0,
                                unit: "mcg/kg/min"
                            }
                            newLocalRows.push(newEventEnd)
                        }
                    } else if (!isLastEvent && nextEvent !== null && nextEvent.event === 'Bolus') {
                        const timeToRun = nextEvent.timeSinceFirstEvent - drugEvent.timeSinceFirstEvent;
                        const newEvent: DoseTableRow = {
                            event: "Start Infusion",
                            time: drugEvent.time,
                            timeSinceFirstEvent: drugEvent.timeSinceFirstEvent,
                            timeToRun,
                            dose: 0,
                            unit: "mcg/kg/min"
                        }
                        timeSinceFirstEvent += timeToRun;
                        console.log('bolus detected with no infusion currently running, push', newEvent)
                        newLocalRows.push(newEvent)
                    }
                }

            }
            timeSinceFirstEvent += drugEvent.timeToRun >= 1 ? drugEvent.timeToRun : 0;

            // If bolus, infusion is running, and bolus is last event then infusion needs to be ended before bolus, bolus added, and then new infusion started at old infusion rate for a length of MAX_TIME
            // Stop Infusion event does not need to be inserted if timeToRun for start/dose change is set. Stop Infusion should set infusion rate to 0 and have a timeToRun of 0 unless it is the last event then it should be set to MAX_TIME

            if(index === localRows.length - 1) {
                // If bolus, infusion is not running, and bolus is last event then an infusion needs to be started and ran for MAX_TIME
                // If infusionRunning=true and no more events, then start infusion timeToRun should be set to MaxTime

                // Process MAX_TIME
                console.log('minMissing', minMissing)
                if (infusionRunning && drugEvent.event !== 'Bolus') {
                    localRows[index].timeToRun = MAX_TIME + minMissing;
                    infusionRunning = false;
                } else {
                    newLocalRows.push({
                        event: "Start Infusion",
                        time: localRows[index].time,
                        timeSinceFirstEvent: timeSinceFirstEvent,// + MAX_TIME,
                        timeToRun: MAX_TIME + minMissing,
                        dose: infusionRate,
                        unit: infusionUnits
                    })
                }
            }
            console.log('afterNewLocalRows', [...newLocalRows])
        });
        console.log('newLocalRows', newLocalRows)
        localRows = [...newLocalRows];
    }
    
    let infusionRunning = false;
    let infusionRate = 0;

    localRows.forEach((drugEvent) => {
        // Start Event Loop
        let set_rate = drugEvent.dose;
        // const tciUnits = drugEvent.unit;
        let msec = 0;

        // Check time difference in minutes between drugEvent.time and next dose table row drugEvent.time. Doesn't apply for bolus
        const dur_min = drugEvent.timeToRun;
        const dur_msec = dur_min * 60 * 1000;

        let mgInfused = 0;
        let mgToInf = 0;

        while (msec <= dur_msec) {
            // every "simulated" 1 second, update the pk simulation
            if ((msec > 0) && (msec % 1000 === 0)) {
                mgInfused += getAmountInfused(mgToInf, 1000);
                if (verbose) {
                    console.log(`${tci.tmin*60.0} sec, mgInfused = ${mgInfused.toFixed(5)} setRate=${set_rate.toFixed(5)}`)
                }
                tci.amounts = pkSimIterate(tci.pkModel, tci.amounts, mgInfused);
                // console.log('tci.amounts', tci.amounts)
                mgInfused = 0;
                tci.Cp[tci.i] = cnvtTCIUnits(tci.amounts.A1 / (tci.pkModel.Vc * 1000), tci.pkModel.tci_unit);
                tci.Ce[tci.i] = cnvtTCIUnits(tci.amounts.A4 / ((tci.pkModel.Vc / EFFECT_VOL_FACTOR) * 1000), tci.pkModel.tci_unit);
                tci.t[tci.i] = tci.tmin;
                if(verbose) {
                    console.log('ce', tci.Ce[tci.i], 'cp', tci.Cp[tci.i]);
                }
                tci.i++;
            }

            if (msec % 10000 === 0) {
                if (verbose) {
                    console.log(`t=${tci.tmin*60} sec, infusion mode: `);
                }
                if (drugEvent.event === 'Start Infusion' || drugEvent.event === 'Stop Infusion' || drugEvent.event === 'Dose Change') {
                    set_rate = convertInfUnits(drugEvent.dose, drugEvent.unit, pDemographics.weight);
                    mgToInf = set_rate * pDemographics.weight / (60 * 1000); // mcg/kg/min to mg in 1 second

                    infusionRunning = drugEvent.event !== 'Stop Infusion';
                    infusionRate = set_rate;

                    if (verbose) {
                        console.log('Constant Infusion', set_rate, mgToInf);
                    }
                } else if (drugEvent.event === "Bolus") {
                    set_rate = cnvBolusRate(drugEvent.dose, drugEvent.unit, pDemographics.weight);
                    const dur_sec = dur_min * 60;
                    mgToInf = set_rate / dur_sec;

                    if(infusionRunning) {
                        const infMMgToInf = infusionRate * pDemographics.weight / (60 * 1000); // mcg/kg/min to mg in 1 second
                        mgToInf += infMMgToInf;
                    }

                    if (verbose) {
                        console.log('Loading Dose/Bolus', set_rate, dur_min, dur_sec, mgToInf);
                    }
                } else if (drugEvent.event === "PlasmaTCI") {
                    mgToInf = tciPlasmaIterate(tci.pkModel, tci.amounts, cnvtMgPerMl(tgtCp, tci.pkModel.tci_unit));
                    if (verbose) {
                        console.log('Plasma TCI');
                    }
                } else if (drugEvent.event === "EffectTCI") {
                    [jpeak0, mgToInf, algoUsed] = tciEfctIterate(tci.pkModel, tci.amounts, cnvtMgPerMl(tgtCe, tci.pkModel.tci_unit), jpeak0);
                    if (verbose) {
                        console.log('Effect TCI', algoUsed);
                    }
                }
            }

            if (msec % 15000 === 0) {
                if (verbose) {
                    console.log(`Simulating... Pump running time: ${tci.tmin} minutes\n`);
                }
            }

            // increment "simulate" time
            msec = msec + incrMillis;
            tci.tmin += incrMillis / 60000;  // % 5 msec of simulation
        }
    });

    let cutOffMin: number = 0
    if(localRows.length > 0 && localRows[0].time != null && refTime > localRows[0].time) {
        const minOffset = getMinDiff(refTime, localRows[0].time);
        if(minOffset > 0) {
            cutOffMin = minOffset;
        }
    }
    console.log('cutOffMin', cutOffMin)

    const cutoffIndexCount = tci.t.findIndex(t => t > cutOffMin);
    console.log('cutoffIndexCount', cutoffIndexCount, tci)
    tci.t = tci.t.slice(cutoffIndexCount);
    tci.Cp = tci.Cp.slice(cutoffIndexCount);
    tci.Ce = tci.Ce.slice(cutoffIndexCount);
    tci.i = tci.i - cutoffIndexCount;
    tci.tmin = tci.tmin - cutOffMin


    console.log('tci', tci);
    return tci;
}