'use client'
import React, {useEffect, useState} from 'react';
import {Medication, PKDrugModel, TCI} from "@/app/utils/interfaces";
import {type Config, type Layout, ScatterData, Shape} from "plotly.js-dist-min";
import {Loader2} from "lucide-react";
import {MedPlotly} from "@/components/dashboard/subComponents/MedPlotly";
import {usePermissions} from "@/app/contexts/PermissionContext";

interface LineGraphProps {
    tci: TCI;
    tci_enabled_count: number;
    tci_unit: string;
    drug: string;
    drugModels: PKDrugModel[];
    medsList: Medication[];
    referenceTime: Date;
    effectSiteStyle: string;
    plasmaStyle: string;
    modelName: string;
    concentrationTarget: string;
    expandGraphAction: (med: string) => void
    fullSize: boolean;
    maxTime: number;
}

export default function Graph({
    tci,
    tci_enabled_count,
    tci_unit,
    drug,
    // drugModels,
    medsList,
    referenceTime,
    effectSiteStyle,
    plasmaStyle,
    modelName,
    concentrationTarget,
    expandGraphAction,
    fullSize,
    maxTime
}: LineGraphProps) {
    const {permissions} = usePermissions();
    const [graphData, setGraphData] = useState<Partial<ScatterData>[]|null>(null);
    const [layout, setLayout] = useState<Partial<Layout>|null>(null);
    const [config, setConfig] = useState<Partial<Config>|null>(null);
    const [showExportButton, setShowExportButton] = useState(false);

    useEffect(() => {
        const matchedMed = medsList.filter((med: {Medication_Name: string}) => med.Medication_Name === drug)[0];

        console.log('graphMed', matchedMed)

        if(tci == null) return;

        console.log('tci', tci)

        const condensedT = condenseArray(tci.t).map((min) => {
            return new Date(referenceTime.getTime() + (min * 60000))
        });
        const condensedCp = condenseArray(tci.Cp);
        const condensedCe = condenseArray(tci.Ce);

        console.log('targetT', condensedT[condensedT.length - 1], new Date(condensedT[condensedT.length - 1].getTime() - (maxTime * 60000)))

        const tIndex = findIndexClosestToDate(new Date(condensedT[condensedT.length - 1].getTime() - (maxTime * 60000)), condensedT);

        console.log('tIndex', tIndex, condensedT[tIndex]);

        const tSolidValues = condensedT.slice(0, tIndex);
        const tDashedValues = condensedT.slice(tIndex, condensedT.length);

        // Every value from index 0 to tIndex including tIndex
        const cpSolidValues = condensedCp.slice(0, tIndex);
        // Every value from tIndex to end including tIndex
        const cpDashedValues = condensedCp.slice(tIndex, condensedCp.length);

        // Every value from index 0 to tIndex including tIndex
        const ceSolidValues = condensedCe.slice(0, tIndex);
        // Every value from tIndex to end including tIndex
        const ceDashedValues = condensedCe.slice(tIndex, condensedCe.length);

        const ceSolid: Partial<ScatterData> = {
            x: tSolidValues,
            y: ceSolidValues,
            mode: "lines",
            type: "scatter",
            line: {
                shape: "spline",
                color: "blue",
            },
            name: "Effect Concentration (Ce)",
            showlegend: plasmaStyle !== "Hide",
        };

        const ceDashed: Partial<ScatterData> = {
            x: tDashedValues,
            y: ceDashedValues,
            mode: 'lines',
            type: 'scatter',
            line: {
                dash: 'dot',
                width: 4,
                color: 'blue'
            },
            name: 'Effect Concentration (Ce)',
            showlegend: false
        };

        const cpSolid: Partial<ScatterData> = {
            x: tSolidValues,
            y: cpSolidValues,
            mode: 'lines',
            type: 'scatter',
            line: {
                shape: 'spline',
                color: 'orange'
            },
            name: 'Plasma Concentration (Cp)',
            showlegend: effectSiteStyle !== 'Hide'
        };

        const cpDashed: Partial<ScatterData> = {
            x: tDashedValues,
            y: cpDashedValues,
            mode: 'lines',
            type: 'scatter',
            line: {
                dash: 'dot',
                width: 4,
                color: 'orange'
            },
            name: 'Plasma Concentration (Cp)',
            showlegend: false
        };

        const dataArr: Partial<ScatterData>[] = [];

        if(plasmaStyle !== 'Hide') {
            dataArr.push(cpSolid);
            dataArr.push(cpDashed);
        }
        if(effectSiteStyle !== 'Hide') {
            dataArr.push(ceSolid);
            dataArr.push(ceDashed);
        }

        const shadedRegion: Partial<Shape> = {
            type: 'rect',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            x1: 1,
            y0: matchedMed['Lower'],
            y1: matchedMed['Upper'],
            fillcolor: 'rgba(0,168,220,0.3)',
            line: { width: 0 },
        }

        const layout: Partial<Layout> = {
            yaxis : {
                title: { text: `Concentration (${tci_unit})`, font: { size: 24, color: "black" } },
                rangemode: 'tozero',
            },
            margin: {
                r: 10,
                pad: 4
            },
            title: { text: `${drug} ${!fullSize ? '' : `Model: ${modelName}`} `, font: { size: 24, color: "black" } },
            shapes: concentrationTarget === 'Show' ? [shadedRegion] : [],
            paper_bgcolor: 'white',
            plot_bgcolor: 'white',
        };

        setGraphData(dataArr);
        setLayout(layout);
        setConfig({displayModeBar: false, responsive: true})
        console.log('updated', dataArr, layout)
    }, [tci, tci_unit, tci_enabled_count, plasmaStyle, effectSiteStyle, fullSize, referenceTime, medsList, drug, modelName, maxTime, concentrationTarget]);

    useEffect(() => {
        if(permissions === null) return;
        const showExportButton = permissions.Permissions.some((permission) => {
            return permission.Function_Name === 'ExportGraphToFileButton'
        });
        setShowExportButton(showExportButton);
    }, [permissions]);

    function condenseArray<T>(arr: T[]): T[] {
        const targetLength = 1000;
        const arrLength = arr.length;

        if (arrLength <= targetLength) {
            return arr; // No need to condense if the array is already 500 or less
        }

        const step = arrLength / targetLength;
        return Array.from({ length: targetLength }, (_, i) => arr[Math.floor(i * step)]);
    }

    const findIndexClosestToDate = (targetDate: Date, dates: Date[]): number => {
        let closest = dates[0];
        let diff = Math.abs(targetDate.getTime() - closest.getTime());

        for (const date of dates) {
            const newDiff = Math.abs(targetDate.getTime() - date.getTime());
            if (newDiff < diff) {
                diff = newDiff;
                closest = date;
            }
        }

        return dates.indexOf(closest);
    };

    return (
        <div className="flex flex-col items-center w-full plot-container">
            {graphData === null || layout === null || config === null ? (
                <div className="inset-0 flex justify-center items-center h-96 bg-white/70">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
            ) : (
                <>
                    <div className="w-full plotly-graph">
                        <MedPlotly
                            data={graphData}
                            layout={layout}
                            config={config}
                            expandGraphAction={() => expandGraphAction(drug)}
                            fullSize={fullSize}
                            showExportButton={showExportButton}
                        />
                    </div>
                </>
            )}
        </div>
    )
}