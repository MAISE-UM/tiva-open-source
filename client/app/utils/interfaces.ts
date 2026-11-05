'use server'

import {MultiValue} from "react-select";

////
// Interfaces
// Next.js requires careful handling of interfaces and types. Most shared types should be defined here.
// Some child components may require their own interfaces to keep this less cluttered like the API editor
////

export type Environment = "Local" | "Development" | "Testing" | "Production"

// JWT Access Token Payload
export interface JwtPayload {
    username: string
    name: string
    roles: string[]
    primary_role: string
    email: string
    authentication_method: string
}

// This is the type that is returned by the API. It must be parsed into a DataResponse<T> object
export interface DataResponseRaw {
    bSuccess: boolean
    oReturnObject: string
    sErrorInfo: string
}

// DataResponseRaw will use this interface to cast oReturnObject into a usable object
export interface DataResponse<T> {
    bSuccess: boolean
    oReturnObject: T|null
    sErrorInfo: string
}

// Used in the Header component
export interface UserNav {
    name: string
    role: string
    username: string
}

// Used in the User Admin component
export interface User {
    User_ID: number;
    Name: string;
    First_Name: string;
    Last_Name: string;
    UserName: string;
    Is_Active: boolean;
    Roles: string;
    ProcessedRoles: MultiValue<{     label: string;     value: number; }>
}


// Used in the User Admin component
export interface Role {
    Role_ID: number;
    Role_Name: string;
    Role_Level: number;
}

// Used across the app to define user/route permissions. Explained in middleware
export interface UserPermission {
    Function_ID: number;
    Function_Name: string;
    Route: string;
    Display_Name: string;
    Parent_ID: number;
    Function_Details: string;
    Type: string;
    Display_Order: number;
}

// A user's access is split into what routes they have access to and the permissions for the current route they are on
export interface UserPermissionGroup {
    Routes: UserPermission[];
    Permissions: UserPermission[];
}

// Used in the API Editor component
export interface DropdownOption {
    label: string;
    value: string|boolean|number;
}

// Used to hold dynamically defined lists from the API
export interface ApplicationListItem {
    ID: number;
    Category: string;
    Section: string;
    List_Key: string;
    List_Value: string;
}

// TIVA Interfaces

export type PatientDemographics = {
    weight: number; // in kg or lb
    weightUnit: string
    height: number; // in cm or in
    heightUnit: string
    age: number; // in years or months
    ageUnit: string;
    sex: 'm' | 'f'; // 'm' for male, 'f' for female
}

export type Amounts = {
    A0: number;
    A1: number;
    A2: number;
    A3: number;
    A4: number;
};

export type PKDrugModel = {
    Model_ID: number,
    Model_Name: string,
    Medication_Name: string,
    Medication_ID: number,
    name: string,
    Vc: number; // central compartment volume in L
    k01: number;
    k10: number; // rate constants
    k12: number;
    k13: number;
    k21: number;
    k31: number;
    ke0: number; // units are 1/min
    tpeak: number[]; // time to peak effect in seconds
    tci_unit: string;
    default_model: boolean,
    error: string
};

export type TCI = {
    pkModel: PKDrugModel;
    i: number;
    t: number[];
    tmin: number;
    Cp: number[];
    Ce: number[];
    amounts: Amounts;
};

export interface DoseTableRow {
    event: string;
    time: Date;
    timeSinceFirstEvent: number;
    timeToRun: number;
    dose: number;
    unit: string;

    [key: string]: Date | string | number;
}

export interface DoseTable {
    med: string;
    model_id: number;
    model_name: string;
    model: PKDrugModel;
    rows: DoseTableRow[];
    tci: TCI;
    failure_reason: null|string;
}

export interface DoseTables {
    [index: string]: DoseTable;
}

export interface MedAdministrations {
    medicationReference: Reference|null;
    basedOn: Reference|null;
    // extensions: null;
    informationSource: Reference|null|undefined;
    status: string|null;
    matchedMed: { code: {text: string} }|null
    medConcentration: FHIRMedicationRatio|null;
    tivaMed: Medication;
    isActive: boolean|null
    MedicationAdministrations: (mpogAdministration | MedicationAdministration)[];
}

export interface MPOGMedEvent {
    AIMS_Med_UOM: string;
    aims_dose_end_dt: string;
    aims_dose_start_dt: string;
    aims_med_dose: number;
    aims_med_route: string;
    aims_patient_age_years: number;
    aims_reg_num: string;
    aims_sex: string;
    aims_procedure_room_name: string;
    aims_actual_procedure_text: string;
    anesEnd: string;
    anesStart: string;
    height_cm: number;
    medication: string;
    mpog_case_id: string;
    weight_kg: number;
    tivaMed: Medication|null;
    instant: Date|null;
}

export interface MedData {
    sexValue: string,
    ageValue: string,
    ageUnit: string,
    heightValue: string,
    heightUnit: string,
    weightValue: string,
    weightUnit: string,
    anesthesiaStart: Date|null,
    anesthesiaEnd: Date|null,
    medDataValue: MedAdministrations[]|null,
    surgicalLog: SurgicalLog | null
    patientName: string,
    procedureName: string,
    procedureLocation: string,
}

export interface VitalBundle {
    type: string;
    total: number;
    link: FHIRLink[];
    entry: VitalEntry[];
}

export interface StatementBundle {
    resourceType: "Bundle";
    type: "searchset";
    total: number;
    link: FHIRLink[];
    entry: StatementBundleEntry[];
}

export interface FHIRLink {
    relation: string;
    url: string;
}

export interface VitalEntry {
    link: FHIRLink[];
    fullUrl: string;
    resource: Observation;
    search?: { mode: string };
}

export interface StatementBundleEntry {
    link: FHIRLink[];
    fullUrl: string;
    resource: MedicationStatement;
    search: {
        mode: string;
    };
}

export interface MedicationStatement {
    resourceType: "MedicationStatement";
    id: string;
    identifier?: Identifier[];
    status: string;
    category?: Category;
    basedOn: Reference;
    medicationReference: Reference;
    effectivePeriod?: Period;
    dateAsserted?: string;
    informationSource?: Reference;
    subject: Reference;
    taken: string;
    dosage?: Dosage[];
}

export interface Observation {
    id: string;
    status: string;
    category: FHIRCategory[];
    code: FHIRCode;
    subject: FHIRReference;
    encounter?: FHIRReference;
    effectiveDateTime?: string;
    resourceType: string;
    issued?: string;
    performer?: FHIRReference[];
    component?: ObservationComponent[];
    valueQuantity?: Quantity;
}

export interface Identifier {
    use: string;
    system: string;
    value: string;
}

export interface Category {
    coding: Coding[];
    text: string;
}

export interface Coding {
    system?: string;
    code: string;
    display: string;
}

export interface Reference {
    reference: string;
    display: string;
}

export interface Period {
    start: string;
    end?: string;
}

export interface Dosage {
    text?: string;
    patientInstruction?: string;
    timing?: Timing;
    asNeededBoolean?: boolean;
    route?: Category;
    method?: Category;
    doseQuantity?: StatementQuantity;
}

export interface Timing {
    repeat?: TimingRepeat;
}

export interface TimingRepeat {
    boundsPeriod?: Period;
    timeOfDay?: string[];
    frequency?: number;
    period?: string;
    periodUnit?: string;
}

export interface StatementQuantity {
    value: string;
    unit: string;
    system: string;
    code: string;
}


export interface FHIRCategory {
    coding: FHIRCoding[];
    text: string;
}

export interface FHIRCode {
    coding: FHIRCoding[];
    text: string;
}

export interface FHIRCoding {
    system: string;
    code: string;
    display?: string;
}

export interface FHIRReference {
    reference: string;
    display?: string;
}

export interface ObservationComponent {
    code: FHIRCode;
    valueQuantity: Quantity;
}

export interface Quantity {
    value: number;
    unit: string;
    system: string;
    code: string;
}

export interface mpogAdministration {
    Action: string;
    Dose: {Value: number, Unit: string}
    AdministrationInstant: string
}

export interface ApplicationListItem {
    List_Group_ID: number;
    List_Group_Name: string;
    List_Value: string;
    List_Order: number;
}

export interface MedicationModalContext {
    tci: TCI;
    tci_unit: string;
    title: string,
    drug: string,
    drugModels: PKDrugModel[],
    medsList: Medication[],
    referenceTime: Date|null,
    effectSiteStyle: string,
    plasmaStyle: string,
    modelName: string,
    // Dose Section
    medTable: DoseTable,
    listData: { [index: string]: ApplicationListItem[] },
    sex: string,
    weightValue: string,
    weightUnit: string,
    heightValue: string,
    heightUnit: string,
    ageValue: string,
    ageUnit: string,
    anesthesiaStart: Date|null,
    anesthesiaEnd: Date|null,
    maxTime: number
}

export interface MedicationRaw {
    Med_ID: number;
    Med_Order: number;
    Medication_Name: string;
    Medication_Search_Terms: string;
    Standard_Concentration: number|null;
    Standard_Concentration_Unit: string|null;
    Concentration_Units: string;
    Bolus_Units: string;
    Infusion_Units: string;
    Default_Units: string;
    Units: string;
    Lower: number|null;
    Upper: number|null;
    Typical: number|null;
    MEAC: number|null;
    EndCe: number|null;
    EndCeText: string;
    Load_Graph_Default: boolean;
}

export interface Order {
    IsMixture: boolean;
    IsInfusion: boolean;
    IsActive: boolean;
    Name: string;
    LinkedOrderType: string | null;
    OrderID: {
        ID: string;
        Type: string;
    };
    LinkedOrderIDs: string[] | null;
    MedicationAdministrations: MedicationAdministration[];
}

export interface MedicationAdministration {
    Action: string;
    MappedAction: string;
    AdministrationInstant: string;
    Dose: {
        Value: string;
        Unit: string;
    };
    Rate: string | null;
    LinkedOverrideOrderID: string | null;
}

export interface FHIRMedicationAdministrations {
    Orders: Order[];
}

export interface FHIRMedication {
    resourceType: string;
    id: string;
    extension?: FHIRMedicationExtension[];
    code: FHIRMedicationCode;
    isBrand: boolean;
    isOverTheCounter: boolean;
    form: FHIRMedicationForm;
    ingredient?: FHIRMedicationIngredient[];
}

export interface FHIRMedicationExtension {
    valueIdentifier: FHIRMedicationValueIdentifier;
    url: string;
}

export interface FHIRMedicationValueIdentifier {
    use: string;
    system: string;
    value: string;
}

export interface FHIRMedicationCode {
    coding: FHIRMedicationCoding[];
    text: string;
}

export interface FHIRMedicationCoding {
    system: string;
    code: string;
}

export interface FHIRMedicationForm {
    coding: FHIRMedicationCodingWithDisplay[];
    text: string;
}

export interface FHIRMedicationCodingWithDisplay extends Coding {
    display: string;
}

export interface FHIRMedicationIngredient {
    itemCodeableConcept: FHIRMedicationCode;
    amount: FHIRMedicationRatio;
}

export interface FHIRMedicationRatio {
    numerator: FHIRMedicationQuantity;
    denominator: FHIRMedicationQuantity;
}

export interface FHIRMedicationQuantity {
    value: number|null;
    unit: string|null;
    system: string|null;
    code: string|null;
}

export interface Medication {
    Med_ID: number;
    Med_Order: number;
    Medication_Name: string;
    Medication_Search_Terms: string;
    Standard_Concentration: number|null;
    Standard_Concentration_Unit: string|null;
    Concentration_Units: string;
    Bolus_Units: string[];
    Infusion_Units: string[];
    Default_Units: string;
    Units: string;
    Lower: number|null;
    Upper: number|null;
    Typical: number|null;
    MEAC: number|null;
    EndCe: number|null;
    EndCeText: string;
    Load_Graph_Default: boolean;
}

export interface SurgicalLogResponse {
    Warnings: string[];
    SurgicalRecord: SurgicalLog;
}

// Labels used to read the EHR data. Configured in the API Ehr:DataMapping settings
export interface EhrDataMapping {
    WeightLabel: string;
    HeightLabel: string;
    AnesthesiaStartEvent: string;
    AnesthesiaStopEvent: string;
    ProcedurePafIndex: number;
}

// Returned by the API ehr/client-config endpoint
export interface EhrClientConfig {
    Enabled: boolean;
    DisplayName: string;
    // API path that completes the EHR login (Ehr:Routes:Complete)
    CompletePath: string;
    DataMapping: EhrDataMapping;
}

export interface SurgicalLog {
    AdmissionDateTime: string|null;
    DischargeDateTime: string|null;
    HospitalUnitName: string|null;
    HospitalRoom: string|null;
    HospitalBed: string|null;
    ScheduleHistoryDateTime: string[]|null
    Actual: SurgicalLogActual|null;
    Scheduled: SurgicalLogActual|null;
    Patient: Patient|null;
    PAFValues: PAFValue[]|null;
}

export interface PAFValue {
    InternalID: string;
    Value: string[];
    DisplayableText: string;
}

export interface SurgicalLogActual {
    InternalID: string;
    VisitContactNumber: number;
    PatientClass: string|null;
    StartDateTime: string|null;
    EndDateTime: string|null;
    ICD9PreOP: string[]|null;
    Status: string|null;
    Comments: string[]|null;
    CancelReason: string|null;
    DateTime: string|null;
    SetupLength: string|null;
    CleanupLength: string|null;
    CreatedDateTime: string|null;
    Classification: string|null;
    CancelDateTime: string|null;
    IsAddOnCase: boolean|null;
    ASARating: string|null;
    Priority: string|null;
    NumberOfPanels: number|null;
    TotalTime: number|null;
    Instruments: SurgicalLogItemInfo[]|null;
    Staff: SurgicalLogStaff[]|null;
    TimingEvents: SurgicalLogTimingEvent[]|null;
    Panels: SurgicalLogPanel[]|null;
    OperatingRoom: SurgicalLogLocation|null;
    Equipment: SurgicalLogItemInfo[]|null;
    AnesthesiaStaff: SurgicalLogStaff[]|null;
    Location: SurgicalLogLocation|null;
    PACUNurses: SurgicalLogStaff[]|null;
    PreOPNurses: SurgicalLogStaff[]|null;
    SurgicalService: SurgicalLogItemInfo|null;

}

export interface Patient {
    Name: string|null;
    MRN: string|null;
    DateOfBirth: string|null;
    Sex: string|null;
    InternalID: string|null;
    CurrentLocation: string|null;
}

export interface SurgicalLogLocation {
    InternalID: string|null;
    Name: string|null;
    Abbreviation: string|null;
}

export interface SurgicalLogPanel {
    Number: number|null;
    Length: string|null;
    TimingEvents: SurgicalLogTimingEvent[]|null;
    Procedures: SurgicalLogProcedure[]|null;
    Surgeons: SurgicalLogSurgeon[]|null;
}

export interface SurgicalLogProcedure {
    Name: string|null;
    InternalID: string|null;
    Laterality: string|null;
    AnesthesiaType: string|null;
    Length: string|null;
    Abbreviation: string|null;
    Region: string|null;
    TimingEvents: SurgicalLogTimingEvent[]|null;
    PatientPosition: string[]|null;

}

export interface SurgicalLogItemInfo {
    Value: string|null;
    Title: string|null;
    Abbreviation: string|null;
}

export interface SurgicalLogTimingEvent {
    Title: string|null;
    StartDateTime: null|string;
    ID: string|null;
    EndDateTime: string|null;
}

export interface SurgicalLogSurgeon {
    InternalID: string|null;
    Name: string|null;
    Service: string|null;
    Role: string|null;
    InOutDateTimes: SurgicalLogStaffInOutTimes[];
}

export interface SurgicalLogStaff {
    InternalID: string|null;
    Name: string|null;
    TypeTitle: string|null;
    TypeValue: string|null;
    InOutDateTimes: SurgicalLogStaffInOutTimes[];
}

export interface SurgicalLogStaffInOutTimes {
    StartDateTime: string|null;
    EndDateTime: string|null;
}

export interface UserReportRow {
    First_Name: string;
    Last_Name: string;
    Username: string;
    Login_Date: string;
    Login_Count: number;
    TotalRows?: number;
}