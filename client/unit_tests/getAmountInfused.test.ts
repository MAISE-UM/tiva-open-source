import { getAmountInfused } from '@/model/getAmountInfused';

describe('getAmountInfused', () => {
  test('should calculate correct amount for 1 second (1000ms)', () => {
    const mgToInf = 0.001; // 0.001 mg per second
    const milliseconds = 1000; // 1 second
    
    const result = getAmountInfused(mgToInf, milliseconds);
    
    expect(result).toBe(0.001);
  });

  test('should calculate correct amount for 500ms (half second)', () => {
    const mgToInf = 0.002; // 0.002 mg per second
    const milliseconds = 500; // 0.5 seconds
    
    const result = getAmountInfused(mgToInf, milliseconds);
    
    expect(result).toBe(0.001); // Half the rate for half the time
  });

  test('should return zero when mgToInf is zero', () => {
    const mgToInf = 0;
    const milliseconds = 1000;
    
    const result = getAmountInfused(mgToInf, milliseconds);
    
    expect(result).toBe(0);
  });

  test('should return zero when time is zero', () => {
    const mgToInf = 0.001;
    const milliseconds = 0;
    
    const result = getAmountInfused(mgToInf, milliseconds);
    
    expect(result).toBe(0);
  });

  test('should handle realistic propofol infusion amount', () => {
    // Example: 100 mcg/kg/min for 70kg patient
    // = 7000 mcg/min = 7 mg/min = 0.1167 mg/sec
    const mgToInf = 0.1167; // mg per second
    const milliseconds = 1000; // 1 second simulation step
    
    const result = getAmountInfused(mgToInf, milliseconds);
    
    expect(result).toBeCloseTo(0.1167, 4);
  });
});