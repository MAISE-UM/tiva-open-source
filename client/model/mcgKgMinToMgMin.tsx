'use client'
export default function mcgKgMinToMgMin(rateMcgKgMin: number, wtKg: number): number {
    return wtKg * rateMcgKgMin / 1000;
}
