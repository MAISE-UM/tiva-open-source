import getTPeak from '@/model/getTPeak';
import { PKDrugModel } from '@/app/utils/interfaces';

// Mock console.log
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn(); // Silence all console.log
});

afterAll(() => {
  console.log = originalConsoleLog; // Restore after tests
});

describe('getTPeak', () => {
  const mock_propofol: PKDrugModel = {
    Model_ID: 3,
    Model_Name: "propofol, Schnider (ABW correction)",
    Medication_Name: "Propofol",
    Medication_ID: 1,
    name: "propofol, Schnider (ABW correction)",
    Vc: 4.27,
    k01: -1,
    k10: 0.42395,
    k12: 0.43138,
    k13: 0.19578,
    k21: 0.06604,
    k31: 0.00351,
    ke0: 0.456,
    tpeak: [],
    tci_unit: "mcg/mL",
    default_model: true,
    error: ""
  };

  const mock_fentanyl: PKDrugModel = {
    Model_ID: 4,
    Model_Name: "fentanyl, Shafer PK/PD",
    Medication_Name: "Fentanyl",
    Medication_ID: 2,
    name: "fentanyl, Shafer PK/PD",
    Vc: 8.4,
    k01: -1,
    k10: 0.07981,
    k12: 0.45143,
    k13: 0.18952,
    k21: 0.10628,
    k31: 0.00591,
    ke0: 0.1121,
    tpeak: [],
    tci_unit: "ng/mL",
    default_model: true,
    error: ""
  };

  test('should calculate correct tpeak values for propofol', () => {
    const result = getTPeak(mock_propofol);
    expect(result.length).toBe(90);
    expect(result[0]).toBeCloseTo(0.00000076, 8);
    expect(result[1]).toBeCloseTo(0.00000226, 8);
    expect(result[89]).toBeCloseTo(0.00023256, 8);
  });

  test('should calculate correct tpeak values for fentanyl', () => {
    const result = getTPeak(mock_fentanyl);
    expect(result.length).toBe(243);
    expect(result[0]).toBeCloseTo(0.0000001868, 10);
    expect(result[1]).toBeCloseTo(0.0000005579, 10);
    expect(result[242]).toBeCloseTo(0.0001210031, 10);
  });
});