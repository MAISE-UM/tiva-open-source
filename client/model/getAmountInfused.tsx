'use client'
export function getAmountInfused(mgToInf: number, milliseconds: number): number {
    return mgToInf * (milliseconds / 1000);
}