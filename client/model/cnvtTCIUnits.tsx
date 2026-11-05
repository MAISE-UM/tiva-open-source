'use client'
export default function cnvtTCIUnits(concMgPerMl: number, tciUnits: string): number {
    let convFactor: number = 1.0;

    if (tciUnits === 'mcg/mL') { // [X mg/mL]*[1000 mcg/1 mg] converts to [Y mcg/mL]
        convFactor = 1000;
    } else if (tciUnits === 'ng/mL') { // [x mg/mL]*[1,000,000 ng/1 mg] converts to [Y ng/mL]
        // TODO: Figure out why this only works when commented out
        convFactor = 1e6;
    }

    return convFactor * concMgPerMl;
}