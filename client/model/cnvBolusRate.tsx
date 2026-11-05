'use client'
export function cnvBolusRate(dose: number, unit: string, kg: number=0) {
    console.log('getBolusRate', dose, unit, kg)
    let factor = 0;
    switch(unit) {
        case 'mcg':
            factor = 0.001;
            break;
        case 'mg':
            factor = 1;
            break;
        case 'mg/kg':
            factor = kg;
            break;
        case 'mcg/kg':
            factor = 0.001 * kg;
            break;
        default:
            break;
    }
    return dose * factor;
}