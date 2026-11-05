'use client'
export default function cnvtMgPerMl(concVal: number, concUnits: string): number {
    let mgPerML: number = 0;

    switch (concUnits) {
        case 'mcg/mL':
            mgPerML = concVal / 1000.0;
            break;
        case 'ng/mL':
            mgPerML = concVal / 1.0e6;
            break;
        default:
            console.error('Error in convertMgPerMl: invalid conc units');
            break;
    }

    return mgPerML;
}