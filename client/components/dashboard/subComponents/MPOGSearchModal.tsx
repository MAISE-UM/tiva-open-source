'use client'
import { getGetCaseFromMPOG } from "@/api/ehr-api";
import {MedData, Medication} from "@/app/utils/interfaces";
import React, {useState} from "react";
import {prepareMPOGData} from "@/lib/med-helpers";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog";

interface MPOGSearchModalProps {
    showMPOGModal: boolean;
    onCancelAction: () => void;
    medsList: Medication[];
    loadMPOGMedsAction: (medData: MedData|null) => void;
}

export const MPOGSearchModal: React.FC<MPOGSearchModalProps> = ({
    showMPOGModal,
    onCancelAction,
    medsList,
    loadMPOGMedsAction
}) => {
    const [mpogCaseId, setMPOGCaseId] = useState('')

    const search = () => {
        getGetCaseFromMPOG({MPOG_CASE_ID: mpogCaseId}).then((res) => {
            const mpogMedList = res.oReturnObject;
            console.log(mpogMedList)
            if(mpogMedList != null && mpogMedList.length !== 0) {
                const medData = prepareMPOGData(mpogMedList, medsList)
                console.log(medData)
                loadMPOGMedsAction(medData)
            }
        });
    }

    const onOpenChange = (open: boolean) => {
        if(!open) {
            onCancelAction()
        }
    }

    return (
        <Dialog
            open={showMPOGModal}
            onOpenChange={onOpenChange}
        >
            <DialogContent className='w-1/2'>
                <DialogHeader>
                    <DialogTitle>Search by MPOG Case ID</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    <div>
                        <Label>MPOG Case ID</Label>
                        <Input
                            type="text"
                            name="mpogCaseId"
                            id="mpogCaseId"
                            value={mpogCaseId}
                            onChange={(e) => setMPOGCaseId(e.target.value)}
                        />
                        <div style={{display: 'flex', justifyContent: 'center', marginTop: '10px'}}>
                            <Button color="primary" onClick={search} disabled={mpogCaseId.trim() === ''}>Search</Button>
                        </div>
                    </div>
                </DialogDescription>
            </DialogContent>
        </Dialog>
    );
}
