'use client'
import React from 'react';
import {MedData} from "@/app/utils/interfaces";
import {Button} from "@/components/ui/button";
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {Unlock, Lock} from "lucide-react";
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {isValidHeight} from "@/components/dashboard/restrictions/patient";

interface PatientCovariatesProps {
    ageValue: string;
    setAgeValue: React.Dispatch<React.SetStateAction<string>>;
    ageUnit: string;
    setAgeUnit: React.Dispatch<React.SetStateAction<string>>;
    weightValue: string;
    setWeightValue: React.Dispatch<React.SetStateAction<string>>;
    weightUnit: string;
    setWeightUnit: React.Dispatch<React.SetStateAction<string>>;
    heightValue: string;
    setHeightValue: React.Dispatch<React.SetStateAction<string>>;
    heightUnit: string;
    setHeightUnit: React.Dispatch<React.SetStateAction<string>>;
    sex: string;
    setSex: React.Dispatch<React.SetStateAction<string>>;
    regenerateTitle: () => void;
    refreshDrugModels: (age: string, ageU: string, weight: string, weightU: string, height: string, heightU: string, sex: string, medData: MedData|null) => void;
    disabled: boolean;
    setDisabled: React.Dispatch<React.SetStateAction<boolean>>;
    procedureLocation: string;
    patientName: string;
    procedureName: string;
    setModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PatientCovariates: React.FC<PatientCovariatesProps> = ({
    ageValue,
    setAgeValue,
    ageUnit,
    setAgeUnit,
    weightValue,
    setWeightValue,
    weightUnit,
    setWeightUnit,
    heightValue,
    setHeightValue,
    heightUnit,
    setHeightUnit,
    sex,
    setSex,
    regenerateTitle,
    refreshDrugModels,
    disabled,
    setDisabled,
    procedureLocation,
    patientName,
    procedureName,
    setModalOpen
}) => {
    const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAgeValue(e.target.value);
    };

    const handleAgeUnitChange = (value: string) => {
        setAgeUnit(value);
    };

    const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWeightValue(e.target.value);
    };

    const handleWeightUnitChange = (value: string) => {
        setWeightUnit(value);
    };

    const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setHeightValue(e.target.value);
    };

    const handleHeightUnitChange = (value: string) => {
        setHeightUnit(value);
    };

    const handleSexChange = (value: string) => {
        setSex(value);
    };

    const handleClickSave = () => {
        if(!isValidHeight(Number(heightValue), heightUnit)) {
            setModalOpen(true);
            return;
        }
        regenerateTitle();
        refreshDrugModels(ageValue, ageUnit, weightValue, weightUnit, heightValue, heightUnit, sex, null);
    }

    return (
        <Card className="bg-[#ADD8E6] p-1">
            <CardContent className='p-0'>
                {procedureName && (
                    <div className="grid grid-cols-8 gap-4 mb-6">
                        <h2 className="text-3xl font-semibold col-span-1">Patient Info</h2>
                        {patientName && (
                            <div className={`col-span-2`}>
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="patientName" className="w-20">
                                        Name
                                    </Label>
                                    <Input id="patientName" value={patientName} disabled className="bg-gray-200 flex-grow" />
                                </div>
                            </div>
                        )}
                        <div className={`col-span-${patientName ? '2' : '3'}`}>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="location" className="w-20">
                                    Location
                                </Label>
                                <Input id="location" value={procedureLocation} disabled className="bg-gray-200 flex-grow" />
                            </div>
                        </div>
                        <div className={`col-span-${patientName ? '3' : '4'}`}>
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="procedure" className="w-20">
                                    Procedure
                                </Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Input id="procedure" value={procedureName} disabled className="bg-gray-200 flex-grow" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{procedureName}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    </div>
                )}

                <div className={`grid grid-cols-6 gap-4`}>
                    {!procedureName && <h2 className="text-3xl font-semibold col-span-1 md:col-span-1">Patient Info</h2>}
                    {procedureName && <h2 className="text-3xl font-semibold col-span-1 md:col-span-1"></h2>}
                    <Card className='bg-[#92c6ff]'>
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-2">
                                <Label htmlFor="age" className="w-20 mt-2">
                                    Age
                                </Label>
                                <Input
                                    id="age"
                                    type="number"
                                    value={ageValue}
                                    onChange={handleAgeChange}
                                    disabled={disabled}
                                    className="w-full mb-2 bg-white"
                                />
                                <div className="flex-grow">
                                    <RadioGroup value={ageUnit} onValueChange={handleAgeUnitChange} disabled={disabled} className="space-y-1">
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem className='bg-white' value="years" id="years" />
                                            <Label htmlFor="years">Years</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem className='bg-white' value="months" id="months" />
                                            <Label htmlFor="months">Months</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className='bg-[#92c6ff]'>
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-2">
                                <Label htmlFor="weight" className="w-20 mt-2">
                                    Weight
                                </Label>
                                <Input
                                    id="weight"
                                    type="number"
                                    value={weightValue}
                                    onChange={handleWeightChange}
                                    disabled={disabled}
                                    className="w-full mb-2 bg-white"
                                />
                                <div className="flex-grow">
                                    <RadioGroup
                                        value={weightUnit}
                                        onValueChange={handleWeightUnitChange}
                                        disabled={disabled}
                                        className="space-y-1"
                                    >
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem className='bg-white' value="kg" id="kg" />
                                            <Label htmlFor="kg">kg</Label>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <RadioGroupItem className='bg-white' value="lb" id="lb" />
                                            <Label htmlFor="lb">lb</Label>
                                        </div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className='bg-[#92c6ff]'>
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-2">
                                <Label htmlFor="height" className="w-20 mt-2">
                                    Height
                                </Label>
                                <Input
                                    id="height"
                                    type="number"
                                    value={heightValue}
                                    onChange={handleHeightChange}
                                    disabled={disabled}
                                    className="w-full mb-2 bg-white"
                                />
                                <RadioGroup
                                    value={heightUnit}
                                    onValueChange={handleHeightUnitChange}
                                    disabled={disabled}
                                    className="space-y-1"
                                >
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem className='bg-white' value="cms" id="cms" />
                                        <Label htmlFor="cms">cms</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem className='bg-white' value="inches" id="inches" />
                                        <Label htmlFor="inches">inches</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className='bg-[#92c6ff]'>
                        <CardContent className="p-4">
                            <div className="flex items-start space-x-2">
                                <Label className="w-10 m-2">Sex</Label>
                                <RadioGroup value={sex} onValueChange={handleSexChange} disabled={disabled} className="space-y-4">
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem className='bg-white' value="male" id="male" />
                                        <Label htmlFor="male">Male</Label>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        <RadioGroupItem className='bg-white' value="female" id="female" />
                                        <Label htmlFor="female">Female</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-center mt-4">
                        {disabled ? (
                            <Button onClick={() => setDisabled(false)}>
                                <Lock className="w-4 h-4 mr-2" /> Unlock
                            </Button>
                        ) : (
                            <Button onClick={handleClickSave}>
                                <Unlock className="w-4 h-4 mr-2" /> Save Changes
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default PatientCovariates;
