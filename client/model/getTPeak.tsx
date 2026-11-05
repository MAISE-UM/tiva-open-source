'use client'
import {Amounts, PKDrugModel} from "@/app/utils/interfaces";
import pkSimIterate from "@/model/PKSimIterate";

export default function getTPeak(pk: PKDrugModel): number[] {
  console.log('pk2', pk)
  let amounts: Amounts = { A0: 0, A1: 0, A2: 0, A3: 0, A4: 0 };
  let prevAmounts: Amounts = {...amounts};

  let finished: boolean = false;
  let secs: number = 0; // In TypeScript, array indexes start from 0
  const tpeak: number[] = [];

  while (!finished) {
    if (secs < 10) { // Adjusted for 0-index
      amounts = pkSimIterate(pk, amounts, 1);
    } else {
      prevAmounts = {...amounts};
      amounts = pkSimIterate(pk, amounts, 0);
    }


    // if(secs < 1000)
    //   console.log('amounts', amounts, 'prevAmounts', prevAmounts, 'secs', secs, 'tpeak', tpeak)
    // console.log('secs', secs)

    if (secs > 0 && amounts.A4 < prevAmounts.A4) {
      finished = true;
    } else {
      tpeak[secs] = amounts.A4;
      secs += 1;
    }
  }

  return tpeak;
}