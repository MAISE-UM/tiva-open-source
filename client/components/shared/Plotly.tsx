"use client";

import dynamic from "next/dynamic";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { Layout, Config, PlotlyHTMLElement, Data } from "plotly.js-dist-min";
import { Loader2 } from "lucide-react";

// Define props type
interface PlotlyProps {
    id?: string;
    className?: string;
    data: Data[];
    layout?: Partial<Layout>;
    config?: Partial<Config>;
}

export const Plotly = dynamic(
    () =>
        import("plotly.js-dist-min").then(({ newPlot, purge }) => {
            const PlotlyComponent = forwardRef<PlotlyHTMLElement | HTMLDivElement, PlotlyProps>(
                ({ id, className, data, layout, config }, ref) => {
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

                    return (
                        <div className="relative">
                            {/* Show loading spinner while rendering */}
                            { loading && (
                                <div className="inset-0 flex justify-center items-center h-96 bg-white/70">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                </div>
                            )}
                            
                            <div id={realId} ref={originRef} className={className} />
                        </div>
                    );
                }
            );

            PlotlyComponent.displayName = "Plotly";
            return PlotlyComponent;
        }),
    { ssr: false }
);
