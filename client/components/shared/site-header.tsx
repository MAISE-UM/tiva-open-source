"use client"

import Image from "next/image"
import Link from "next/link"
import {EnvironmentBadge} from "@/components/shared/environment-badge"
import {useEffect, useState} from "react";
import {useLayout} from "@/app/contexts/LayoutContext";
import {usePathname} from "next/navigation";
import {UserDropdown} from "@/components/shared/sub/user-dropdown";
import {Environment, UserNav, UserPermission} from "@/app/utils/interfaces";
import {usePermissions} from "@/app/contexts/PermissionContext";

export function SiteHeader() {
    const {permissions, userPayload} = usePermissions();
    const [user, setUser] = useState<UserNav | null>(null);
    const [dropdownParent, setDropdownParent] = useState<UserPermission|null>(null);
    const [dropdownItems, setDropdownItems] = useState<UserPermission[]>([]);

    // This is a custom hook that allows us to enable and disable the header
    const {showHeader} = useLayout();

    const pathname = usePathname();

    useEffect(() => {
        if(userPayload !== null) {
            setUser({
                name: userPayload.name,
                role: userPayload.primary_role,
                username: userPayload.username,
            })
        }

        // The middleware will set the user's permissions in a cookie whenever a new route is loaded. The user dropdown
        // is a shared and enabled by default permission so we should always have the component available. What is
        // in the dropdown in controlled via the Application_Functions table in the database.
        if(permissions !== null && permissions.Permissions !== null) {
            const userDropdownParent = permissions.Permissions.filter(route => route.Function_Name.toLowerCase() === 'userdropdown');
            if(userDropdownParent.length === 0) {
                // If the user does not have the UserDropdown permission, we do not show the dropdown
                setDropdownParent(null);
                setDropdownItems([]);
                return;
            }
            setDropdownParent(userDropdownParent[0]);
            const userDropdownParentID = userDropdownParent[0].Function_ID;
            const userDropdownPermissions = permissions.Permissions.filter(permission => permission.Parent_ID === userDropdownParentID);
            setDropdownItems(userDropdownPermissions);
        }
    // Whenever the pathname changes we want to update the user's status and permissions
    }, [pathname, userPayload, permissions]);

    if (!showHeader) return null;

    // This would come from your environment configuration
    // You can change this to 'Local', 'Testing', or 'Production'
    const environment = process.env.NEXT_PUBLIC_ENVIRONMENT as Environment ?? 'Local' as Environment;

    return (
        <header className="bg-[#00274c]">
            <div className="flex h-16 items-center px-4 container">
                <div className="flex items-center">
                    <Link href="/">
                        <Image
                            src="/images/main_header_logo.png"
                            alt="Logo"
                            width={380}
                            height={46}
                            priority
                            style={{height: "46px", width: "auto"}} // Ensure correct aspect ratio
                        />
                    </Link>
                </div>
                <div className="absolute right-10 flex items-center gap-4">
                    {process.env.NEXT_PUBLIC_FEEDBACK_URL &&
                        <Link
                            href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:bg-[#004080] px-3 py-2 rounded-md transition-colors text-sm"
                        >
                            Feedback
                        </Link>
                    }
                    <EnvironmentBadge environment={environment}/>
                    {user !== null && dropdownParent !== null &&
                        <UserDropdown
                            user={user}
                            dropdownParent={dropdownParent}
                            dropdownItems={dropdownItems}
                        />
                    }
                </div>
            </div>
        </header>
    )
}

