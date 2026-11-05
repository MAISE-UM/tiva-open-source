'use client'

import type React from "react";
import { useEffect } from "react";
import {useRouter} from "next/navigation";

// The API redirects here after a successful EHR login. Opens the dashboard in EHR mode
export default function EhrLaunch() {
    const router = useRouter();

    useEffect(() => {
        if(router)
            router.push('/?fromEhr=true');
    }, [router]);

    return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
}
