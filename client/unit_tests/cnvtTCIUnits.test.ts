import cnvtTCIUnits from '@/model/cnvtTCIUnits';

describe('cnvtTCIUnits', () => {
  test('should convert mg/mL to mcg/mL correctly', () => {
    const concMgPerMl = 1.5; // 1.5 mg/mL
    const tciUnits = 'mcg/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(1500); // 1.5 * 1000 = 1500 mcg/mL
  });

  test('should convert mg/mL to ng/mL correctly', () => {
    const concMgPerMl = 0.002; // 0.002 mg/mL (small concentration)
    const tciUnits = 'ng/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(2000); // 0.002 * 1,000,000 = 2000 ng/mL
  });

  test('should return same value for unknown units (default conversion factor 1)', () => {
    const concMgPerMl = 2.5;
    const tciUnits = 'mg/mL'; // Unknown unit, should use default factor of 1
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(2.5); // 2.5 * 1 = 2.5
  });

  test('should handle zero concentration', () => {
    const concMgPerMl = 0;
    const tciUnits = 'mcg/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(0);
  });

  test('should handle realistic propofol concentration (mcg/mL)', () => {
    const concMgPerMl = 0.004; // 4 mcg/mL in mg/mL
    const tciUnits = 'mcg/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(4); // 0.004 * 1000 = 4 mcg/mL
  });

  test('should handle realistic remifentanil concentration (ng/mL)', () => {
    const concMgPerMl = 0.000005; // 5 ng/mL in mg/mL
    const tciUnits = 'ng/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(5); // 0.000005 * 1,000,000 = 5 ng/mL
  });

  test('should handle case sensitivity - exact match required', () => {
    const concMgPerMl = 1.0;
    const tciUnits = 'MCG/ML'; // Wrong case
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(1.0); // Should use default factor of 1, not 1000
  });

  test('should handle floating point precision for mcg/mL', () => {
    const concMgPerMl = 0.123456789;
    const tciUnits = 'mcg/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBeCloseTo(123.456789, 6);
  });

  test('should handle scientific notation conversion (1e6)', () => {
    const concMgPerMl = 0.000001; // 1 ng/mL in mg/mL
    const tciUnits = 'ng/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(1); // 0.000001 * 1e6 = 1 ng/mL
  });

  test('should handle very small concentrations', () => {
    const concMgPerMl = 0.001; // 0.001 mg/mL
    const tciUnits = 'mcg/mL';
    
    const result = cnvtTCIUnits(concMgPerMl, tciUnits);
    
    expect(result).toBe(1); // 0.001 * 1000 = 1 mcg/mL
  });
});