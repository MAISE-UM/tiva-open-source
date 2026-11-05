'use client'
import {PKDrugModel, TCI} from "@/app/utils/interfaces";

export function initTCI(pkModel: PKDrugModel): TCI {
    return {
        pkModel,
        i: 1,
        t: [0],
        tmin: 0.0,
        Cp: [0],
        Ce: [0],
        amounts: {
            A0: 0,
            A1: 0,
            A2: 0,
            A3: 0,
            A4: 0
        }
    };
}