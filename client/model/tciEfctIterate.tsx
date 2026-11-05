'use client'

import {Amounts, PKDrugModel} from "@/app/utils/interfaces";
import tciPlasmaIterate from "@/model/tciPlasmaIterate";

export default function tciEfctIterate(pk: PKDrugModel, initAmounts: Amounts, target_Ce: number, init_jpeak0: number): [number, number, string] {
    const EFFECT_VOL_FACTOR = 10000;
    const k10 = pk.k10 / 60.0;
    const k12 = pk.k12 / 60.0;
    const k21 = pk.k21 / 60.0;
    const k13 = pk.k13 / 60.0;
    const k31 = pk.k31 / 60.0;
    const k14 = pk.ke0 / (60.0 * EFFECT_VOL_FACTOR);
    const k41 = pk.ke0 / 60.0;
    const k1 = k10 + k12 + k13 + k14;
    const Vc = pk.Vc * 1000;            // convert L to mL
    const V4 = Vc / EFFECT_VOL_FACTOR;  // volume of the effect compartment in mL
    const target_A4 = target_Ce * V4;   // target amount in the effect compartment in mg

    const amounts = { ...initAmounts };
    const tpeak = pk.tpeak.length;
    const E = pk.tpeak;
    const temp: number[] = new Array(tpeak).fill(0);

    let jpeak0 = init_jpeak0;
    let mgToInfuse = 0;
    let algoUsed = '';
    let B1 = amounts.A1;
    let B2 = amounts.A2;
    let B3 = amounts.A3;
    let B4 = amounts.A4;

    for (let j = 0; j < tpeak; j++) {
        B1 = B1 + (B2 * k21 + B3 * k31 + B4 * k41 - B1 * k1);
        B2 = B2 + (B1 * k12 - B2 * k21);
        B3 = B3 + (B1 * k13 - B3 * k31);
        B4 = B4 + (B1 * k14 - B4 * k41);
        temp[j] = B4;
    }

    if (target_Ce === 0.0 || temp[9] > target_A4) {
        algoUsed = 'Not Applicable (target Ce is 0)';
        mgToInfuse = 0;
    } else if (Math.abs((temp[0] - target_A4) / target_A4) < 0.05) {
        algoUsed = 'Plasma TCI calculation (Ce is w/in 5% of target)';
        mgToInfuse = tciPlasmaIterate(pk, amounts, target_Ce);
    } else {
        let rateFound = false;
        algoUsed = `Effect TCI calculation, jpeak0 = ${jpeak0} sec`;

        while (!rateFound) {
            const Io = (target_A4 - temp[jpeak0]) / E[jpeak0];
            const tempPeakValue = temp.map((value, index) => value + E[index] * Io);

            // Find the index of the peak value in tempPeakValue
            const maxTemp = Math.max(...tempPeakValue);
            const jpeak1 = tempPeakValue.indexOf(maxTemp);

            if (jpeak1 === jpeak0) {
                rateFound = true;
            } else {
                jpeak0 = jpeak1;
            }

            mgToInfuse = Io; // mg/sec

            if (mgToInfuse < 0) {
                mgToInfuse = 0;
            }
        }
    }

    return [jpeak0, mgToInfuse, algoUsed];
}