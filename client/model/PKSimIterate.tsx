'use client'
import {Amounts, PKDrugModel} from "@/app/utils/interfaces";

export default function pkSimIterate(pk: PKDrugModel, initAmounts: Amounts, mgInfused: number): Amounts {
    const amounts: Amounts = { ...initAmounts }; // Create a new object for the updated amounts

    const EFFECT_VOL_FACTOR = 10000; // ratio of central compartment vol to effect

    const k01 = pk.k01 / 60.0;
    const k10 = pk.k10 / 60.0;
    const k12 = pk.k12 / 60.0;
    const k21 = pk.k21 / 60.0;
    const k13 = pk.k13 / 60.0;
    const k31 = pk.k31 / 60.0;
    const k14 = (pk.ke0 / 60.0) / EFFECT_VOL_FACTOR;
    const k41 = pk.ke0 / 60.0;
    const k1 = k10 + k12 + k13 + k14;

    if (k01 > 0) { // succinylcholine model only
        amounts.A0 = amounts.A0 + (-amounts.A0 * k01 + mgInfused);
        amounts.A1 = amounts.A1 + ((amounts.A0 * k01 + amounts.A2 * k21 + amounts.A3 * k31 + amounts.A4 * k41) - amounts.A1 * k1);
    } else {
        amounts.A1 = amounts.A1 + (((amounts.A2 * k21 + amounts.A3 * k31 + amounts.A4 * k41) - amounts.A1 * k1) + mgInfused);
    }

    amounts.A2 = amounts.A2 + (amounts.A1 * k12 - amounts.A2 * k21);
    amounts.A3 = amounts.A3 + (amounts.A1 * k13 - amounts.A3 * k31);
    amounts.A4 = amounts.A4 + (amounts.A1 * k14 - amounts.A4 * k41);

    return amounts;
}