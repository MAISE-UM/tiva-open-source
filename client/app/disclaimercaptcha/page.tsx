'use client'

import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {useEffect} from "react";
import DisclaimerCaptcha from "@/components/shared/disclaimer-captcha";
import {usePermissions} from "@/app/contexts/PermissionContext";

export default function DisclaimerCaptchaPage() {
    useLayoutToggle(true, true)
    const {permissions, userPayload} = usePermissions();

    useEffect(() => {
        // Explained in middleware
        console.log('userPermissions', permissions, userPayload)
    }, []);

    return (
        <DisclaimerCaptcha />
    )
}
