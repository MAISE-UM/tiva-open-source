'use client'
import React, {Fragment, useEffect} from 'react';
import {ApplicationListItem, DoseTable, DoseTableRow, Medication} from "@/app/utils/interfaces";
import { getMinDiff } from '@/lib/med-helpers';
import {Input} from "@/components/ui/input";
import {DateTimePicker} from "@/components/shared/DateTimePicker";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Trash2} from "lucide-react";
import {isMoment, Moment} from "moment/moment";
interface DoseTableProps {
    medTable: DoseTable;
    setMedTable: (medTable: DoseTable) => void;
    listData: { [index: string]: ApplicationListItem[] };
    referenceTime: Date;
    onSave: () => void;
    onRemoveMed: (med: string) => void;
    medsList: Medication[];
    index: number;
    lockedDoseTable: boolean;
    startWithNewRow?: boolean;
    showDelete: boolean;
}

const DoseTableComponent: React.FC<DoseTableProps> = ({
    medTable,
    listData,
    setMedTable,
    referenceTime,
    onSave,
    onRemoveMed,
    medsList, 
    index,
    lockedDoseTable,
    startWithNewRow,
    showDelete
}) => {
    useEffect(() => {
        if(startWithNewRow) {
            onAddRow();
        }
    }, []);

    useEffect(() => {
        console.log('medTable', medTable)
    }, [medTable]);

    const onAddRow = () => {
        const currentTime = new Date();

        const firstEvent = medTable.rows.length > 0 ? medTable.rows[0] : null;
        const firstEventTime = firstEvent ? firstEvent.time : currentTime;

        // If the day is different, set the time to the reference time
        let newTime = currentTime;
        if(currentTime.toDateString() !== referenceTime.toDateString() && medTable.rows.length > 0) {
            newTime = new Date(medTable.rows[medTable.rows.length - 1].time);
        }

        // Num of minutes between time and referenceTime both times are in HH:MM format
        const timeSinceFirstEvent= getMinDiff(currentTime, firstEventTime);

        const medRow: DoseTableRow = {
            event: '-- Choose Event --',
            time: newTime,
            timeSinceFirstEvent,
            timeToRun: 0,
            dose: 0,
            unit: listData['DoseTable-Units'][0]['List_Value']
        }
        setMedTable({...medTable, rows: [...medTable.rows, medRow]});
    }

    const onChange = (index: number, field: string, value: string|number|Date, bolusUnits: string[]=[], infusionUnits: string[]=[]) => {
        console.log('onChange', index, field, value, bolusUnits, infusionUnits)
        const updatedTable = medTable;

        if(field === 'time') {
            const dateVal = value as Date;
            console.log('test', value, referenceTime)
            updatedTable.rows[index].timeSinceFirstEvent = getMinDiff(dateVal, referenceTime);
        }
        if(field === 'event' && value === 'Bolus') {
            updatedTable.rows[index].timeToRun = 10.0/60.0;
            const wasInfusion = updatedTable.rows[index].event === 'Stop Infusion' || updatedTable.rows[index].event === 'Start Infusion' || updatedTable.rows[index].event === 'Dose Change' || updatedTable.rows[index].event === '-- Choose Event --';
            if(bolusUnits.length !== 0 && wasInfusion) {
                updatedTable.rows[index].unit = bolusUnits[0];
            }
        } else if(field === 'event' && (value === 'Stop Infusion' || value === 'Start Infusion' || value === 'Dose Change')) {
            const wasBolus = updatedTable.rows[index].event === 'Bolus' || updatedTable.rows[index].event === '-- Choose Event --';
            if(value === 'Stop Infusion') {
                updatedTable.rows[index].dose = 0;
            }
            if(infusionUnits.length !== 0 && wasBolus) {
                updatedTable.rows[index].unit = infusionUnits[0];
            }
        } else {
            updatedTable.rows[index].timeToRun = 0;
        }
        updatedTable.rows[index][field] = value;
        console.log('updatedTable', updatedTable)
        setMedTable(updatedTable);
    }

    const onDeleteRow = (index: number) => {
        const updatedTable = medTable;
        updatedTable.rows.splice(index, 1);
        setMedTable(updatedTable);
    }

    const onTimeRecordedChange = (index: number, date: string|Moment|FocusEvent, bolusUnits: string[], infusionUnits: string[]) => {
        if(isMoment(date)) {
            console.log('datechange', index, date.toDate(), bolusUnits, infusionUnits)
            onChange(index, "time", date.toDate(), bolusUnits, infusionUnits)
        } else if (typeof date === 'string') {
            onChange(index, "time", new Date(date), bolusUnits, infusionUnits)
        }
    }

    return (
        <div className="space-y-4">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[25%]">Med Event</TableHead>
                        <TableHead className="w-[20%]">Time Recorded</TableHead>
                        <TableHead className="w-[15%]">Dose</TableHead>
                        <TableHead>Units</TableHead>
                        {showDelete && <TableHead className="w-[100px]">Delete</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {medTable?.rows.map((row, index) => {
                        const med = medsList.find((med) => med.Medication_Name === medTable.med)
                        const infusionUnits = med?.Infusion_Units || []
                        const bolusUnits = med?.Bolus_Units || []
                        let units: string[] = []
                        if (row.event === "Bolus") {
                            units = bolusUnits
                        } else if (row.event === "Stop Infusion" || row.event === "Start Infusion" || row.event === "Dose Change") {
                            units = infusionUnits
                        }
                        const lastRow = index > 0 ? medTable.rows[index - 1] : medTable.rows[0]
                        const lastRowTime = lastRow.time
                        const currentRowTime = row.time
                        const showRefRow =
                            index > 0 &&
                            lastRowTime !== null &&
                            lastRowTime < referenceTime &&
                            row.time !== null &&
                            row.time >= referenceTime

                        return (
                            <Fragment key={`GTC-${medTable.model_id}-${index}`}>
                                {showRefRow && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="bg-red-100 text-red-800 text-center">
                                            Reference Time: {referenceTime.toDateString()}{" "}
                                            {referenceTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                        </TableCell>
                                    </TableRow>
                                )}
                                <TableRow className={index % 2 === 0 ? "bg-gray-100" : "bg-white"}>
                                    <TableCell>
                                        <Select
                                            value={row.event}
                                            onValueChange={(value) => onChange(index, "event", value, bolusUnits, infusionUnits)}
                                            disabled={lockedDoseTable}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select event" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {listData["DoseTable-Events"]?.map((event) => (
                                                    <SelectItem key={event.List_Value} value={event.List_Value}>
                                                        {event.List_Value}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <DateTimePicker
                                            value={row.time === null ? new Date() : row.time}
                                            onChange={date => onTimeRecordedChange(index, date, bolusUnits, infusionUnits)}
                                            disabled={lockedDoseTable}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            value={row.dose}
                                            onChange={(e) => onChange(index, "dose", Number.parseFloat(e.target.value))}
                                            disabled={row.event === "-- Choose Event --" || row.event === "Stop Infusion" || lockedDoseTable}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={row.unit}
                                            onValueChange={(value) => onChange(index, "unit", value)}
                                            disabled={row.event === "-- Choose Event --" || row.event === "Stop Infusion" || lockedDoseTable}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select unit" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {units.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>
                                                        {unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    {showDelete && (
                                        <TableCell>
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={() => onDeleteRow(index)}
                                                disabled={lockedDoseTable}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                                {index === medTable.rows.length - 1 && currentRowTime !== null && referenceTime > currentRowTime && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="bg-red-100 text-red-800 text-center">
                                            Reference Time: {referenceTime.toDateString()}{" "}
                                            {referenceTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </Fragment>
                        )
                    })}
                </TableBody>
            </Table>

            {(medTable == null || medTable.rows.length === 0) && (
                <div className="text-orange-500 text-xl font-bold text-center">Add a Med Event</div>
            )}

            {medTable.failure_reason && (
                <div className="bg-red-500 text-white p-2 mb-4 text-center">{medTable.failure_reason}</div>
            )}

            {!lockedDoseTable && (
                <div className="flex justify-between items-center">
                    <Button onClick={onAddRow}>Add Event</Button>
                    <Button onClick={onSave} variant="default" id={`save-${index}`}>
                        Save
                    </Button>
                    {!startWithNewRow && (
                        <Button variant="destructive" onClick={() => onRemoveMed(medTable.med)}>
                            Remove Med
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
};

export default DoseTableComponent;
