"use client"

import {createContext, useState, useContext, type ReactNode, useEffect} from "react"
import {JwtPayload, UserPermissionGroup} from "@/app/utils/interfaces";
import {usePathname} from "next/navigation";
import {getUserPermissions, jwtPayload} from "@/app/utils/auth";

interface PermissionContextType {
    userPayload: JwtPayload|null;
    permissions: UserPermissionGroup|null;
    setUserPayload: (user: JwtPayload) => void;
    setPermissions: (permissions: UserPermissionGroup) => void;
}

// This whole LayoutContext allows us to define which pages have the header and footer enabled
const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

export function PermissionProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<UserPermissionGroup|null>(null)
    const [userPayload, setUserPayload] = useState<JwtPayload|null>(null)

    const pathname = usePathname();

    useEffect(() => {
        jwtPayload().then((payload) => {
            if (payload !== null) {
                // console.log('jwtPayload', data)
                setUserPayload(payload);

                // The middleware will set the user's permissions in a cookie whenever a new route is loaded. The user dropdown
                // is a shared and enabled by default permission so we should always have the component available. What is
                // in the dropdown in controlled via the Application_Functions table in the database.
                getUserPermissions().then((userPermissions) => {
                    setPermissions(userPermissions);
                });
            }
        });
    }, [pathname]);

    return (
        <PermissionContext.Provider value={{ permissions, setPermissions, userPayload, setUserPayload }}>
            {children}
        </PermissionContext.Provider>
    )
}

export function usePermissions() {
    const context = useContext(PermissionContext)
    if (context === undefined) {
        throw new Error("usePermissions must be used within a PermissionProvider")
    }
    return context
}

