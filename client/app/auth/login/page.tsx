"use client"

import React, {useEffect, useState} from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {login} from "@/api/auth-api";
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";
import {usePermissions} from "@/app/contexts/PermissionContext";

export default function LoginPage() {
  useLayoutToggle(false, false)
  const {permissions, userPayload} = usePermissions();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    // Explained in middleware
    console.log('userPermissions', permissions, userPayload)
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Add your login logic here. LDAP used as example
    login(username, password).then((response) => {
      // Redirect to home page after successful login
      if(response.bSuccess) {
        router.push("/")
      } else {
        setError("Login failed. Please check your credentials or contact your administrator.");
      }
    });
  }

  return (
    <div className="min-h-svh flex flex-col bg-[#00274c]">
      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-[28rem]">
          <div className="flex justify-center mb-6">
            <div className="bg-[#00274c] p-4 rounded-lg shadow-md">
              <Image
                src="/images/main_header_logo.png"
                alt="Logo"
                width={190}
                height={23}
                priority
                className="w-auto h-8"
              />
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center text-[#00274c]">Login</h1>
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-md shadow-sm text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-[#00274c]">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="border-[#00274c] focus:ring-[#00274c]"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[#00274c]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border-[#00274c] focus:ring-[#00274c]"
              />
            </div>
            <Button type="submit" className="w-full bg-[#00274c] hover:bg-[#003366] text-white">
              Log In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

