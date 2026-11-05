'use client'
// Function to calculate adjusted body weight
import {PatientDemographics} from "@/app/utils/interfaces";

export default function calcAdjustedBodyWeight(patDemog: PatientDemographics): number {
    let ibw: number = 45.4 + 0.89 * (patDemog.height - 152.4); // ideal body weight

    // Adjust the IBW for males
    if (patDemog.sex === 'm') {
        ibw = ibw + 4.5;
    }

    // Calculate Adjusted Body weight (ABW) in kg
    return ibw + (0.4 * (patDemog.weight - ibw));
}