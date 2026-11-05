"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import {logout} from "@/app/utils/auth";
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {usePermissions} from "@/app/contexts/PermissionContext";

export default function LogoutPage() {
  const router = useRouter()
  const {permissions, userPayload} = usePermissions();
  useLayoutToggle(false, false)

  useEffect(() => {
    // Cookies are cleared on logout
    const asyncLogout = async () => {
        await logout()
    }
    asyncLogout().catch((error) => {
        console.error('Error:', error);
    });
    // Explained in middleware
    console.log('userPermissions', permissions, userPayload)
  }, [])

  const handleReturn = () => {
    router.push("/auth/login")
  }

  return (
    <div className="min-h-svh flex flex-col bg-[#00274c] items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-[#00274c] p-4 rounded-lg shadow-md">
            <Image
              src="/images/main_header_logo.png"
              alt="Logo"
              width={190}
              height={23}
              priority
              className="w-auto h-8"
              quality={100}
              onError={(e) => {
                console.error('Error loading image:', e);
                const imgElement = e.target as HTMLImageElement;
                imgElement.src = '/images/main_header_logo.png';
              }}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4">You have been logged out</h1>
        <p className="mb-6">Thank you for using our application.</p>
        <Button onClick={handleReturn} className="bg-[#00274c] hover:bg-[#003366]">
          Return to Login
        </Button>
      </div>
    </div>
  )
}

