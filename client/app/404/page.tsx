'use client'
import Link from "next/link"
import { Home } from "lucide-react"
import {useLayoutToggle} from "@/app/hooks/useLayoutToggle";

export default function NotFound() {
    useLayoutToggle(true, true)
    return (
        <div className="mt-6 bg-gray-100 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="space-y-4">
                    <h1 className="text-9xl font-extrabold text-gray-900">404</h1>
                    <h2 className="text-4xl font-bold text-gray-900">Page Not Found</h2>
                    <p className="text-xl text-gray-600">Oops! The page you&#39;re looking for doesn&#39;t exist or has been moved.</p>
                </div>
                <div className="mt-8">
                    <Link
                        href="/"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Home className="mr-2 h-5 w-5" />
                        Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

