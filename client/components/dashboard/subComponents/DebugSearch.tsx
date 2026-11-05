'use client'
import React, {useState} from 'react';
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

interface SearchProps {
    FHIRSearch: (accessToken: string, fhirPatientID: string, surgicalLog: string) => void;
}

const DebugSearch: React.FC<SearchProps> = ({FHIRSearch}) => {
    const [accessToken, setAccessToken] = useState<string>('');
    const [fhirPatientID, setFhirPatientID] = useState<string>('');
    const [surgicalLog, setSurgicalLog] = useState<string>('');

    const handleSearch = () => {
        FHIRSearch(accessToken, fhirPatientID, surgicalLog);
    };

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6">Debug FHIR Search</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input id="accessToken" type="text" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="fhirPatientID">FHIR Patient ID</Label>
                    <Input
                        id="fhirPatientID"
                        type="text"
                        value={fhirPatientID}
                        onChange={(e) => setFhirPatientID(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="surgicalLog">Surgical Log ID</Label>
                    <Input id="surgicalLog" type="text" value={surgicalLog} onChange={(e) => setSurgicalLog(e.target.value)} />
                </div>
                <Button onClick={handleSearch} className="w-full md:w-auto">
                    Search
                </Button>
            </div>
        </div>
    )
};

export default DebugSearch;
