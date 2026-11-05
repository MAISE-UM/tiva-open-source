'use client'
export default function convertInfUnits(concVal: number, concUnits: string, kg: number=0): number {
    let mcgKgMin: number = 0;
    // Convert Unit to mcg/kg/min
    switch (concUnits) {
        case 'mcg/kg/hr':
            mcgKgMin = concVal / 60.0;
            break;
        case 'mg/kg/hr':
            mcgKgMin = (concVal * 1000) / 60.0;
            break;
        case 'mg/kg/min':
            mcgKgMin = concVal * 1000;
            break;
        case 'mcg/kg/min':
            mcgKgMin = concVal;
            break;
        case 'mcg/min':
            mcgKgMin = concVal / kg;
            break;
        case 'mg/min':
            mcgKgMin = (concVal * 1000) / kg;
            break;
        case 'mcg/hr':
            mcgKgMin = (concVal / 60.0) / kg;
            break;
        case 'mg/hr':
            mcgKgMin = ((concVal * 1000) / 60.0) / kg;
            break;
        default:
            console.error('Error in convertMgPerMl: invalid conc units');
            break;
    }

    return mcgKgMin;
}