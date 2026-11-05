'use client'
export default function prepareOutput(t_: number[], Cp_: number[], Ce_: number[]): { t: number[], Cp: number[], Ce: number[] } {
    let j = 0;
    let tSecs = 0;
    const t: number[] = [];
    const Cp: number[] = [];
    const Ce: number[] = [];

    for (let i = 0; i < t_.length; i++) {
        if (tSecs % 10 === 0) {
            t.push(tSecs);
            Cp.push(Cp_[i]);
            Ce.push(Ce_[i]);
            j++;
        }
        tSecs++;
    }

    return { t, Cp, Ce };
}