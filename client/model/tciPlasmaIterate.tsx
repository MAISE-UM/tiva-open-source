'use client'

import {Amounts, PKDrugModel} from "@/app/utils/interfaces";

export default function tciPlasmaIterate(pk: PKDrugModel, amounts: Amounts, target_Cp: number): number {
    // Convert PK parameters to 1/sec for the simulation algorithm
    const k10 = pk.k10 / 60.0;
    const k12 = pk.k12 / 60.0;
    const k21 = pk.k21 / 60.0;
    const k13 = pk.k13 / 60.0;
    const k31 = pk.k31 / 60.0;
    const k1 = k10 + k12 + k13;

    // Calculate the amount to infuse, given the target_Cp (concentration in the plasma)
    const mgToInfuse: number = ((k1 * amounts.A1) - (k21 * amounts.A2) - (k31 * amounts.A3)) + ((target_Cp * pk.Vc * 1000) - amounts.A1) / 10;

    // Ensure no negative infusion rates
    return  Math.max(mgToInfuse, 0);
}