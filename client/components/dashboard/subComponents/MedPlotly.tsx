"use client";

import dynamic from "next/dynamic";
import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { Layout, Config, PlotlyHTMLElement, Data } from "plotly.js-dist-min";
import { Loader2 } from "lucide-react";
import {Button} from "@/components/ui/button";

// Define props type
interface MedPlotlyProps {
    id?: string;
    className?: string;
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
    expandGraphAction: () => void
    fullSize: boolean;
    showExportButton: boolean;
}

export const MedPlotly = dynamic(
    () =>
        import("plotly.js-dist-min").then(({ newPlot, purge }) => {
            const PlotlyComponent = forwardRef<PlotlyHTMLElement | HTMLDivElement, MedPlotlyProps>(
                ({ id, className, data, layout, config, expandGraphAction, fullSize, showExportButton }, ref) => {
                    const originId = useId();
                    const realId = id || originId;
                    const originRef = useRef<HTMLDivElement | null>(null);
                    const [handle, setHandle] = useState<PlotlyHTMLElement | null>(null);
                    const [loading, setLoading] = useState(true); // Track loading state

                    useEffect(() => {
                        if (!originRef.current) return;
                        let instance: PlotlyHTMLElement | null = null;

                        setLoading(true); // Start loading before rendering

                        newPlot(originRef.current, data, layout, config).then((plotInstance) => {
                            setHandle((instance = plotInstance));
                            console.log('loadingFinished')
                            setLoading(false); // Stop loading when rendering is complete
                        });

                        return () => {
                            if (instance) purge(instance);
                        };
                    }, [data, layout, config]); // Depend on all relevant props

                    useImperativeHandle(ref, () => handle ?? originRef.current ?? document.createElement("div"), [handle]);

                    const saveDataToFile = () => {
                        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        const title = layout?.title as {text: string};
                        a.download = `${title.text.trim()}-data.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }

                    return (
                        <div className="relative">
                            {/* Show loading spinner while rendering */}
                            { loading && (
                                <div className="inset-0 flex justify-center items-center h-96 bg-white/70">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            )}
                            
                            <div id={realId} ref={originRef} className={className} />
                            {!loading && !fullSize && <>
                                <Button className='title-button' onClick={expandGraphAction}>Preview Changes</Button>
                                {
                                    showExportButton &&
                                    <Button className='title-button-2' onClick={saveDataToFile}>Export to File</Button>
                                }
                            </>}
                        </div>
                    );
                }
            );

            PlotlyComponent.displayName = "Plotly";
            return PlotlyComponent;
        }),
    { ssr: false }
);
