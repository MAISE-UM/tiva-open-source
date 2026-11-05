

function heightUnitConverter(value: number, cur_unit: string, target_unit: string) {
    if (cur_unit === "cms" && target_unit === "inches") {
        return value * 0.393701;
    }
    else if (cur_unit === "inches" && target_unit === "cms") {
        return value * 2.54;
    }
    return value;
}

export const restrictions = {
    height_max: {
        value: 200, 
        unit: "cms"
    }, 
    height_min: {
        value: 10, 
        unit: "cms"
    }
}

export function isValidHeight(value: number, unit: string) {
    if (!Number.isFinite(value)) {
        return false;
    }
    if (unit === "cms") {
        return value <= restrictions.height_max.value && value >= restrictions.height_min.value;
    }
    const height_in_cm = heightUnitConverter(value, "inches", "cms");
    return height_in_cm <= restrictions.height_max.value && height_in_cm >= restrictions.height_min.value;
         
}