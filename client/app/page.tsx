'use client'
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {usePermissions} from "@/app/contexts/PermissionContext";
import {Suspense, useEffect} from "react";
import Dashboard from "@/components/dashboard/Dashboard";

export default function Page() {
    useLayoutToggle(true, true)
    const {permissions, userPayload} = usePermissions();

    useEffect(() => {
        // Explained in middleware
        console.log('userPermissions', permissions, userPayload)
    }, [permissions, userPayload]);

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <Dashboard />
        </Suspense>
    )
}

