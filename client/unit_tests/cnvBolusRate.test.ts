import { cnvBolusRate } from '@/model/cnvBolusRate';

// Mock console.log
const originalConsoleLog = console.log;
beforeAll(() => {
  console.log = jest.fn(); // Silence all console.log
});

afterAll(() => {
  console.log = originalConsoleLog; // Restore after tests
});

describe('cnvBolusRate', () => {
  test('should convert mcg to mg correctly', () => {
    const result = cnvBolusRate(1000, 'mcg', 70);
    expect(result).toBe(1); // 1000 * 0.001 = 1 mg
  });

  test('should convert mg (no conversion needed)', () => {
    const result = cnvBolusRate(100, 'mg', 70);
    expect(result).toBe(100); // 100 * 1 = 100 mg
  });

  test('should convert mg/kg to total mg', () => {
    const result = cnvBolusRate(2, 'mg/kg', 70);
    expect(result).toBe(140); // 2 * 70 = 140 mg
  });

  test('should convert mcg/kg to total mg', () => {
    const result = cnvBolusRate(2000, 'mcg/kg', 70);
    expect(result).toBe(140); // 2000 * 0.001 * 70 = 140 mg
  });

  test('should return 0 for unknown units', () => {
    const result = cnvBolusRate(100, 'unknown', 70);
    expect(result).toBe(0); // factor remains 0
  });

  test('should handle zero dose', () => {
    const result = cnvBolusRate(0, 'mg/kg', 70);
    expect(result).toBe(0);
  });

  test('should log function call', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    cnvBolusRate(100, 'mg', 70);
    
    expect(consoleSpy).toHaveBeenCalledWith('getBolusRate', 100, 'mg', 70);
    consoleSpy.mockRestore();
  });

  test('should handle missing weight parameter (uses default kg=0)', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Call without the kg parameter - should use default kg=0
    const result = cnvBolusRate(100, 'mg');
    
    expect(result).toBe(100); // 100 * 1 = 100 (no weight dependency)
    expect(consoleSpy).toHaveBeenCalledWith('getBolusRate', 100, 'mg', 0); // kg should be 0
    
    consoleSpy.mockRestore();
  });

  test('should handle missing weight with weight-dependent unit', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Call mg/kg without kg parameter - should use default kg=0
    const result = cnvBolusRate(2, 'mg/kg');
    
    expect(result).toBe(0); // 2 * 0 = 0 (factor = kg = 0)
    expect(consoleSpy).toHaveBeenCalledWith('getBolusRate', 2, 'mg/kg', 0);
    
    consoleSpy.mockRestore();
  });

});