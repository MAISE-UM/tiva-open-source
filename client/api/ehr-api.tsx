'use server'

import {fetch_api_wrapper} from "@/api/api-wrapper";
import {
    DataResponseRaw,
    VitalBundle,
    MedicationRaw,
    MPOGMedEvent,
    PKDrugModel,
    StatementBundle,
    FHIRMedication,
    FHIRMedicationAdministrations,
    SurgicalLogResponse,
    EhrClientConfig
} from "@/app/utils/interfaces";
import {processResponse} from "@/lib/utils";

// Used when the API is unreachable or the EHR integration is not configured
const defaultEhrClientConfig: EhrClientConfig = {
    Enabled: false,
    DisplayName: 'EHR',
    CompletePath: 'ehr/complete',
    DataMapping: {
        WeightLabel: 'Weight',
        HeightLabel: 'Height',
        AnesthesiaStartEvent: 'Anesthesia Start',
        AnesthesiaStopEvent: 'Anesthesia Stop',
        ProcedurePafIndex: 1
    }
}

let ehrClientConfigCache: EhrClientConfig | null = null;

// EHR settings from the API (Ehr section of the API appsettings). Cached after the first successful call
export async function getEhrClientConfig(): Promise<EhrClientConfig> {
    if (ehrClientConfigCache != null) {
        return ehrClientConfigCache;
    }
    try {
        const responseData = await fetch_api_wrapper(
            'GET',
            'ehr/client-config',
            {},
            {},
            false,
            'no-store',
            false
        )

        if('data' in responseData) {
            const response = processResponse<EhrClientConfig>(responseData.data as DataResponseRaw)
            if (response.bSuccess && response.oReturnObject != null) {
                ehrClientConfigCache = response.oReturnObject;
                return ehrClientConfigCache;
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
    return defaultEhrClientConfig;
}

export async function getEhrSurgicalCase(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/FHIR/GetSurgicalCase',
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<SurgicalLogResponse>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<SurgicalLogResponse>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<SurgicalLogResponse>(dataResponse)
    }
}

export async function getMedicationAdministrations(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/FHIR/GetMedicationAdministration',
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<FHIRMedicationAdministrations>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<FHIRMedicationAdministrations>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<FHIRMedicationAdministrations>(dataResponse)
    }
}
export async function getFHIRMedicationStatements(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'GET',
            'API/FHIR/GetMedicationStatements',
            {...obj},
            {},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<StatementBundle>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<StatementBundle>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<StatementBundle>(dataResponse)
    }
}
export async function getFHIRVitalSigns(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'GET',
            'API/FHIR/GetVitalSigns',
            {...obj},
            {},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<VitalBundle>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<VitalBundle>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<VitalBundle>(dataResponse)
    }
}
export async function getMedications() {
    try {
        const response = fetch_api_wrapper(
            'GET',
            'API/Meds/GetMedications',
            {},
            {},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<MedicationRaw[]>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<MedicationRaw[]>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<MedicationRaw[]>(dataResponse)
    }
}
export async function getFHIRMedication(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'GET',
            'API/FHIR/GetMedication',
            {...obj},
            {},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<FHIRMedication>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<FHIRMedication>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<FHIRMedication>(dataResponse)
    }
}
export async function getDrugModels(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/Meds/GetDrugModels',
            {},
            {...obj},
            true,
            'no-store',
            false
        )
        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<PKDrugModel[]>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<PKDrugModel[]>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<PKDrugModel[]>(dataResponse)
    }
}

export async function getGetCaseFromMPOG(obj: object) {
    try {
        const response = fetch_api_wrapper(
            'POST',
            'API/MPOG/GetCaseFromMPOG',
            {},
            {...obj},
            true,
            'no-store',
            false
        )

        const responseData = await response

        if('data' in responseData) {
            const dataResponse = responseData.data as DataResponseRaw
            return processResponse<MPOGMedEvent[]>(dataResponse)
        } else {
            const dataResponse: DataResponseRaw = {
                bSuccess: false,
                oReturnObject: "[]",
                sErrorInfo: 'Request failed. Response did not contain data.'
            }
            return processResponse<MPOGMedEvent[]>(dataResponse)
        }
    } catch (error) {
        console.error('Error:', error);
        const dataResponse: DataResponseRaw = {
            bSuccess: false,
            oReturnObject: "[]",
            sErrorInfo: 'Request failed. Error Occurred'
        }
        return processResponse<MPOGMedEvent[]>(dataResponse)
    }
}