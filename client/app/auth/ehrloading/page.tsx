'use client'

import type React from "react";
import { useEffect } from "react";
import {useRouter} from "next/navigation";
import {getEhrClientConfig} from "@/api/ehr-api";

// The API redirects here from the EHR callback. Sends the browser back to the API to complete the EHR login
export default function EhrLoading() {
    const router = useRouter();

    useEffect(() => {
        if(router)
            getEhrClientConfig().then((ehrConfig) => {
                router.push(`${process.env.NEXT_PUBLIC_EXTERNAL_API_BASE_URL}/${ehrConfig.CompletePath}`);
            });
    }, [router]);

    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
}
