import convertInfUnits from '@/model/cnvtInfUnits';

describe('convertInfUnits', () => {
  const standardWeight = 70; // kg - typical adult weight for testing

  describe('Weight-independent conversions (per kg units)', () => {
    test('should convert mcg/kg/hr to mcg/kg/min correctly', () => {
      const concVal = 120; // 120 mcg/kg/hr
      const result = convertInfUnits(concVal, 'mcg/kg/hr', standardWeight);
      
      expect(result).toBe(2); // 120 / 60 = 2 mcg/kg/min
    });

    test('should convert mg/kg/hr to mcg/kg/min correctly', () => {
      const concVal = 0.12; // 0.12 mg/kg/hr
      const result = convertInfUnits(concVal, 'mg/kg/hr', standardWeight);
      
      expect(result).toBe(2); // (0.12 * 1000) / 60 = 2 mcg/kg/min
    });

    test('should convert mg/kg/min to mcg/kg/min correctly', () => {
      const concVal = 0.002; // 0.002 mg/kg/min
      const result = convertInfUnits(concVal, 'mg/kg/min', standardWeight);
      
      expect(result).toBe(2); // 0.002 * 1000 = 2 mcg/kg/min
    });

    test('should return same value for mcg/kg/min (no conversion needed)', () => {
      const concVal = 100; // 100 mcg/kg/min
      const result = convertInfUnits(concVal, 'mcg/kg/min', standardWeight);
      
      expect(result).toBe(100); // No conversion needed
    });
  });

  describe('Weight-dependent conversions (absolute units)', () => {
    test('should convert mcg/min to mcg/kg/min correctly', () => {
      const concVal = 7000; // 7000 mcg/min total dose
      const weight = 70; // kg
      const result = convertInfUnits(concVal, 'mcg/min', weight);
      
      expect(result).toBe(100); // 7000 / 70 = 100 mcg/kg/min
    });

    test('should convert mg/min to mcg/kg/min correctly', () => {
      const concVal = 7; // 7 mg/min total dose
      const weight = 70; // kg
      const result = convertInfUnits(concVal, 'mg/min', weight);
      
      expect(result).toBe(100); // (7 * 1000) / 70 = 100 mcg/kg/min
    });

    test('should convert mcg/hr to mcg/kg/min correctly', () => {
      const concVal = 420000; // 420,000 mcg/hr total dose
      const weight = 70; // kg
      const result = convertInfUnits(concVal, 'mcg/hr', weight);
      
      expect(result).toBe(100); // (420000 / 60) / 70 = 100 mcg/kg/min
    });

    test('should convert mg/hr to mcg/kg/min correctly', () => {
      const concVal = 420; // 420 mg/hr total dose
      const weight = 70; // kg
      const result = convertInfUnits(concVal, 'mg/hr', weight);
      
      expect(result).toBe(100); // ((420 * 1000) / 60) / 70 = 100 mcg/kg/min
    });
  });

  describe('Medical scenarios', () => {
    test('should handle realistic propofol infusion (mcg/kg/min)', () => {
      const concVal = 100; // 100 mcg/kg/min propofol
      const result = convertInfUnits(concVal, 'mcg/kg/min', 70);
      
      expect(result).toBe(100);
    });

    test('should handle realistic propofol infusion (mg/hr)', () => {
      const concVal = 420; // 420 mg/hr for 70kg patient = 100 mcg/kg/min
      const weight = 70;
      const result = convertInfUnits(concVal, 'mg/hr', weight);
      
      expect(result).toBe(100);
    });

    test('should handle pediatric dosing with smaller weight', () => {
      const concVal = 150; // 150 mcg/min total dose
      const weight = 15; // 15kg child
      const result = convertInfUnits(concVal, 'mcg/min', weight);
      
      expect(result).toBe(10); // 150 / 15 = 10 mcg/kg/min
    });

    test('should handle obese patient dosing', () => {
      const concVal = 12000; // 12,000 mcg/min total dose
      const weight = 120; // 120kg patient
      const result = convertInfUnits(concVal, 'mcg/min', weight);
      
      expect(result).toBe(100); // 12000 / 120 = 100 mcg/kg/min
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle zero concentration', () => {
      const result = convertInfUnits(0, 'mcg/kg/min', 70);
      
      expect(result).toBe(0);
    });

    test('should handle zero weight (division by zero protection)', () => {
      const concVal = 1000;
      const result = convertInfUnits(concVal, 'mcg/min', 0);
      
      // Should return Infinity or handle gracefully
      expect(result).toBe(Infinity);
    });

    test('should handle missing weight parameter (default 0)', () => {
      const concVal = 100;
      const result = convertInfUnits(concVal, 'mcg/kg/min'); // No weight provided
      
      expect(result).toBe(100); // Should still work for per-kg units
    });

    test('should handle unknown units correctly', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const concVal = 100;
        const result = convertInfUnits(concVal, 'unknown/unit', 70);
        
        // Test return value
        expect(result).toBe(0);
        
        // Test that warning was logged (optional - adjust message as needed)
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
    });

    test('should handle very small concentrations', () => {
      const concVal = 0.001; // Very small mg/kg/hr
      const result = convertInfUnits(concVal, 'mg/kg/hr', 70);
      
      expect(result).toBeCloseTo(0.0167, 4); // (0.001 * 1000) / 60
    });

    test('should handle floating point precision', () => {
      const concVal = 33.333333; // Repeating decimal
      const result = convertInfUnits(concVal, 'mcg/kg/hr', 70);
      
      expect(result).toBeCloseTo(0.5556, 4); // 33.333333 / 60
    });
  });

  describe('Unit conversion chains', () => {
    test('should convert complex mg/hr scenario correctly', () => {
      // 300 mg/hr for 50kg patient should equal 100 mcg/kg/min
      const concVal = 300; // mg/hr
      const weight = 50; // kg
      const result = convertInfUnits(concVal, 'mg/hr', weight);
      
      // ((300 * 1000) / 60) / 50 = 5000 / 50 = 100
      expect(result).toBe(100);
    });

    test('should handle very precise weight-based calculation', () => {
      const concVal = 4200; // mcg/hr total
      const weight = 84.5; // Precise weight
      const result = convertInfUnits(concVal, 'mcg/hr', weight);
      
      // (4200 / 60) / 84.5 = 70 / 84.5
      expect(result).toBeCloseTo(0.8284, 4);
    });
  });

  describe('Boundary testing', () => {
    test('should handle maximum realistic infusion rate', () => {
      const concVal = 500; // High propofol dose
      const result = convertInfUnits(concVal, 'mcg/kg/min', 70);
      
      expect(result).toBe(500);
    });

    test('should handle minimum realistic infusion rate', () => {
      const concVal = 0.1; // Very low maintenance dose
      const result = convertInfUnits(concVal, 'mcg/kg/min', 70);
      
      expect(result).toBe(0.1);
    });
  });
});