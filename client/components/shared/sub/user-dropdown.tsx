'use client'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {Button} from "@/components/ui/button";
import {User, ChevronDown} from "lucide-react";
import Link from "next/link";
import {UserNav, UserPermission} from "@/app/utils/interfaces";

interface UserDropdownProps {
    user: UserNav
    dropdownParent: UserPermission
    dropdownItems: UserPermission[]
}

export function UserDropdown({
    user,
    dropdownParent,
    dropdownItems
}: UserDropdownProps) {
    console.log('dropdownParent', dropdownParent);
    const usernameDisplay = dropdownParent.Display_Name.replace('{User}', user.username);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2 text-white bg-[#00172e] hover:bg-[#004080] hover:text-white px-3 py-2 rounded-md"
                >
                    <User className="h-4 w-4" />
                    <span>{usernameDisplay}</span>
                    <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#00172e] border-[#003366] text-white">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-gray-300">{user.role}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#003366]" />
                {
                    dropdownItems.map((permission) => (
                    <DropdownMenuItem
                        key={permission.Function_ID}
                        asChild
                        className="hover:bg-[#003366] focus:bg-[#003366] bg-white text-black cursor-pointer mb-1"
                    >
                        <Link href={permission.Function_Details}>{permission.Display_Name}</Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}