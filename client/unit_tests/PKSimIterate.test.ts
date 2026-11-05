import pkSimIterate from '@/model/PKSimIterate';
import { PKDrugModel, Amounts } from '@/app/utils/interfaces';

describe('pkSimIterate', () => {
  const mockPkModel: PKDrugModel = {
    Model_ID: 1,
    Model_Name: "Propofol Marsh",
    Medication_Name: "Propofol",
    Medication_ID: 1,
    name: "Propofol",
    Vc: 4.27,
    k01: 0,        // Not succinylcholine
    k10: 0.443,    // Central elimination (per min)
    k12: 0.302,    // Central to peripheral 1
    k13: 0.196,    // Central to peripheral 2
    k21: 0.069,    // Peripheral 1 to central
    k31: 0.0035,   // Peripheral 2 to central
    ke0: 0.456,    // Effect site transfer
    tpeak: [],
    tci_unit: "mcg/ml",
    default_model: true,
    error: ""
  };

  test('should calculate exact amounts for 1mg infusion into empty compartments', () => {
    const initialAmounts: Amounts = { A0: 0, A1: 0, A2: 0, A3: 0, A4: 0 };
    const mgInfused = 1.0;
    
    const result = pkSimIterate(mockPkModel, initialAmounts, mgInfused);
    
    // Calculate rate constants per second (matching the actual function)
    const k10 = 0.443 / 60;   // 0.007383
    const k12 = 0.302 / 60;   // 0.005033  
    const k13 = 0.196 / 60;   // 0.003267
    const k14 = (0.456 / 60) / 10000; // 0.00000076
    const k21 = 0.069 / 60;   // 0.00115
    const k31 = 0.0035 / 60;  // 0.0000583
    const k41 = 0.456 / 60;   // 0.0076
    const k1 = k10 + k12 + k13 + k14; // 0.015684
    
    // Step 1: A1 gets updated first
    // A1 = 0 + (((0*k21 + 0*k31 + 0*k41) - 0*k1) + 1.0) = 0 + (0 - 0 + 1.0) = 1.0
    expect(result.A1).toBeCloseTo(1.0, 6);
    
    // Step 2: Other compartments use the NEW A1 value (1.0)
    // A2 = 0 + (1.0*k12 - 0*k21) = 0 + (1.0*0.005033 - 0) = 0.005033
    expect(result.A2).toBeCloseTo(0.005033, 6);
    
    // A3 = 0 + (1.0*k13 - 0*k31) = 0 + (1.0*0.003267 - 0) = 0.003267
    expect(result.A3).toBeCloseTo(0.003267, 6);
    
    // A4 = 0 + (1.0*k14 - 0*k41) = 0 + (1.0*0.00000076 - 0) = 0.00000076
    expect(result.A4).toBeCloseTo(0.00000076, 9);
  });

  test('should calculate exact redistribution from central compartment', () => {
    const initialAmounts: Amounts = { A0: 0, A1: 10, A2: 0, A3: 0, A4: 0 };
    const mgInfused = 0;
    
    const result = pkSimIterate(mockPkModel, initialAmounts, mgInfused);
    
    // Rate constants per second
    const k10 = 0.443 / 60;   // 0.007383
    const k12 = 0.302 / 60;   // 0.005033
    const k13 = 0.196 / 60;   // 0.003267
    const k14 = (0.456 / 60) / 10000; // 0.00000076
    const k1 = k10 + k12 + k13 + k14; // 0.015684
    
    // A1 = 10 + (0 - 10 * 0.015684) = 10 - 0.15684 = 9.84316
    expect(result.A1).toBeCloseTo(9.84316, 4);
    
    // A2 = 0 + (9.84316 * 0.005033 - 0 * 0.069/60) = 0.04954
    expect(result.A2).toBeCloseTo(0.04954, 4);
    
    // A3 = 0 + (9.84316 * 0.003267 - 0 * 0.0035/60) = 0.03215
    expect(result.A3).toBeCloseTo(0.03215, 4);
    
    // A4 = 0 + (9.84316 * 0.00000076 - 0 * 0.456/60) = 0.0000075
    expect(result.A4).toBeCloseTo(0.0000075, 7);
  });

  test('should calculate exact steady state scenario', () => {
    const initialAmounts: Amounts = { A0: 0, A1: 2, A2: 1, A3: 0.5, A4: 0.1 };
    const mgInfused = 0.5;
    
    const result = pkSimIterate(mockPkModel, initialAmounts, mgInfused);
    
    // Calculate exact values using the formulas
    const k10 = 0.443 / 60;  // 0.007383
    const k12 = 0.302 / 60;  // 0.005033
    const k13 = 0.196 / 60;  // 0.003267
    const k21 = 0.069 / 60;  // 0.00115
    const k31 = 0.0035 / 60; // 0.0000583
    const k14 = (0.456 / 60) / 10000; // 0.00000076
    const k41 = 0.456 / 60;  // 0.0076
    const k1 = k10 + k12 + k13 + k14; // 0.015684
    
    // Step 1: A1 gets updated first
    // A1 = 2 + ((1*0.00115 + 0.5*0.0000583 + 0.1*0.0076) - 2*0.015684) + 0.5
    // A1 = 2 + (0.00115 + 0.0000292 + 0.00076 - 0.031368) + 0.5
    // A1 = 2 + (-0.0295588) + 0.5 = 2.4704412
    const newA1 = 2.4704412;
    expect(result.A1).toBeCloseTo(newA1, 3);
    
    // Step 2: Other compartments use the NEW A1 value (2.4704412)
    // A2 = 1 + (2.4704412*0.005033 - 1*0.00115) = 1 + (0.01243 - 0.00115) = 1.01128
    expect(result.A2).toBeCloseTo(1.01128, 4);
    
    // A3 = 0.5 + (2.4704412*0.003267 - 0.5*0.0000583) = 0.5 + (0.008070 - 0.0000292) = 0.508041
    expect(result.A3).toBeCloseTo(0.508041, 4);
    
    // A4 = 0.1 + (2.4704412*0.00000076 - 0.1*0.0076) = 0.1 + (0.00000188 - 0.00076) = 0.099242
    expect(result.A4).toBeCloseTo(0.099242, 4);
  });

  test('should handle succinylcholine model (k01 > 0)', () => {
    const suxPkModel: PKDrugModel = { 
      ...mockPkModel, 
      k01: 1.2,
      Medication_Name: "Succinylcholine"
    };
    const initialAmounts: Amounts = { A0: 5, A1: 0, A2: 0, A3: 0, A4: 0 };
    const mgInfused = 2;
    
    const result = pkSimIterate(suxPkModel, initialAmounts, mgInfused);
    
    const k01 = 1.2 / 60; // 0.02
    const k1 = 0.015684; // Same as before
    
    // A0 = 5 + (-5 * 0.02 + 2) = 5 + (-0.1 + 2) = 6.9
    expect(result.A0).toBeCloseTo(6.9, 4);
    
    // A1 = 0 + (6.9 * 0.02 - 0 * 0.015684) = 0 + 0.138 = 0.138
    expect(result.A1).toBeCloseTo(0.138, 4);
  });

  test('should verify mass balance with elimination', () => {
    const initialAmounts: Amounts = { A0: 0, A1: 3, A2: 1, A3: 0.5, A4: 0.2 };
    const mgInfused = 0;
    
    const result = pkSimIterate(mockPkModel, initialAmounts, mgInfused);
    const finalTotal = result.A1 + result.A2 + result.A3 + result.A4;
    
    expect(finalTotal).toBeCloseTo(4.67748, 4);
  });

  test('should handle zero amounts', () => {
    const initialAmounts: Amounts = { A0: 0, A1: 0, A2: 0, A3: 0, A4: 0 };
    const mgInfused = 0;
    
    const result = pkSimIterate(mockPkModel, initialAmounts, mgInfused);
    
    expect(result.A0).toBe(0);
    expect(result.A1).toBe(0);
    expect(result.A2).toBe(0);
    expect(result.A3).toBe(0);
    expect(result.A4).toBe(0);
  });
});