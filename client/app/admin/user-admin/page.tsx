'use client'
import AdminUsers from "@/app/admin/user-admin/sub-components/AdminUsers";
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {useEffect} from "react";
import {usePermissions} from "@/app/contexts/PermissionContext";

export default function UserAdminPage() {
    useLayoutToggle(true, true)
    const {permissions, userPayload} = usePermissions();

    useEffect(() => {
        // Explained in middleware
        console.log('userPermissions', permissions, userPayload)
    }, []);

    return (
        <AdminUsers/>
    )
}

