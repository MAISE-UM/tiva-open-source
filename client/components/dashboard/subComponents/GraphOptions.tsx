'use client'
import React, {Fragment} from 'react';
import {ApplicationListItem, DoseTables} from "@/app/utils/interfaces";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {Label} from "@/components/ui/label";
import {SelectTrigger, Select, SelectValue, SelectContent, SelectItem} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface GraphOptionsProps {
    maxTime: number;
    setMaxTime: React.Dispatch<React.SetStateAction<number>>;
    plasmaStyle: string;
    setPlasmaStyle: React.Dispatch<React.SetStateAction<string>>;
    effectSiteStyle: string;
    setEffectSiteStyle: React.Dispatch<React.SetStateAction<string>>;
    concentrationTarget: string;
    setConcentrationTarget: React.Dispatch<React.SetStateAction<string>>;
    listData: { [index: string]: ApplicationListItem[] };
    medTables: DoseTables;
    graphList: Array<string>;
    setGraphList: React.Dispatch<React.SetStateAction<Array<string>>>;
    style?: React.CSSProperties;
}

const GraphOptions: React.FC<GraphOptionsProps> = ({
    maxTime,
    setMaxTime,
    plasmaStyle,
    setPlasmaStyle,
    effectSiteStyle,
    setEffectSiteStyle,
    concentrationTarget,
    setConcentrationTarget,
    listData,
    medTables,
    graphList,
    setGraphList
}) => {
    const [localMaxTime, setLocalMaxTime] = React.useState<number>(maxTime);

    const handleClickCheckbox = (med: string) => {
        const newGraphList = [...graphList]
        if (graphList.includes(med)) {
            const index: number = graphList.indexOf(med);
            newGraphList.splice(index, 1)
        }
        else {
            newGraphList.push(med);
        }
        setGraphList(newGraphList)
    }

    return (
        <Card className="bg-[#ADD8E6] border-[#ADD8E6] min-h-[200px] p-5 rounded-lg">
            <CardHeader>
                <CardTitle>Graph Options</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="concentrationTarget">Target Effect Site Concentration Range</Label>
                        <Select value={concentrationTarget} onValueChange={setConcentrationTarget}>
                            <SelectTrigger id="concentrationTarget">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                {listData["GraphOptions-GraphStyle"]?.map((styleOption) => (
                                    <SelectItem key={`${styleOption.List_Value}-2`} value={styleOption.List_Value}>
                                        {styleOption.List_Value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maxTime">Time (min) Into Future to Generate</Label>
                        <Input
                            type="number"
                            id="maxTime"
                            value={localMaxTime}
                            className='bg-white'
                            onChange={(e) => setLocalMaxTime(Number.parseFloat(e.target.value))}
                            onBlur={(e) => setMaxTime(Number.parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="effectSiteStyle">Effect Site Concentration</Label>
                        <Select value={effectSiteStyle} onValueChange={setEffectSiteStyle}>
                            <SelectTrigger id="effectSiteStyle">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                {listData["GraphOptions-GraphStyle"]?.map((styleOption) => (
                                    <SelectItem key={`${styleOption.List_Value}-2`} value={styleOption.List_Value}>
                                        {styleOption.List_Value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="plasmaStyle">Plasma Concentration</Label>
                        <Select value={plasmaStyle} onValueChange={setPlasmaStyle}>
                            <SelectTrigger id="plasmaStyle">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                {listData["GraphOptions-GraphStyle"]?.map((styleOption) => (
                                    <SelectItem key={`${styleOption.List_Value}-1`} value={styleOption.List_Value}>
                                        {styleOption.List_Value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {Object.keys(medTables).length > 0 && (
                    <Card className="mt-6 bg-teal-200">
                        <CardHeader>
                            <CardTitle className="text-lg">Show Graph</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="font-semibold">Generate Graph</div>
                                <div className="font-semibold">Medications</div>
                                {Object.keys(medTables).map((med, id) => (
                                    <Fragment key={`go-${id}`}>
                                        <div
                                            onClick={() => handleClickCheckbox(med)}
                                            className="flex justify-center items-center border-2 border-sky-500 p-2 cursor-pointer"
                                        >
                                            <Checkbox checked={graphList.includes(med)} onCheckedChange={() => handleClickCheckbox(med)} />
                                        </div>
                                        <div className="flex items-center border-2 border-sky-500 p-2">
                                            <Label>{med}</Label>
                                        </div>
                                    </Fragment>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </CardContent>
        </Card>
    );
};

export default GraphOptions;
